import type { AgentInput } from '../core/types.js';
import type { NpcResponseConfig } from '@minimal-rpg/schemas';

/**
 * Extended input type for NPC agents with response configuration.
 * Extends AgentInput with NPC-specific requirements for multi-action turns
 * and narrative response generation.
 */
export interface NpcAgentInput extends AgentInput {
  /** Optional configuration for response generation */
  responseConfig?: NpcResponseConfig;
}
