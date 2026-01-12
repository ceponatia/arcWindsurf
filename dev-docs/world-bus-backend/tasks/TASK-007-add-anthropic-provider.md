# TASK-007: Add Anthropic Provider to LLM Package

**Priority**: P2
**Estimate**: 3-4 hours
**Category**: LLM Provider Expansion

---

## Objective

Add native Anthropic provider adapter to `@minimal-rpg/llm` for Claude models.

## File to Create

`packages/llm/src/providers/anthropic.ts`

## Dependencies to Add

```bash
pnpm --filter @minimal-rpg/llm add @anthropic-ai/sdk
```

## Implementation Steps

1. Install Anthropic SDK
2. Create AnthropicProvider class implementing LLMProvider interface
3. Map LLMMessage format to Anthropic's message format
4. Handle system prompts separately (Anthropic uses `system` param)
5. Support chat and stream methods
6. Map tool calls to Anthropic's tool format
7. Export from package index

## Code Structure

```typescript
import { Effect } from 'effect';
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMResponse, ChatOptions } from '../types.js';

export interface AnthropicProviderConfig {
  id: string;
  apiKey: string;
  model: string; // e.g., 'claude-3-5-sonnet-20241022'
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  public readonly id: string;
  private model: string;

  public readonly supportsTools = true;
  public readonly supportsFunctions = false; // Anthropic uses tools, not functions

  constructor(config: AnthropicProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: options?.max_tokens ?? 4096,
          system: systemMessage?.content ?? undefined,
          messages: nonSystemMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
          })),
        });

        // Map to LLMResponse
        return {
          id: response.id,
          content: response.content[0]?.type === 'text'
            ? response.content[0].text
            : null,
          tool_calls: null, // Map if tools used
          usage: {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens,
          },
        };
      },
      catch: (error) => error instanceof Error ? error : new Error(String(error)),
    });
  }

  stream(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
    // Implement streaming with Anthropic's stream API
  }
}
```

## Update Package Index

```typescript
// packages/llm/src/index.ts
export * from './providers/anthropic.js';
```

## Acceptance Criteria

- [ ] Anthropic SDK added to package
- [ ] AnthropicProvider class created
- [ ] Implements LLMProvider interface
- [ ] System messages handled separately
- [ ] chat() method works with Anthropic API
- [ ] stream() method works with Anthropic streaming
- [ ] Tool calls mapped correctly (if used)
- [ ] Exported from package index
- [ ] TypeScript compiles without errors
