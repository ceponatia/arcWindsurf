# Governor Composition

Factory and configuration for the Governor system that orchestrates game turns.

## Overview

Provides `createGovernorForRequest()` which wires together the core components:

- **StateManager** — Manages and validates game state patches
- **AgentRegistry** — Registers domain agents (Map, NPC, Rules)
- **RetrievalService** — In-memory knowledge retrieval
- **IntentDetector** — LLM-based or rule-based intent classification
- **ResponseComposer** — LLM-based narrative composition from agent outputs
- **NPC Transcript Loader** — Fetches NPC conversation history

## Configuration

Uses OpenRouter for LLM calls when `OPENROUTER_API_KEY` is set. Falls back to rule-based intent detection and template-based responses otherwise.

## Exports

- `createGovernorForRequest(options?)` — Creates a Governor instance for handling game turns
