import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageParam,
  MessageStreamEvent,
  Message,
  RawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages.mjs';
import { Effect } from 'effect';
import type {
  ChatOptions,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
} from '../types.js';

export interface AnthropicProviderConfig {
  id: string;
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  public readonly id: string;
  private model: string;

  public readonly supportsTools = true;
  public readonly supportsFunctions = false;

  constructor(config: AnthropicProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.client = new Anthropic({ apiKey: config.apiKey }) as Anthropic;
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const { system, nonSystem } = splitSystem(messages);

        const requestMessages: MessageParam[] = nonSystem.map((message) => ({
          role: message.role as 'assistant' | 'user',
          content: message.content ?? '',
        }));

        const body: MessageCreateParamsNonStreaming = {
          model: this.model,
          max_tokens: options?.max_tokens ?? 4096,
          messages: requestMessages,
          ...(system ? { system } : {}),
          ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options?.top_p !== undefined ? { top_p: options.top_p } : {}),
          ...(options?.stop ? { stop_sequences: options.stop } : {}),
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const response = (await this.client.messages.create(body)) as Message;

        const content = extractFirstText(response.content as { type: string; text?: string }[]);

        return {
          id: response.id,
          content,
          tool_calls: null,
          usage: response.usage
            ? {
              prompt_tokens: response.usage.input_tokens,
              completion_tokens: response.usage.output_tokens,
              total_tokens: response.usage.input_tokens + response.usage.output_tokens,
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
        const { system, nonSystem } = splitSystem(messages);

        const requestMessages: MessageParam[] = nonSystem.map((message) => ({
          role: message.role as 'assistant' | 'user',
          content: message.content ?? '',
        }));

        const body: MessageCreateParamsStreaming = {
          model: this.model,
          max_tokens: options?.max_tokens ?? 4096,
          messages: requestMessages,
          stream: true,
          ...(system ? { system } : {}),
          ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options?.top_p !== undefined ? { top_p: options.top_p } : {}),
          ...(options?.stop ? { stop_sequences: options.stop } : {}),
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const stream = (await this.client.messages.create(body)) as AsyncIterable<RawMessageStreamEvent>;

        async function* mapChunks(): AsyncIterable<LLMStreamChunk> {
          for await (const chunk of stream) {
            const delta = extractDeltaText(chunk);
            if (delta !== null) {
              yield { choices: [{ delta: { content: delta } }] } satisfies LLMStreamChunk;
            }
          }
        }

        return mapChunks();
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }
}

function splitSystem(messages: LLMMessage[]): { system: string | null; nonSystem: LLMMessage[] } {
  let system: string | null = null;
  const nonSystem: LLMMessage[] = [];
  for (const message of messages) {
    if (message.role === 'system' && system === null) {
      system = message.content ?? null;
    } else {
      nonSystem.push(message);
    }
  }
  return { system, nonSystem };
}

function extractFirstText(content: { type: string; text?: string }[]): string | null {
  const first = content.find((block) => block.type === 'text');
  return first?.text ?? null;
}

function extractDeltaText(chunk: RawMessageStreamEvent): string | null {
  if (typeof chunk !== 'object' || chunk === null) return null;

  const event = chunk as Partial<MessageStreamEvent>;

  if (event.type === 'content_block_delta') {
    const delta = (event as { delta?: { text?: string } }).delta;
    if (delta?.text) return delta.text;
  }

  if (event.type === 'message_delta') {
    const delta = (event as { delta?: { text?: string } }).delta;
    if (delta?.text) return delta.text;
  }

  return null;
}
