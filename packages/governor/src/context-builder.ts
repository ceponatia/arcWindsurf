import {
  type AgentStateSlices,
  type CharacterSlice,
  type LocationSlice,
  type LocationExit,
  type InventorySlice,
  type InventoryItem,
  type SettingSlice,
} from '@minimal-rpg/agents';
import { type RetrievalService, type RetrievalQuery } from '@minimal-rpg/retrieval';
import { type StateManager, type DeepPartial } from '@minimal-rpg/state-manager';
import {
  type TurnContext,
  type TurnStateContext,
  type ContextBuildInput,
  type ContextBuilder,
  type KnowledgeContextItem,
  type ConversationTurn,
  type GovernorRetrievalResult,
  type StateObject,
  type NpcTranscriptLoader,
} from './types.js';

// ============================================================================
// Context Builder Configuration
// ============================================================================

/**
 * Configuration for the DefaultContextBuilder.
 */
export interface ContextBuilderConfig {
  /** State manager for computing effective state */
  stateManager: StateManager;

  /** Retrieval service for knowledge context (optional) */
  retrievalService?: RetrievalService | undefined;

  /** Maximum knowledge nodes to retrieve */
  maxKnowledgeNodes?: number | undefined;

  /** Minimum score threshold for knowledge nodes */
  minKnowledgeScore?: number | undefined;

  /** Whether to include conversation history in retrieval queries */
  includeHistoryInQuery?: boolean | undefined;

  /** Loader for per-NPC transcripts (optional) */
  npcTranscriptLoader?: NpcTranscriptLoader | undefined;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard for checking if a value is a StateObject.
 */
function isStateObject(value: unknown): value is StateObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Safely get a string from an unknown value.
 */
function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Safely get a string or undefined from an unknown value.
 */
function safeStringOptional(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely get a number or undefined from an unknown value.
 */
function safeNumberOptional(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely get a boolean or undefined from an unknown value.
 */
function safeBooleanOptional(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Safely get a string array from an unknown value.
 */
function safeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value.filter((v): v is string => typeof v === 'string');
  return result.length > 0 ? result : undefined;
}

// ============================================================================
// Default Context Builder
// ============================================================================

/**
 * Default implementation of context building.
 * Assembles TurnContext from input, state, and retrieval results.
 */
export class DefaultContextBuilder implements ContextBuilder {
  private readonly stateManager: StateManager;
  private readonly retrievalService: RetrievalService | undefined;
  private readonly maxKnowledgeNodes: number;
  private readonly minKnowledgeScore: number;
  private readonly includeHistoryInQuery: boolean;
  private readonly npcTranscriptLoader: NpcTranscriptLoader | undefined;

  constructor(config: ContextBuilderConfig) {
    this.stateManager = config.stateManager;
    this.retrievalService = config.retrievalService;
    this.maxKnowledgeNodes = config.maxKnowledgeNodes ?? 10;
    this.minKnowledgeScore = config.minKnowledgeScore ?? 0.3;
    this.includeHistoryInQuery = config.includeHistoryInQuery ?? true;
    this.npcTranscriptLoader = config.npcTranscriptLoader;
  }

  async build(input: ContextBuildInput): Promise<TurnContext> {
    // 1. Compute effective state
    const effectiveState = this.computeEffectiveState(input.baseline, input.overrides);

    // 1b. Load NPC transcript history if a canonical NPC is targeted
    const npcConversationHistory = await this.loadNpcTranscript(
      input.intent.params?.npcId,
      input.sessionId
    );

    // 2. Extract state slices for agents
    const stateSlices = this.extractStateSlices(effectiveState);

    // 3. Retrieve knowledge context
    const knowledgeContext = await this.retrieveKnowledge(
      input.sessionId,
      input.playerInput,
      effectiveState,
      input.conversationHistory
    );

    // 4. Assemble turn context
    return {
      sessionId: input.sessionId,
      intent: input.intent,
      effectiveState,
      stateSlices,
      knowledgeContext,
      conversationHistory: input.conversationHistory ?? [],
      npcConversationHistory,
      playerInput: input.playerInput,
      turnNumber: input.turnNumber ?? 1,
    };
  }

  /**
   * Load per-NPC transcript history when an npcId is present.
   */
  private async loadNpcTranscript(
    npcId: string | undefined,
    sessionId: string
  ): Promise<ConversationTurn[] | undefined> {
    if (!npcId || !this.npcTranscriptLoader) return undefined;

    try {
      return await this.npcTranscriptLoader({ sessionId, npcId, limit: 50 });
    } catch (err) {
      // Fail open; transcript is optional context
      console.warn('Failed to load NPC transcript', err);
      return undefined;
    }
  }

  /**
   * Compute effective state from baseline and overrides.
   */
  private computeEffectiveState(
    baseline: TurnStateContext,
    overrides: DeepPartial<TurnStateContext>
  ): TurnStateContext {
    const result = this.stateManager.getEffectiveState(baseline, overrides);
    return result.effective as TurnStateContext;
  }

  /**
   * Extract state slices for agent consumption.
   */
  private extractStateSlices(state: TurnStateContext): AgentStateSlices {
    const slices: AgentStateSlices = {};

    // Extract character slice (primary PC)
    if (state.character) {
      slices.character = this.extractCharacterSlice(state.character);
    }

    // Extract NPC slice (active NPC for this turn)
    if (state.npc) {
      slices.npc = this.extractCharacterSlice(state.npc);
    }

    // Extract location slice
    if (state.location) {
      slices.location = this.extractLocationSlice(state.location);
    }

    // Extract setting slice
    if (state.setting) {
      slices.setting = this.extractSettingSlice(state.setting);
    }

    // Extract inventory slice
    if (state.inventory) {
      slices.inventory = this.extractInventorySlice(state.inventory);
    }

    return slices;
  }

  /**
   * Extract character slice from state.
   * Passes through all CharacterProfile fields for agents to use as needed.
   */
  private extractCharacterSlice(character: StateObject): CharacterSlice {
    const slice: CharacterSlice = {
      instanceId: safeString(character['instanceId'], 'unknown'),
      name: safeString(character['name'], 'Unknown'),
    };

    // Basic fields
    const age = safeNumberOptional(character['age']);
    if (age !== undefined) slice.age = age;

    const backstory = safeStringOptional(character['backstory']);
    if (backstory !== undefined) slice.backstory = backstory;

    // Goals (runtime state)
    const goals = safeStringArray(character['goals']);
    if (goals !== undefined) slice.goals = goals;

    // Personality - can be string or string[]
    const personality = character['personality'];
    if (typeof personality === 'string') {
      slice.personality = personality;
    } else if (Array.isArray(personality)) {
      const traits = personality.filter((v): v is string => typeof v === 'string');
      if (traits.length > 0) slice.personality = traits;
    }

    // Physique - can be string or Physique object
    const physique = character['physique'];
    if (typeof physique === 'string' || isStateObject(physique)) {
      slice.physique = physique as CharacterSlice['physique'];
    }

    // Legacy scent
    const scent = character['scent'];
    if (isStateObject(scent)) {
      slice.scent = scent as CharacterSlice['scent'];
    }

    // Body map for per-region sensory data
    const body = character['body'];
    if (isStateObject(body)) {
      slice.body = body as unknown as NonNullable<CharacterSlice['body']>;
    }

    // Structured personality map
    const personalityMap = character['personalityMap'];
    if (isStateObject(personalityMap)) {
      slice.personalityMap = personalityMap as CharacterSlice['personalityMap'];
    }

    // Details array
    const details = character['details'];
    if (Array.isArray(details)) {
      slice.details = details as CharacterSlice['details'];
    }

    return slice;
  }

  /**
   * Extract setting slice from state.
   */
  private extractSettingSlice(setting: StateObject): SettingSlice {
    const slice: SettingSlice = {
      instanceId: safeString(setting['instanceId'], 'unknown'),
      name: safeString(setting['name'], 'Unknown Setting'),
      summary: safeString(setting['summary'], ''),
    };

    const themes = safeStringArray(setting['themes']);
    if (themes !== undefined) {
      slice.themes = themes;
    }

    return slice;
  }

  /**
   * Extract location slice from state.
   */
  private extractLocationSlice(location: StateObject): LocationSlice {
    const exits = this.extractExits(location['exits']);
    const slice: LocationSlice = {
      id: safeString(location['id'], 'unknown'),
      name: safeString(location['name'], 'Unknown Location'),
      description: safeString(location['description'], ''),
    };

    if (exits.length > 0) {
      slice.exits = exits;
    }

    return slice;
  }

  /**
   * Extract inventory slice from state.
   */
  private extractInventorySlice(inventory: StateObject): InventorySlice {
    const slice: InventorySlice = {
      items: this.extractInventoryItems(inventory['items']),
    };

    const capacity = safeNumberOptional(inventory['capacity']);
    if (capacity !== undefined) {
      slice.capacity = capacity;
    }

    return slice;
  }

  /**
   * Extract inventory items from state.
   */
  private extractInventoryItems(items: unknown): InventoryItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const result: InventoryItem[] = [];

    for (const item of items) {
      if (!isStateObject(item)) {
        continue;
      }

      const inventoryItem: InventoryItem = {
        id: safeString(item['id'], 'unknown'),
        name: safeString(item['name'], 'Unknown Item'),
      };

      const description = safeStringOptional(item['description']);
      if (description !== undefined) {
        inventoryItem.description = description;
      }

      const usable = safeBooleanOptional(item['usable']);
      if (usable !== undefined) {
        inventoryItem.usable = usable;
      }

      result.push(inventoryItem);
    }

    return result;
  }

  /**
   * Extract exits from location.
   */
  private extractExits(exits: unknown): LocationExit[] {
    if (!Array.isArray(exits)) {
      return [];
    }

    const result: LocationExit[] = [];

    for (const exit of exits) {
      if (!isStateObject(exit)) {
        continue;
      }

      const locationExit: LocationExit = {
        direction: safeString(exit['direction'], 'unknown'),
        targetId: safeString(exit['targetId'], 'unknown'),
      };

      const description = safeStringOptional(exit['description']);
      if (description !== undefined) {
        locationExit.description = description;
      }

      const accessible = safeBooleanOptional(exit['accessible']);
      if (accessible !== undefined) {
        locationExit.accessible = accessible;
      }

      result.push(locationExit);
    }

    return result;
  }

  /**
   * Retrieve relevant knowledge nodes.
   */
  private async retrieveKnowledge(
    sessionId: string,
    playerInput: string,
    state: TurnStateContext,
    history?: ConversationTurn[]
  ): Promise<KnowledgeContextItem[]> {
    if (!this.retrievalService) {
      return [];
    }

    // Build query text
    let queryText = playerInput;
    if (this.includeHistoryInQuery && history && history.length > 0) {
      const recentMessages = history.slice(-3).map((t) => t.content);
      queryText = [...recentMessages, playerInput].join(' ');
    }

    // Build retrieval query
    const query: RetrievalQuery = {
      sessionId,
      queryText,
      maxNodes: this.maxKnowledgeNodes,
      minScore: this.minKnowledgeScore,
    };

    // Add character/setting filters if available
    if (state.character) {
      const characterInstanceId = safeStringOptional(state.character['instanceId']);
      if (characterInstanceId !== undefined) {
        query.characterInstanceId = characterInstanceId;
      }
    }
    if (state.setting) {
      const settingInstanceId = safeStringOptional(state.setting['instanceId']);
      if (settingInstanceId !== undefined) {
        query.settingInstanceId = settingInstanceId;
      }
    }

    try {
      const result = await this.retrievalService.retrieve(query);
      return this.scoredNodesToContextItems(result.nodes);
    } catch {
      // Log error but don't fail - return empty context
      console.warn('[ContextBuilder] Knowledge retrieval failed, continuing without context');
      return [];
    }
  }

  /**
   * Convert scored nodes to knowledge context items.
   */
  private scoredNodesToContextItems(
    nodes: GovernorRetrievalResult['nodes']
  ): KnowledgeContextItem[] {
    return nodes.map((scoredNode) => {
      const item: KnowledgeContextItem = {
        path: scoredNode.node.path,
        content: scoredNode.node.content,
        score: scoredNode.score,
      };

      if (scoredNode.node.characterInstanceId) {
        item.source = 'character';
      } else if (scoredNode.node.settingInstanceId) {
        item.source = 'setting';
      }

      return item;
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a default context builder.
 */
export function createContextBuilder(config: ContextBuilderConfig): DefaultContextBuilder {
  return new DefaultContextBuilder(config);
}
