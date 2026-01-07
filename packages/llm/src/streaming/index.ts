import { Effect } from 'effect';

/**
 * Utility for handling LLM streams and converting them to SSE or other formats.
 */
export const streamToLines = (stream: AsyncIterable<any>): AsyncIterable<string> => {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
          const content = chunk.choices[0].delta.content;
          if (content) {
            yield content;
          }
        }
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
    catch: (error) => error as Error,
  });
};
