import {
  type CharacterProfile,
  type SettingProfile,
  type PersonaProfile,
  type SessionTagInstance,
  type ParsedAction,
  type ActionSequenceResult,
} from '@minimal-rpg/schemas';
import { type StateManager, type DeepPartial } from '@minimal-rpg/state-manager';
import { type RetrievalResult } from '@minimal-rpg/retrieval';
import {
  type AgentOutput,
  type AgentType,
  type AgentExecutionResult,
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
  npcTranscriptLoader?: NpcTranscriptLoader;
  actionSequencer?: ActionSequencer;
  /** Tool-based turn handler for LLM tool calling mode (required) */
  toolTurnHandler: ToolTurnHandler;
  logging?: {
    logTurns?: boolean;
    logStateChanges?: boolean;
    logActionSequence?: boolean;
  };
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
  devMode?: boolean;
  /** Number of turns without NPC dialogue before auto-interjection. Set to 0 to disable. Default: 3 */
  npcInterjectionThreshold?: number;
  /** Enable action sequencing for multi-action turns. Default: false */
  useActionSequencer?: boolean;
}

export const DEFAULT_GOVERNOR_OPTIONS: Required<GovernorOptions> = {
  devMode: false,
  npcInterjectionThreshold: 3,
  useActionSequencer: false,
};

export interface TurnInput {
  sessionId: string;
  playerInput: string;
  turnNumber?: number;
  baseline?: TurnStateContext;
  overrides?: DeepPartial<TurnStateContext>;
  conversationHistory?: ConversationTurn[];
  sessionTags?: SessionTagInstance[];
  /** Routed per-turn tag context (session/NPC/location), computed by API snapshot layer */
  turnTagContext?: TurnTagContext;
  /** Player character persona (when attached to session) */
  persona?: PersonaProfile;
  /** Parsed actions from pre-parser (optional, for multi-action sequencing) */
  parsedActions?: ParsedAction[];
  /** Running summary of older conversation history (for long conversations) */
  conversationSummary?: string;
  /** Recent tool usage history for maintaining tool calling patterns */
  toolHistory?: ToolHistoryContext;
}

// ============================================================================
// Prompt Tag Routing (MVP)
// ============================================================================

export interface TagInstruction {
  bindingId: string;
  tagId: string;
  tagName: string;
  targetType: string;
  instructionText: string;
  shortDescription?: string;
  activationMode?: string;
}

export interface TurnTagContext {
  session: TagInstruction[];
  byNpcInstanceId: Record<string, TagInstruction[]>;
  byLocationId: Record<string, TagInstruction[]>;
  playerLocationId: string | null;
  ignored: { bindingId: string; tagId: string; reason: string }[];
}

/**
 * Tool history context for maintaining tool calling patterns.
 * Helps the LLM understand that tools should be used.
 */
export interface ToolHistoryContext {
  /** Recent tool calls from the last few turns (summary form) */
  recentToolCalls?: {
    turnIdx: number;
    toolName: string;
    success: boolean;
  }[];
  /** Tool usage statistics */
  stats?: {
    totalCalls: number;
    callsByTool: Record<string, number>;
    recentTools: string[];
  };
  /** Tool usage hints for the system prompt */
  usageHints?: string[];
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

/**
 * NPC context for the active NPC in a turn.
 * Includes schedule-based availability and awareness information.
 */
export interface NpcContext {
  /** NPC's current schedule resolution */
  schedule?: {
    /** Current slot ID the NPC is in */
    currentSlotId?: string;
    /** Current activity description */
    activity?: string;
    /** Current location from schedule */
    scheduledLocationId?: string;
    /** Whether NPC is available for interaction */
    available: boolean;
    /** Reason if unavailable (e.g., "sleeping", "working", "busy") */
    unavailableReason?: string;
  };
  /** NPC's awareness of the player */
  awareness?: {
    /** Whether NPC has met the player before */
    hasMet: boolean;
    /** Turn number of last interaction */
    lastInteractionTurn?: number;
    /** Number of previous interactions */
    interactionCount?: number;
    /** Player's reputation level with this NPC (-100 to 100) */
    reputation?: number;
  };
  /** NPC's current emotional state */
  mood?: {
    /** Primary mood (e.g., "neutral", "happy", "annoyed") */
    primary: string;
    /** Intensity 0-1 */
    intensity?: number;
  };
}

export interface TurnStateContext {
  character: CharacterWithInstance;
  setting: SettingWithInstance;
  location: Record<string, unknown>;
  inventory: Record<string, unknown>;
  time: Record<string, unknown>;
  npc?: CharacterWithInstance;
  /** Affinity states for all NPCs (keyed by NPC ID) - available for affinity-aware prompting */
  affinity?: Record<string, unknown>;
  /** NPC location states (keyed by NPC ID) - tracks where NPCs are */
  npcLocations?: Record<string, unknown>;
  /** Player's current location ID */
  playerLocationId?: string;
  /** Context for the active NPC (schedule, availability, awareness) */
  npcContext?: NpcContext;
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
  contextRetrievalMs?: number;
  agentExecutionMs?: number;
  stateUpdateMs?: number;
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
