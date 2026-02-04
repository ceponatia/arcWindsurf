# Services Package Test Coverage Review

## Scope

Package: `@minimal-rpg/services`

Focus: world mechanics services (location, physics, proximity, rules, time, schedules, social, simulation).

## Existing Tests

- `test/location-service.test.ts`
  - Covers node indexing, adjacency list construction, exit resolution, reachability, pathfinding, prompt formatting, location info map, name search, and default start location selection.
- `test/exit-resolver.test.ts`
  - Covers `ExitResolver.resolveExit` delegation.
- `test/pathfinding.test.ts`
  - Covers reachable locations within travel time, locked connection exclusion.
- `test/spatial-index.test.ts`
  - Covers engage/intensify/reduce/end flows, invalid operations, touch, and end-all for NPCs.
- `test/proximity-service.test.ts`
  - Covers default state creation, engagement start, filtering, proximity levels, summary, stale cleanup, touch/end engagement.
- `test/physics-service.test.ts`
  - Covers MOVE_INTENT to MOVED emission and start/stop idempotence.
- `test/presence-service.test.ts`
  - Covers heartbeat resume behavior, running within threshold, and resume after inactivity.
- `test/validators.test.ts`
  - Covers unknown event pass-through, MOVE_INTENT reachability, SPEAK_INTENT presence/content/busy, and USE_ITEM_INTENT inventory checks.
- `test/rules-engine.test.ts`
  - Covers intent validation, ACTION_REJECTED emission, non-intent ignore, missing session id handling, and start/stop idempotence.
- `test/tick-emitter.test.ts`
  - Covers interval start/stop and tick emission.
- `test/time-service.test.ts`
  - Covers scheduled tick emission, manual tick emission, and tick counter increment.
- `test/scheduler.test.ts`
  - Covers schedule processing, MOVE_INTENT emission, actor state updates, and active session processing.
- `test/dialogue.test.ts`
  - Covers LLM prompt generation and conversation history retention.
- `test/dialogue-service.test.ts`
  - Covers SPEAK_INTENT to SPOKE emission, sessionId gating, and start/stop idempotence.
- `test/dialogue-tree-resolver.test.ts`
  - Covers tree selection priority, option filtering by conditions, and effect execution with state updates.
- `test/faction.test.ts`
  - Covers relationship retrieval, reputation updates and clamping, and hostile checks.
- `test/social-engine.test.ts`
  - Covers start/stop idempotence.
- `test/encounter.test.ts`
  - Covers scene narration, introductions, and entrance/exit narration.

## Notably Untested or Under-tested Areas

### Location

- `LocationService.getChildLocations` is not tested.
- `LocationService.getExitsForLocation` filtering with `includeLockedExits=false` is not tested.
- `LocationService.canReachDirectly` locked exit handling is not tested.
- `LocationService.findPath` unreachable case and locked connection skip are not tested.

### Physics/Proximity

- `PathfindingService.findShortestPath` wrapper path is not tested.
- `SpatialIndex.setNpcProximityLevel` no-op path (same level) is not tested.
- `SpatialIndex.updateEngagement` unknown action and reduce invalid intensity paths are not tested.
- `ProximityService.getHighestIntensityEngagement`, `isWithinProximity`, `getRecentEngagements`, and `endAllEngagementsForNpc` are not tested.

### Presence

- `PresenceService.getLastHeartbeat`, `listSessions`, `removeSession`, `seedSession`, and `setScheduler` are not tested.
- Error handling when `updateSessionHeartbeat` or scheduler calls fail is not tested.

### Rules

- `Validators` coverage is missing for `ATTACK_INTENT` and `TAKE_ITEM_INTENT`.
- `Validators` error branch for `LocationDataValidationError` is not tested.
- `RulesEngine` fail-open behavior when validation throws is not tested.
- `RulesEngine` location extraction paths (nested `locationState`/`simulation`) are not tested.

### Time/Schedules

- `schedule-service` functions (`resolveNpcScheduleAtTime`, `resolveNpcSchedulesBatch`, `checkNpcAvailability`, `getNpcsAtLocationBySchedule`) are not tested.
- `Scheduler.start` subscription path is not tested.
- `Scheduler.processSchedules` early exit paths (no game time, no NPCs, already processing) are not tested.

### Social/Dialogue

- `DialogueService` branch where a dialogue tree is found (uses `DialogueTreeResolver`) is not tested.
- `DialogueTreeResolver` condition types beyond flags (relationship, quest, item, time, custom) and effect handlers (reputation, quest, item, flag) are not tested.
- `DialogueTreeResolver.normalizeState` error cases (missing session/tree) are not tested.
- `FactionService` coverage is missing for `areAllied` and `isEnemy`.

### Simulation

- `encounter` edge cases like empty background crowd, large crowd phrasing, and time-of-day defaults are not tested.
- `simulation/hooks.ts` is types-only and has no runtime tests.

## Suggested Test Additions (Prioritized)

1. Add schedule-service unit tests for schedule resolution, fallbacks, availability, and batch outputs.
2. Extend validators coverage for ATTACK_INTENT, TAKE_ITEM_INTENT, and LocationDataValidationError handling.
3. Add tests for dialogue tree condition/effect types and DialogueService tree path.
4. Cover missing proximity and location branches (locked exits, unreachable paths, wrapper behavior).
5. Add Scheduler early-exit tests and RulesEngine fail-open coverage.

## Notes

- `social-engine.ts` is mostly a placeholder; tests currently only cover lifecycle idempotence.
