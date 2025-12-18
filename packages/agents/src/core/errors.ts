import type { AgentType } from './agent.js';
import type { AgentIntent } from './intents.js';

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
