import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { streamToLines, consumeStream } from '../src/streaming/index.js';
import type { LLMStreamChunk } from '../src/types.js';

describe('streaming helpers', () => {
  it('streams only non-empty content chunks', async () => {
    async function* chunks(): AsyncIterable<LLMStreamChunk> {
      yield { choices: [{ delta: { content: '' } }] } as LLMStreamChunk;
      yield { choices: [{ delta: { content: 'hello' } }] } as LLMStreamChunk;
      yield { choices: [{ delta: { content: ' ' } }] } as LLMStreamChunk;
      yield { choices: [{ delta: { content: 'world' } }] } as LLMStreamChunk;
    }

    const lines = streamToLines(chunks());
    const collected: string[] = [];
    for await (const line of lines) {
      collected.push(line);
    }

    expect(collected.join('')).toBe('hello world');
  });

  it('consumeStream aggregates content', async () => {
    async function* lines() {
      yield 'a';
      yield 'b';
    }

    const result = await Effect.runPromise(consumeStream(lines()));
    expect(result).toBe('ab');
  });
});
