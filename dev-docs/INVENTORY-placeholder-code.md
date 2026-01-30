# Placeholder & Incomplete Code Inventory

**Generated**: January 30, 2026
**Purpose**: Track incomplete implementations, TODOs, and stub code across the codebase

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Service Stubs (returns placeholder data) | 5 | High |
| TODO Comments (implementation needed) | 13 | Medium |
| Empty Type Files | 9 | Low |
| Tool Definitions (schema only, no handler) | 3 | Medium |
| Data Migration Pending | 2 | Medium |

---

## High Priority: Service Stubs

These services exist but return placeholder/hardcoded data instead of real implementations.

### 1. TurnOrchestrator - NPC Response

**File**: [packages/api/src/services/turn-orchestrator.ts](packages/api/src/services/turn-orchestrator.ts#L185-L188)

```typescript
// TODO: Wire to actor cognition or LLM call.
void playerMessage;
void this.llmProvider;
return '[NPC response placeholder]';
```

**Impact**: Game sessions cannot generate real NPC dialogue
**Depends On**: TASK-011 (Living World Game Loop)

---

### 2. TurnOrchestrator - Ambient Narration

**File**: [packages/api/src/services/turn-orchestrator.ts](packages/api/src/services/turn-orchestrator.ts#L172)

```typescript
// TODO: Wire to AmbientCollector (TASK-014).
void sessionId;
return [];
```

**Impact**: No background world narration during gameplay
**Depends On**: TASK-004 (AmbientCollector)

---

### 3. DialogueService

**File**: [packages/services/src/social/dialogue.ts](packages/services/src/social/dialogue.ts#L35-L42)

```typescript
static resolveResponse(actorId: string, context: DialogueContext): DialogueResponse {
  // TODO: Implement dialogue tree resolution using actorId and context
  // For now, return placeholder acknowledging the actor
  return {
    content: "I'm listening...",
    options: [],
  };
}
```

**Impact**: No dialogue tree support - all NPCs respond identically
**Depends On**: Dialogue tree schema design

---

### 4. FactionService

**File**: [packages/services/src/social/faction.ts](packages/services/src/social/faction.ts#L21-L34)

```typescript
static getRelationship(factionA: string, factionB: string): FactionRelationship {
  // TODO: Implement faction relationship lookup from state/db
  return 0; // Always neutral
}

static updateReputation(actorId: string, factionId: string, delta: number): void {
  // TODO: Implement reputation persistence
  console.debug(...);
}
```

**Impact**: Faction system non-functional - all factions neutral, reputation changes lost
**Depends On**: DB schema for faction relationships

---

### 5. Scheduler

**File**: [packages/services/src/time/scheduler.ts](packages/services/src/time/scheduler.ts#L15)

```typescript
static async processSchedules(tick: number): Promise<void> {
  // TODO: Implement schedule processing - check NPC schedules against current tick,
  // emit location change events via worldBus when NPCs need to move
  console.debug(`[Scheduler] Processing schedules for tick ${tick}`);
  await Promise.resolve();
}
```

**Impact**: NPC schedules exist in DB but never trigger movement
**Depends On**: WorldBus event integration

---

## Medium Priority: TODO Comments

Active TODOs indicating incomplete features.

### Rules Engine

**File**: [packages/services/src/rules/rules-engine.ts](packages/services/src/rules/rules-engine.ts#L13)

```typescript
// TODO: Implement rule validation based on event.type
// For now, log and acknowledge all events
```

**Status**: All events pass validation - no game rules enforced

---

### Validators

**File**: [packages/services/src/rules/validators.ts](packages/services/src/rules/validators.ts#L13-L33)

```typescript
// TODO: Define proper GameState type in schemas when state structure is finalized.
// TODO: Implement validation rules per action type
// For now, log the validation attempt and allow all actions
return { valid: true, reason: '' };
```

**Status**: All actions valid - no validation logic

---

### TurnOrchestrator - Time Service

**File**: [packages/api/src/services/turn-orchestrator.ts](packages/api/src/services/turn-orchestrator.ts#L160)

```typescript
// TODO: Replace with a session-aware time service when available.
void sessionId;
```

**Status**: Time advances globally, not per-session

---

### Tag Builder API

**File**: [packages/web/src/features/tag-builder/api.ts](packages/web/src/features/tag-builder/api.ts#L39)

```typescript
// TODO: Pass options to API when backend supports query params
```

**Status**: Client-side filtering used as workaround

---

### Prefab Builder Store

**Files**: [packages/web/src/features/prefab-builder/store.ts](packages/web/src/features/prefab-builder/store.ts#L105) and [L703](packages/web/src/features/prefab-builder/store.ts#L703)

```typescript
// TODO: Migrate to new relational structure
// TODO: Update API to use new relational structure
```

**Status**: Uses legacy inline node format; relational model exists but not wired

---

## Medium Priority: Tool Definitions (Schema Only)

These LLM tools have schema definitions but no execution handlers.

### examine_object

**File**: [packages/llm/src/tools/definitions/environment/examine-object.ts](packages/llm/src/tools/definitions/environment/examine-object.ts)

**Status**: Tool schema defined, no handler implementation

---

### navigate_player

**File**: [packages/llm/src/tools/definitions/environment/navigate-player.ts](packages/llm/src/tools/definitions/environment/navigate-player.ts)

**Status**: Tool schema defined, no handler implementation

---

### use_item

**File**: [packages/llm/src/tools/definitions/inventory/use-item.ts](packages/llm/src/tools/definitions/inventory/use-item.ts)

**Status**: Tool schema defined, no handler implementation

---

## Low Priority: Empty Type Files

Placeholder type files created for module structure but containing no types.

| File | Content |
|------|---------|
| [packages/db/src/vector/types.ts](packages/db/src/vector/types.ts) | `// Placeholder for vector types` |
| [packages/db/src/utils/types.ts](packages/db/src/utils/types.ts) | `// Placeholder for utils types` |
| [packages/retrieval/src/scoring/types.ts](packages/retrieval/src/scoring/types.ts) | `// Placeholder for scoring types` |
| [packages/retrieval/src/services/types.ts](packages/retrieval/src/services/types.ts) | `// Placeholder for services types` |
| [packages/retrieval/src/utils/types.ts](packages/retrieval/src/utils/types.ts) | `// Placeholder for utils types` |
| [packages/utils/src/http/types.ts](packages/utils/src/http/types.ts) | `// Placeholder for http types` |
| [packages/utils/src/errors/types.ts](packages/utils/src/errors/types.ts) | `// Placeholder for errors types` |
| [packages/utils/src/parsers/types.ts](packages/utils/src/parsers/types.ts) | `// Placeholder for shared parser types` |
| [packages/utils/src/settings/types.ts](packages/utils/src/settings/types.ts) | `// Placeholder for settings types` |

**Action**: Can be deleted if unused, or populated when features are implemented

---

## Intentional Placeholders (Not Incomplete)

These use "placeholder" terminology but are working as designed:

- **Schedule Templates** (`@minimal-rpg/schemas`): `$workLocation`, `$homeLocation` placeholders are intentional template variables
- **Physics Engine**: Explicitly documented as "thin placeholder until full physics/pathfinding is added" - converts MOVE_INTENT to MOVED events correctly
- **Social Engine**: Basic event handling that logs events - may be intentional minimal implementation

---

## Related Documentation

- [010-living-world-game-loop](010-living-world-game-loop/status/STATUS.md): TASK-001 partially complete, rest planned
- [011-vector-rag-implementation](011-vector-rag-implementation/plan/PLAN-postgres-to-qdrant-migration.md): Phase 0 requires EmbeddingService implementation

---

## Recommended Prioritization

1. **TurnOrchestrator wiring** - Blocks playable game sessions
2. **Scheduler implementation** - Enables NPC autonomy
3. **DialogueService** - Enables conversation variety
4. **Tool handlers** - Enables LLM-driven gameplay actions
5. **FactionService** - Enables faction-based gameplay
6. **Type file cleanup** - Low impact, do when touching related code
