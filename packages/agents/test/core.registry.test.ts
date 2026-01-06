import { describe, test, expect } from 'vitest';
import { DefaultAgentRegistry } from '../src/core/registry.js';
import type { Agent, AgentIntent, AgentOutput, AgentType, IntentType } from '../src/core/types.js';

class TestAgent implements Agent {
  constructor(
    public readonly agentType: AgentType,
    private readonly handled: IntentType[],
    public readonly name = `${agentType}-agent`
  ) {}

  canHandle(intent: AgentIntent): boolean {
    return this.handled.includes(intent.type);
  }

  execute(): Promise<AgentOutput> {
    return Promise.resolve({ narrative: 'ok' });
  }
}

describe('DefaultAgentRegistry', () => {
  test('register, get, has, size, unregister, and clear manage agents', () => {
    const registry = new DefaultAgentRegistry();
    const mapAgent = new TestAgent('map', ['move']);
    const rulesAgent = new TestAgent('rules', ['use']);

    registry.register(mapAgent);
    registry.register(rulesAgent);

    expect(registry.size).toBe(2);
    expect(registry.has('map')).toBe(true);
    expect(registry.get('map')).toBe(mapAgent);

    const removed = registry.unregister('map');
    expect(removed).toBe(true);
    expect(registry.has('map')).toBe(false);
    expect(registry.size).toBe(1);

    registry.clear();
    expect(registry.size).toBe(0);
  });

  test('findForIntent returns agents that can handle the intent', () => {
    const registry = new DefaultAgentRegistry();
    const mapAgent = new TestAgent('map', ['move', 'look']);
    const rulesAgent = new TestAgent('rules', ['use']);

    registry.register(mapAgent);
    registry.register(rulesAgent);

    const cases: { intent: AgentIntent; expectedAgents: AgentType[] }[] = [
      { intent: { type: 'move', params: {}, confidence: 1 }, expectedAgents: ['map'] },
      { intent: { type: 'use', params: {}, confidence: 1 }, expectedAgents: ['rules'] },
      { intent: { type: 'attack', params: {}, confidence: 1 }, expectedAgents: [] },
    ];

    for (const { intent, expectedAgents } of cases) {
      const handlers = registry.findForIntent(intent);
      expect(handlers.map((a) => a.agentType).sort()).toEqual(expectedAgents.sort());
    }
  });
});
