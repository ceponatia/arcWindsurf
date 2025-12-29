import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  ConversationTurn,
  ProximityLevel,
} from '../core/types.js';
import type { NpcResponseConfig } from '@minimal-rpg/schemas';

/**
 * Repository contract for fetching NPC-scoped transcript history.
 */
export interface NpcMessageRepository {
  fetchOwnHistory(params: {
    ownerEmail: string;
    sessionId: string;
    npcId: string;
    limit?: number;
  }): Promise<ConversationTurn[]>;
}

export interface HygieneServiceLike {
  getSensoryModifier(
    sessionId: string,
    npcId: string,
    bodyPart: string,
    sense: 'smell' | 'touch' | 'taste'
  ): Promise<{ level: number; modifier?: string | null }>;
}

export interface MemoryServiceLike {
  fetchMemories?(params: { sessionId: string; npcId: string; limit?: number }): Promise<unknown>;
}

export interface SensoryAgentLike {
  execute(input: AgentInput): Promise<AgentOutput>;
}

export interface NpcAgentServices {
  messageRepository?: NpcMessageRepository;
  hygieneService?: HygieneServiceLike;
  memoryService?: MemoryServiceLike;
  sensoryAgent?: SensoryAgentLike;
}

export interface NpcAgentConfig extends AgentConfig {
  services?: NpcAgentServices;
  historyLimit?: number;
}

/**
 * Extended input type for NPC agents with response configuration.
 * Extends AgentInput with NPC-specific requirements for multi-action turns
 * and narrative response generation.
 */
export interface NpcAgentInput extends AgentInput {
  /** Optional configuration for response generation */
  responseConfig?: NpcResponseConfig;

  /** Whether the player directly addressed this NPC in the turn */
  isDirectlyAddressed?: boolean;

  /** Proximity tier from proximity manager (if available) */
  proximityLevel?: ProximityLevel;

  /** Routed tags targeting this NPC for the turn */
  npcTags?: string[];

  /** Routed tags targeting the current location */
  locationTags?: string[];

  /** Session-level tag context relevant to this turn */
  sessionTags?: string[];

  /** Tenant/owner for history isolation */
  ownerEmail?: string;
}

export interface NpcAgentOutput extends AgentOutput {
  /** Priority used for deterministic ordering during parallel execution */
  npcPriority?: number;
}

/**
 * NPC context slice type (matches NpcContext from governor).
 */
export interface NpcContextSlice {
  schedule?: {
    currentSlotId?: string;
    activity?: string;
    scheduledLocationId?: string;
    available: boolean;
    unavailableReason?: string;
  };
  awareness?: {
    hasMet: boolean;
    lastInteractionTurn?: number;
    interactionCount?: number;
    reputation?: number;
  };
  mood?: {
    primary: string;
    intensity?: number;
  };
}
