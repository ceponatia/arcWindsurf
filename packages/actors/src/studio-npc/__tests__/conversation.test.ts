import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import { ConversationManager } from '../conversation.js';
import type { ConversationMessage } from '../types.js';

function createMockProvider(content: string): LLMProvider {
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: () => Effect.succeed({ id: 'resp', content } as LLMResponse),
    stream: () =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      ),
  } satisfies LLMProvider;
}

function buildMessages(count: number): ConversationMessage[] {
  return Array.from({ length: count }, (_v, index) => ({
    id: `msg-${index}`,
    role: index % 2 === 0 ? 'user' : 'character',
    content: `Message ${index} content for summarization.`,
    timestamp: new Date(),
  }));
}

describe('studio-npc/conversation', () => {
  it('summarizes conversations on success', async () => {
    const provider = createMockProvider(JSON.stringify({
      summary: 'Summary text',
      keyPoints: ['point-one'],
    }));

    const manager = new ConversationManager({
      llmProvider: provider,
      characterName: 'Elara',
    });

    for (const message of buildMessages(20)) {
      manager.addMessage(message);
    }

    await manager.summarize();

    expect(manager.getSummary()).toBe('Summary text');
  });

  it('falls back to plain text summary when JSON parsing fails', async () => {
    const provider = createMockProvider('Freeform summary text without JSON.');

    const manager = new ConversationManager({
      llmProvider: provider,
      characterName: 'Elara',
    });

    for (const message of buildMessages(20)) {
      manager.addMessage(message);
    }

    await manager.summarize();

    expect(manager.getSummary()).toBe('Freeform summary text without JSON.');
  });

  it('builds full context with summary and recent messages', () => {
    const provider = createMockProvider('Unused');
    const manager = new ConversationManager({
      llmProvider: provider,
      characterName: 'Elara',
    });

    manager.restore({ messages: [], summary: 'Earlier summary.' });
    manager.addMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello there.',
      timestamp: new Date(),
    });
    manager.addMessage({
      id: 'msg-2',
      role: 'character',
      content: 'Greetings.',
      timestamp: new Date(),
    });

    const context = manager.getFullContext();

    expect(context).toContain('[Previous conversation summary]');
    expect(context).toContain('Earlier summary.');
    expect(context).toContain('[Recent conversation]');
    expect(context).toContain('User: Hello there.');
    expect(context).toContain('Elara: Greetings.');
  });

  it('exports and restores state symmetrically', () => {
    const provider = createMockProvider('Unused');
    const manager = new ConversationManager({
      llmProvider: provider,
      characterName: 'Elara',
    });

    const messages = buildMessages(3);
    for (const message of messages) {
      manager.addMessage(message);
    }

    manager.restore({ messages, summary: 'Stored summary.' });
    const exported = manager.export();

    const restored = new ConversationManager({
      llmProvider: provider,
      characterName: 'Elara',
    });
    restored.restore(exported);

    expect(restored.getAllMessages()).toHaveLength(messages.length);
    expect(restored.getSummary()).toBe('Stored summary.');
  });
});
