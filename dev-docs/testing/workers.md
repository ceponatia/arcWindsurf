# Workers Package Test Coverage Review

## Scope

Package: `@minimal-rpg/workers`

Focus: BullMQ queue setup, job processors, scheduler, heartbeat monitoring, and worker bootstrap.

## Existing Tests

- `test/config.test.ts`
  - Covers Redis connection parsing (redis/rediss), processor wrapper metrics, and crash handling in `createWorker`.
- `test/processors.test.ts`
  - Covers tick processor event emission, cognition processor success/error, and embedding processor completion.
- `test/queues.test.ts`
  - Covers enqueue helpers for cognition, tick, and embedding queues.
- `test/scheduler.test.ts`
  - Covers start/stop world tick job creation, idempotent scheduling, and repeatable removal.
- `test/heartbeat-monitor.test.ts`
  - Covers stale session detection and removal, and recent session no-op behavior.

## Notably Untested or Under-tested Areas

### Worker Bootstrap

- `src/index.ts` main bootstrap path (OpenAI provider setup, queue/worker wiring, shutdown handling) is not tested.
- Presence hydration (`hydratePresenceFromDatabase`) and integration with `presenceService`/`Scheduler` are not tested.

### Config and Queues

- `getBullMqConnectionOptions` error cases for invalid protocol/port are not tested.
- Queue options (priority, removeOnComplete) are not asserted.

### Processors

- `createCognitionProcessor` does not test emitted payload shape or use of `context.lastEvents`.
- `createTickProcessor` does not test event values beyond emission (tick count/time parsing).
- `createEmbeddingProcessor` timing/logging behavior is not tested.

### Scheduler

- `startWorldTick` path for replacing existing jobs with mismatched interval is not tested.

### Heartbeat Monitor

- `start`/`stop` interval behavior and log output are not tested.

## Suggested Test Additions (Prioritized)

1. Add tests for `getBullMqConnectionOptions` invalid protocol/port errors.
2. Add scheduler test for rescheduling when interval changes.
3. Add cognition processor test asserting SPEAK_INTENT payload values.
4. Add bootstrap tests for presence hydration and worker shutdown handling.

## Notes

- `types.ts` defines shared job payloads and is fully exercised indirectly by processor/queue tests.
