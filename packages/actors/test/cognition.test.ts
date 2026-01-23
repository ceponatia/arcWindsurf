import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse } from '@minimal-rpg/llm';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import { CognitionLayer } from '../src/npc/cognition.js';
import type { CognitionContext } from '../src/npc/types.js';

function buildContext(relevantEvents: WorldEvent[]): CognitionContext {
  return {
    perception: {
      relevantEvents,
      nearbyActors: [],
    },
    state: {
      id: 'npc-1',
      type: 'npc',
      npcId: 'npc-1',
      sessionId: 'session-1',
      locationId: 'loc-1',
      spawnedAt: new Date('2026-01-22T00:00:00.000Z'),
      lastActiveAt: new Date('2026-01-22T00:00:00.000Z'),
      recentEvents: [],
      goals: [],
    },
    availableActions: ['SPEAK_INTENT', 'MOVE_INTENT'],
  };
}

describe('npc/cognition', () => {
  it('returns null when no relevant events', () => {
    const context = buildContext([]);
    const result = CognitionLayer.decideSync(context);
    expect(result).toBeNull();
  });

  it('responds to SPOKE events from other actors', () => {
    const context = buildContext([
      { type: 'SPOKE', actorId: 'player-1', sessionId: 'session-1' } as unknown as WorldEvent,
    ]);

    const result = CognitionLayer.decideSync(context);

    expect(result?.intent.type).toBe('SPEAK_INTENT');
    expect((result?.intent as Record<string, unknown>).targetActorId).toBe('player-1');
  });

  it('responds to MOVED events into location', () => {
    const context = buildContext([
      { type: 'MOVED', actorId: 'player-1', toLocationId: 'loc-1' } as unknown as WorldEvent,
    ]);

    const result = CognitionLayer.decideSync(context);

    expect(result?.intent.type).toBe('SPEAK_INTENT');
    expect(result?.delayMs).toBe(1000);
  });

  it('decide returns decideSync', async () => {
    const context = buildContext([
      { type: 'SPOKE', actorId: 'player-1', sessionId: 'session-1' } as unknown as WorldEvent,
    ]);

    const result = await CognitionLayer.decide(context);

    expect(result?.intent.type).toBe('SPEAK_INTENT');
  });

  it('shouldAct returns true when there are relevant events', () => {
    const context = buildContext([
      { type: 'SPOKE', actorId: 'player-1', sessionId: 'session-1' } as unknown as WorldEvent,
    ]);

    expect(CognitionLayer.shouldAct(context)).toBe(true);
  });

  it('summarizes decisions', () => {
    expect(CognitionLayer.summarizeDecision(null)).toBe('No action needed');

    const context = buildContext([
      { type: 'SPOKE', actorId: 'player-1', sessionId: 'session-1' } as unknown as WorldEvent,
    ]);
    const result = CognitionLayer.decideSync(context);

    expect(CognitionLayer.summarizeDecision(result)).toContain('Decided to SPEAK_INTENT');
  });

  it('decideLLM falls back to rules on NO_ACTION', async () => {
    const context = buildContext([
      { type: 'SPOKE', actorId: 'player-1', sessionId: 'session-1' } as WorldEvent,
    ]);

    const profile = { name: 'NPC' } as CharacterProfile;
    const provider: LLMProvider = {
      id: 'mock',
      supportsTools: false,
      supportsFunctions: false,
      chat: () => Effect.succeed({ id: 'resp', content: 'NO_ACTION' } as LLMResponse),
      stream: () => Effect.succeed((async function* empty() { })()),
    };

    const result = await CognitionLayer.decideLLM(context, profile, provider);

    expect(result?.intent.type).toBe('SPEAK_INTENT');
  });

  it('decideLLM returns null when there are no relevant events', async () => {
    const context = buildContext([]);
    const profile = { name: 'NPC' } as CharacterProfile;
    const provider: LLMProvider = {
      id: 'mock',
      supportsTools: false,
      supportsFunctions: false,
      chat: () => Effect.succeed({ id: 'resp', content: 'Hello' } as LLMResponse),
      stream: () => Effect.succeed((async function* empty() { })()),
    };

    const result = await CognitionLayer.decideLLM(context, profile, provider);

    expect(result).toBeNull();
  });
});
