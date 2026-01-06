import { type Operation } from 'fast-json-patch';
import { cloneJsonLike } from '../utils/clone.js';
import type { AgentOutput, AgentStateSlices, NpcAgent, NpcAgentInput } from '@minimal-rpg/agents';
import type { ProximityLevel } from '@minimal-rpg/schemas';
import type {
  PhaseTiming,
  TurnEvent,
  TurnInput,
  TurnMetadata,
  TurnResult,
  TurnStateChanges,
  ToolTurnHandler,
} from './types.js';

interface NpcTurnContext {
  npcId: string;
  stateSlices: AgentStateSlices;
  proximityLevel?: ProximityLevel;
}

interface NpcTurnHandlerConfig {
  npcAgent: NpcAgent;
  /** Optional tenant scoping for history-aware agents */
  ownerEmail?: string;
  /** Default NPC slices for this turn (cloned per execution). */
  stateSlices: AgentStateSlices;
  /** Optional explicit pool of NPC contexts to execute. */
  npcPool?: NpcTurnContext[];
  debug?: boolean;
}

interface NpcTurnResult {
  npcId: string;
  npcName: string;
  tier: 'addressed' | 'nearby' | 'background';
  npcPriority: number;
  output: AgentOutput;
  index: number;
  statePatches: Operation[];
  events: TurnEvent[];
}

function buildModifiedPaths(patches: Operation[]): string[] {
  const paths = new Set<string>();
  for (const patch of patches) {
    const topLevel = patch.path.split('/').find(Boolean);
    if (topLevel) {
      paths.add(topLevel);
    }
  }
  return Array.from(paths);
}

function resolveTier(
  isDirectlyAddressed: boolean,
  proximityLevel?: ProximityLevel
): 'addressed' | 'nearby' | 'background' {
  if (isDirectlyAddressed) return 'addressed';
  if (proximityLevel && ['intimate', 'close', 'near'].includes(proximityLevel)) {
    return 'nearby';
  }
  return 'background';
}

/**
 * Direct NPC turn handler that executes NpcAgent for each NPC in the pool.
 */
export class NpcTurnHandler implements ToolTurnHandler {
  private readonly npcAgent: NpcAgent;
  private readonly ownerEmail: string | undefined;
  private readonly npcPool: NpcTurnContext[];
  private readonly debug: boolean;

  constructor(config: NpcTurnHandlerConfig) {
    this.npcAgent = config.npcAgent;
    this.ownerEmail = config.ownerEmail;
    this.debug = config.debug ?? false;

    const defaultNpcId =
      config.stateSlices.npc?.instanceId ?? config.stateSlices.character?.instanceId ?? 'npc';

    const defaultContext: NpcTurnContext = {
      npcId: defaultNpcId,
      stateSlices: config.stateSlices,
      ...(config.stateSlices.proximity?.npcProximity?.[defaultNpcId] !== undefined
        ? { proximityLevel: config.stateSlices.proximity?.npcProximity?.[defaultNpcId] }
        : {}),
    };

    const basePool: NpcTurnContext[] = config.npcPool?.length ? config.npcPool : [defaultContext];

    this.npcPool = basePool.map((ctx) => ({
      npcId: ctx.npcId,
      stateSlices: cloneJsonLike(ctx.stateSlices),
      ...(ctx.proximityLevel ? { proximityLevel: ctx.proximityLevel } : {}),
    }));
  }

  async handleTurn(input: TurnInput): Promise<TurnResult> {
    const start = Date.now();
    const phaseTiming: PhaseTiming = {};
    const events: TurnEvent[] = [
      {
        type: 'turn-started',
        timestamp: new Date(),
        payload: { sessionId: input.sessionId, mode: 'npc-agent' },
      },
    ];
    try {
      const npcContexts = this.npcPool.length > 0 ? this.npcPool : [];
      if (npcContexts.length === 0) {
        const processingTimeMs = Date.now() - start;
        events.push({
          type: 'turn-completed',
          timestamp: new Date(),
          payload: {
            success: false,
            processingTimeMs,
            npcCount: 0,
            patchesCollected: 0,
          },
        });

        const metadata: TurnMetadata = {
          processingTimeMs,
          agentsInvoked: [],
          nodesRetrieved: 0,
          phaseTiming,
        };

        return {
          message: 'No NPCs available for this turn.',
          events,
          metadata,
          success: false,
          error: {
            code: 'NO_NPC_CONTEXT',
            message: 'NpcTurnHandler requires at least one NPC context',
            phase: 'npc-execution',
          },
        };
      }

      const executionStart = Date.now();
      const results = await Promise.all(
        npcContexts.map((ctx, index) => this.runNpc(ctx, input, events, index))
      );
      phaseTiming.agentExecutionMs = Date.now() - executionStart;

      const sorted = this.sortResults(results);
      const combinedNarrative = sorted.map((r) => r.output.narrative).join('\n\n');
      const combinedPatches = sorted.flatMap((r) => r.statePatches);
      const metadata: TurnMetadata = {
        processingTimeMs: Date.now() - start,
        agentsInvoked: ['npc'],
        nodesRetrieved: 0,
        phaseTiming,
        agentOutputs: sorted.map((r) => ({ agentType: 'npc', output: r.output })),
      };

      const npcOrderingEvent: TurnEvent = {
        type: 'npc-priority-ordering',
        timestamp: new Date(),
        payload: {
          ordering: sorted.map((r) => ({
            npcId: r.npcId,
            npcName: r.npcName,
            tier: r.tier,
            npcPriority: r.npcPriority,
          })),
        },
        source: 'NpcTurnHandler',
      };
      events.push(npcOrderingEvent);

      const stateChanges: TurnStateChanges | undefined = combinedPatches.length
        ? {
            patchCount: combinedPatches.length,
            modifiedPaths: buildModifiedPaths(combinedPatches),
            patches: combinedPatches,
          }
        : undefined;

      events.push({
        type: 'turn-completed',
        timestamp: new Date(),
        payload: {
          success: true,
          processingTimeMs: metadata.processingTimeMs,
          npcCount: sorted.length,
          patchesCollected: combinedPatches.length,
        },
      });

      return {
        message: combinedNarrative || 'Nothing happens.',
        events,
        ...(stateChanges ? { stateChanges } : {}),
        metadata,
        success: true,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      events.push({
        type: 'error',
        timestamp: new Date(),
        payload: { message: errorMessage },
      });

      events.push({
        type: 'turn-completed',
        timestamp: new Date(),
        payload: {
          success: false,
          processingTimeMs,
        },
      });

      const metadata: TurnMetadata = {
        processingTimeMs,
        agentsInvoked: ['npc'],
        nodesRetrieved: 0,
        phaseTiming,
      };

      return {
        message: 'An error occurred while processing NPC actions. Please try again.',
        events,
        metadata,
        success: false,
        error: {
          code: 'NPC_TURN_ERROR',
          message: errorMessage,
          phase: 'npc-execution',
        },
      };
    }
  }

  private async runNpc(
    ctx: NpcTurnContext,
    turn: TurnInput,
    events: TurnEvent[],
    index: number
  ): Promise<NpcTurnResult> {
    const npcName =
      ctx.stateSlices.npc?.name ?? ctx.stateSlices.character?.name ?? ctx.npcId ?? 'the NPC';
    const isDirectlyAddressed = this.isDirectlyAddressed(turn.playerInput, npcName);

    events.push({
      type: 'npc-started',
      timestamp: new Date(),
      payload: { npcId: ctx.npcId, npcName },
      source: ctx.npcId,
    });

    const npcInput = this.buildNpcInput(ctx, turn, npcName, isDirectlyAddressed);
    const output = await this.npcAgent.execute(npcInput);

    const npcEvents: TurnEvent[] = [];
    if (output.events) {
      for (const evt of output.events) {
        npcEvents.push({
          type: evt.type,
          timestamp: new Date(),
          payload: evt.payload,
          source: evt.source,
        });
      }
      events.push(...npcEvents);
    }

    events.push({
      type: 'npc-completed',
      timestamp: new Date(),
      payload: {
        npcId: ctx.npcId,
        npcName,
        npcPriority: output.npcPriority ?? 0,
        hasPatches: Array.isArray(output.statePatches) && output.statePatches.length > 0,
      },
      source: ctx.npcId,
    });

    if (this.debug) {
      console.log('[NpcTurnHandler] %s priority=%s', ctx.npcId, output.npcPriority ?? 0);
    }

    const statePatches = output.statePatches ?? [];
    const tier = resolveTier(isDirectlyAddressed, ctx.proximityLevel);

    return {
      npcId: ctx.npcId,
      npcName,
      tier,
      npcPriority: output.npcPriority ?? 0,
      output,
      index,
      statePatches,
      events: npcEvents,
    };
  }

  private buildNpcInput(
    ctx: NpcTurnContext,
    turn: TurnInput,
    npcName: string,
    isDirectlyAddressed: boolean
  ): NpcAgentInput {
    const tagContext = turn.turnTagContext;

    const npcTags = ctx.npcId
      ? (tagContext?.byNpcInstanceId[ctx.npcId]?.map((t) => t.tagName) ?? [])
      : [];

    const locationTags = tagContext?.playerLocationId
      ? (tagContext.byLocationId?.[tagContext.playerLocationId]?.map((t) => t.tagName) ?? [])
      : [];

    const sessionTags = tagContext?.session.map((t) => t.tagName) ?? [];
    const proximityLevel =
      ctx.proximityLevel ?? ctx.stateSlices.proximity?.npcProximity?.[ctx.npcId];

    const stateSlices = cloneJsonLike(ctx.stateSlices);

    const npcInput: NpcAgentInput = {
      sessionId: turn.sessionId,
      playerInput: turn.playerInput,
      npcId: ctx.npcId,
      intent: {
        type: 'talk',
        params: { npcId: ctx.npcId, target: npcName },
        confidence: 1,
      },
      stateSlices,
      ...(this.ownerEmail ? { ownerEmail: this.ownerEmail } : {}),
      isDirectlyAddressed,
      npcTags,
      locationTags,
      sessionTags,
      ...(proximityLevel ? { proximityLevel } : {}),
    };

    if (turn.persona) {
      npcInput.persona = turn.persona;
    }

    return npcInput;
  }

  private isDirectlyAddressed(playerInput: string, npcName: string): boolean {
    if (!npcName) return false;
    return playerInput.toLowerCase().includes(npcName.toLowerCase());
  }

  private sortResults(results: NpcTurnResult[]): NpcTurnResult[] {
    const tierRank: Record<NpcTurnResult['tier'], number> = {
      addressed: 0,
      nearby: 1,
      background: 2,
    };

    return [...results].sort((a, b) => {
      if (tierRank[a.tier] !== tierRank[b.tier]) {
        return tierRank[a.tier] - tierRank[b.tier];
      }
      if ((b.npcPriority ?? 0) !== (a.npcPriority ?? 0)) {
        return (b.npcPriority ?? 0) - (a.npcPriority ?? 0);
      }
      return a.index - b.index;
    });
  }
}

export type { NpcTurnHandlerConfig, NpcTurnContext };
