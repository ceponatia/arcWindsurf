# Faction Service Plan

**Created**: January 30, 2026
**Status**: Complete
**Priority**: P1
**Effort**: 8-12 hours

---

## Overview

Implement the FactionService to enable faction-based gameplay with relationship tracking between factions and actor reputation with factions.

## Problem Statement

The current FactionService in `packages/services/src/social/faction.ts` always returns neutral (0) for all faction relationships and discards reputation updates. This prevents faction-based gameplay mechanics like:

- NPCs reacting based on player's faction reputation
- Faction wars affecting world state
- Reputation gates for quests/areas
- Alliance and enemy detection

## Existing Infrastructure

### Entity Profiles Table

Already supports factions as an entity type:

```sql
entity_type TEXT NOT NULL, -- 'character', 'setting', 'item', 'faction', 'persona'
```

### World Sim State

Has flexible JSONB container that could store faction state:

```sql
state_json JSONB NOT NULL DEFAULT '{}'
```

## Implementation Approach

### Phase 1: Schema & Basic Service (4-6 hours)

1. Add `faction_relationships` table for faction-to-faction relations
2. Add `actor_faction_reputation` table for actor-to-faction reputation
3. Implement `getRelationship()` with bidirectional lookup
4. Implement `updateReputation()` with change persistence

### Phase 2: Integration (4-6 hours)

1. Wire reputation changes to WorldBus events
2. Add reputation checks to NPC behavior
3. Integrate with DialogueService for faction-aware responses

## Success Criteria

- [x] Faction relationships persist to database
- [x] Reputation changes persist to database
- [x] Bidirectional faction lookups work correctly
- [ ] Reputation affects NPC dialogue (via DialogueService) - Future integration
- [ ] Actions can trigger reputation changes (via WorldBus) - Future integration

## Dependencies

- `@minimal-rpg/db` - Drizzle schema and queries
- `@minimal-rpg/bus` - WorldBus for reputation events

## Related Files

- [packages/services/src/social/faction.ts](../../packages/services/src/social/faction.ts) - Current placeholder
- [packages/db/sql-fresh/001_foundation/001_foundation.sql](../../packages/db/sql-fresh/001_foundation/001_foundation.sql) - Entity profiles
