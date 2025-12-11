import { type Operation } from 'fast-json-patch';
import type {
  BodyMap,
  Physique,
  PersonalityMap,
  CharacterDetail,
  PersonaProfile,
  SensoryContextForNpc,
  ParsedAction,
  ActionInterrupt,
  AccumulatedSensoryContext,
} from '@minimal-rpg/schemas';

// ============================================================================
// Agent Input/Output Types
// ============================================================================

/**
 * Common input provided to all agents on each turn.
 * The Governor assembles this from session context and effective state.
 */
export interface AgentInput {
  /** Stable session identifier */
  sessionId: string;

  /** Canonical NPC identifier for this turn, if applicable */
  npcId?: string;

  /** Raw player text from the client */
  playerInput: string;

  /** Normalized intent (once intent detection is implemented) */
  intent?: AgentIntent;

  /** Effective state slices relevant to the agent's domain */
  stateSlices: AgentStateSlices;

  /** Retrieved knowledge nodes (from retrieval layer) */
  knowledgeContext?: KnowledgeContextItem[];

  /** Recent conversation history for context */
  conversationHistory?: ConversationTurn[];

  /** NPC-specific transcript history when addressing a specific NPC */
  npcConversationHistory?: ConversationTurn[];

  /** Player character persona (when attached to session) - NOT passed to intent detector */
  persona?: PersonaProfile;

  /** Structured sensory context for NPC agents to weave into narrative */
  sensoryContext?: SensoryContextForNpc;

  /** Action sequence information for multi-action turns */
  actionSequence?: {
    completedActions: ParsedAction[];
    interruptedAt?: ActionInterrupt;
    pendingActions: ParsedAction[];
  };

  /** Accumulated sensory context across all completed actions */
  accumulatedContext?: AccumulatedSensoryContext;
}

/**
 * A single turn in the conversation history.
 */
export interface ConversationTurn {
  /** The speaker (player or character) */
  speaker: 'player' | 'character' | 'narrator';

  /** The message content */
  content: string;

  /** Timestamp of the turn */
  timestamp: Date;
}

/**
 * Re-export AccumulatedSensoryContext from schemas for convenience
 */
export type { AccumulatedSensoryContext } from '@minimal-rpg/schemas';

/**
 * A segment of a compound intent input.
 * Used when player input mixes speech, actions, thoughts, and sensory awareness.
 *
 * ASTERISK RULE: Text in *asterisks* is NEVER talk.
 * - Text outside asterisks = talk (speech)
 * - Text inside asterisks = action/thought/emote/sensory
 *
 * Example: "If I must *he jokes while noticing the smell of her perfume*"
 */
export interface IntentSegment {
  /**
   * Segment type:
   * - 'talk': Direct speech (NOT in asterisks)
   * - 'action': Physical actions (*sits down*)
   * - 'thought': Internal thoughts (*wonders if...*)
   * - 'emote': Emotional reactions (*blushes*)
   * - 'sensory': Sensory awareness (*smells perfume*)
   */
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';

  /** The extracted text content for this segment */
  content: string;

  /** For sensory segments, which sense: smell, touch, look, taste, or listen */
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen' | undefined;

  /** For sensory segments, raw body part reference (e.g., "feet", "hair") */
  bodyPart?: string | undefined;
}

/**
 * Intent detection output.
 */
export interface AgentIntent {
  /** The detected intent type (e.g., 'move', 'talk', 'inspect', 'use') */
  type: IntentType;

  /** Additional intent parameters extracted from input */
  params: IntentParams;

  /** Confidence score (0-1) */
  confidence: number;

  /** Raw tokens/phrases that contributed to this classification */
  signals?: string[];

  /**
   * For compound inputs, ordered segments of different intent types.
   * Example: action + speech + thought in one player turn.
   * When present, agents should process all segments in order.
   */
  segments?: IntentSegment[] | undefined;
}

/**
 * Known intent types.
 * Extended as new agent behaviors are added.
 */
export type IntentType =
  | 'move' // Player wants to move/travel
  | 'look' // Player wants to observe/inspect
  | 'talk' // Player wants to converse with NPC
  | 'use' // Player wants to use an item
  | 'take' // Player wants to pick up an item
  | 'give' // Player wants to give an item
  | 'attack' // Player wants to engage in combat
  | 'examine' // Player wants to closely examine something
  | 'wait' // Player wants to wait/pass time
  | 'system' // Meta/system commands
  | 'smell' // Player wants to smell/sniff something
  | 'taste' // Player wants to taste something
  | 'touch' // Player wants to touch/feel something
  | 'listen' // Player wants to listen to sounds
  | 'narrate' // Player describes actions/narrative (no dialogue expected)
  | 'custom'; // Free-form or unclassified intent

/**
 * Parameters associated with an intent.
 */
export interface IntentParams {
  /** Target entity (NPC name, item, location) */
  target?: string | undefined;

  /** Canonical NPC identifier when addressing a specific NPC */
  npcId?: string | undefined;

  /** Direction for movement */
  direction?: string | undefined;

  /** Item being used/given/taken */
  item?: string | undefined;

  /**
   * Body part reference for sensory intents (smell, touch, look).
   * Raw player input - resolved to canonical BodyRegion by agents.
   * Example: "hair", "feet", "hands", or undefined for general/unspecified.
   */
  bodyPart?: string | undefined;

  /** Action for custom intents */
  action?: string | undefined;

  /**
   * For 'narrate' intents, specifies the type of narrative input:
   * - 'action': Physical action (*sits down*, *walks over*)
   * - 'thought': Internal thought (*wonders if she noticed*, *thinks about leaving*)
   * - 'emote': Emotional state/reaction (*blushes*, *feels nervous*)
   * - 'narrative': Third-person storytelling ("The two spend time together")
   *
   * When narrateType is 'thought', the NPC can be narratively aware but
   * the character should not explicitly react to or mention the thought.
   */
  narrateType?: 'action' | 'thought' | 'emote' | 'narrative' | undefined;

  /**
   * When true, indicates this is an auto-interjection by the Governor
   * to maintain conversation flow after extended non-dialogue turns.
   * NPC agents should keep responses brief during interjections.
   */
  interject?: boolean | undefined;

  /** Additional free-form parameters */
  extra?: Record<string, unknown>;
}

/**
 * State slices passed to agents.
 * Each agent receives only the slices relevant to its domain.
 */
export interface AgentStateSlices {
  /** Current character profile (effective state) */
  character?: CharacterSlice;

  /** Active NPC profile for this turn (if any) */
  npc?: CharacterSlice;

  /** Current setting profile (effective state) */
  setting?: SettingSlice;

  /** Current location data */
  location?: LocationSlice;

  /** Inventory/items data */
  inventory?: InventorySlice;

  /** Proximity/sensory engagement state (session-only) */
  proximity?: ProximitySlice;

  /** Recent conversation history (deprecated, use AgentInput.conversationHistory) */
  recentHistory?: unknown[];
}

/**
 * Full character data for agent consumption.
 * Contains all CharacterProfile fields for agents to use as needed.
 */
export interface CharacterSlice {
  /** Character instance ID */
  instanceId: string;

  /** Character name */
  name: string;

  /** Character age */
  age?: number | undefined;

  /** Full backstory for NPC dialogue generation */
  backstory?: string | undefined;

  /** Current goals (runtime state, not in profile) */
  goals?: string[] | undefined;

  /** Personality - simple string or array of traits */
  personality?: string | string[] | undefined;

  /** Physique - appearance description or structured object */
  physique?: string | Physique | undefined;

  /** Body map with per-region sensory data (scent, texture, visual, flavor) */
  body?: BodyMap | undefined;

  /** Structured personality map for detailed NPC behavior */
  personalityMap?: PersonalityMap | undefined;

  /** Additional character details/facts */
  details?: CharacterDetail[] | undefined;
}

/**
 * Minimal setting slice for agent consumption.
 */
export interface SettingSlice {
  /** Setting instance ID */
  instanceId: string;

  /** Setting name */
  name: string;

  /** Short summary/lore */
  summary: string;

  /** Active themes */
  themes?: string[];
}

/**
 * Location slice for navigation agents.
 */
export interface LocationSlice {
  /** Current location ID */
  id: string;

  /** Location name */
  name: string;

  /** Description of the location */
  description: string;

  /** Connected locations (exits) */
  exits?: LocationExit[];
}

/**
 * An exit from a location.
 */
export interface LocationExit {
  /** Direction (e.g., 'north', 'up', 'through the door') */
  direction: string;

  /** Target location ID */
  targetId: string;

  /** Description of the exit */
  description?: string;

  /** Whether the exit is currently accessible */
  accessible?: boolean;
}

/**
 * Inventory slice for item-related agents.
 */
export interface InventorySlice {
  /** Items currently held */
  items: InventoryItem[];

  /** Maximum capacity (optional) */
  capacity?: number;
}

/**
 * An item in inventory.
 */
export interface InventoryItem {
  /** Item ID */
  id: string;

  /** Item name */
  name: string;

  /** Item description */
  description?: string;

  /** Whether the item is usable */
  usable?: boolean;
}

/**
 * Proximity slice for sensory engagement tracking.
 * Tracks active sensory engagements between player and NPCs.
 */
export interface ProximitySlice {
  /** Active sensory engagements keyed by `${npcId}:${bodyPart}:${senseType}` */
  engagements: Record<string, SensoryEngagementData>;

  /** General proximity level to each NPC, keyed by npcId */
  npcProximity: Record<string, ProximityLevel>;
}

/**
 * A single sensory engagement between player and an NPC body part.
 */
export interface SensoryEngagementData {
  /** NPC identifier */
  npcId: string;

  /** Body part being engaged (e.g., 'hair', 'feet', 'hands') */
  bodyPart: string;

  /** Type of sense engaged */
  senseType: SenseType;

  /** Current intensity level */
  intensity: EngagementIntensity;

  /** Turn number or timestamp when engagement started */
  startedAt: number;

  /** Turn number or timestamp of last activity */
  lastActiveAt: number;
}

/**
 * The type of sense being engaged.
 */
export type SenseType = 'look' | 'touch' | 'smell' | 'taste' | 'hear';

/**
 * Intensity level of a sensory engagement.
 */
export type EngagementIntensity = 'casual' | 'focused' | 'intimate';

/**
 * General proximity level to an NPC.
 */
export type ProximityLevel = 'distant' | 'near' | 'close' | 'intimate';

/**
 * A single knowledge context item retrieved for the agent.
 */
export interface KnowledgeContextItem {
  /** The path/key of the knowledge node (e.g., 'appearance.hair') */
  path: string;

  /** Human-readable content */
  content: string;

  /** Combined score from similarity + salience */
  score: number;

  /** Source entity type */
  source?: 'character' | 'setting' | 'location';
}

// ============================================================================
// Agent Output Types
// ============================================================================

/**
 * Output returned by an agent after processing a turn.
 */
export interface AgentOutput {
  /** Player-facing narrative text */
  narrative: string;

  /** Proposed state changes as JSON Patch operations */
  statePatches?: Operation[];

  /** Events emitted by this agent (for cross-agent communication) */
  events?: AgentEvent[];

  /** Optional diagnostic/debug info */
  diagnostics?: AgentDiagnostics;

  /** Whether this agent wants to continue (multi-step) */
  continueProcessing?: boolean;

  /** Structured sensory context (for SensoryAgent output to NpcAgent) */
  sensoryContext?: SensoryContextForNpc;
}

/**
 * An event emitted by an agent.
 * Used for cross-agent communication and state coordination.
 */
export interface AgentEvent {
  /** Event type identifier */
  type: string;

  /** Event payload */
  payload: Record<string, unknown>;

  /** Source agent */
  source: AgentType;
}

/**
 * Diagnostic information from agent execution.
 */
export interface AgentDiagnostics {
  /** Time taken to execute (ms) */
  executionTimeMs?: number;

  /** Token usage if LLM was invoked */
  tokenUsage?: TokenUsage | undefined;

  /** Any warnings or notes */
  warnings?: string[];

  /** Debug information */
  debug?: Record<string, unknown>;
}

/**
 * Token usage from LLM calls.
 */
export interface TokenUsage {
  /** Prompt tokens */
  prompt: number;

  /** Completion tokens */
  completion: number;

  /** Total tokens */
  total: number;
}

/**
 * Result of executing an agent for a single turn.
 */
export interface AgentExecutionResult {
  /** Agent type that was executed */
  agentType: AgentType;

  /** Output produced by the agent (may be fallback on error) */
  output: AgentOutput;

  /** Time taken to execute (ms) */
  executionTimeMs: number;

  /** Whether the agent completed successfully */
  success: boolean;

  /** Optional error when execution failed */
  error?: Error | undefined;
}

// ============================================================================
// Agent Interface
// ============================================================================

/**
 * Base interface that all specialized agents must implement.
 */
export interface Agent {
  /** Unique identifier for this agent type */
  readonly agentType: AgentType;

  /** Human-readable name */
  readonly name: string;

  /** Process a turn and return output */
  execute(input: AgentInput): Promise<AgentOutput>;

  /** Check if this agent can handle the given intent */
  canHandle(intent: AgentIntent): boolean;
}

/**
 * Known agent types in the system.
 */
export type AgentType = 'map' | 'npc' | 'rules' | 'sensory' | 'custom';

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Configuration for creating an agent.
 */
export interface AgentConfig {
  /** LLM provider to use for this agent (if needed) */
  llmProvider?: LlmProvider;

  /** Default temperature for LLM calls */
  temperature?: number;

  /** Maximum tokens for LLM responses */
  maxTokens?: number;

  /** Additional agent-specific configuration */
  options?: Record<string, unknown>;
}

/**
 * Minimal LLM provider interface for agents.
 * The actual implementation lives in @minimal-rpg/api.
 */
export interface LlmProvider {
  /** Generate a response given a prompt */
  generate(prompt: string, options?: LlmGenerateOptions): Promise<LlmResponse>;
}

/**
 * Options for LLM generation.
 */
export interface LlmGenerateOptions {
  /** Temperature (0-1) */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** System prompt */
  systemPrompt?: string;
}

/**
 * Response from LLM generation.
 */
export interface LlmResponse {
  /** Generated text */
  text: string;

  /** Token usage */
  usage?: TokenUsage;

  /** Model used */
  model?: string;
}

// ============================================================================
// Agent Registry Types
// ============================================================================

/**
 * Registry for managing agent instances.
 */
export interface AgentRegistry {
  /** Register an agent */
  register(agent: Agent): void;

  /** Get an agent by type */
  get(type: AgentType): Agent | undefined;

  /** Get all registered agents */
  getAll(): Agent[];

  /** Find agents that can handle an intent */
  findForIntent(intent: AgentIntent): Agent[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when an agent fails to execute.
 */
export class AgentExecutionError extends Error {
  public readonly agentType: AgentType;
  public override readonly cause: Error | undefined;

  constructor(message: string, agentType: AgentType, cause?: Error) {
    super(message);
    this.name = 'AgentExecutionError';
    this.agentType = agentType;
    this.cause = cause;
  }
}

/**
 * Error thrown when no agent can handle an intent.
 */
export class NoAgentFoundError extends Error {
  constructor(public readonly intent: AgentIntent) {
    super(`No agent found to handle intent: ${intent.type}`);
    this.name = 'NoAgentFoundError';
  }
}
