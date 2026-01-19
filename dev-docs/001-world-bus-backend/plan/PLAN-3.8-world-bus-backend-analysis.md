# World Bus Backend Analysis

**Status**: Verification Complete
**Created**: January 11, 2026
**Reference**: WORLD_BUS_STATUS.md (archived)
**Prerequisite For**: PLAN-4.1-character-studio-1.0.md

---

## Executive Summary

This document analyzes the current state of the World Bus backend implementation against the specification in `WORLD_BUS_STATUS.md` and assesses readiness for Character Studio 1.0.

**Key Findings**:

- Phases 1-3 are **substantially implemented** as documented
- The `@minimal-rpg/llm` package exists but has **incomplete studio integration**
- Character Studio requires **LLM wiring** in studio routes (Phase 4 work)
- Database schema for events is complete and integrated

---

## Phase 1: Foundation + Redis

### Specification Claims

| Component | Claimed Status |
|-----------|----------------|
| WorldBus core | ✅ Complete |
| Redis pub/sub adapter | ✅ Complete |
| Event schemas | ✅ Complete |
| Drizzle ORM setup | ✅ Complete |
| Event persistence middleware | ✅ Complete |
| SSE streaming endpoint | ✅ Complete |
| OpenTelemetry middleware | ✅ Complete |
| Database migration (006_world_bus_events.sql) | ✅ Complete |

### Verification Results

| Component | Actual Status | Location |
|-----------|---------------|----------|
| **WorldBus core** | ✅ Implemented | `packages/bus/src/index.ts` |
| **Redis pub/sub adapter** | ✅ Implemented | `packages/bus/src/adapters/redis-pubsub.ts` |
| **Event schemas** | ✅ Implemented | `@minimal-rpg/schemas` (WorldEvent types) |
| **Drizzle ORM setup** | ✅ Implemented | `packages/db/src/connection/drizzle.ts` |
| **Event persistence middleware** | ⚠️ Partial | `packages/bus/src/middleware/persistence.ts` - Handler injection exists but needs app-layer registration |
| **SSE streaming endpoint** | ✅ Implemented | `packages/api/src/routes/stream.ts` - `/stream/:sessionId` |
| **OpenTelemetry middleware** | ✅ Implemented | `packages/bus/src/middleware/telemetry.ts` |
| **Database migration** | ✅ Implemented | `packages/db/src/schema/index.ts` - `events` table defined in schema |

### Notes

- The `events` table is defined in the Drizzle schema (lines 261-286 in `packages/db/src/schema/index.ts`)
- Event persistence uses a handler injection pattern to avoid circular dependencies
- The migration file `006_world_bus_events.sql` may not exist as a separate file - the schema is managed via Drizzle

---

## Phase 2: System Services

### Specification Claims

| Component | Claimed Status |
|-----------|----------------|
| PhysicsEngine | ✅ Complete |
| SocialEngine | ✅ Complete |
| TimeService | ✅ Complete |
| LocationService | ✅ Complete |
| RulesEngine | ✅ Complete |
| WorldBus integration | ✅ Complete |

### Verification Results

| Component | Actual Status | Location |
|-----------|---------------|----------|
| **PhysicsEngine** | ✅ Implemented | `packages/services/src/physics/physics-engine.ts` |
| **SpatialIndex** | ✅ Implemented | `packages/services/src/physics/spatial-index.ts` |
| **Pathfinding** | ✅ Implemented | `packages/services/src/physics/pathfinding.ts` |
| **ProximityService** | ✅ Implemented | `packages/services/src/physics/proximity-service.ts` |
| **SocialEngine** | ✅ Implemented | `packages/services/src/social/social-engine.ts` |
| **DialogueService** | ✅ Implemented | `packages/services/src/social/dialogue-service.ts` |
| **FactionService** | ✅ Implemented | `packages/services/src/social/faction.ts` |
| **TimeService** | ✅ Implemented | `packages/services/src/time/time-service.ts` |
| **Scheduler** | ✅ Implemented | `packages/services/src/time/scheduler.ts` |
| **TickEmitter** | ✅ Implemented | `packages/services/src/time/tick-emitter.ts` |
| **LocationService** | ✅ Implemented | `packages/services/src/location/location-service.ts` |
| **ExitResolver** | ✅ Implemented | `packages/services/src/location/exit-resolver.ts` |
| **RulesEngine** | ✅ Implemented | `packages/services/src/rules/rules-engine.ts` |
| **Validators** | ✅ Implemented | `packages/services/src/rules/validators.ts` |
| **Simulation Hooks** | ✅ Implemented | `packages/services/src/simulation/hooks.ts`, `encounter.ts` |

### Notes

- All services are exported from `packages/services/src/index.ts`
- Services follow the subscribe/emit pattern with WorldBus

---

## Phase 3: Actor Model

### Specification Claims

| Component | Claimed Status |
|-----------|----------------|
| XState v5 state machines | ✅ Complete |
| PerceptionLayer | ✅ Complete |
| CognitionLayer | ✅ Complete |
| ActorRegistry | ✅ Complete |
| BaseActorLifecycle | ✅ Complete |
| NpcActor implementation | ✅ Complete |
| PlayerActor stub | ✅ Complete |

### Verification Results

| Component | Actual Status | Location |
|-----------|---------------|----------|
| **XState state machine** | ✅ Implemented | `packages/actors/src/npc/npc-machine.ts` |
| **PerceptionLayer** | ✅ Implemented | `packages/actors/src/npc/perception.ts` |
| **CognitionLayer** | ⚠️ Rule-based only | `packages/actors/src/npc/cognition.ts` - Uses `decideSync()`, LLM integration pending |
| **ActorRegistry** | ✅ Implemented | `packages/actors/src/registry/` |
| **BaseActorLifecycle** | ✅ Implemented | `packages/actors/src/base/lifecycle.ts` |
| **NpcActor** | ✅ Implemented | `packages/actors/src/npc/npc-actor.ts` |
| **PlayerActor** | ✅ Stub exists | `packages/actors/src/player/` |

### NPC State Machine States

Verified implementation of all documented states:

1. **idle** - Waiting for events
2. **perceiving** - Processing via `PerceptionLayer.buildContext()`
3. **thinking** - Decision via `CognitionLayer.decideSync()`
4. **acting** - Emit intent via `worldBus.emit()`
5. **waiting** - 500ms cooldown

### Notes

- Cognition is currently rule-based (responds to SPOKE and MOVED events)
- Code contains TODO comments for Phase 4 LLM integration:
  - `npc-machine.ts` line 105-106: "For Phase 3, synchronous cognition. Phase 4 will add LLM calls via invoke"
  - `cognition.ts` line 8: "Phase 4 will integrate LLM providers for rich decision-making"

---

## Phase 4: LLM Abstraction (Partially Complete)

### Specification Claims (Next Phase)

| Component | Claimed Status |
|-----------|----------------|
| `@minimal-rpg/llm` package | 🔲 Pending |
| Provider adapters | 🔲 Pending |
| Tool registry | 🔲 Pending |
| Tiered cognition | 🔲 Pending |
| Token budgets | 🔲 Pending |
| Streaming support | 🔲 Pending |

### Verification Results

The `@minimal-rpg/llm` package **already exists** and has significant implementation:

| Component | Actual Status | Location |
|-----------|---------------|----------|
| **LLM Package** | ✅ Exists | `packages/llm/` |
| **OpenAI Provider** | ✅ Implemented | `packages/llm/src/providers/openai.ts` |
| **LLM Types** | ✅ Defined | `packages/llm/src/types.ts` |
| **Tool Registry** | ✅ Implemented | `packages/llm/src/tools/registry.ts` |
| **Tool Definitions** | ✅ 15+ tools | `packages/llm/src/tools/definitions/` (core, environment, hygiene, inventory, location, relationship, schedule, time) |
| **TieredCognitionRouter** | ✅ Implemented | `packages/llm/src/cognition/tiered.ts` |
| **Token Budget** | ✅ Implemented | `packages/llm/src/cognition/budget.ts` |
| **Streaming** | ✅ Implemented | `packages/llm/src/streaming/index.ts` |

### LLM Provider Capabilities

The OpenAI provider supports:

- Chat completions (non-streaming)
- Streaming responses
- Tool/function calling
- Token usage tracking
- Custom baseURL (for OpenRouter/Ollama compatibility)

### Discrepancy

WORLD_BUS_STATUS.md claims Phase 4 is pending, but the LLM package is substantially complete. What's missing is the **integration** between:

1. Studio API routes and LLM package
2. NpcActor cognition and LLM calls

---

## Character Studio Requirements

### What Character Studio 1.0 Needs (from PLAN-4.1)

| Requirement | Backend Component | Status |
|-------------|-------------------|--------|
| Character persistence | `entity_profiles` table via API | ✅ Ready |
| `/studio/generate` endpoint | LLM-powered response | ⚠️ Stub only - needs LLM wiring |
| `/studio/infer-traits` endpoint | LLM trait extraction | ⚠️ Stub only - needs LLM wiring |
| LLM provider abstraction | `@minimal-rpg/llm` | ✅ Ready |
| System prompts | Character prompt builder | 🔲 Not implemented |

### Studio Routes Current State

`packages/api/src/routes/studio.ts`:

```typescript
// POST /studio/generate
// TODO: Integrate with LLM provider
// Currently returns: `[Character response to: "${userMessage}..."]`

// POST /studio/infer-traits
// TODO: Use LLM to infer traits
// Currently returns: { traits: [] }
```

### Gap Analysis for Character Studio

| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| **Wire LLM to `/studio/generate`** | P0 | 2-4h | Import LLM provider, build system prompt from profile, call chat() |
| **Wire LLM to `/studio/infer-traits`** | P0 | 2-4h | Create trait inference prompt, parse structured response |
| **Create prompt builders** | P0 | 2h | Implement in `@minimal-rpg/actors` (studio-npc prompt + inference engine) |
| **Add streaming support** | P1 | 2h | Use LLM streaming for better UX |
| **Add error handling** | P1 | 1h | Handle LLM failures gracefully |

---

## Missed or Incomplete Items

### Items Not Found

| Item | Claimed in Status Doc | Found |
|------|----------------------|-------|
| Migration file `006_world_bus_events.sql` | ✅ Complete | ❌ Not as separate file - schema in Drizzle |
| Ollama/Anthropic provider adapters | Phase 4 pending | ❌ Only OpenAI provider exists |

### Items Partially Complete

| Item | Claimed | Actual |
|------|---------|--------|
| Event persistence middleware | ✅ Complete | Handler exists but needs app-layer registration |
| NPC cognition | ✅ Complete | Rule-based only, LLM integration pending |
| Studio routes | Not mentioned | Stub endpoints exist without LLM |

---

## Recommendations

### For Character Studio 1.0 (Immediate)

1. **Use the prompt + inference utilities in `@minimal-rpg/actors`**
   - `packages/actors/src/studio-npc/prompts.ts` (`buildStudioSystemPrompt(...)`)
   - `packages/actors/src/studio-npc/inference.ts` (`TraitInferenceEngine`)

2. **Update `packages/api/src/routes/studio.ts`**
   - Import and instantiate OpenAI provider
   - Wire `/studio/generate` to call LLM
   - Wire `/studio/infer-traits` to call LLM with structured output

3. **Environment Configuration**
   - Ensure `OPENAI_API_KEY` or equivalent is documented
   - Add provider configuration to API startup

### For World Bus Backend (Future)

1. **Add Ollama/Anthropic providers** to `@minimal-rpg/llm/src/providers/`
2. **Wire NpcActor cognition to LLM** (replace `decideSync` with async LLM calls)
3. **Register persistence handler** in API startup to enable event sourcing

---

## Conclusion

The World Bus backend (Phases 1-3) is **implemented as documented**. The `@minimal-rpg/llm` package is more complete than the status document suggests.

**For Character Studio 1.0**, the backend is **ready** with one exception: the studio API routes need LLM integration. This is estimated at **6-8 hours of work** and should be added to Phase 2 of the Character Studio implementation plan.

The system architecture is sound and the components are in place. The remaining work is wiring, not building.

---

## Appendix: Package Inventory

| Package | Purpose | Status |
|---------|---------|--------|
| `@minimal-rpg/bus` | WorldBus + Redis pub/sub | ✅ Complete |
| `@minimal-rpg/services` | Physics, Social, Time, Location, Rules | ✅ Complete |
| `@minimal-rpg/actors` | XState NPC/Player actors | ✅ Complete (rule-based cognition) |
| `@minimal-rpg/llm` | LLM abstraction layer | ✅ Complete (single provider) |
| `@minimal-rpg/schemas` | Event/domain types | ✅ Complete |
| `@minimal-rpg/db` | PostgreSQL + Drizzle ORM | ✅ Complete |
| `@minimal-rpg/api` | HTTP server + routes | ✅ Complete (studio routes need LLM) |
