import { type Operation } from 'fast-json-patch';
import {
  type Agent,
  type AgentInput,
  type AgentOutput,
  type AgentRegistry,
  type AgentType,
  type AgentStateSlices,
  type KnowledgeContextItem,
  type ConversationTurn,
  type AgentIntent,
} from '@minimal-rpg/agents';
import { type RetrievalService, type ScoredNode } from '@minimal-rpg/retrieval';
import { type StateManager, type DeepPartial } from '@minimal-rpg/state-manager';
import { type IntentType } from './intents.js';

// Re-export IntentType for consumers
export type { IntentType } from './intents.js';

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type {
  Agent,
  AgentInput,
  AgentOutput,
  AgentRegistry,
  AgentType,
  AgentStateSlices,
  KnowledgeContextItem,
  ConversationTurn,
  AgentIntent,
  Operation,
};

// ============================================================================
// Base Types
// ============================================================================

/**
 * A JSON-serializable value for state objects.
 */
export type StateValue =
  | string
  | number
  | boolean
  | null
  | StateValue[]
  | { [key: string]: StateValue };

/**
 * A JSON-serializable object for state.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/consistent-indexed-object-style
export type StateObject = { [key: string]: StateValue };

// ============================================================================
// Governor Configuration
// ============================================================================

/**
 * Configuration for the Governor.
 */
export interface GovernorConfig {
  /** State manager for effective state computation and patch application */
  stateManager: StateManager;

  /** Optional NPC transcript loader for per-npc context */
  npcTranscriptLoader?: NpcTranscriptLoader | undefined;

  /** Retrieval service for knowledge context (optional until implemented) */
  retrievalService?: RetrievalService | undefined;

  /** Agent registry for routing intents to agents */
  agentRegistry?: AgentRegistry | undefined;

  /** Intent detector for parsing player input */
  intentDetector?: IntentDetector | undefined;

  /** Optional response composer to synthesize the final player-facing reply */
  responseComposer?: ResponseComposer | undefined;

  /** Logging configuration */
  logging?: GovernorLoggingConfig | undefined;

  /** Turn processing options */
  options?: GovernorOptions | undefined;
}

/**
 * Governor processing options.
 */
export interface GovernorOptions {
  /** Maximum agents to execute per turn (safety limit) */
  maxAgentsPerTurn?: number;

  /** Whether to continue executing agents if one fails */
  continueOnAgentError?: boolean;

  /** Whether to apply state patches even if some agents fail */
  applyPatchesOnPartialFailure?: boolean;

  /** Default confidence threshold for intent detection */
  intentConfidenceThreshold?: number;

  /** Whether to expose additional debug metadata */
  devMode?: boolean;

  /** Timeout for individual agent execution in milliseconds (default: 30000) */
  agentTimeoutMs?: number;
}

/**
 * Default governor options.
 */
export const DEFAULT_GOVERNOR_OPTIONS: Required<GovernorOptions> = {
  maxAgentsPerTurn: 5,
  continueOnAgentError: true,
  applyPatchesOnPartialFailure: false,
  intentConfidenceThreshold: 0.3,
  devMode: false,
  agentTimeoutMs: 30000,
};

// ============================================================================
// Response Composition
// ============================================================================

/**
 * Input provided to an optional response composer.
 * Allows callers to synthesize a final reply from agent outputs and context.
 */
export interface ResponseComposeInput {
  /** Raw turn input as seen by the Governor */
  turnInput: TurnInput;

  /** Detected intent for the turn */
  intent: DetectedIntent;

  /** Results from executing all agents */
  executionResult: TurnExecutionResult;

  /** Applied state changes */
  stateChanges: TurnStateChanges;

  /** Number of knowledge nodes retrieved */
  nodesRetrieved: number;

  /** All events accumulated during the turn */
  events: TurnEvent[];

  /** Active session tags for prompt injection */
  sessionTags?: SessionTag[] | undefined;
}

/**
 * Optional hook for composing the final player-facing message.
 * If provided, the Governor will call this and use its return value
 * (when non-empty) as the TurnResult.message.
 */
export type ResponseComposer = (input: ResponseComposeInput) => Promise<string> | string;

/**
 * Logging configuration for the Governor.
 */
export interface GovernorLoggingConfig {
  /** Whether to log turn summaries */
  logTurns?: boolean | undefined;

  /** Whether to log agent invocations */
  logAgents?: boolean | undefined;

  /** Whether to log state changes */
  logStateChanges?: boolean | undefined;

  /** Whether to log intent detection */
  logIntentDetection?: boolean | undefined;

  /** Whether to log retrieval results */
  logRetrieval?: boolean | undefined;
}

// ============================================================================
// Session Tags
// ============================================================================

/**
 * A session tag for prompt injection.
 * Minimal representation for governor - full type lives in @minimal-rpg/schemas.
 */
export interface SessionTag {
  /** Tag identifier */
  id: string;

  /** Display name */
  name: string;

  /** Prompt text to inject into system prompt */
  promptText: string;

  /** Optional short description for logging */
  shortDescription?: string | undefined;
}

// ============================================================================
// Turn Input/Output Types
// ============================================================================

/**
 * Input to a Governor turn.
 */
export interface TurnInput {
  /** Session identifier */
  sessionId: string;

  /** Raw player input text */
  playerInput: string;

  /** Pre-loaded baseline state (optional - Governor can load if not provided) */
  baseline?: TurnStateContext | undefined;

  /** Pre-loaded overrides (optional - Governor can load if not provided) */
  overrides?: DeepPartial<TurnStateContext> | undefined;

  /** Recent conversation history for context */
  conversationHistory?: ConversationTurn[] | undefined;

  /** Turn number in the session (for logging/debugging) */
  turnNumber?: number | undefined;

  /** Active session tags to inject into prompts */
  sessionTags?: SessionTag[] | undefined;
}

/**
 * State context for a turn.
 * Represents the game state domains that can be loaded/modified.
 */
export interface TurnStateContext {
  /** Character profile data */
  character?: StateObject | undefined;

  /** Setting profile data */
  setting?: StateObject | undefined;

  /** Location data */
  location?: StateObject | undefined;

  /** Inventory data */
  inventory?: StateObject | undefined;

  /** Time data */
  time?: StateObject | undefined;

  /** Active NPC state for this turn */
  npc?: StateObject | undefined;

  /** Player-specific state */
  player?: StateObject | undefined;

  /** Session-specific state */
  session?: StateObject | undefined;

  /** Index signature for additional state domains */
  [key: string]: StateValue | undefined;
}

/**
 * Result of a Governor turn.
 */
export interface TurnResult {
  /** Player-facing narrative message */
  message: string;

  /** Events emitted during the turn (for UI updates, etc.) */
  events?: TurnEvent[] | undefined;

  /** State changes applied during the turn */
  stateChanges?: TurnStateChanges | undefined;

  /** Metadata about the turn for observability */
  metadata?: TurnMetadata | undefined;

  /** Whether the turn completed successfully */
  success: boolean;

  /** Error details if the turn failed */
  error?: TurnError | undefined;
}

/**
 * An error that occurred during turn processing.
 */
export interface TurnError {
  /** Error code for programmatic handling */
  code: TurnErrorCode;

  /** Human-readable error message */
  message: string;

  /** The phase where the error occurred */
  phase: TurnPhase;

  /** Agent type if the error occurred during agent execution */
  agentType?: AgentType | undefined;

  /** Underlying error (for logging) */
  cause?: Error | undefined;
}

/**
 * Error codes for turn processing failures.
 */
export type TurnErrorCode =
  | 'INTENT_DETECTION_FAILED'
  | 'STATE_LOAD_FAILED'
  | 'RETRIEVAL_FAILED'
  | 'NO_AGENT_FOUND'
  | 'AGENT_EXECUTION_FAILED'
  | 'STATE_UPDATE_FAILED'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Phases of turn processing.
 */
export type TurnPhase =
  | 'intent-detection'
  | 'state-recall'
  | 'context-retrieval'
  | 'agent-routing'
  | 'agent-execution'
  | 'state-update'
  | 'response-aggregation';

/**
 * An event emitted during a turn.
 */
export interface TurnEvent {
  /** Event type identifier */
  type: TurnEventType;

  /** Event payload */
  payload?: Record<string, unknown> | undefined;

  /** Timestamp */
  timestamp: Date;

  /** Source of the event */
  source?: string | undefined;
}

/**
 * Known turn event types.
 */
export type TurnEventType =
  | 'turn-started'
  | 'turn-completed'
  | 'intent-detected'
  | 'agent-started'
  | 'agent-completed'
  | 'state-updated'
  | 'error'
  | 'custom';

/**
 * Summary of state changes applied during a turn.
 */
export interface TurnStateChanges {
  /** Number of patches applied */
  patchCount: number;

  /** Paths that were modified */
  modifiedPaths: string[];

  /** The patches that were applied */
  patches?: Operation[] | undefined;

  /** The new effective state after applying patches (baseline + overrides + patches) */
  newEffectiveState?: TurnStateContext | undefined;

  /** The new overrides computed after applying patches */
  newOverrides?: DeepPartial<TurnStateContext> | undefined;
}

/**
 * Metadata about a turn for observability.
 */
export interface TurnMetadata {
  /** Turn processing time (ms) */
  processingTimeMs: number;

  /** Detected intent */
  intent?: DetectedIntent | undefined;

  /** Additional debugging artefacts for intent detection */
  intentDebug?: IntentDetectionDebug | undefined;

  /** Agents that were invoked */
  agentsInvoked: AgentType[];

  /** Agent outputs paired with agent type */
  agentOutputs?: { agentType: AgentType; output: AgentOutput }[] | undefined;

  /** Number of knowledge nodes retrieved */
  nodesRetrieved?: number | undefined;

  /** Turn phase timings for performance analysis */
  phaseTiming?: PhaseTiming | undefined;
}

/**
 * Timing information for each phase of turn processing.
 */
export interface PhaseTiming {
  intentDetectionMs?: number | undefined;
  stateRecallMs?: number | undefined;
  contextRetrievalMs?: number | undefined;
  agentRoutingMs?: number | undefined;
  agentExecutionMs?: number | undefined;
  stateUpdateMs?: number | undefined;
  responseAggregationMs?: number | undefined;
}

// ============================================================================
// Intent Detection Types
// ============================================================================

/**
 * A segment of a compound intent.
 * When player input contains multiple actions/thoughts/speech/sensory, each is a segment.
 *
 * Example: "If I must *he jokes. He notices the smell of her perfume*"
 * Would produce 2 segments:
 * 1. { type: 'talk', content: 'If I must' }
 * 2. { type: 'sensory', content: 'He notices the smell of her perfume', sensoryType: 'smell' }
 *
 * Note: Text inside *asterisks* is NEVER talk - it's always action/thought/emote/sensory.
 * Text outside asterisks (or in "quotes") is talk.
 */
export interface IntentSegment {
  /**
   * The type of this segment:
   * - 'talk': Direct speech (text NOT in asterisks)
   * - 'action': Physical actions (*sits down*, *walks over*)
   * - 'thought': Internal thoughts (*wonders if...*, *hopes that...*)
   * - 'emote': Emotional reactions (*blushes*, *feels nervous*)
   * - 'sensory': Sensory awareness (*smells her perfume*, *feels the warmth*)
   */
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';

  /** The extracted content for this segment */
  content: string;

  /**
   * For sensory segments, which sense is being engaged:
   * - 'smell': Olfactory awareness (scent, odor, fragrance)
   * - 'touch': Tactile awareness (texture, temperature, pressure)
   * - 'look': Visual focus on specific detail
   * - 'taste': Gustatory awareness
   * - 'listen': Auditory focus
   */
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen' | undefined;

  /**
   * For sensory segments, raw body part reference from player input.
   * Examples: "feet", "hair", "hands". Resolved to canonical region by SensoryAgent.
   */
  bodyPart?: string | undefined;
}

/**
 * A detected intent from player input.
 */
export interface DetectedIntent {
  /** Primary intent type */
  type: IntentType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Intent-specific parameters */
  params?: IntentParams | undefined;

  /** Raw signals that contributed to this detection */
  signals?: string[] | undefined;

  /**
   * When type is 'unknown', the LLM's best guess at what the intent might be.
   * Useful for identifying new intent types to add during development.
   */
  suggestedType?: string | undefined;

  /**
   * For compound inputs containing multiple actions/thoughts/speech.
   * When present, the NPC agent should process all segments in order.
   * The primary `type` reflects the dominant intent for routing purposes.
   */
  segments?: IntentSegment[] | undefined;
}

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
   * Raw player input - should be resolved to canonical BodyRegion by agents.
   * Example: "hair", "feet", "hands", or undefined for general/unspecified.
   */
  bodyPart?: string | undefined;

  /** Action for custom intents */
  action?: string | undefined;

  /**
   * For 'narrate' intents, specifies the type of narrative input:
   * - 'action': Physical action (*sits down*, *walks over*)
   * - 'thought': Internal thought (*wonders if she noticed*)
   * - 'emote': Emotional state/reaction (*blushes*, *feels nervous*)
   * - 'narrative': Third-person storytelling ("The two spend time together")
   *
   * When narrateType is 'thought', the NPC can be narratively aware but
   * the character should not explicitly react to or mention the thought.
   */
  narrateType?: 'action' | 'thought' | 'emote' | 'narrative' | undefined;

  /** Additional free-form parameters */
  extra?: Record<string, unknown> | undefined;
}

/**
 * Interface for intent detection.
 */
export interface IntentDetector {
  /**
   * Detect intent from player input and context.
   */
  detect(input: string, context?: IntentDetectionContext): Promise<IntentDetectionResult>;
}

/**
 * Context for intent detection.
 */
export interface IntentDetectionContext {
  /** Recent message history */
  recentHistory?: string[] | undefined;

  /** Current location name */
  currentLocation?: string | undefined;

  /** Available actions in current context */
  availableActions?: string[] | undefined;

  /** NPCs present in current location */
  presentNpcs?: string[] | undefined;

  /** Items in inventory */
  inventoryItems?: string[] | undefined;
}

/**
 * Debug metadata produced during intent detection.
 */
export interface IntentDetectionDebug {
  /** Identifier for the detector implementation */
  detector: string;

  /** Optional model or strategy used */
  model?: string | undefined;

  /** Prompt snapshot that was sent to the detector */
  prompt?:
    | {
        system: string;
        user: string;
      }
    | undefined;

  /** Recent history lines that were provided */
  historyPreview?: string[] | undefined;

  /** Context bullet points that were included */
  contextSummary?: string[] | undefined;

  /** Raw text response from the detector */
  rawResponse?: string | undefined;

  /** Parsed JSON payload before normalization */
  parsed?: unknown;

  /** Any warnings emitted while parsing */
  warnings?: string[] | undefined;
}

/**
 * Full intent detection result that includes debug artefacts.
 */
export interface IntentDetectionResult {
  /** Normalized intent produced by the detector */
  intent: DetectedIntent;

  /** Optional debug metadata */
  debug?: IntentDetectionDebug | undefined;
}

// ============================================================================
// Context Building Types
// ============================================================================

/**
 * Context assembled for agent execution.
 */
export interface TurnContext {
  /** Session identifier */
  sessionId: string;

  /** The detected intent */
  intent: DetectedIntent;

  /** Effective state after merging baseline and overrides */
  effectiveState: TurnStateContext;

  /** State slices formatted for agents */
  stateSlices: AgentStateSlices;

  /** Retrieved knowledge context */
  knowledgeContext: KnowledgeContextItem[];

  /** Conversation history */
  conversationHistory: ConversationTurn[];

  /** NPC-specific transcript history for targeted NPCs */
  npcConversationHistory?: ConversationTurn[] | undefined;

  /** Raw player input */
  playerInput: string;

  /** Turn number */
  turnNumber: number;
}

/**
 * Input for context building.
 */
export interface ContextBuildInput {
  /** Session identifier */
  sessionId: string;

  /** Player input */
  playerInput: string;

  /** Detected intent */
  intent: DetectedIntent;

  /** Baseline state */
  baseline: TurnStateContext;

  /** Overrides */
  overrides: DeepPartial<TurnStateContext>;

  /** Conversation history */
  conversationHistory?: ConversationTurn[] | undefined;

  /** Optional NPC transcript history to seed context builder */
  npcConversationHistory?: ConversationTurn[] | undefined;

  /** Turn number */
  turnNumber?: number | undefined;
}

/**
 * Interface for context building.
 */
export interface ContextBuilder {
  /**
   * Build the turn context from input and state.
   */
  build(input: ContextBuildInput): Promise<TurnContext>;
}

/**
 * Adapter for loading per-NPC transcript history.
 */
export type NpcTranscriptLoader = (params: {
  sessionId: string;
  npcId: string;
  limit?: number;
}) => Promise<ConversationTurn[]>;

// ============================================================================
// Agent Routing Types
// ============================================================================

/**
 * Result of agent routing.
 */
export interface AgentRoutingResult {
  /** Agents to execute, in order */
  agents: Agent[];

  /** Why these agents were selected */
  reason: string;

  /** Whether a fallback agent was used */
  usedFallback: boolean;
}

/**
 * Interface for agent routing.
 */
export interface AgentRouter {
  /**
   * Route an intent to the appropriate agents.
   */
  route(intent: DetectedIntent, registry: AgentRegistry): AgentRoutingResult;
}

// ============================================================================
// Agent Execution Types
// ============================================================================

/**
 * Result of executing a single agent.
 */
export interface AgentExecutionResult {
  /** The agent type that was executed */
  agentType: AgentType;

  /** The agent output */
  output: AgentOutput;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Whether execution succeeded */
  success: boolean;

  /** Error if execution failed */
  error?: Error | undefined;
}

/**
 * Result of executing all agents for a turn.
 */
export interface TurnExecutionResult {
  /** Results from each agent */
  agentResults: AgentExecutionResult[];

  /** Combined narrative from all agents */
  combinedNarrative: string;

  /** Combined patches from all agents */
  combinedPatches: Operation[];

  /** Combined events from all agents */
  combinedEvents: TurnEvent[];

  /** Agents that succeeded */
  successfulAgents: AgentType[];

  /** Agents that failed */
  failedAgents: AgentType[];
}

// ============================================================================
// Retrieval Types (re-exported with extensions)
// ============================================================================

/**
 * Extended retrieval result with governor-specific metadata.
 */
export interface GovernorRetrievalResult {
  /** Scored nodes from retrieval */
  nodes: ScoredNode[];

  /** Knowledge context items formatted for agents */
  contextItems: KnowledgeContextItem[];

  /** Retrieval time in milliseconds */
  retrievalTimeMs: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when turn processing fails.
 */
export class TurnProcessingError extends Error {
  public readonly code: TurnErrorCode;
  public readonly phase: TurnPhase;
  public readonly agentType: AgentType | undefined;
  public override readonly cause: Error | undefined;

  constructor(
    message: string,
    code: TurnErrorCode,
    phase: TurnPhase,
    options?: { agentType?: AgentType; cause?: Error }
  ) {
    super(message);
    this.name = 'TurnProcessingError';
    this.code = code;
    this.phase = phase;
    this.agentType = options?.agentType;
    this.cause = options?.cause;
  }

  /**
   * Convert to a TurnError for the result.
   */
  toTurnError(): TurnError {
    return {
      code: this.code,
      message: this.message,
      phase: this.phase,
      agentType: this.agentType,
      cause: this.cause,
    };
  }
}
