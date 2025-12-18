import type { Agent, AgentType } from './agent.js';
import type { AgentIntent } from './intents.js';

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
