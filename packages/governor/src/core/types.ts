import {
  type CharacterProfile,
  type SettingProfile,
  type PersonaProfile,
  type SessionTagInstance,
  type ParsedAction,
  type ActionSequenceResult,
} from '@minimal-rpg/schemas';
import {
  type DetectedIntent,
  type IntentDetectionDebug,
  type IntentDetector,
} from '../intents/types.js';
import { type StateManager, type DeepPartial } from '@minimal-rpg/state-manager';
import { type RetrievalService, type RetrievalResult } from '@minimal-rpg/retrieval';
import {
  type AgentRegistry,
  type AgentOutput,
  type AgentType,
  type AgentExecutionResult,
  type AgentStateSlices,
  type KnowledgeContextItem as AgentKnowledgeContextItem,
  type ConversationTurn as AgentConversationTurn,
} from '@minimal-rpg/agents';
import { type Operation } from 'fast-json-patch';
import { type ActionSequencer } from './action-sequencer.js';

// ============================================================================
// Core Types
// ============================================================================

export interface GovernorConfig {
  stateManager: StateManager;
  retrievalService?: RetrievalService;
  agentRegistry?: AgentRegistry;
  intentDetector?: IntentDetector;
  npcTranscriptLoader?: NpcTranscriptLoader;
  actionSequencer?: ActionSequencer;
  /** Tool-based turn handler for LLM tool calling mode */
  toolTurnHandler?: ToolTurnHandler;
  logging?: {
    logTurns?: boolean;
    logIntentDetection?: boolean;
    logRetrieval?: boolean;
    logStateChanges?: boolean;
    logAgents?: boolean;
    logActionSequence?: boolean;
  };
  responseComposer?: ResponseComposer;
  options?: GovernorOptions;
}

/**
 * Interface for tool-based turn handlers.
 * Allows injection of different tool-calling implementations.
 */
export interface ToolTurnHandler {
  handleTurn(input: TurnInput): Promise<TurnResult>;
}

export interface GovernorOptions {
  maxAgentsPerTurn?: number;
  continueOnAgentError?: boolean;
  applyPatchesOnPartialFailure?: boolean;
  intentConfidenceThreshold?: number;
  devMode?: boolean;
  agentTimeoutMs?: number;
  /** Number of turns without NPC dialogue before auto-interjection. Set to 0 to disable. Default: 3 */
  npcInterjectionThreshold?: number;
  /** Enable action sequencing for multi-action turns. Default: false */
  useActionSequencer?: boolean;
  /**
   * Turn handler mode:
   * - 'classic': Rule-based intent detection + agent routing (default)
   * - 'tool-calling': LLM decides when to call tools based on context
   * - 'hybrid': Use tool-calling for complex inputs, classic for simple ones
   */
  turnHandler?: 'classic' | 'tool-calling' | 'hybrid';
}

export const DEFAULT_GOVERNOR_OPTIONS: Required<GovernorOptions> = {
  maxAgentsPerTurn: 5,
  continueOnAgentError: true,
  applyPatchesOnPartialFailure: true,
  intentConfidenceThreshold: 0.4,
  devMode: false,
  agentTimeoutMs: 30000,
  npcInterjectionThreshold: 3,
  useActionSequencer: false,
  turnHandler: 'classic',
};

export interface TurnInput {
  sessionId: string;
  playerInput: string;
  turnNumber?: number;
  baseline?: TurnStateContext;
  overrides?: DeepPartial<TurnStateContext>;
  conversationHistory?: ConversationTurn[];
  sessionTags?: SessionTagInstance[];
  /** Player character persona (when attached to session) */
  persona?: PersonaProfile;
  /** Parsed actions from pre-parser (optional, for multi-action sequencing) */
  parsedActions?: ParsedAction[];
}

/**
 * Instance metadata added to character/setting/npc profiles when loaded into state.
 * These fields augment the base profile with session-specific identity.
 */
export interface InstanceMetadata {
  instanceId?: string;
  templateId?: string;
  role?: string;
  label?: string;
}

/**
 * Character or NPC with instance metadata and index signature for compatibility.
 * Used in TurnStateContext to provide strongly-typed access to instanceId.
 */
export type CharacterWithInstance = Partial<CharacterProfile> &
  InstanceMetadata &
  Record<string, unknown>;

/**
 * Setting with instance metadata and index signature for compatibility.
 */
export type SettingWithInstance = Partial<SettingProfile> &
  Pick<InstanceMetadata, 'instanceId' | 'templateId'> &
  Record<string, unknown>;

export interface TurnStateContext {
  character: CharacterWithInstance;
  setting: SettingWithInstance;
  location: Record<string, unknown>;
  inventory: Record<string, unknown>;
  time: Record<string, unknown>;
  npc?: CharacterWithInstance;
  [key: string]: unknown;
}

export interface TurnResult {
  message: string;
  events: TurnEvent[];
  stateChanges?: TurnStateChanges;
  metadata?: TurnMetadata;
  success: boolean;
  error?: TurnError;
}

export interface TurnEvent {
  type: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  source?: string;
}

export interface TurnMetadata {
  processingTimeMs: number;
  agentsInvoked: string[];
  nodesRetrieved: number;
  phaseTiming: PhaseTiming;
  intent?: DetectedIntent;
  intentDebug?: IntentDetectionDebug;
  agentOutputs?: { agentType: string; output: AgentOutput }[];
  actionSequenceResult?: ActionSequenceResult;
}

export interface TurnStateChanges {
  patchCount: number;
  modifiedPaths: string[];
  patches?: Operation[];
  newEffectiveState?: TurnStateContext;
  newOverrides?: DeepPartial<TurnStateContext>;
}

export interface PhaseTiming {
  intentDetectionMs?: number;
  stateRecallMs?: number;
  contextRetrievalMs?: number;
  agentRoutingMs?: number;
  agentExecutionMs?: number;
  stateUpdateMs?: number;
  responseAggregationMs?: number;
  actionSequencingMs?: number;
}

export interface TurnExecutionResult {
  agentResults: AgentExecutionResult[];
  combinedNarrative: string;
  combinedPatches: Operation[];
  combinedEvents: TurnEvent[];
  successfulAgents: AgentType[];
  failedAgents: AgentType[];
}

export interface TurnContext {
  sessionId: string;
  playerInput: string;
  intent: DetectedIntent;
  effectiveState: TurnStateContext;
  stateSlices: AgentStateSlices;
  knowledgeContext: KnowledgeContextItem[];
  conversationHistory: ConversationTurn[];
  npcConversationHistory?: ConversationTurn[];
  turnNumber: number;
}

export type ResponseComposer = (params: {
  turnInput: TurnInput;
  intent: DetectedIntent;
  executionResult: TurnExecutionResult;
  stateChanges: TurnStateChanges;
  nodesRetrieved: number;
  events: TurnEvent[];
  sessionTags?: SessionTagInstance[];
}) => Promise<string | undefined>;

export interface TurnError {
  code: string;
  message: string;
  phase: string;
  cause?: unknown;
}

export class TurnProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'TurnProcessingError';
  }

  toTurnError(): TurnError {
    return {
      code: this.code,
      message: this.message,
      phase: this.phase,
      cause: this.cause,
    };
  }
}

// Re-export AgentExecutionResult for convenience
export type { AgentExecutionResult };

// ============================================================================
// Context Building & Retrieval Types
// ============================================================================

export type StateObject = Record<string, unknown>;

export type ConversationTurn = AgentConversationTurn;

export type KnowledgeContextItem = AgentKnowledgeContextItem;

export type GovernorRetrievalResult = RetrievalResult;

export interface ContextBuildInput {
  sessionId: string;
  playerInput: string;
  intent: DetectedIntent;
  baseline: TurnStateContext;
  overrides: DeepPartial<TurnStateContext>;
  conversationHistory: ConversationTurn[];
  turnNumber: number;
}

export interface ContextBuilder {
  build(input: ContextBuildInput): Promise<TurnContext>;
}

export interface NpcTranscriptRequest {
  sessionId: string;
  npcId: string;
  limit?: number;
}

export type NpcTranscriptLoader = (params: NpcTranscriptRequest) => Promise<ConversationTurn[]>;

// Session tags (DTO used by API when constructing TurnInput)
export type SessionTag = SessionTagInstance;

// ============================================================================
// NPC Evaluation Types (Phase 5: Governor Simplification)
// ============================================================================

/**
 * Result of evaluating whether an NPC would respond to player input.
 */
export interface NpcEvaluation {
  /** NPC instance ID */
  npcId: string;

  /** Whether this NPC would respond to the current input */
  wouldRespond: boolean;

  /** Priority score (0-1) - higher means more urgent/important to respond */
  priority: number;

  /** Type of response this NPC would give */
  responseType: 'speech' | 'action' | 'observation' | 'silent';

  /** Explanation of why the NPC would/wouldn't respond */
  reason: string;
}

/**
 * Result of governor's NPC selection phase.
 */
export interface GovernorSelection {
  /** NPCs selected to respond this turn (0-2 typically) */
  selectedNpcs: string[];

  /** All NPC evaluations performed */
  evaluations: NpcEvaluation[];

  /** Whether selection was automatic (heuristic) or LLM-based */
  selectionMethod: 'heuristic' | 'llm';
}

/**
 * Context for scene actions (for multi-NPC coordination).
 */
export interface SceneAction {
  /** Actor entity ID (player or NPC) */
  actor: string;

  /** Action type */
  type: 'speech' | 'action' | 'thought' | 'observation';

  /** Action content/description */
  content: string;

  /** Timestamp */
  timestamp: Date;

  /** Entity IDs who can observe this action */
  observableBy: string[];
}
