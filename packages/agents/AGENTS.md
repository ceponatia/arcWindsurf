# @minimal-rpg/agents

## Purpose

Domain-specific workers that execute game actions. Each agent handles a specific behavior domain (navigation, dialogue, rules, parsing) and returns narrative text plus state patches.

## Scope

- Agent interfaces, contracts, and base classes
- Agent implementations: `MapAgent`, `NpcAgent`, `RulesAgent`, `ParserAgent`
- Agent registry and intent-based dispatch
- Agent execution helpers and diagnostics

## Package Connections

- **schemas**: Uses shared types for state slices, intents, and agent I/O
- **state-manager**: Agents produce JSON Patch operations; does not apply them directly
- **governor**: Receives agent outputs; governor orchestrates execution and applies patches
- **retrieval**: Agents receive knowledge context as input (passed through by governor)
- **characters**: Reads character data (and hygiene/sensory state when available) to ground responses
- **utils**: Reuses shared logging, error, and formatting helpers; avoid duplicating cross-cutting utilities in agents

## Authoring Notes

- Keep each agent in its own module folder with its domain types in a local `types.ts`. Only promote shared types to `src/types.ts` when they are used across multiple agents.
- Inject external services (LLM providers, repositories, hygiene/memory services) via config; avoid direct instantiation inside agents.
