# @minimal-rpg/state-manager

## Purpose

Pure, in-memory state management. Merges baseline templates with session overrides and applies JSON Patch (RFC 6902) mutations. Does not persist state; that is handled by db and api.

## Scope

- State merge/diff/apply logic using JSON Patch
- State slice registration and default state management
- Validation hooks via Zod schema integration
- Types and utilities for state computation

## Package Connections

- **schemas**: Uses Zod schemas for state validation
- **governor**: Governor calls `applyPatches` to mutate state after tool execution
- **agents**: Agents produce patches consumed by state-manager
- **api**: API uses state-manager to compute effective state for sessions
- **characters**: Character state flows through state-manager slices
