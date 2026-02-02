# Tool Handlers Plan

**Created**: January 30, 2026
**Status**: Mostly Complete (pending unit tests)
**Priority**: P2
**Effort**: 6-10 hours

---

## Overview

Extend SessionToolHandler with new tool implementations for examine_object, navigate_player, and use_item.

## Problem Statement

The tool definition constants (`EXAMINE_OBJECT_TOOL`, `NAVIGATE_PLAYER_TOOL`, `USE_ITEM_TOOL`) exist but aren't implemented in SessionToolHandler. When the LLM calls these tools, they silently fail or return empty results.

## Current Implementation

All three handlers are implemented in [packages/api/src/game/tools/gameplay-handlers.ts](../../packages/api/src/game/tools/gameplay-handlers.ts):

- `handleExamineObject` - Resolves targets (locations, actors, items) and returns descriptions
- `handleNavigatePlayer` - Moves player via direction or destination, supports describe_only mode
- `handleUseItem` - Uses inventory items with consumable quantity tracking

All handlers emit WorldBus events and are wired into `SessionToolHandler` via [packages/api/src/game/tools/handlers.ts](../../packages/api/src/game/tools/handlers.ts).

## Success Criteria

- [x] `examine_object` returns object descriptions
- [x] `navigate_player` moves player between locations
- [x] `use_item` applies item effects
- [x] All handlers emit appropriate WorldBus events
- [x] Error handling for invalid tool arguments
- [ ] Unit tests for each handler (pending)

## Dependencies

- `@minimal-rpg/db` - Actor/item/location queries
- `@minimal-rpg/bus` - Event emission
- `@minimal-rpg/services` - LocationService for navigation
- `@minimal-rpg/schemas` - Inventory and location schemas

## Related Files

- [packages/api/src/game/tools/gameplay-handlers.ts](../../packages/api/src/game/tools/gameplay-handlers.ts) - Handler implementations
- [packages/api/src/game/tools/handlers.ts](../../packages/api/src/game/tools/handlers.ts) - SessionToolHandler (wiring)
- [packages/api/src/game/tools/tool-args.ts](../../packages/api/src/game/tools/tool-args.ts) - Zod argument schemas
- [packages/api/src/game/tools/types.ts](../../packages/api/src/game/tools/types.ts) - TypeScript types
