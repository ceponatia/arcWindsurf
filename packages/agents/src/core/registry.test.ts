import { describe, it, expect } from 'vitest';
import { DefaultAgentRegistry } from './registry.js';
import { MapAgent } from '../map/map-agent.js';
import { NpcAgent } from '../npc/npc-agent.js';
import { RulesAgent } from '../rules/rules-agent.js';
import type { AgentIntent } from './types.js';

describe('DefaultAgentRegistry', () => {
  describe('register and get', () => {
    it('registers and retrieves an agent', () => {
      const registry = new DefaultAgentRegistry();
      const agent = new MapAgent();

      registry.register(agent);

      expect(registry.get('map')).toBe(agent);
    });

    it('returns undefined for unregistered agent type', () => {
      const registry = new DefaultAgentRegistry();

      expect(registry.get('map')).toBeUndefined();
    });

    it('overwrites existing agent of same type', () => {
      const registry = new DefaultAgentRegistry();
      const agent1 = new MapAgent();
      const agent2 = new MapAgent();

      registry.register(agent1);
      registry.register(agent2);

      expect(registry.get('map')).toBe(agent2);
    });
  });

  describe('getAll', () => {
    it('returns all registered agents', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());
      registry.register(new NpcAgent());
      registry.register(new RulesAgent());

      const all = registry.getAll();

      expect(all).toHaveLength(3);
      expect(all.map((a) => a.agentType)).toContain('map');
      expect(all.map((a) => a.agentType)).toContain('npc');
      expect(all.map((a) => a.agentType)).toContain('rules');
    });
  });

  describe('findForIntent', () => {
    it('finds agents that can handle an intent', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());
      registry.register(new NpcAgent());
      registry.register(new RulesAgent());

      const moveIntent: AgentIntent = { type: 'move', params: {}, confidence: 1 };
      const handlers = registry.findForIntent(moveIntent);

      expect(handlers).toHaveLength(1);
      expect(handlers[0]?.agentType).toBe('map');
    });

    it('returns empty array when no agent handles intent', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());

      const talkIntent: AgentIntent = { type: 'talk', params: {}, confidence: 1 };
      const handlers = registry.findForIntent(talkIntent);

      expect(handlers).toHaveLength(0);
    });
  });

  describe('has', () => {
    it('returns true for registered agents', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());

      expect(registry.has('map')).toBe(true);
      expect(registry.has('npc')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('removes an agent', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());

      expect(registry.unregister('map')).toBe(true);
      expect(registry.get('map')).toBeUndefined();
    });

    it('returns false for non-existent agent', () => {
      const registry = new DefaultAgentRegistry();

      expect(registry.unregister('map')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all agents', () => {
      const registry = new DefaultAgentRegistry();
      registry.register(new MapAgent());
      registry.register(new NpcAgent());

      registry.clear();

      expect(registry.size).toBe(0);
    });
  });

  describe('size', () => {
    it('returns the number of registered agents', () => {
      const registry = new DefaultAgentRegistry();

      expect(registry.size).toBe(0);

      registry.register(new MapAgent());
      expect(registry.size).toBe(1);

      registry.register(new NpcAgent());
      expect(registry.size).toBe(2);
    });
  });
});
