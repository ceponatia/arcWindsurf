import type { Agent, AgentIntent, AgentRegistry, AgentType } from './types.js';

/**
 * Default implementation of the agent registry.
 * Manages agent instances and routes intents to appropriate agents.
 */
export class DefaultAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<AgentType, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.agentType, agent);
  }

  get(type: AgentType): Agent | undefined {
    return this.agents.get(type);
  }

  getAll(): Agent[] {
    return [...this.agents.values()];
  }

  findForIntent(intent: AgentIntent): Agent[] {
    return this.getAll().filter((agent) => agent.canHandle(intent));
  }

  /**
   * Check if an agent type is registered.
   */
  has(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Remove an agent from the registry.
   */
  unregister(type: AgentType): boolean {
    return this.agents.delete(type);
  }

  /**
   * Clear all registered agents.
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Get the number of registered agents.
   */
  get size(): number {
    return this.agents.size;
  }
}

/**
 * Create a registry with all default agents registered.
 */
export function createDefaultRegistry(): DefaultAgentRegistry {
  // Dynamic imports would be cleaner but require async
  // For now, the caller should import and register agents as needed
  return new DefaultAgentRegistry();
}
