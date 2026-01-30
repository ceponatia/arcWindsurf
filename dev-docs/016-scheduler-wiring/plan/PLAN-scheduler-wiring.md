# Scheduler Wiring Plan

**Created**: January 30, 2026
**Status**: ✅ Complete
**Priority**: P0 - Enables NPC autonomy
**Effort**: 4-6 hours

---

## Overview

Wire the `Scheduler.processSchedules()` method to use the existing `schedule-service` for resolving NPC schedules and emitting movement events via WorldBus.

## Problem Statement

The Scheduler service currently logs debug messages but doesn't actually process NPC schedules. All the schedule resolution logic exists in `schedule-service.ts` but isn't connected.

## Existing Infrastructure

### Schedule Service ([packages/services/src/time/schedule-service.ts](../../packages/services/src/time/schedule-service.ts))

- `resolveNpcScheduleAtTime()` - Resolves NPC location from schedule
- `resolveNpcSchedulesBatch()` - Batch resolution for multiple NPCs
- `checkNpcAvailability()` - Checks if NPC is interruptible
- `getNpcsAtLocationBySchedule()` - Find NPCs at a location

### Schedule Types ([packages/schemas/src/schedule/types.ts](../../packages/schemas/src/schedule/types.ts))

- Full schedule slot definitions
- Choice-based destinations
- Override conditions
- Template system

### Schedule Templates ([packages/schemas/src/schedule/defaults.ts](../../packages/schemas/src/schedule/defaults.ts))

- Shopkeeper, Guard, Tavern Keeper, Noble, Wanderer templates
- Common activities (sleeping, working, eating, etc.)

### Tick Emitter ([packages/services/src/time/tick-emitter.ts](../../packages/services/src/time/tick-emitter.ts))

- Emits TICK events to WorldBus at regular intervals

## Implementation Approach

1. Subscribe Scheduler to TICK events from WorldBus
2. On tick, resolve schedules for all NPCs in active sessions
3. Compare resolved locations with current locations
4. Emit MOVE_INTENT events for NPCs that need to move
5. Update actor state with new activity/engagement

## Success Criteria

- [x] Scheduler processes schedules on each TICK event
- [x] NPCs move to scheduled locations
- [x] Activities update based on schedule
- [x] Performance: < 100ms for typical session
- [x] No duplicate move events

## Dependencies

- `@minimal-rpg/bus` - WorldBus subscription
- `@minimal-rpg/db` - Actor state queries
- `@minimal-rpg/api` - Schedule service

## Related Files

- [packages/services/src/time/scheduler.ts](../../packages/services/src/time/scheduler.ts) - Scheduler implementation
- [packages/services/src/time/schedule-service.ts](../../packages/services/src/time/schedule-service.ts) - Schedule resolution
- [packages/services/src/time/tick-emitter.ts](../../packages/services/src/time/tick-emitter.ts) - TICK source
- [packages/services/test/scheduler.test.ts](../../packages/services/test/scheduler.test.ts) - Unit tests
