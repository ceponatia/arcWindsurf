/**
 * Shared types for Character Studio conversations and inference.
 */

/**
 * Supported message roles for Character Studio.
 */
export type StudioMessageRole = 'user' | 'character' | 'system';

/**
 * Status values for inferred traits in the studio UI.
 */
export type InferredTraitStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed';

/**
 * A trait inferred from conversation context.
 */
export interface InferredTrait {
  /** Optional identifier for UI usage */
  id?: string | undefined;
  /** Path in the JSON profile where this trait belongs */
  path: string;
  /** The value of the trait */
  value: unknown;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Source text or event that led to this inference */
  evidence: string;
  /** Status for pending/accepted flow (UI-facing) */
  status?: InferredTraitStatus | undefined;
  /** Detailed reasoning for the inference */
  reasoning?: string | undefined;
  /** Reference to an existing trait this inference contradicts */
  contradicts?: string | undefined;
  /** Strategy for resolving conflicts with existing data */
  resolution?: ('newer' | 'stronger' | 'context-dependent' | 'flag-for-review') | undefined;
}

/**
 * A single message in the studio conversation.
 */
export interface ConversationMessage {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: StudioMessageRole;
  /** Text content of the message */
  content: string;
  /** When the message was sent */
  timestamp: Date;
  /** Optional inner monologue or reasoning from the actor */
  thought?: string | undefined;
  /** Optional inferred traits associated with this message */
  inferredTraits?: InferredTrait[] | undefined;
}

/**
 * A prompt suggested by the studio to explore a topic.
 */
export interface SuggestedPrompt<TTopic extends string = string> {
  /** The suggested text for the user to send */
  prompt: string;
  /** The topic this prompt aims to explore */
  topic: TTopic;
  /** Why this prompt was suggested */
  rationale: string;
}
