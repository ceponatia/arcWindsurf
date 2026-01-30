import { CharacterProfileSchema, type CharacterProfile, type Intent, type WorldEvent } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';
import { CognitionLayer, type CognitionContext } from '@minimal-rpg/actors';
import { worldBus } from '@minimal-rpg/bus';
import { timeService } from '@minimal-rpg/services';
import { getActorState, getEntityProfile } from '@minimal-rpg/db/node';
import { isUuid, toId, toSessionId } from '../utils/uuid.js';

/**
 * Configuration for turn handling.
 */
export interface TurnConfig {
  /** Game minutes per turn (default: 5) */
  minutesPerTurn: number;
  /** Whether background NPCs update during turns */
  enableAmbientUpdates: boolean;
  /** How many background events to include per turn (0 = none) */
  maxAmbientNarrations: number;
  /** Narrative verbosity */
  narrativeMode: 'minimal' | 'standard' | 'verbose';
}

/**
 * Input to process a turn.
 */
export interface TurnInput {
  sessionId: string;
  playerId: string;
  playerMessage: string;
  focusedNpcId: string | null;
  locationId: string;
}

/**
 * Result of processing a turn.
 */
export interface TurnResult {
  /** Events emitted during this turn */
  events: WorldEvent[];
  /** The focused NPC's dialogue response */
  npcResponse: string | null;
  /** Ambient narration to include */
  ambientNarration: string[];
  /** Location transition narration (if player moved) */
  transitionNarration: string | null;
  /** Final composed response for display */
  composedResponse: string;
  /** New location (if player moved) */
  newLocationId: string | null;
  /** Game time after this turn */
  gameTime: { hour: number; minute: number };
}

/**
 * TurnOrchestrator coordinates the processing of a single game turn.
 */
export class TurnOrchestrator {
  private config: TurnConfig;
  private llmProvider: LLMProvider;

  /**
   * Create a new TurnOrchestrator instance.
   */
  constructor(config: Partial<TurnConfig>, llmProvider: LLMProvider) {
    this.config = {
      minutesPerTurn: config.minutesPerTurn ?? 5,
      enableAmbientUpdates: config.enableAmbientUpdates ?? true,
      maxAmbientNarrations: config.maxAmbientNarrations ?? 3,
      narrativeMode: config.narrativeMode ?? 'standard',
    };
    this.llmProvider = llmProvider;
  }

  /**
   * Process a complete turn.
   */
  async processTurn(input: TurnInput): Promise<TurnResult> {
    // Step 1: Parse player intent (TASK-011 dependency)
    const intents = this.buildPlaceholderIntents(input);

    // Step 2: Emit intents to WorldBus
    const events = await this.emitIntents(intents, input.sessionId);

    // Step 3: Advance time
    await this.advanceTime(input.sessionId, this.config.minutesPerTurn);

    // Step 4: Collect ambient events (TASK-014 dependency)
    const ambientNarration = this.collectAmbientNarration(input.sessionId);

    // Step 5: Generate focused NPC response
    const npcResponse = await this.generateNpcResponse(
      input.focusedNpcId,
      input.playerMessage,
      input.sessionId
    );

    // Step 6: Compose final response (TASK-016 dependency)
    const transitionNarration = null;
    const newLocationId = null;
    const composedResponse = this.composeResponse(
      npcResponse,
      ambientNarration,
      transitionNarration
    );

    return {
      events,
      npcResponse,
      ambientNarration,
      transitionNarration,
      composedResponse,
      newLocationId,
      gameTime: { hour: 12, minute: 0 },
    };
  }

  /**
   * Build placeholder intents until the intent parser is wired.
   */
  private buildPlaceholderIntents(input: TurnInput): Intent[] {
    const trimmed = input.playerMessage.trim();
    if (!trimmed) {
      return [];
    }

    return [
      {
        type: 'SPEAK_INTENT',
        content: trimmed,
        targetActorId: input.focusedNpcId ?? undefined,
        sessionId: input.sessionId,
        actorId: input.playerId,
        timestamp: new Date(),
      },
    ];
  }

  /**
   * Emit intents to the WorldBus and return the emitted events.
   */
  private async emitIntents(intents: Intent[], sessionId: string): Promise<WorldEvent[]> {
    const emittedEvents: WorldEvent[] = [];

    for (const intent of intents) {
      const event: WorldEvent = {
        ...intent,
        sessionId,
        timestamp: new Date(),
      } as WorldEvent;
      await worldBus.emit(event);
      emittedEvents.push(event);
    }

    return emittedEvents;
  }

  /**
   * Advance time for the session.
   */
  private async advanceTime(sessionId: string, minutes: number): Promise<void> {
    if (minutes <= 0) {
      return;
    }

    await timeService.emitTick();

    // TODO: Replace with a session-aware time service when available.
    void sessionId;
  }

  /**
   * Collect ambient narration strings for this turn.
   */
  private collectAmbientNarration(sessionId: string): string[] {
    if (!this.config.enableAmbientUpdates || this.config.maxAmbientNarrations <= 0) {
      return [];
    }

    // TODO: Wire to AmbientCollector (TASK-014).
    void sessionId;
    return [];
  }

  /**
   * Generate the focused NPC's response.
   */
  private async generateNpcResponse(
    focusedNpcId: string | null,
    playerMessage: string,
    sessionId: string
  ): Promise<string | null> {
    if (!focusedNpcId) {
      return null;
    }

    const actorState = await getActorState(toSessionId(sessionId), focusedNpcId);
    if (!actorState) {
      console.warn(`[TurnOrchestrator] Missing actor state for NPC ${focusedNpcId}`);
      return null;
    }

    const profile = await this.loadNpcProfile(focusedNpcId, actorState.entityProfileId ?? null);
    if (!profile) {
      console.warn(`[TurnOrchestrator] Missing profile for NPC ${focusedNpcId}`);
      return null;
    }

    const rawState =
      actorState.state && typeof actorState.state === 'object'
        ? (actorState.state as Record<string, unknown>)
        : {};
    const locationId =
      typeof rawState['locationId'] === 'string' ? (rawState['locationId'] as string) : 'unknown';
    const spawnedAt = actorState.createdAt ?? new Date();
    const lastActiveAt = actorState.updatedAt ?? new Date();
    const recentEvents = Array.isArray(rawState['recentEvents'])
      ? (rawState['recentEvents'] as WorldEvent[])
      : [];
    const goals = Array.isArray(rawState['goals']) ? (rawState['goals'] as string[]) : [];

    if (locationId === 'unknown') {
      console.warn(`[TurnOrchestrator] Missing locationId for NPC ${focusedNpcId}`);
    }

    const context: CognitionContext = {
      perception: {
        relevantEvents: [
          {
            type: 'SPOKE',
            content: playerMessage,
            actorId: 'player',
            sessionId,
            timestamp: new Date(),
          },
        ],
        nearbyActors: [],
        locationState: locationId,
      },
      state: {
        id: actorState.actorId,
        type: 'npc',
        npcId: focusedNpcId,
        sessionId,
        locationId,
        spawnedAt,
        lastActiveAt,
        recentEvents,
        goals,
      },
      availableActions: ['SPEAK_INTENT'],
    };

    const result = await CognitionLayer.decideLLM(context, profile, this.llmProvider);

    if (result?.intent?.type === 'SPEAK_INTENT') {
      const content = (result.intent as { content?: string }).content;
      return content ?? null;
    }

    return null;
  }

  /**
   * Load NPC character profile from entity profiles.
   */
  private async loadNpcProfile(
    npcId: string,
    entityProfileId: string | null
  ): Promise<CharacterProfile | null> {
    const candidateIds: string[] = [];
    if (isUuid(npcId)) {
      candidateIds.push(npcId);
    }
    if (entityProfileId && isUuid(entityProfileId)) {
      candidateIds.push(entityProfileId);
    }

    for (const id of candidateIds) {
      const profileRow = await getEntityProfile(toId(id));
      if (!profileRow || profileRow.entityType !== 'character') {
        continue;
      }

      const parsed = CharacterProfileSchema.safeParse(profileRow.profileJson);
      if (parsed.success) {
        return parsed.data;
      }
    }

    return null;
  }

  /**
   * Compose the final response for display.
   */
  private composeResponse(
    npcResponse: string | null,
    ambientNarration: string[],
    transitionNarration: string | null
  ): string {
    const parts: string[] = [];

    if (transitionNarration) {
      parts.push(`*${transitionNarration}*`);
    }

    for (const narration of ambientNarration) {
      parts.push(`*${narration}*`);
    }

    if (npcResponse) {
      parts.push(npcResponse);
    }

    return parts.join('\n\n');
  }
}
