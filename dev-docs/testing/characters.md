# Characters Test Coverage Analysis

Date: 2026-02-04
Scope: packages/characters (tests + source review)

## Existing tests

Services
- test/body-map.service.test.ts
- test/appearance.service.test.ts
- test/personality.service.test.ts
- test/profile.service.test.ts
- test/hygiene.service.test.ts

Repositories and providers
- test/hygiene.repository.test.ts
- test/hygiene.modifiers-provider.test.ts

Utils
- test/data-dir.test.ts
- test/utils.test.ts

## What is covered today

Service delegation
- BodyMapService, AppearanceService, PersonalityService, ProfileService delegate to repositories.

Hygiene logic (partial)
- HygieneService.update passes current level into decay calculation and updates state.
- HygieneService.applyEvent applies cleaning event and persists only changed parts.
- HygieneService.getSensoryModifier returns level and modifier.

Hygiene persistence
- ActorStateHygieneRepository read/write, resetParts, initializeAll behavior.

File modifiers + data dir
- FileHygieneModifiersProvider load caching, read failure, parse failure.
- resolveDataDir arg/env/discovery behavior.
- utils ok/err re-exports.

## Missing or thin coverage by area

HygieneService edge cases
- initialize() behavior when state is empty, and cleanParts() update of repository plus in-memory state.
- update() when cleanedParts provided (skip decay for cleaned regions).
- update() when modifiers missing for a region (should skip).
- applyEvent() when no initial state (initializeAll path).
- getSensoryModifier() when body part or sense type missing (returns empty string, level 0).

ActorStateHygieneRepository edge cases
- getState returns empty hygiene when actor state missing or hygiene malformed.
- upsertPart/resetParts when no actor state exists (actorType defaults to npc, lastEventSeq default).
- initializeAll preserves existing body parts and does not overwrite existing values.

FileHygieneModifiersProvider
- concurrent load calls share a single read (loadPromise behavior).
- retry after failure (loadPromise reset).
- trimming of dataDir option and resolveDataDir fallback behavior.

Utils and types
- types.ts (DomainError, PaginatedResult) are type-only; no runtime tests needed.
- index.ts barrel exports not directly exercised.

## Suggested next test targets (characters package)

1) HygieneService edge cases
- initialize/cleanParts, cleanedParts skip, missing modifier config, applyEvent init path.

2) ActorStateHygieneRepository edge cases
- missing actor state, malformed hygiene, default actorType/lastEventSeq.

3) FileHygieneModifiersProvider concurrency
- loadPromise reuse and retry after failure.
