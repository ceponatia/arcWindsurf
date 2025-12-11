/**
 * Turns Route
 *
 * Thin orchestration layer for governor-backed turn handling.
 * Uses extracted modules for validation, state loading, and persistence.
 */
import type { Hono } from 'hono';
import { getSession } from '../db/sessionsClient.js';
import { notFound, serverError } from '../util/responses.js';
import { loadStateForTurn } from '../sessions/state-loader.js';
import { createGovernorForRequest } from '../governor/composition.js';
import type { ConversationTurn } from '@minimal-rpg/governor';
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
import type { TurnContext, TurnPersistenceData } from './turns/types.js';

export function registerTurnRoutes(app: Hono): void {
  /**
   * POST /sessions/:id/turns
   *
   * Execute a turn with governor-backed AI handling.
   * Validates request, loads state, invokes governor, persists changes.
   */
  app.post('/sessions/:id/turns', async (c) => {
    const sessionId = c.req.param('id');

    // 1. Validate session exists
    const session = await getSession(sessionId);
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
        sessionId,
        ...(targetNpcId ? { targetNpcId } : {}),
      });
    } catch (err) {
      console.error('[turns] Failed to load state:', err);
      return serverError(c, 'failed to load session state');
    }

    // 4. Persist player input
    await persistPlayerInput(sessionId, input);

    // 5. Load complete session snapshot (messages, tags, persona, speaker)
    let snapshot;
    try {
      snapshot = await loadSessionSnapshot(sessionId, loadedState);
    } catch (err) {
      console.error('[turns] Failed to load snapshot:', err);
      return serverError(c, 'failed to load session snapshot');
    }

    const turnIdx = snapshot.messages.at(-1)?.idx ?? 0;

    // 6. Create governor and execute turn
    const governor = createGovernorForRequest({
      sessionId,
      stateSlices: {
        character: loadedState.baseline.character as any,
        npc: loadedState.baseline.npc as any,
        setting: loadedState.baseline.setting as any,
        location: loadedState.baseline.location as any,
        inventory: loadedState.baseline.inventory as any,
        proximity: loadedState.sessionState.proximity as any,
      },
    });

    const turnContext: TurnContext = {
      sessionId,
      playerInput: input,
      baseline: loadedState.baseline,
      overrides: loadedState.overrides,
      conversationHistory: snapshot.messages.map(
        (m): ConversationTurn => ({
          speaker: m.role === 'user' ? 'player' : 'character',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      ),
      sessionTags: snapshot.sessionTags,
      ...(snapshot.persona ? { persona: snapshot.persona } : {}),
    };

    const turnResult = await governor.handleTurn(turnContext);

    // 7. Persist assistant response
    await persistAssistantMessage(sessionId, turnResult.message, snapshot.speaker);

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

    await persistStateChanges(persistenceData, turnResult);

    // 9. Persist NPC transcript
    await persistNpcTranscript(
      sessionId,
      input,
      turnResult,
      loadedState.instances.activeNpc.id,
      loadedState.instances.primaryCharacter.id
    );

    // 10. Persist session history with debug info
    await persistSessionHistory(persistenceData, turnResult);

    // 11. Build and return response DTO
    const dto = mapTurnResultToDto(turnResult, snapshot.speaker);
    return c.json(dto, 200);
  });
}
