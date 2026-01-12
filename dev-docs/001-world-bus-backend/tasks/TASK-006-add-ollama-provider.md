# TASK-006: Add Ollama Provider to LLM Package

**Priority**: P2
**Estimate**: 2-3 hours
**Category**: LLM Provider Expansion

---

## Objective

Add Ollama provider adapter to `@minimal-rpg/llm` for local LLM support.

## File to Create

`packages/llm/src/providers/ollama.ts`

## Implementation Steps

1. Create OllamaProvider class implementing LLMProvider interface
2. Use Ollama's OpenAI-compatible API
3. Configure default baseURL to `http://localhost:11434/v1`
4. Support chat and stream methods
5. Handle Ollama-specific response format differences
6. Export from package index

## Code Structure

```typescript
import { Effect } from 'effect';
import { OpenAI } from 'openai';
import type { LLMProvider, LLMMessage, LLMResponse, ChatOptions } from '../types.js';

export interface OllamaProviderConfig {
  id: string;
  model: string;
  baseURL?: string; // defaults to http://localhost:11434/v1
}

export class OllamaProvider implements LLMProvider {
  private client: OpenAI;
  public readonly id: string;
  private model: string;

  public readonly supportsTools = false; // Most Ollama models don't support tools
  public readonly supportsFunctions = false;

  constructor(config: OllamaProviderConfig) {
    this.id = config.id;
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't require API key
      baseURL: config.baseURL ?? 'http://localhost:11434/v1',
    });
  }

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error> {
    // Similar to OpenAI provider but without tool support
  }

  stream(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
    // Similar to OpenAI provider
  }
}
```

## Update Package Index

```typescript
// packages/llm/src/index.ts
export * from './providers/ollama.js';
```

## Testing Notes

Requires local Ollama installation:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Test endpoint
curl http://localhost:11434/v1/chat/completions \
  -d '{"model": "llama3.2", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Acceptance Criteria

- [ ] OllamaProvider class created
- [ ] Implements LLMProvider interface
- [ ] chat() method works with Ollama API
- [ ] stream() method works with Ollama API
- [ ] Default baseURL points to local Ollama
- [ ] Exported from package index
- [ ] TypeScript compiles without errors
