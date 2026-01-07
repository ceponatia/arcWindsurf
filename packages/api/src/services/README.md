# Session Services

Session-scoped utilities for the RPG engine.

## Overview

- Instance management for per-session overrides
- Schedule resolution helpers for NPC availability
- Simulation hooks/services for time and turn changes
- Tier scoring for NPC interest and promotions
- Encounter narration helpers

## Exports

### Instance Management (`instances.ts`)

- `getEffectiveCharacter(sessionId, character)` — Returns merged character profile
- `getEffectiveSetting(sessionId, setting)` — Returns merged setting profile
- `getEffectiveProfiles(sessionId, character, setting)` — Returns both effective profiles
- `upsertCharacterOverrides(params)` — Applies overrides to a character instance
- `upsertSettingOverrides(params)` — Applies overrides to a setting instance
- `deepMergeReplaceArrays(base, override)` — Deep merge utility

### Schedule Service (`schedule-service.ts`)

- `resolveNpcScheduleAtTime(time, schedule)` — Resolve a schedule at a specific time
- `resolveNpcSchedulesBatch(options)` — Resolve multiple schedules concurrently
- `checkNpcAvailability(...)` — Determine if an NPC is available
- `getNpcsAtLocationBySchedule(...)` — Find NPCs at a location based on schedules

### Simulation Service (`simulation-service.ts`)

- `runSimulationTick(options)` — Advance NPC simulations by one tick
- `runTimeSkipSimulation(options)` — Simulate a time skip
- `getNpcsNeedingSimulation(sessionId)` — Identify NPCs requiring simulation
- `buildSimulationPriorities(sessionId)` — Prioritize NPCs for simulation

### Simulation Hooks (`simulation-hooks.ts`)

- `onTurnComplete`, `onPeriodChange`, `onLocationChange`, `onTimeSkip`
- Hook-specific input/result types for turn, period, location, and time skip events

### Tier Service (`tier-service.ts`)

- `getInterestScore(sessionId, npcId)` — Compute interest score for a single NPC
- `getAllInterestScores(sessionId)` — Compute interest scores for all NPCs
- `processTurnInterest(...)` — Update interest after a turn
- `executePromotion(...)` — Promote NPCs based on thresholds

### Encounter Service (`encounter-service.ts`)

- `generateEncounterNarration(options)` — Build encounter narration
- `generateNpcEntranceNarration(options)` — Narrative for NPC entrance
- `generateNpcExitNarration(options)` — Narrative for NPC exit
