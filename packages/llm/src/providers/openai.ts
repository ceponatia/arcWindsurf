import { Effect } from 'effect';
import { OpenAI } from 'openai';
import type {
  ChatOptions,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
} from '../types.js';
import type { ToolCall } from '../tools/types.js';

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

  public readonly supportsTools = true;
  public readonly supportsFunctions = true;

  constructor(config: OpenAIProviderConfig) {
    this.id = config.id;
    this.model = config.model;
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

        const body: OpenAICreateParams = {
          model: this.model,
          messages: openAIMessages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
          ...(tools !== undefined ? { tools } : {}),
          ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
          ...(responseFormat !== undefined ? { response_format: responseFormat } : {}),
        };

        const response = await this.client.chat.completions.create(body);

        const choice = response.choices[0];
        if (!choice) {
          throw new Error('No choice in response');
        }

        const toolCalls: ToolCall[] | null = choice.message.tool_calls
          ? choice.message.tool_calls.map((toolCall) => ({
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

        const body: OpenAICreateParamsStreaming = {
          model: this.model,
          messages: openAIMessages,
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(topP !== undefined ? { top_p: topP } : {}),
          ...(stop !== undefined ? { stop } : {}),
          ...(tools !== undefined ? { tools } : {}),
          ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
          ...(responseFormat !== undefined ? { response_format: responseFormat } : {}),
          stream: true,
        };

        const stream = await this.client.chat.completions.create(body);
        return stream as AsyncIterable<LLMStreamChunk>;
      },
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
  }
}
