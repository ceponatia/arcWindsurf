# NPC Response Wiring Plan

**Created**: January 30, 2026
**Status**: Complete
**Priority**: P0 - Unblocks playable game sessions
**Effort**: 2-4 hours

---

## Overview

Wire `TurnOrchestrator.generateNpcResponse()` to use the existing `CognitionLayer` from `@minimal-rpg/actors`. This is a pure wiring task - all infrastructure already exists.

## Problem Statement

The TurnOrchestrator currently returns a placeholder string `'[NPC response placeholder]'` instead of generating actual NPC dialogue. The CognitionLayer in the actors package has full LLM-backed decision making that just needs to be connected.

## Existing Infrastructure

### CognitionLayer ([packages/actors/src/npc/cognition.ts](../../packages/actors/src/npc/cognition.ts))

- `decideLLM(context, profile, llmProvider)` - Full LLM-backed NPC decision making
- `decideSync(context)` - Rule-based fallback
- Timeout handling with 2-second threshold
- Falls back gracefully on LLM failure

### NPC Prompts ([packages/actors/src/npc/prompts.ts](../../packages/actors/src/npc/prompts.ts))

- `NPC_DECISION_SYSTEM_PROMPT` - Instructs NPC behavior
- `buildNpcCognitionPrompt()` - Builds context from perception, state, and profile

### NpcMachine ([packages/actors/src/npc/npc-machine.ts](../../packages/actors/src/npc/npc-machine.ts))

- XState machine with perceive → think → act flow
- Already wired to use `llmDecision` actor

## Implementation Approach

1. Import CognitionLayer into TurnOrchestrator
2. Fetch NPC profile and actor state from DB
3. Build CognitionContext from player message
4. Call `CognitionLayer.decideLLM()`
5. Return the intent content as the NPC response

## Success Criteria

- [x] NPC responses are generated via LLM when focused NPC is set
- [x] Responses reflect NPC personality from profile
- [x] Fallback to rule-based response on LLM failure
- [x] Response time < 3 seconds for typical interactions

## Dependencies

- `@minimal-rpg/actors` - CognitionLayer
- `@minimal-rpg/db` - Character profiles, actor state queries
- `@minimal-rpg/llm` - LLMProvider (already injected into TurnOrchestrator)

## Related Files

- [packages/api/src/services/turn-orchestrator.ts](../../packages/api/src/services/turn-orchestrator.ts) - Target file
- [packages/actors/src/npc/cognition.ts](../../packages/actors/src/npc/cognition.ts) - Existing cognition logic
- [packages/actors/src/npc/prompts.ts](../../packages/actors/src/npc/prompts.ts) - Prompt templates
