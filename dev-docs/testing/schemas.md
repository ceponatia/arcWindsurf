# Schemas Package Test Coverage Review

## Scope

Package: `@minimal-rpg/schemas`

Focus: Zod schemas, helpers, and world/boundary spec validations across the package.

## Existing Tests

- `test/shared.record-helpers.test.ts`
  - Covers `getRecord`, `getRecordOptional`, `getPartialRecord`, `setRecord`, `setPartialRecord`, `getArraySafe`, `getTuple`.
- `test/utils.schema-helpers.test.ts`
  - Covers `nullableOptional` and `numericString` behaviors.
- `test/time.utils.test.ts`
  - Covers `advanceTime`, `advanceTimeBySeconds`, `gameTimeToTotalSeconds`, `totalSecondsToGameTime`.
  - Covers `getCurrentPeriod`, `getDayPeriods`, `formatGameTime`, `validateTimeSkip`.
  - Covers `compareGameTime`, `gameTimeEquals`, `gameTimeDifferenceSeconds`.
- `test/state.occupancy.test.ts`
  - Covers crowd categorization, narrative hints, occupancy prompt context derivation, filtering, and sort ordering.
- `test/state.proximity.test.ts`
  - Covers `createDefaultProximityState`, `makeEngagementKey`, `parseEngagementKey`.
- `test/seed.profiles.test.ts`
  - Validates seed JSONs against `CharacterProfileSchema`, `SettingProfileSchema`, `LocationMapSchema`.
- `test/events.intents.test.ts`, `test/events.effects.test.ts`, `test/events.system.test.ts`
  - Cover parsing of event variants, invalid types, timestamp handling, and legacy fixtures.
- `test/events.world-event.test.ts`
  - Covers `WorldEventSchema`, `WireWorldEventSchema`, and JSON round-tripping behavior.
- `test/api.prompt-config.test.ts`
  - Covers `SystemPromptSchema`, `SafetyRulesSchema`, `SafetyModeSchema` validation and legacy fixture.
- `test/api.prompt-config-loader.test.ts`
  - Covers loader success path and error handling for invalid inputs.
- `test/api.tags.test.ts`
  - Covers tag request/response schemas, query coercion, and round-trip behavior.
- `test/api.parsed-input.test.ts`
  - Covers `ParsedPlayerInputSchema`, confidence bounds, legacy fixture, JSON round-trip.
- `test/api.action-sequence.test.ts`
  - Covers `ActionSequenceSchema` and `ActionSequenceResultSchema` validation and fixtures.
- `test/api.sensory-context.test.ts`
  - Covers `SensoryContextForNpcSchema` validation and round-trip.
- `test/api.npc-config.test.ts`
  - Covers `NpcResponseConfigSchema` defaults, bounds, legacy fixture, round-trip.
- `test/items.inventory.test.ts`
  - Covers `ItemDefinitionSchema`, `InventoryItemSchema`, `InventoryStateSchema` basics.
- `test/character.appearance.test.ts`
  - Covers `getRegionAttributes` and `getDefaultAttribute` for appearance regions.
- `test/character.regions.side.test.ts`
  - Covers `resolveBodyRegion` and `isBodyReference` side parsing and length guards.
- `test/body-regions.hygiene-data.test.ts`
  - Covers grouped default scents (toe regions under feet) and `flattenHygieneData` overrides.
- `test/resolveSensoryProfile.test.ts`
  - Covers auto-defaults, template blending, attribution, overrides, and weight skipping.
- `test/tags.schemas-helpers.test.ts`
  - Covers `TagDefinitionSchema` defaults and `TagTriggerSchema` validation helpers.

## Notably Untested or Under-tested Areas

### Boundary Spec Gaps

- `src/utils/schema-helpers.ts`
  - `coercedDate` is untested (e.g., epoch number, ISO string, invalid values).
- `src/events/wire.ts`
  - Wire schemas are exercised indirectly, but no direct tests for `WireIntentSchema`/`WireEffectSchema`/`WireSystemEventSchema` edge cases beyond `WireWorldEventSchema`.
- `src/api/speaker-types.ts` and `src/api/error-types.ts`
  - No direct tests for these API-facing schemas.
- `src/api/action-sequence.ts`
  - Limited coverage for optional fields (`requirements`, `stateChanges`, interrupts, preconditions).

### World Spec Gaps

- **Body regions**: No direct tests for `BODY_REGIONS`, `BODY_REGION_GROUP_KEYS`, hierarchy, or region constants.
  - Files such as `body-regions/regions.ts`, `hierarchy.ts`, `constants.ts`, `sensoryTemplate.ts`, and per-region appearance/hygiene data are untested.
- **Character schemas**: `character/characterProfile.ts`, `basics.ts`, `personality.ts`, `details.ts`, `sensory.ts`, `scent/*`, `touch/*` lack direct validation tests.
- **Persona/setting/location/races/schedule/simulation/affinity/dialogue/npc-tier**
  - Schemas and defaults in these domains have no direct coverage.
- **Inventory/items**: only `ItemDefinitionSchema` and inventory state are tested; other item schemas (`core`, `outfit`, `owner`) lack coverage.

### Utilities and Exports

- `src/index.ts` export surface is not validated; changes could silently break downstream imports.
- `src/shared/*` helpers beyond `record-helpers.ts` (e.g., `message-types`, `tool-types`, `usage-types`) are untested.
- `time/utils.ts` has no tests for `tick`, `buildTimeSlice`, `getDayName`, `getMonthName`, `getCurrentSeason`, `isHoliday`, `getHoliday`, `createInitialTimeState`, `updateTimeStateFromTick`.
- `state` schemas like `npc-location`, `awareness`, `availability`, `eavesdrop`, `hygiene`, and `hygiene-events` are untested.

## Suggested Test Additions (Prioritized)

1. Boundary spec coverage
   - Add tests for `coercedDate`, `speaker-types`, `error-types`, and wire schema inputs.
2. Time utilities coverage
   - Validate `tick`, holidays, season/day/month naming, and time state helpers.
3. World spec invariants
   - Add sanity tests for `BODY_REGIONS`/grouping/hierarchy, plus representative schemas in character, setting, location, and schedule domains.
4. Export surface checks
   - Simple tests to ensure core exports remain stable (index barrel and domain barrels).

## Notes

- The package has strong boundary tests for events and API schemas, but world-spec areas remain mostly unverified.
- Placeholder or data-heavy modules (e.g., per-region hygiene/appearance) could benefit from lightweight invariant tests rather than exhaustive snapshots.
