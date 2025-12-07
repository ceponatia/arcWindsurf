# Utilities

Shared utility functions for the API server.

## Overview

- **config.ts** — Runtime configuration from environment variables (`PORT`, `CONTEXT_WINDOW`, `TEMPERATURE`, `TOP_P`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GOVERNOR_DEV_MODE`)
- **health.ts** — Health check utilities (e.g., `checkOllama` for local Ollama server)
- **version.ts** — Reads package version from root `package.json`

## Exports

- `getConfig()` — Returns parsed `RuntimeConfig` from environment
- `checkOllama(baseUrl)` — Checks Ollama server availability
- `getVersion()` — Returns the application version string
