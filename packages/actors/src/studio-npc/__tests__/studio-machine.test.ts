import { describe, it, expect, vi } from 'vitest';
import { createActor, type ActorRefFrom } from 'xstate';
import { Effect } from 'effect';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import { createStudioMachine } from '../studio-machine.js';
import type { StudioMachineContext, StudioResponse, ConversationMessage } from '../types.js';

type StudioActor = ActorRefFrom<ReturnType<typeof createStudioMachine>>;

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

function buildContext(llmProvider: LLMProvider, overrides?: Partial<StudioMachineContext>): StudioMachineContext {
  return {
    sessionId: 'session-1',
    profile: { name: 'Elara' } as CharacterProfile,
    llmProvider,
    conversation: [],
    summary: null,
    inferredTraits: [],
    exploredTopics: new Set(),
    ...overrides,
  } satisfies StudioMachineContext;
}

function waitForIdle(actor: StudioActor): Promise<StudioResponse> {
  return new Promise((resolve, reject) => {
    const subscription = actor.subscribe((state) => {
      if (state.context.error) {
        subscription.unsubscribe();
        reject(new Error(state.context.error));
      }
      if (state.matches('idle') && state.context.pendingResponse) {
        const response = state.context.pendingResponse;
        subscription.unsubscribe();
        resolve(response);
      }
    });
  });
}

const VALID_DIALOGUE = 'I remember the river in spring, the smell of rain on stone.';

describe('studio-npc/studio-machine', () => {
  it('tracks explored topics from user messages', async () => {
    const provider = createMockProvider([
      'I will answer with a thoughtful response that is long enough.',
      '[]',
    ]);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({ type: 'SEND_MESSAGE', content: 'I am afraid of the dark.' });

    await waitForIdle(actor);

    const topics = Array.from(actor.getSnapshot().context.exploredTopics);
    expect(topics).toContain('fears');

    actor.stop();
  });

  it('assembles pendingResponse with suggestions and meta', async () => {
    const provider = createMockProvider([
      'Here is a thoughtful response that should pass validation checks.',
      '[]',
    ]);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({ type: 'SEND_MESSAGE', content: 'Tell me about your values.' });

    const response = await waitForIdle(actor);

    expect(response.response.length).toBeGreaterThan(0);
    expect(response.suggestedPrompts).toHaveLength(3);
    expect(response.meta.messageCount).toBe(2);

    actor.stop();
  });

  it('clears conversation state', () => {
    const provider = createMockProvider(['Response', '[]']);
    const conversation: ConversationMessage[] = [
      { id: '1', role: 'user', content: 'Hi', timestamp: new Date() },
      { id: '2', role: 'character', content: 'Hello', timestamp: new Date() },
    ];

    const context = buildContext(provider, {
      conversation,
      summary: 'Summary',
      inferredTraits: [{ path: 'backstory', value: 'test', confidence: 0.7, evidence: 'x', reasoning: 'y' }],
      exploredTopics: new Set(['values']),
    });

    const actor = createActor(createStudioMachine(context)).start();
    actor.send({ type: 'CLEAR_CONVERSATION' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.conversation).toHaveLength(0);
    expect(snapshot.context.summary).toBeNull();
    expect(snapshot.context.inferredTraits).toHaveLength(0);
    expect(snapshot.context.exploredTopics.size).toBe(0);

    actor.stop();
  });

  it('restores state from persisted data', () => {
    const provider = createMockProvider(['Response', '[]']);
    const context = buildContext(provider);

    const actor = createActor(createStudioMachine(context)).start();
    actor.send({
      type: 'RESTORE_STATE',
      conversation: [{ id: '1', role: 'user', content: 'Hi', timestamp: new Date() }],
      summary: 'Restored summary',
      inferredTraits: [{ path: 'backstory', value: 'test', confidence: 0.7, evidence: 'x', reasoning: 'y' }],
      exploredTopics: ['backstory'],
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.conversation).toHaveLength(1);
    expect(snapshot.context.summary).toBe('Restored summary');
    expect(snapshot.context.inferredTraits).toHaveLength(1);
    expect(snapshot.context.exploredTopics.has('backstory')).toBe(true);

    actor.stop();
  });

  it('uses dilemma fallback when validation fails after a dilemma', async () => {
    const provider = createMockProvider(['short', '[]']);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    actor.send({ type: 'REQUEST_DILEMMA' });

    const response = await waitForIdle(actor);

    expect(response.response).toBe(
      '*pauses, staring into the distance* This is... not a simple choice. I need a moment to think.'
    );

    mathSpy.mockRestore();
    actor.stop();
  });

  it('uses generic fallback when validation fails without a dilemma', async () => {
    const provider = createMockProvider(['short', '[]']);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    actor.send({ type: 'SEND_MESSAGE', content: 'Tell me anything.' });

    const response = await waitForIdle(actor);

    expect(response.response).toBe('*seems lost in thought for a moment* ...I\'m sorry, where were we?');

    mathSpy.mockRestore();
    actor.stop();
  });

  it('handles emotional range requests', async () => {
    const provider = createMockProvider(['Happy response', 'Sad response']);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({
      type: 'REQUEST_EMOTIONAL_RANGE',
      request: { basePrompt: 'How do you respond?', emotions: ['happy', 'sad'] },
    });

    const response = await waitForIdle(actor);
    expect(response.response).toContain('Generated 2 variations');

    actor.stop();
  });

  it('handles vignette requests', async () => {
    const provider = createMockProvider([VALID_DIALOGUE]);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({
      type: 'REQUEST_VIGNETTE',
      request: { archetype: 'stranger', scenario: 'first-meeting' },
    });

    const response = await waitForIdle(actor);
    expect(response.response).toContain('[VIGNETTE]');

    actor.stop();
  });

  it('handles memory requests and maps inferred traits', async () => {
    const provider = createMockProvider([
      'I remember the old river in spring, the smell of rain on stone. It was the day I chose to leave home forever.',
    ]);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({ type: 'REQUEST_MEMORY', topic: 'earliest-memory' });

    const response = await waitForIdle(actor);
    expect(response.response).toContain('[MEMORY]');
    expect(response.inferredTraits.length).toBeGreaterThan(0);

    actor.stop();
  });

  it('handles first impression requests', async () => {
    const provider = createMockProvider([
      'They see a confident leader, but inside you feel uneasy about the attention.',
    ]);
    const context = buildContext(provider);
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({
      type: 'REQUEST_FIRST_IMPRESSION',
      context: { context: 'tavern' },
    });

    const response = await waitForIdle(actor);
    expect(response.response).toContain('[FIRST IMPRESSION]');
    expect(response.response).toContain('Perception');
    expect(response.response).toContain('Reality');

    actor.stop();
  });

  it('handles voice fingerprint requests', async () => {
    const provider = createMockProvider([]);
    const conversation: ConversationMessage[] = [
      { id: '1', role: 'character', content: 'Hello there.', timestamp: new Date() },
      { id: '2', role: 'character', content: 'How are you today?', timestamp: new Date() },
      { id: '3', role: 'character', content: 'I suppose we should begin.', timestamp: new Date() },
      { id: '4', role: 'character', content: 'This is a measured response.', timestamp: new Date() },
      { id: '5', role: 'character', content: 'The rhythm is consistent.', timestamp: new Date() },
    ];

    const context = buildContext(provider, { conversation });
    const actor = createActor(createStudioMachine(context)).start();

    actor.send({ type: 'REQUEST_VOICE_FINGERPRINT' });

    const response = await waitForIdle(actor);
    expect(response.response).toContain('[VOICE FINGERPRINT]');

    actor.stop();
  });
});
