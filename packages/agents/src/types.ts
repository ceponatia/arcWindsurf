import { type Operation } from 'fast-json-patch';

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
  | 'custom'; // Free-form or unclassified intent

/**
 * Parameters associated with an intent.
 */
export interface IntentParams {
  /** Target entity (NPC name, item, location) */
  target?: string | undefined;

  /** Direction for movement */
  direction?: string | undefined;

  /** Item being used/given/taken */
  item?: string | undefined;

  /** Action for custom intents */
  action?: string | undefined;

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

  /** Current setting profile (effective state) */
  setting?: SettingSlice;

  /** Current location data */
  location?: LocationSlice;

  /** Inventory/items data */
  inventory?: InventorySlice;

  /** Recent conversation history (deprecated, use AgentInput.conversationHistory) */
  recentHistory?: unknown[];
}

/**
 * Minimal character slice for agent consumption.
 * Agents should not need full profiles—retrieval provides salient details.
 */
export interface CharacterSlice {
  /** Character instance ID */
  instanceId: string;

  /** Character name */
  name: string;

  /** Short summary */
  summary: string;

  /** Current goals (for narrative consistency) */
  goals?: string[];

  /** Personality traits (for dialogue style) */
  personalityTraits?: string[];
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
export type AgentType = 'map' | 'npc' | 'rules' | 'parser' | 'custom';

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
