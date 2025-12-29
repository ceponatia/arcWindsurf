# @minimal-rpg/characters

## Purpose

Character domain logic and services. Manages character profiles, body maps, hygiene state, and personality data.

## Scope

- Character domain models and state shapes
- Services for loading, saving, and updating character data
- Domain logic: hygiene calculations, body map handling, personality utilities
- Character-focused helpers for state updates

## Package Connections

- **schemas**: Uses character-related Zod schemas and types
- **state-manager**: Integrates with state slices for character state
- **agents**: Provides character context to agents
- **retrieval**: Extracts knowledge nodes from character profiles
- **utils**: Shared parsing and formatting helpers
