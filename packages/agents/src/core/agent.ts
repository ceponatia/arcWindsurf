import type { AgentInput } from './slices.js';
import type { AgentIntent } from './intents.js';
import type { AgentOutput } from './output.js';

/**
 * Known agent types in the system.
 */
export type AgentType = 'map' | 'npc' | 'rules' | 'sensory' | 'custom';

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
