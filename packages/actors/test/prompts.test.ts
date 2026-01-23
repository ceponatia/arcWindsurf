import { describe, it, expect } from 'vitest';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import { buildNpcCognitionPrompt, NPC_DECISION_SYSTEM_PROMPT } from '../src/npc/prompts.js';
import type { PerceptionContext, NpcActorState } from '../src/npc/types.js';

describe('npc/prompts', () => {
  it('includes profile details and recent events', () => {
    const profile = {
      name: 'Test NPC',
      summary: 'Short summary',
      backstory: 'Backstory details',
      personalityMap: {
        traits: ['kind', 'curious'],
        speech: { directness: 'direct' },
      },
    } as CharacterProfile;

    const perception: PerceptionContext = {
      relevantEvents: [
        { type: 'SPOKE', actorId: 'player-1' } as unknown as WorldEvent,
        { type: 'MOVED', actorId: 'player-2' } as unknown as WorldEvent,
      ],
      nearbyActors: ['player-1'],
    };

    const state: NpcActorState = {
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
      lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      recentEvents: [],
      goals: [],
    };

    const prompt = buildNpcCognitionPrompt(perception, state, profile);

    expect(prompt).toContain('NPC: Test NPC');
    expect(prompt).toContain('Traits: kind, curious');
    expect(prompt).toContain('Speech: direct');
    expect(prompt).toContain('Summary: Short summary');
    expect(prompt).toContain('Backstory: Backstory details');
    expect(prompt).toContain('- SPOKE from player-1');
    expect(prompt).toContain('- MOVED from player-2');
  });

  it('handles empty events', () => {
    const profile = { name: 'NPC' } as CharacterProfile;
    const perception: PerceptionContext = { relevantEvents: [], nearbyActors: [] };
    const state: NpcActorState = {
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
      lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      recentEvents: [],
      goals: [],
    };

    const prompt = buildNpcCognitionPrompt(perception, state, profile);

    expect(prompt).toContain('- None');
  });

  it('limits to 5 recent events', () => {
    const profile = { name: 'NPC' } as CharacterProfile;
    const events: WorldEvent[] = Array.from({ length: 6 }, (_v, idx) => {
      return { type: 'SPOKE', actorId: `player-${idx}` } as unknown as WorldEvent;
    });

    const perception: PerceptionContext = { relevantEvents: events, nearbyActors: [] };
    const state: NpcActorState = {
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
      lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      recentEvents: [],
      goals: [],
    };

    const prompt = buildNpcCognitionPrompt(perception, state, profile);

    expect(prompt.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(5);
    expect(prompt).not.toContain('player-0');
    expect(prompt).toContain('player-5');
  });

  it('exposes the decision system prompt', () => {
    expect(NPC_DECISION_SYSTEM_PROMPT).toContain('NO_ACTION');
  });
});
