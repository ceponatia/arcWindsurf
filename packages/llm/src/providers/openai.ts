import { Effect } from 'effect';
import { OpenAI } from 'openai';
import type {
  ChatOptions,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
} from '../types.js';
import { getOpenRouterEnvSettings, type OpenRouterEnvConfig } from '../config.js';
import type { ToolCall } from '@minimal-rpg/schemas';

export interface ProviderRouting {
  order?: string[];
  sort?: 'price' | 'throughput' | 'latency';
  allow_fallbacks?: boolean;
}

export interface OpenAIProviderConfig {
  id: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  /** OpenRouter-specific provider routing preferences */
  providerRouting?: ProviderRouting;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  public readonly id: string;
  private model: string;
  private providerRouting: ProviderRouting | undefined;

  public readonly supportsTools = true;
  public readonly supportsFunctions = true;

  constructor(config: OpenAIProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.providerRouting = config.providerRouting;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
        type OpenAICreateParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

        const openAIMessages: OpenAIMessageParam[] = messages.map((message): OpenAIMessageParam => {
          switch (message.role) {
            case 'tool': {
              return {
                role: 'tool',
                content: message.content ?? '',
                tool_call_id: message.tool_call_id ?? '',
              };
            }

            case 'assistant': {
              return {
                role: 'assistant',
                content: message.content,
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
                ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
              };
            }

            case 'system': {
              return {
                role: 'system',
                content: message.content ?? '',
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
              };
            }

            case 'user': {
              return {
                role: 'user',
                content: message.content ?? '',
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
              };
            }
          }
        });

        const temperature = options?.temperature;
        const maxTokens = options?.max_tokens;
        const topP = options?.top_p;
        const stop = options?.stop;
        const tools = options?.tools;
        const toolChoice = options?.tool_choice;
        const responseFormat = options?.response_format;

        const body: OpenAICreateParams & { provider?: ProviderRouting } = {
          model: this.model,
          messages: openAIMessages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
          ...(tools !== undefined ? { tools } : {}),
          ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
          ...(responseFormat !== undefined ? { response_format: responseFormat } : {}),
          ...(this.providerRouting ? { provider: this.providerRouting } : {}),
        };

        const response = await this.client.chat.completions.create(body as OpenAICreateParams);

        const choice = response.choices[0];
        if (!choice) {
          throw new Error('No choice in response');
        }

        type OpenAIFunctionToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;

        const toolCalls: ToolCall[] | null = choice.message.tool_calls
          ? choice.message.tool_calls
            .filter((toolCall): toolCall is OpenAIFunctionToolCall => toolCall.type === 'function')
            .map((toolCall) => ({
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            }))
          : null;

        return {
          id: response.id,
          content: choice.message.content,
          tool_calls: toolCalls,
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

  stream(
    messages: LLMMessage[],
    options?: ChatOptions
  ): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
    return Effect.tryPromise({
      try: async () => {
        type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
        type OpenAICreateParamsStreaming =
          OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

        const openAIMessages: OpenAIMessageParam[] = messages.map((message): OpenAIMessageParam => {
          switch (message.role) {
            case 'tool': {
              return {
                role: 'tool',
                content: message.content ?? '',
                tool_call_id: message.tool_call_id ?? '',
              };
            }

            case 'assistant': {
              return {
                role: 'assistant',
                content: message.content,
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
                ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
              };
            }

            case 'system': {
              return {
                role: 'system',
                content: message.content ?? '',
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
              };
            }

            case 'user': {
              return {
                role: 'user',
                content: message.content ?? '',
                ...(typeof message.name === 'string' ? { name: message.name } : {}),
              };
            }
          }
        });

        const temperature = options?.temperature;
        const maxTokens = options?.max_tokens;
        const topP = options?.top_p;
        const stop = options?.stop;
        const tools = options?.tools;
        const toolChoice = options?.tool_choice;
        const responseFormat = options?.response_format;

        const body: OpenAICreateParamsStreaming & { provider?: ProviderRouting } = {
          model: this.model,
          messages: openAIMessages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
          ...(tools !== undefined ? { tools } : {}),
          ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
          ...(responseFormat !== undefined ? { response_format: responseFormat } : {}),
          ...(this.providerRouting ? { provider: this.providerRouting } : {}),
          stream: true,
        };

        const stream = await this.client.chat.completions.create(body as OpenAICreateParamsStreaming);
        return stream as AsyncIterable<LLMStreamChunk>;
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }
}

/**
 * Convenience factory to build an OpenRouter-backed provider using env vars.
 * Expects OPENROUTER_API_KEY and optional OPENROUTER_MODEL/OPENROUTER_BASE_URL.
 * Optional OPENROUTER_PROVIDER_ORDER for provider routing (comma-separated).
 */
export function createOpenRouterProviderFromEnv(
  config?: OpenRouterEnvConfig
): OpenAIProvider | null {
  const settings = getOpenRouterEnvSettings(config);
  if (!settings) return null;

  const providerRouting = settings.providerSort ? { sort: settings.providerSort } : undefined;

  return new OpenAIProvider({
    id: settings.id,
    apiKey: settings.apiKey,
    baseURL: settings.baseURL,
    model: settings.model,
    ...(providerRouting ? { providerRouting } : {}),
  });
}
