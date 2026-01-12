import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import { actorRegistry } from '../src/registry/actor-registry.js';
import type { LLMProvider, LLMMessage, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import { CognitionLayer } from '../src/npc/cognition.js';

function createMockProvider(content: string): LLMProvider {
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: vi.fn((_messages: LLMMessage[]) =>
      Effect.succeed({ id: '1', content, tool_calls: null, usage: null } satisfies LLMResponse)
    ),
    stream: vi.fn((_messages: LLMMessage[]) =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      )
    ),
  } satisfies LLMProvider;
}

describe('TASK-008a wiring', () => {
  beforeEach(() => {
    actorRegistry.getAll().forEach((a) => actorRegistry.despawn(a.id));
  });

  afterEach(() => {
    actorRegistry.getAll().forEach((a) => actorRegistry.despawn(a.id));
    vi.useRealTimers();
  });

  it('ActorRegistry.spawn forwards llmProvider+profile into cognition (provider.chat called)', async () => {
    const mockProvider = createMockProvider('Hello from LLM');
    const profile: CharacterProfile = {
      name: 'Test NPC',
    } as CharacterProfile;

    const actor = actorRegistry.spawn({
      id: 'test-npc',
      type: 'npc',
      sessionId: 'session-1',
      locationId: 'loc-1',
      npcId: 'npc-1',
      llmProvider: mockProvider,
      profile,
    });

    const spoke: WorldEvent = {
      type: 'SPOKE',
      sessionId: 'session-1',
      actorId: 'player-1',
      content: 'Hi',
      timestamp: new Date(),
    } as WorldEvent;

    actor.send(spoke);

    // Allow the machine to process invoke.
    await new Promise((r) => setTimeout(r, 25));

    expect(mockProvider.chat).toHaveBeenCalled();
  });

  it('decideLLM falls back to rules on 2s timeout (enforces <2s decision cap)', async () => {
    vi.useFakeTimers();

    const neverResolvingProvider: LLMProvider = {
      id: 'never',
      supportsTools: false,
      supportsFunctions: false,
      chat: () =>
        Effect.tryPromise({
          try: async () => await new Promise<LLMResponse>(() => undefined),
          catch: (e) => (e instanceof Error ? e : new Error(String(e))),
        }),
      stream: () =>
        Effect.succeed(
          (async function* empty(): AsyncGenerator<LLMStreamChunk> {
            // not used
          })()
        ),
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const context = {
      perception: {
        relevantEvents: [
          {
            type: 'SPOKE',
            sessionId: 's',
            actorId: 'player-1',
            content: 'Hello',
            timestamp: new Date(),
          } as WorldEvent,
        ],
        nearbyActors: [],
      },
      state: {
        id: 'npc-actor',
        type: 'npc' as const,
        npcId: 'npc-1',
        sessionId: 's',
        locationId: 'loc',
        spawnedAt: new Date(),
        lastActiveAt: new Date(),
        recentEvents: [],
        goals: [],
      },
      availableActions: ['SPEAK_INTENT'],
    };

    const profile: CharacterProfile = { name: 'Test NPC' } as CharacterProfile;

    const promise = CognitionLayer.decideLLM(context, profile, neverResolvingProvider);

    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result?.intent.type).toBe('SPEAK_INTENT');
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
