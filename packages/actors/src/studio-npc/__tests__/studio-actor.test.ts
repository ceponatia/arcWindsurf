import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import { createStudioNpcActor } from '../studio-actor.js';

function createMockProvider(responses: string[]): LLMProvider {
  let index = 0;
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: () =>
      Effect.succeed({
        id: `resp-${index}`,
        content: responses[index++] ?? 'Default response for tests.',
      } as LLMResponse),
    stream: () =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      ),
  } satisfies LLMProvider;
}

describe('studio-npc/studio-actor', () => {
  it('responds end-to-end and triggers trait callbacks', async () => {
    const onTraitInferred = vi.fn();
    const provider = createMockProvider([
      'This response is long enough to pass the validation checks easily.',
      '[{"path":"personalityMap.dimensions.openness","value":0.9,"confidence":0.7,"evidence":"test","reasoning":"test"}]',
    ]);

    const actor = createStudioNpcActor({
      sessionId: 'session-1',
      profile: { name: 'Elara' } as CharacterProfile,
      llmProvider: provider,
      onTraitInferred,
    });

    const response = await actor.respond('Tell me about yourself.');

    expect(response.response).toContain('This response is long enough');
    expect(response.inferredTraits).toHaveLength(1);
    expect(onTraitInferred).toHaveBeenCalledTimes(1);

    actor.stop();
  });

  it('invokes onProfileUpdate when profile changes', () => {
    const onProfileUpdate = vi.fn();
    const provider = createMockProvider(['Response', '[]']);

    const actor = createStudioNpcActor({
      sessionId: 'session-1',
      profile: { name: 'Elara' } as CharacterProfile,
      llmProvider: provider,
      onProfileUpdate,
    });

    actor.updateProfile({ summary: 'Updated summary' });

    expect(onProfileUpdate).toHaveBeenCalledWith({ summary: 'Updated summary' });

    actor.stop();
  });

  it('routes advanced feature requests through the actor helpers', async () => {
    const provider = createMockProvider([
      'A thoughtful response that passes validation for the dilemma.',
      '[]',
      'Happy response',
      'Sad response',
      'Welcome, traveler. It is good to meet you.',
      'I remember the old river in spring, the smell of rain on stone. It was the day I chose to leave home forever.',
      'They see a confident leader, but inside you feel uneasy about the attention.',
    ]);

    const actor = createStudioNpcActor({
      sessionId: 'session-1',
      profile: { name: 'Elara' } as CharacterProfile,
      llmProvider: provider,
    });

    const dilemma = await actor.requestDilemma();
    expect(dilemma.response.length).toBeGreaterThan(0);

    const emotional = await actor.requestEmotionalRange({
      basePrompt: 'How do you respond?',
      emotions: ['happy', 'sad'],
    });
    expect(emotional.response).toContain('Generated 2 variations');

    const vignette = await actor.requestVignette({ archetype: 'stranger', scenario: 'first-meeting' });
    expect(vignette.response).toContain('[VIGNETTE]');

    const memory = await actor.requestMemory('earliest-memory');
    expect(memory.response).toContain('[MEMORY]');
    expect(memory.inferredTraits.length).toBeGreaterThan(0);

    const impression = await actor.requestFirstImpression({ context: 'tavern' });
    expect(impression.response).toContain('[FIRST IMPRESSION]');

    const voice = await actor.requestVoiceFingerprint();
    expect(voice.response).toContain('[VOICE FINGERPRINT]');

    actor.stop();
  });

  it('exports and restores state consistently', async () => {
    const provider = createMockProvider([
      'This response is long enough to pass the validation checks easily.',
      '[{"path":"personalityMap.dimensions.openness","value":0.9,"confidence":0.7,"evidence":"test","reasoning":"test"}]',
    ]);

    const actor = createStudioNpcActor({
      sessionId: 'session-1',
      profile: { name: 'Elara' } as CharacterProfile,
      llmProvider: provider,
    });

    await actor.respond('Tell me about yourself.');
    const exported = actor.exportState();

    const restoredProvider = createMockProvider(['Response', '[]']);
    const restoredActor = createStudioNpcActor({
      sessionId: 'session-2',
      profile: { name: 'Elara' } as CharacterProfile,
      llmProvider: restoredProvider,
    });

    restoredActor.restoreState(exported);

    expect(restoredActor.getAllMessages()).toHaveLength(exported.conversation.length);
    expect(restoredActor.getInferredTraits()).toHaveLength(exported.inferredTraits.length);
    expect(restoredActor.getExploredTopics()).toEqual(exported.exploredTopics);

    actor.stop();
    restoredActor.stop();
  });
});
