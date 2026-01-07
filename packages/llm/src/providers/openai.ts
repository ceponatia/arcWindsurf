import { Effect } from 'effect';
import { OpenAI } from 'openai';
import type { LLMProvider, LLMMessage, ChatOptions, LLMResponse } from '../types.js';

export interface OpenAIProviderConfig {
  id: string;
  apiKey: string;
  baseURL?: string;
  model: string;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  public readonly id: string;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  get supportsTools(): boolean {
    return true;
  }

  get supportsFunctions(): boolean {
    return true;
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const body: any = {
          model: this.model,
          messages: messages as any,
          temperature: options?.temperature ?? undefined,
          max_tokens: options?.max_tokens ?? null,
          top_p: options?.top_p ?? undefined,
          stop: options?.stop ?? null,
          tools: (options?.tools as any) ?? undefined,
          tool_choice: (options?.tool_choice as any) ?? undefined,
          response_format: (options?.response_format as any) ?? undefined,
        };

        const response = (await this.client.chat.completions.create(body)) as any;

        const choice = response.choices[0];
        if (!choice) {
          throw new Error('No choice in response');
        }

        return {
          id: response.id,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls ?? null,
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

  stream(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<AsyncIterable<any>, Error> {
    return Effect.tryPromise({
      try: async () => {
        const body: any = {
          model: this.model,
          messages: messages as any,
          temperature: options?.temperature ?? undefined,
          max_tokens: options?.max_tokens ?? null,
          top_p: options?.top_p ?? undefined,
          stop: options?.stop ?? null,
          tools: (options?.tools as any) ?? undefined,
          tool_choice: (options?.tool_choice as any) ?? undefined,
          response_format: (options?.response_format as any) ?? undefined,
          stream: true,
        };

        const stream = (await this.client.chat.completions.create(body)) as any;
        return stream as AsyncIterable<any>;
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }
}
