import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Configuration for the Studio NPC Actor.
 */
export interface StudioNpcActorConfig {
  /** Unique session identifier */
  sessionId: string;
  /** Partial character profile to work with */
  profile: Partial<CharacterProfile>;
  /** LLM provider for intelligence */
  llmProvider: LLMProvider;
  /** Callback triggered when a new trait is inferred */
  onTraitInferred?: ((trait: InferredTrait) => void) | undefined;
  /** Callback triggered when the character profile is updated */
  onProfileUpdate?: ((updates: Partial<CharacterProfile>) => void) | undefined;
}

/**
 * A single message in the studio conversation.
 */
export interface ConversationMessage {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'character' | 'system';
  /** Text content of the message */
  content: string;
  /** When the message was sent */
  timestamp: Date;
  /** Optional inner monologue or reasoning from the actor */
  thought?: string | undefined;
}

/**
 * A trait inferred from the conversation by the NPC.
 */
export interface InferredTrait {
  /** Path in the JSON profile where this trait belongs */
  path: string;
  /** The value of the trait */
  value: unknown;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Source text or event that led to this inference */
  evidence: string;
  /** Detailed reasoning for the inference */
  reasoning?: string | undefined;
  /** Reference to an existing trait this inference contradicts */
  contradicts?: string | undefined;
  /** Strategy for resolving conflicts with existing data */
  resolution?: ('newer' | 'stronger' | 'context-dependent' | 'flag-for-review') | undefined;
}

// ============================================================================
// Discovery Types
// ============================================================================

/**
 * Topics available for exploration during character discovery.
 */
export type DiscoveryTopic =
  | 'values'
  | 'fears'
  | 'relationships'
  | 'backstory'
  | 'stress-response'
  | 'social-behavior'
  | 'communication-style'
  | 'goals-motivations'
  | 'emotional-range';

/**
 * A prompt suggested by the NPC to explore a specific topic.
 */
export interface SuggestedPrompt {
  /** The suggested text for the user to send */
  prompt: string;
  /** The topic this prompt aims to explore */
  topic: DiscoveryTopic;
  /** Why this prompt was suggested */
  rationale: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard response from the Studio NPC.
 */
export interface StudioResponse {
  /** The character's spoken response */
  response: string;
  /** The character's internal thoughts */
  thought?: string | undefined;
  /** Traits inferred from this interaction */
  inferredTraits: InferredTrait[];
  /** Prompts suggested for continuing the conversation */
  suggestedPrompts: SuggestedPrompt[];
  /** Metadata about the state of discovery */
  meta: {
    /** Total messages in the session */
    messageCount: number;
    /** Whether the conversation history was summarized (due to length) */
    summarized: boolean;
    /** Topics that have been substantially explored */
    exploredTopics: DiscoveryTopic[];
  };
}

// ============================================================================
// Advanced Feature Types
// ============================================================================

/**
 * A scenario designed to test character values through conflict.
 */
export interface Dilemma {
  /** Unique dilemma identifier */
  id: string;
  /** Description of the scenario */
  scenario: string;
  /** Values expected to come into conflict */
  conflictingValues: string[];
  /** Specific traits targeted for discovery */
  targetTraits: string[];
}

/**
 * A signal indicating a specific character value with evidence.
 */
export interface ValueSignal {
  /** The value detected */
  value: string;
  /** Relative priority (typically 1-10) */
  priority: number;
  /** Evidence from speech or behavior */
  evidence: string;
}

/**
 * Possible emotional states for character variations.
 */
export type EmotionState = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'vulnerable';

/**
 * Request to generate variations of a response for different emotions.
 */
export interface EmotionalRangeRequest {
  /** The starting prompt or context */
  basePrompt: string;
  /** The specific emotions to test */
  emotions: EmotionState[];
}

/**
 * Response containing emotional variations and analysis of range.
 */
export interface EmotionalRangeResponse {
  /** Generated dialogue variations per emotion */
  variations: { emotion: EmotionState; response: string }[];
  /** Analysis of the character's emotional depth in a specific dimension */
  inferredRange: { dimension: string; value: number };
}

/**
 * Detection of a conflict between new evidence and an existing trait.
 */
export interface Contradiction {
  /** The trait as currently defined */
  existingTrait: { path: string; value: unknown };
  /** The conflicting data found */
  newEvidence: { path: string; value: unknown };
  /** Suggested prompt for the user to resolve the conflict */
  reflectionPrompt: string;
}

/**
 * Major relationship patterns for testing character social dynamics.
 */
export type RelationshipArchetype =
  | 'authority-figure'
  | 'romantic-interest'
  | 'rival'
  | 'child'
  | 'stranger'
  | 'old-friend';

/**
 * Common interaction scenarios for social vignettes.
 */
export type VignetteScenario = 'first-meeting' | 'conflict' | 'request-for-help' | 'casual';

/**
 * Request to play out a short social vignette.
 */
export interface VignetteRequest {
  /** The type of relationship to simulate */
  archetype: RelationshipArchetype;
  /** The context of the interaction */
  scenario: VignetteScenario;
}

/**
 * Result of a social vignette including behavioral patterns found.
 */
export interface VignetteResponse {
  /** The simulated dialogue */
  dialogue: string;
  /** Behavior patterns inferred from the simulation */
  inferredPatterns: {
    strangerDefault?: string | undefined;
    warmthRate?: string | undefined;
    conflictStyle?: string | undefined;
  };
}

/**
 * Key pillars of character history that can be prompted for.
 */
export type MemoryTopic =
  | 'earliest-memory'
  | 'proudest-moment'
  | 'deepest-regret'
  | 'first-loss'
  | 'defining-choice';

/**
 * A reconstructed piece of backstory with integration advice.
 */
export interface BackstoryElement {
  /** Content of the memory or history */
  content: string;
  /** Estimated reliability of the inference */
  confidence: number;
  /** How to update the character profile to include this */
  suggestedIntegration: string;
}

/**
 * Context for testing a character's first impression.
 */
export interface FirstImpressionContext {
  /** Environmental setting for the meeting */
  context?: ('tavern' | 'court' | 'battlefield' | 'marketplace') | undefined;
}

/**
 * Analysis of a character's external facade vs internal reality.
 */
export interface FirstImpressionResponse {
  /** How others perceive the character initially */
  externalPerception: string;
  /** What the character is actually thinking/feeling */
  internalReaction: string;
  /** Discrepancy between presented and hidden personality */
  inferredGap: { presentedTrait: string; actualTrait: string } | null | undefined;
}

/**
 * Analysis contrasting spoken word with internal monologue.
 */
export interface InternalMonologueResponse {
  /** Spoken dialogue */
  spoken: string;
  /** Secret internal thought */
  thought: string;
  /** Traits inferred by comparing speech to thought */
  inferredTraits: { path: string; evidence: 'spoken' | 'thought' | 'contrast' }[];
}

/**
 * Detailed analysis of a character's unique way of speaking.
 */
export interface VoiceFingerprint {
  /** Word choice and complexity */
  vocabulary: {
    level: 'simple' | 'average' | 'educated' | 'erudite';
    distinctiveWords: string[];
  };
  /** Sentence structure and flow */
  rhythm: {
    averageSentenceLength: number;
    variability: 'consistent' | 'varied' | 'erratic';
  };
  /** Repetitive phrases and emotional triggers */
  patterns: {
    signaturePhrases: string[];
    avoidedTopics: string[];
    emotionalTriggers: string[];
  };
  /** Use and style of humor */
  humor: {
    frequency: 'none' | 'rare' | 'occasional' | 'frequent';
    type: string | null | undefined;
  };
}

// ============================================================================
// XState Machine Types
// ============================================================================

/**
 * Internal state context for the Studio NPC state machine.
 */
export interface StudioMachineContext {
  /** Session identifier matching the database */
  sessionId: string;
  /** Working copy of the character profile */
  profile: Partial<CharacterProfile>;
  /** LLM provider instance */
  llmProvider: LLMProvider;
  /** Full history of current session */
  conversation: ConversationMessage[];
  /** Summarized context for token efficiency */
  summary: string | null;
  /** All traits found during this session */
  inferredTraits: InferredTrait[];
  /** Set of topics tracking exploration progress */
  exploredTopics: Set<DiscoveryTopic>;
  /** The most recent response generated */
  pendingResponse?: StudioResponse | undefined;
  /** Last error message if any */
  error?: string | undefined;
}

/**
 * Events accepted by the Studio NPC state machine.
 */
export type StudioMachineEvent =
  | { type: 'SEND_MESSAGE'; content: string }
  | { type: 'REQUEST_DILEMMA' }
  | { type: 'REQUEST_EMOTIONAL_RANGE'; request: EmotionalRangeRequest }
  | { type: 'REQUEST_VIGNETTE'; request: VignetteRequest }
  | { type: 'REQUEST_MEMORY'; topic: MemoryTopic }
  | { type: 'REQUEST_FIRST_IMPRESSION'; context?: FirstImpressionContext }
  | { type: 'REQUEST_VOICE_FINGERPRINT' }
  | { type: 'UPDATE_PROFILE'; profile: Partial<CharacterProfile> }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'RESPONSE_COMPLETE'; response: StudioResponse }
  | { type: 'ERROR'; error: string };
