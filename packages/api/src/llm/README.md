# LLM Integration

LLM provider adapters and tool definitions used by the governor-driven turns pipeline.

## Overview

### Providers

- **openrouter.ts** — OpenRouter API adapter (OpenAI-compatible gateway to multiple LLM providers)
- **ollama.ts** — Local Ollama adapter for self-hosted models

### Tools

- **tools/** — Tool definitions and handlers used by the governor for function calling.

The governor composes prompts internally; the legacy prompt builder and JSON templates have been removed.

## Key Exports

- `generateWithOpenRouter(params, options?)` — Generate LLM completions via OpenRouter
- `chatWithOpenRouter(opts)` — Low-level chat completion request
- `chatWithOpenRouterTools(opts)` — OpenRouter chat completion with tool calling support
