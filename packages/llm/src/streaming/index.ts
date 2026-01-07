import { Effect } from 'effect';
import type { LLMStreamChunk } from '../types.js';

/**
 * Utility for handling LLM streams and converting them to SSE or other formats.
 */
export const streamToLines = (stream: AsyncIterable<LLMStreamChunk>): AsyncIterable<string> => {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const firstChoice = chunk.choices[0];
        const content = firstChoice?.delta?.content;
        if (typeof content === 'string' && content.length > 0) yield content;
      }
    },
  };
};

export const consumeStream = (stream: AsyncIterable<string>): Effect.Effect<string, Error> => {
  return Effect.tryPromise({
    try: async () => {
      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
      }
      return fullContent;
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });
};
