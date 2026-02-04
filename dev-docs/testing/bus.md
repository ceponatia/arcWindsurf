# Bus Test Coverage Analysis

Date: 2026-02-04
Scope: packages/bus (tests + source review)

## Existing tests

Core
- test/world-bus.test.ts
- test/index.test.ts

Adapters and infrastructure
- test/redis-pubsub.test.ts
- test/redis-client.test.ts

Middleware
- test/telemetry.test.ts

## What is covered today

World bus behavior
- Middleware ordering and publish execution.
- Subscribe/unsubscribe forwarding to adapter.

Redis adapter + client
- Publish calls Redis.
- Subscribes once, dispatches parsed events to handlers.
- Logs handler promise rejections and invalid JSON.
- Instantiates Redis clients and registers error handlers.

Telemetry middleware
- Span attributes for event type and session id.
- Success and error status handling, exception recording.

## Missing or thin coverage by area

Persistence middleware
- src/middleware/persistence.ts: register handler, handler error logging, and middleware continuation behavior.

Redis adapter edge cases
- src/adapters/redis-pubsub.ts: ensures multiple handlers are invoked, handler removal stops further calls, ignores other channels.
- WireWorldEventSchema validation failure paths beyond invalid JSON (schema mismatch).

WorldBus edge cases
- src/index.ts: behavior when middleware throws (ensures publish not called, error propagates).
- Middleware chain termination (no middleware case) is partially covered but not explicit.

Index exports
- src/index.ts exports for middleware/persistence/redis-client are not exercised.

## Suggested next test targets (bus package)

1) persistence middleware
- registerPersistenceHandler wiring, error logging, and that bus continues to publish on handler failures.

2) redis adapter edge cases
- Multiple handlers, unsubscribe behavior, channel filtering, schema mismatch logging.

3) WorldBus error propagation
- Middleware throwing and ensuring publish is skipped and error surfaces to caller.
