/**
 * Turns Route
 *
 * Thin orchestration layer for governor-backed turn handling.
 * Uses extracted modules for validation, state loading, and persistence.
 */
import type { Hono } from 'hono';
import { getSession, getRecentToolCalls, getToolCallStats } from '../db/sessionsClient.js';
import { notFound, serverError } from '../util/responses.js';
import { loadStateForTurn } from '../sessions/state-loader.js';
import { createGovernorForRequest } from '../governor/composition.js';
import type { ConversationTurn, ToolHistoryContext } from '@minimal-rpg/governor';
import type { AgentStateSlices } from '@minimal-rpg/agents';
import { validateTurnRequest } from './turns/turn-request.js';
import { loadSessionSnapshot } from './turns/session-snapshot.js';
import { mapTurnResultToDto } from './turns/turn-result-mapper.js';
import {
  persistPlayerInput,
  persistAssistantMessage,
  persistStateChanges,
  persistNpcTranscript,
  persistSessionHistory,
} from './turns/state-persistence.js';
import { processTurnInterest, executePromotion } from '../sessions/tier-service.js';
import type { TurnContext, TurnPersistenceData } from './turns/types.js';
import { getOwnerEmail } from '../auth/ownerEmail.js';

/**
 * Builds usage hints based on tool call statistics.
 * These hints remind the LLM of established tool usage patterns.
 */
function buildToolUsageHints(stats: {
  totalCalls: number;
  callsByTool: Record<string, number>;
  recentTools: string[];
}): string[] {
  const hints: string[] = [];

  // Hint about successful tool usage history
  if (stats.totalCalls >= 5) {
    hints.push(
      `This session has successfully used tools ${stats.totalCalls} times. Continue using tools for game actions.`
    );
  }

  // Hint about commonly used tools
  const topTools = Object.entries(stats.callsByTool)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);

  if (topTools.length > 0) {
    hints.push(`Most used tools: ${topTools.join(', ')}`);
  }

  // Remind about recently used tools
  if (stats.recentTools.length > 0) {
    const unique = [...new Set(stats.recentTools.slice(0, 3))];
    hints.push(`Recently used: ${unique.join(', ')}`);
  }

  return hints;
}

export function registerTurnRoutes(app: Hono): void {
  /**
   * POST /sessions/:id/turns
   *
   * Execute a turn with governor-backed AI handling.
   * Validates request, loads state, invokes governor, persists changes.
   */
  app.post('/sessions/:id/turns', async (c) => {
    const sessionId = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

    // 1. Validate session exists
    const session = await getSession(ownerEmail, sessionId);
    if (!session) {
      return notFound(c, 'session not found');
    }

    // 2. Validate request body
    const validationResult = await validateTurnRequest(c);
    if (!validationResult.success) {
      return validationResult.response;
    }
    const { input, targetNpcId } = validationResult.data;

    // 3. Load state (baseline + overrides + session state)
    let loadedState;
    try {
      loadedState = await loadStateForTurn({
        ownerEmail,
        sessionId,
        ...(targetNpcId ? { targetNpcId } : {}),
      });
    } catch (err) {
      console.error('[turns] Failed to load state:', err);
      return serverError(c, 'failed to load session state');
    }

    // 4. Persist player input
    await persistPlayerInput(ownerEmail, sessionId, input);

    // 5. Load complete session snapshot (messages, tags, persona, speaker)
    let snapshot;
    try {
      snapshot = await loadSessionSnapshot(ownerEmail, sessionId, loadedState);
    } catch (err) {
      console.error('[turns] Failed to load snapshot:', err);
      return serverError(c, 'failed to load session snapshot');
    }

    const turnIdx = snapshot.messages.at(-1)?.idx ?? 0;

    // 6. Load tool call history for context (helps maintain tool calling patterns)
    let toolHistory: ToolHistoryContext | undefined;
    try {
      const [recentCalls, stats] = await Promise.all([
        getRecentToolCalls(ownerEmail, sessionId, { turnLimit: 5, limit: 20 }),
        getToolCallStats(ownerEmail, sessionId),
      ]);

      if (stats.totalCalls > 0) {
        toolHistory = {
          recentToolCalls: recentCalls.map((c) => ({
            turnIdx: c.turnIdx,
            toolName: c.toolName,
            success: c.success,
          })),
          stats: {
            totalCalls: stats.totalCalls,
            callsByTool: stats.callsByTool,
            recentTools: stats.recentTools,
          },
          // Build usage hints based on tool patterns
          usageHints: buildToolUsageHints(stats),
        };
      }
    } catch (err) {
      // Non-fatal - continue without tool history
      console.warn('[turns] Failed to load tool history:', err);
    }

    // 7. Create governor and execute turn
    const stateSlices: AgentStateSlices = {
      character: loadedState.baseline.character as unknown as NonNullable<
        AgentStateSlices['character']
      >,
      setting: loadedState.baseline.setting as unknown as NonNullable<AgentStateSlices['setting']>,
      location: loadedState.baseline.location as unknown as NonNullable<
        AgentStateSlices['location']
      >,
      inventory: loadedState.baseline.inventory as unknown as NonNullable<
        AgentStateSlices['inventory']
      >,
      proximity: loadedState.sessionState.proximity as unknown as NonNullable<
        AgentStateSlices['proximity']
      >,
      ...(loadedState.baseline.npc
        ? { npc: loadedState.baseline.npc as unknown as NonNullable<AgentStateSlices['npc']> }
        : {}),
    };

    const governor = createGovernorForRequest({
      ownerEmail,
      sessionId,
      stateSlices,
      ...(snapshot.turnTagContext ? { turnTagContext: snapshot.turnTagContext } : {}),
      ...(loadedState.locationInfoMap.size > 0 && {
        availableLocations: loadedState.locationInfoMap,
      }),
      ...(loadedState.playerLocationId !== undefined && {
        playerLocationId: loadedState.playerLocationId,
      }),
      turnIdx: turnIdx + 1, // Next turn index for tool history tracking
    });

    // Include proximity in baseline so state patches can be applied
    const baselineWithProximity = {
      ...loadedState.baseline,
      proximity: loadedState.sessionState.proximity,
    };

    const turnContext: TurnContext = {
      sessionId,
      playerInput: input,
      baseline: baselineWithProximity,
      overrides: loadedState.overrides,
      conversationHistory: snapshot.messages.map(
        (m): ConversationTurn => ({
          speaker: m.role === 'user' ? 'player' : 'character',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      ),
      sessionTags: snapshot.sessionTags,
      ...(snapshot.turnTagContext ? { turnTagContext: snapshot.turnTagContext } : {}),
      ...(snapshot.persona ? { persona: snapshot.persona } : {}),
      ...(toolHistory ? { toolHistory } : {}),
    };

    const turnResult = await governor.handleTurn(turnContext);

    // 7. Persist assistant response
    await persistAssistantMessage(ownerEmail, sessionId, turnResult.message, snapshot.speaker);

    // 8. Persist state changes to database and cache
    const persistenceData: TurnPersistenceData = {
      sessionId,
      playerInput: input,
      turnIdx,
      loadedState,
      sessionTags: snapshot.sessionTags,
      baseline: loadedState.baseline,
      overrides: loadedState.overrides,
      ...(snapshot.persona ? { persona: snapshot.persona } : {}),
    };

    await persistStateChanges(ownerEmail, persistenceData, turnResult);

    // 9. Persist NPC transcript
    await persistNpcTranscript(
      ownerEmail,
      sessionId,
      input,
      turnResult,
      loadedState.instances.activeNpc.id,
      loadedState.instances.primaryCharacter.id
    );

    // 10. Persist session history with debug info
    await persistSessionHistory(ownerEmail, persistenceData, turnResult);

    // 11. Process player interest and tier promotions
    // Track interest for the active NPC (dialogue interaction)
    const allNpcIds = loadedState.instances.characterInstances
      .filter((ci) => ci.role === 'npc')
      .map((ci) => ci.id);

    if (allNpcIds.length > 0) {
      try {
        const interestResult = await processTurnInterest({
          ownerEmail,
          sessionId,
          interactedNpcIds: [loadedState.instances.activeNpc.id],
          allNpcIds,
          interactions: new Map([
            [
              loadedState.instances.activeNpc.id,
              {
                type: 'dialogue' as const,
                namedNpc: true,
                askedQuestions: input.includes('?'),
              },
            ],
          ]),
        });

        // Execute any pending promotions
        for (const promotion of interestResult.promotions) {
          if (promotion.targetTier) {
            await executePromotion(ownerEmail, sessionId, promotion.npcId, promotion.targetTier);
            console.log(
              `[turns] Promoted NPC ${promotion.npcId} from ${promotion.currentTier} to ${promotion.targetTier}`
            );
          }
        }
      } catch (err) {
        // Non-fatal - log but don't fail the turn
        console.error('[turns] Failed to process interest/promotions:', err);
      }
    }

    // 12. Build and return response DTO
    const dto = mapTurnResultToDto(turnResult, snapshot.speaker);
    return c.json(dto, 200);
  });
}
