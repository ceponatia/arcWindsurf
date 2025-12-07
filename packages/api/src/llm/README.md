# LLM Integration

LLM provider adapters and prompt construction utilities.

## Overview

### Providers

- **openrouter.ts** — OpenRouter API adapter (OpenAI-compatible gateway to multiple LLM providers)
- **ollama.ts** — Local Ollama adapter for self-hosted models
- **providerUtils.ts** — Shared utilities for building provider options

### Prompt Building

- **prompt.ts** — Constructs system prompts from character/setting profiles, handles history summarization, and applies tag-specific rules

### Prompt Templates

The `prompts/` directory contains JSON configuration files:

- `system-prompt.json` — Base narrative rules
- `system-prompt-romance.json`, `system-prompt-adventure.json`, `system-prompt-mystery.json` — Tag-specific rule extensions
- `safety-mode.json`, `safety-rules.json` — Content filtering configuration

## Key Exports

- `generateWithOpenRouter(params, options?)` — Generate LLM completions via OpenRouter
- `chatWithOpenRouter(opts)` — Low-level chat completion request
- `buildPrompt(opts)` — Build the full message array for LLM calls
- `assertPromptConfigValid()` — Validate prompt JSON configuration at startup
