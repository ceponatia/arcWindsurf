# Session Services

Session-scoped state management, persistence, and caching for the RPG engine.

## Overview

This module provides the full lifecycle for session state:

1. **Instances** — Per-session profile copies with override support
2. **State Cache** — In-memory session-only state (proximity, dialogue)
3. **State Loader** — Turn-start state assembly from DB + cache
4. **State Persister** — Turn-end state saving to DB + cache

## Key Concepts

- **Template** — The original character/setting profile (read-only reference)
- **Instance** — A session-specific copy that can have overrides applied
- **Overrides** — Partial updates merged onto the instance using deep merge
- **Session State** — Ephemeral state that lives only in memory during a session
- **Persisted State** — Durable state saved to the database between turns

## Exports

### Instance Management (`instances.ts`)

- `getEffectiveCharacter(sessionId, character)` — Returns merged character profile
- `getEffectiveSetting(sessionId, setting)` — Returns merged setting profile
- `getEffectiveProfiles(sessionId, character, setting)` — Returns both effective profiles
- `upsertCharacterOverrides(params)` — Applies overrides to a character instance
- `upsertSettingOverrides(params)` — Applies overrides to a setting instance
- `deepMergeReplaceArrays(base, override)` — Deep merge utility

### Session State Cache (`state-cache.ts`)

- `sessionStateCache` — Singleton cache instance
- `SessionStateCache` — Class with TTL, LRU eviction, periodic cleanup
- Stores: `proximityState`, `dialogueState` per session

### State Loader (`state-loader.ts`)

- `loadStateForTurn({ sessionId, targetNpcId })` — Loads all state slices for a turn
- Returns: baseline profiles, overrides, session state, instances, NPC context

### State Persister (`state-persister.ts`)

- `persistTurnState({ sessionId, patches })` — Saves DB-backed state slices
- `persistSessionState({ sessionId, proximity, dialogue })` — Saves cache state
- `clearSessionState(sessionId)` — Clears session cache on disconnect

## State Flow

```text
Turn Start:
  DB → StateLoader → { baseline, overrides, sessionState }
                          ↓
  Governor receives AgentStateSlices

Turn End:
  Governor returns patches
                          ↓
  StatePersister → DB (character, setting, location, inventory, time)
                 → Cache (proximity, dialogue)
```
