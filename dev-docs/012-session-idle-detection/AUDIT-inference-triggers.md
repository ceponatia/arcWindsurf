# Inference Trigger Audit

## Purpose

This document catalogs **every place in the codebase that triggers LLM inference**, categorized by whether it's correctly triggered (by player action) or incorrectly triggered (by backend events that shouldn't call LLM).

**Goal**: Prevent the LLM from running for 48 hours without user activity.

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| ✅ Correct (Player-triggered) | 12 | Expected behavior |
| ❌ Incorrect (Backend-triggered) | 3 | **Needs fixing** |
| ⚠️ Async/Background | 2 | Review needed |
| 🔒 No LLM | 2 packages | Verified clean |

---

## Package-by-Package Audit

### 🔒 Packages with NO LLM Usage

| Package | Status | Notes |
|---------|--------|-------|
| `@minimal-rpg/generator` | ✅ Clean | Random generation only, no LLM |
| `@minimal-rpg/characters` | ✅ Clean | Data structures only, no LLM |
| `@minimal-rpg/services` | ✅ Clean | Backend simulation only |
| `@minimal-rpg/projections` | ✅ Clean | State reducers only |
| `@minimal-rpg/bus` | ✅ Clean | Event transport only |
| `@minimal-rpg/schemas` | ✅ Clean | Type definitions only |
| `@minimal-rpg/db` | ✅ Clean | Database operations only |

---

### ❌ PROBLEMATIC: `@minimal-rpg/actors` - NPC Layer

**File**: `packages/actors/src/npc/npc-machine.ts`

```typescript
// Line 31-34: ANY WorldEvent triggers cognition
states: {
  idle: {
    on: {
      WORLD_EVENT: {
        actions: 'bufferEvent',
        target: 'perceiving',  // → thinking → LLM call
      },
    },
  },
}
```

**Problem**: Every event (including TICK every 1s) can trigger LLM inference.

**File**: `packages/actors/src/npc/cognition.ts`

```typescript
// Lines 68-85: MOVED events trigger inference
const moveEvents = perception.relevantEvents.filter((e) => e.type === 'MOVED');
if (moveEvents.length > 0) {
  // Generates SPEAK_INTENT → LLM call
}
```

**Problem**: Someone walking into a room triggers LLM call.

| Trigger | Current Behavior | Correct Behavior |
|---------|------------------|------------------|
| `TICK` | Triggers cognition | ❌ Should NOT trigger |
| `MOVED` | Triggers speech | ❌ Should NOT trigger |
| `SPOKE` (player) | Triggers response | ✅ Correct |
| `SPOKE` (NPC) | May trigger response | ⚠️ Review |

---

### ✅ CORRECT: `@minimal-rpg/actors` - Studio NPC Layer

**File**: `packages/actors/src/studio-npc/studio-machine.ts`

All studio inference is triggered by explicit user actions:

| Trigger | Event | LLM Calls | Status |
|---------|-------|-----------|--------|
| User sends message | `SEND_MESSAGE` | 1. generateResponse<br>2. inferTraits | ✅ Correct |
| User requests dilemma | `REQUEST_DILEMMA` | 1. generateDilemma | ✅ Correct |
| User requests emotional range | `REQUEST_EMOTIONAL_RANGE` | 1. EmotionalRangeGenerator | ✅ Correct |
| User requests vignette | `REQUEST_VIGNETTE` | 1. VignetteGenerator | ✅ Correct |
| User requests memory | `REQUEST_MEMORY` | 1. MemoryExcavator | ✅ Correct |
| User requests first impression | `REQUEST_FIRST_IMPRESSION` | 1. FirstImpressionGenerator | ✅ Correct |

**No backend triggers** - all studio inference requires explicit user action.

---

### ✅ CORRECT: `@minimal-rpg/api` - Studio Routes

**File**: `packages/api/src/routes/studio.ts`

| Endpoint | Trigger | LLM Calls | Status |
|----------|---------|-----------|--------|
| `POST /studio/generate` | User request | 1 | ✅ Correct |
| `GET /studio/generate/stream` | User request | 1 (streaming) | ✅ Correct |
| `POST /studio/infer-traits` | User request | 1 | ✅ Correct |
| `POST /studio/summarize` | User request | 1 | ✅ Correct |
| `POST /studio/conversation` | User sends message | 1+ | ✅ Correct |
| `POST /studio/conversation/stream` | User sends message | 1 (streaming) | ✅ Correct |
| `POST /studio/suggest-prompt` | User request | 0 (rule-based) | ✅ No LLM |
| `POST /studio/dilemma/generate` | User request | 0-1 | ✅ Correct |
| `POST /studio/dilemma` | User request | 1+ | ✅ Correct |

**All studio routes require explicit HTTP request from user.**

---

### ⚠️ REVIEW: `@minimal-rpg/api` - Game Routes

**File**: `packages/api/src/routes/game/turns.ts`

```typescript
// Line 191-201: Player speaks → emits SPOKE event
const playerSpoke: WorldEvent = {
  type: 'SPOKE',
  actorId: playerActorId,
  content: input,
  ...
};
await worldBus.emit(playerSpoke);

// Line 203-204: Wait for NPC responses
await new Promise((resolve) => setTimeout(resolve, RESPONSE_TIMEOUT_MS));
```

| Trigger | Behavior | Status |
|---------|----------|--------|
| `POST /sessions/:id/turns` | Player sends input → NPC responds | ✅ Correct |

**This endpoint itself is correct** - inference happens because player explicitly sent a turn. However, the NPC actors spawned here inherit the problematic behavior from `npc-machine.ts`.

---

### ❌ PROBLEMATIC: `@minimal-rpg/workers`

**File**: `packages/workers/src/processors/cognition.ts`

```typescript
// This processor is called via BullMQ queue
export const createCognitionProcessor = (bus, router) => {
  return async (job) => {
    // ... builds LLM task and executes
    const response = await Effect.runPromise(program);
    // ... emits SPEAK_INTENT
  };
};
```

**File**: `packages/workers/src/queues/index.ts`

```typescript
export const enqueueCognition = (sessionId, actorId, context) => {
  return cognitionQueue.add('think', { sessionId, payload: { actorId, context } });
};
```

**Problem**: If `enqueueCognition` is called by backend events (tick, movement), LLM runs without user.

| Caller | Status |
|--------|--------|
| NPC machine on WORLD_EVENT | ❌ **Problematic** |
| Direct API call | ✅ Would be correct |

---

### ❌ PROBLEMATIC: `@minimal-rpg/workers` - Tick Processor

**File**: `packages/workers/src/processors/tick.ts`

```typescript
export const createTickProcessor = (bus) => {
  return async (job) => {
    await bus.emit({
      type: 'TICK',
      tick: payload.tickCount,
      timestamp: new Date(payload.timestamp),
    });
    // TICK events go to all NPC actors → triggers cognition
  };
};
```

**Problem**: Tick fires every 1 second → broadcasts to all NPCs → each NPC may call LLM.

---

## Inference Call Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORRECT FLOW (Player-Triggered)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Action → HTTP Request → API Route → LLM Provider → Response          │
│                                                                             │
│   Examples:                                                                 │
│   - POST /studio/conversation                                               │
│   - POST /sessions/:id/turns                                                │
│   - POST /studio/dilemma                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          INCORRECT FLOW (Backend-Triggered)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Tick Scheduler (1s) → TICK event → NPC Actor → Cognition → LLM            │
│                                                                             │
│   PhysicsService → MOVED event → NPC Actor → Cognition → LLM                │
│                                                                             │
│   ANY WorldEvent → NPC Actor → Cognition → LLM                              │
│                                                                             │
│   ❌ These run 24/7 even without users!                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Issues to Fix

### Issue 1: NPC Reacts to ALL Events

**Location**: `packages/actors/src/npc/npc-machine.ts:31-34`

**Problem**: `WORLD_EVENT` transition fires on ANY event type.

**Fix**: Add guard to only react to meaningful events:

```typescript
WORLD_EVENT: {
  guard: 'isMeaningfulEvent',
  target: 'perceiving',
}

// Guard implementation
guards: {
  isMeaningfulEvent: ({ event }) => {
    const MEANINGFUL_TYPES = ['SPOKE'];  // Only player speech
    return MEANINGFUL_TYPES.includes(event.data.type);
  },
}
```

### Issue 2: MOVED Triggers Speech

**Location**: `packages/actors/src/npc/cognition.ts:68-85`

**Problem**: Hardcoded rule generates SPEAK_INTENT on MOVED events.

**Fix**: Remove this rule entirely. Movement is state, not conversation trigger.

### Issue 3: Tick Scheduler Runs Without Users

**Location**: `packages/workers/src/scheduler/index.ts`

**Problem**: Once started, ticks run forever.

**Fix**: Implement heartbeat-based presence detection (see PLAN-session-presence-and-idle-timeout.md).

---

## Correct Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              What SHOULD Call LLM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ✅ Player sends message (SPOKE event with player actorId)                 │
│   ✅ Player requests feature (dilemma, vignette, etc.)                      │
│   ✅ Player-initiated summarization                                         │
│   ✅ Player-initiated trait inference                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            What Should NOT Call LLM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ❌ TICK events                                                            │
│   ❌ MOVED events                                                           │
│   ❌ NPC-to-NPC speech (without player in conversation)                     │
│   ❌ Time progression                                                       │
│   ❌ Physics updates                                                        │
│   ❌ Any backend simulation                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| **P0** | Remove TICK → inference path | Low | Stops constant LLM calls |
| **P0** | Remove MOVED → inference rule | Low | Stops movement LLM calls |
| **P0** | Implement heartbeat-based session pause | Medium | Stops all inference when no user |
| **P1** | Add `isMeaningfulEvent` guard | Low | Prevents future regressions |
| **P2** | Add player presence check to cognition | Medium | NPC awareness of player |

---

## Verification Checklist

After fixes are implemented, verify:

- [ ] TICK events do NOT trigger LLM calls
- [ ] MOVED events do NOT trigger LLM calls
- [ ] Only SPOKE events from players trigger NPC responses
- [ ] Session without heartbeat pauses tick scheduler
- [ ] Session with heartbeat resumes tick scheduler
- [ ] Studio features still work (all player-triggered)
- [ ] Game turns still work (player sends input → NPC responds)

---

## Appendix: All LLM Provider Usages

### Direct LLMProvider.chat() Calls

| File | Line | Context | Triggered By |
|------|------|---------|--------------|
| `actors/src/npc/cognition.ts` | 121 | NPC decision | WorldEvent (❌) |
| `actors/src/studio-npc/studio-machine.ts` | 473 | Character response | SEND_MESSAGE (✅) |
| `actors/src/studio-npc/inference.ts` | 91 | Trait inference | User action (✅) |
| `actors/src/studio-npc/conversation.ts` | 127 | Summarization | User action (✅) |
| `actors/src/studio-npc/dilemma.ts` | 168 | Custom dilemma | User action (✅) |
| `actors/src/studio-npc/dilemma.ts` | 201 | Value analysis | User action (✅) |
| `actors/src/studio-npc/emotional-range.ts` | ~50 | Emotional range | User action (✅) |
| `actors/src/studio-npc/vignettes.ts` | ~50 | Vignettes | User action (✅) |
| `actors/src/studio-npc/memory-excavation.ts` | ~50 | Memory | User action (✅) |
| `actors/src/studio-npc/first-impression.ts` | ~50 | First impression | User action (✅) |
| `api/src/routes/studio.ts` | 235 | Legacy generate | HTTP request (✅) |
| `api/src/routes/studio.ts` | 275 | Stream generate | HTTP request (✅) |
| `api/src/routes/studio.ts` | 327 | Legacy traits | HTTP request (✅) |
| `workers/src/processors/cognition.ts` | 41 | BullMQ job | Queue (⚠️) |

### TieredCognitionRouter Usages

| File | Context | Triggered By |
|------|---------|--------------|
| `workers/src/index.ts` | Worker initialization | BullMQ queue (⚠️) |
| `workers/src/processors/cognition.ts` | Cognition processing | Queue job (⚠️) |

---

## Summary

**Root cause of 48-hour LLM run**: NPC actors react to TICK and MOVED events, triggering LLM calls even without user activity.

**Fix**: 
1. NPCs should only respond to player SPOKE events
2. Tick scheduler should pause when no user is viewing the session
3. Movement should update state, not trigger conversation
