# Actors Test Coverage Analysis

Date: 2026-02-04
Scope: packages/actors (tests + source review)
Status: Completed

## Existing tests

Unit tests in packages/actors/test
- npc-machine.test.ts
- npc-llm-wiring.test.ts
- actor-registry-errors.test.ts
- cognition.test.ts
- perception.test.ts
- npc-actor.test.ts
- prompts.test.ts
- player-actor.test.ts
- lifecycle.test.ts
- studio-npc/inference.test.ts

Studio NPC tests in packages/actors/src/studio-npc/__tests__
- integration.test.ts
- advanced-feature-fallbacks.test.ts

## What is covered today

NPC and registry
- npc-machine: basic buffering, ignore non-meaningful events, cooldown clears events
- cognition: rule-based decisions, shouldAct, summarizeDecision, basic LLM fallback path
- perception: relevance filtering, MOVED handling, payload session/location, targetActorId
- npc-actor: construction, start/stop, send, snapshot
- actor-registry: spawn/despawn, session queries, errors
- lifecycle: worldBus subscribe/unsubscribe
- player-actor: start/stop idempotency, logging, snapshot

Studio NPC (partial)
- TraitInferenceEngine: parsing, evidence accumulation, contradiction detection
- Prompt building: npc prompt content, studio system prompt includes key profile fields
- DiscoveryGuide: suggestTopic, generatePrompts, explored topics
- ConversationManager: context window size and summarization trigger
- VignetteGenerator: LLM failure fallback and simple inference patterns

## Missing or thin coverage by module

Base and index exports
- src/base/types.ts, src/base/index.ts, src/index.ts, src/npc/index.ts, src/player/index.ts, src/registry/index.ts
  - These are type or barrel exports only. No runtime behavior to test.

NPC state machine and cognition
- src/npc/npc-machine.ts
  - Pending intent enrichment logic for Intent events (adds sessionId, actorId, timestamp).
  - Behavior when LLM returns NO_ACTION, and when LLM throws (error path).
  - Guard logic for meaningful events beyond SPOKE (if expanded later).
- src/npc/cognition.ts
  - withTimeout behavior and error handling paths.
  - LLM timeout warning path and elapsed timing threshold logging.

Studio NPC core
- src/studio-npc/studio-machine.ts
  - State transitions for each request type (dilemma, emotional range, vignette, memory, first impression, voice fingerprint).
  - Response validation failure fallback selection (generic vs dilemma).
  - Explored topic inference from user message updates exploredTopics.
  - RESTORE_STATE and CLEAR_CONVERSATION correctness.
  - Suggestion generation flow and pendingResponse assembly.
- src/studio-npc/studio-actor.ts
  - respond() end-to-end flow, callbacks (onTraitInferred, onProfileUpdate).
  - request* helper methods wiring to machine events.
  - exportState and restoreState consistency with conversation manager and machine context.

Conversation and summarization
- src/studio-npc/conversation.ts
  - summarize() behavior with LLM success path (summary update, key points).
  - parseSummaryResponse fallback with non-JSON content.
  - getFullContext output format and use of summary.
  - restore/export symmetry.

Prompt builders
- src/studio-npc/prompts.ts
  - buildStudioSystemPrompt for full personality map permutations (values, fears, social, stress, speech) and summary integration.
  - buildInternalMonologuePrompt, buildDilemmaPrompt, buildEmotionalRangePrompt, buildVignettePrompt, buildMemoryPrompt, buildFirstImpressionPrompt.

Studio NPC feature modules
- src/studio-npc/dilemma.ts
  - generateDilemma template selection, deterministic behavior with known values.
  - generateCustomDilemma JSON parsing and fallback to template on failure.
  - analyzeResponse parsing and fallback.
  - buildCharacterPrompt output uses conflicting values.
- src/studio-npc/emotional-range.ts
  - Variation list length, fallback response on LLM failure, expressiveness calculation.
- src/studio-npc/memory-excavation.ts
  - extractBackstoryElements parsing and suggestedIntegration mapping.
  - Failure fallback memory string.
- src/studio-npc/internal-monologue.ts
  - parseResponse JSON and fallback, failure fallback.
- src/studio-npc/first-impression.ts
  - parseResponse split behavior and fallback.
- src/studio-npc/voice-fingerprint.ts
  - analyze defaults when <5 messages, vocabulary/rhythm/patterns/humor heuristics.
- src/studio-npc/contradiction.ts
  - numeric and string conflict detection thresholds, reflection prompt text.
- src/studio-npc/validation.ts
  - isValidCharacterResponse and validateCharacterResponse for length, markers, ratios, and valid cases.

Studio NPC types
- src/studio-npc/types.ts
  - Types only; no runtime behavior to test.

## Suggested next test targets (actors package)

1) Studio machine and actor
- Add state transition tests for each request type and for validation fallback paths.
- Add snapshot and persistence tests for export/restore.

2) Conversation and validation utilities
- Summarization parsing paths and validation heuristics.

3) Advanced feature generators
- Dilemma, emotional range, memory, internal monologue, first impression, voice fingerprint.

4) NPC machine edge cases
- Intent enrichment, LLM error paths, and guard behavior.
