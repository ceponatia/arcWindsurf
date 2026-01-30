# Rules Engine Plan

**Created**: January 30, 2026
**Status**: ✅ Complete
**Priority**: P1
**Effort**: 8-16 hours

---

## Overview

Implement the RulesEngine and Validators to validate game actions and enforce game rules before they're executed.

## Problem Statement

The current RulesEngine subscribes to WorldBus but doesn't validate any events. The Validators class returns `{ valid: true }` for all actions. This means:

- Invalid moves aren't prevented
- Items can be used inappropriately
- Game rules aren't enforced
- Exploit vectors exist

## Existing Infrastructure

### RulesEngine ([packages/services/src/rules/rules-engine.ts](../../packages/services/src/rules/rules-engine.ts))

- Subscribes to WorldBus events
- Has start/stop methods
- Logs events but doesn't validate

### Validators ([packages/services/src/rules/validators.ts](../../packages/services/src/rules/validators.ts))

- `ValidationResult` interface defined
- `ValidationContext` interface defined
- `validateAction` method stub

## Implementation Approach

### Phase 1: Core Validation (4-6 hours)

1. Define validation rules per intent type
2. Build validation context from session state
3. Implement validators for common intents
4. Wire RulesEngine to reject invalid intents

### Phase 2: Advanced Rules (4-10 hours)

1. Add item usage rules
2. Add faction-based restrictions
3. Add time-based rules (curfew, business hours)
4. Add location access rules

## Success Criteria

- [x] Invalid MOVE_INTENT blocked (unreachable locations)
- [x] Invalid SPEAK_INTENT blocked (NPC not present)
- [x] Invalid USE_ITEM_INTENT blocked (item not owned)
- [x] ACTION_REJECTED events emitted with reasons
- [x] Rules are configurable/extensible

## Dependencies

- `@minimal-rpg/bus` - WorldBus events
- `@minimal-rpg/db` - Session state queries
- `@minimal-rpg/schemas` - Event types

## Related Files

- [packages/services/src/rules/rules-engine.ts](../../packages/services/src/rules/rules-engine.ts) - Engine
- [packages/services/src/rules/validators.ts](../../packages/services/src/rules/validators.ts) - Validators
- [packages/services/test/rules-engine.test.ts](../../packages/services/test/rules-engine.test.ts) - RulesEngine tests
- [packages/services/test/validators.test.ts](../../packages/services/test/validators.test.ts) - Validators tests
