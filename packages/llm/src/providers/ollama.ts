import { Effect } from 'effect';
import { OpenAI } from 'openai';
import type { ChatOptions, LLMMessage, LLMProvider, LLMResponse, LLMStreamChunk } from '../types.js';

export interface OllamaProviderConfig {
  id: string;
  model: string;
  baseURL?: string;
}

export class OllamaProvider implements LLMProvider {
  private client: OpenAI;
  public readonly id: string;
  private model: string;

  public readonly supportsTools = false;
  public readonly supportsFunctions = false;

  constructor(config: OllamaProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: 'ollama',
      baseURL: config.baseURL ?? 'http://localhost:11434/v1',
    });
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
        type OpenAICreateParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

        const openAIMessages: OpenAIMessageParam[] = messages.map((message): OpenAIMessageParam => {
          switch (message.role) {
            case 'assistant':
              return { role: 'assistant', content: message.content ?? '' };
            case 'system':
              return { role: 'system', content: message.content ?? '' };
            case 'user':
              return { role: 'user', content: message.content ?? '' };
            case 'tool':
              // Ollama does not support tool messages; drop them
              return { role: 'assistant', content: message.content ?? '' };
          }
        });

        const temperature = options?.temperature;
        const maxTokens = options?.max_tokens;
        const topP = options?.top_p;
        const stop = options?.stop;

        const body: OpenAICreateParams = {
          model: this.model,
          messages: openAIMessages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
        };

        const response = await this.client.chat.completions.create(body);
        const choice = response.choices[0];
        if (!choice) {
          throw new Error('No choice in response');
        }

        return {
          id: response.id,
          content: choice.message.content,
          tool_calls: null,
          usage: response.usage
            ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            }
            : null,
        } satisfies LLMResponse;
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }

  stream(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
    return Effect.tryPromise({
      try: async () => {
        type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
        type OpenAICreateParamsStreaming = OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

        const openAIMessages: OpenAIMessageParam[] = messages.map((message): OpenAIMessageParam => {
          switch (message.role) {
            case 'assistant':
              return { role: 'assistant', content: message.content ?? '' };
            case 'system':
              return { role: 'system', content: message.content ?? '' };
            case 'user':
              return { role: 'user', content: message.content ?? '' };
            case 'tool':
              // Ollama does not support tool messages; drop them
              return { role: 'assistant', content: message.content ?? '' };
          }
        });

        const temperature = options?.temperature;
        const maxTokens = options?.max_tokens;
        const topP = options?.top_p;
        const stop = options?.stop;

        const body: OpenAICreateParamsStreaming = {
          model: this.model,
          messages: openAIMessages,
          stream: true,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
        };

        const stream = await this.client.chat.completions.create(body);
        return stream as AsyncIterable<LLMStreamChunk>;
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }
}
