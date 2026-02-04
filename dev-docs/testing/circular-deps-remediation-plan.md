# Circular Dependency Remediation Plan

## Context

The deps check reported 16 circular dependency violations across web, services, schemas, and db. This plan focuses on root-cause architectural fixes. It avoids suppressions, rule relaxations, shims, barrel masking, re-export facades, or lazy-import cycle breaks.

## Goals

- Eliminate all reported cycles by restructuring module boundaries and moving shared types to stable domain modules.
- Keep domain ownership clear and one-directional across packages and feature folders.
- Preserve behavior with minimal API changes while improving long-term maintainability.

## Cycle Inventory

- web
  - packages/web/src/shared/api/client.ts <-> packages/web/src/types.ts
  - packages/web/src/features/character-studio/signals.ts <-> packages/web/src/features/character-studio/utils/trait-applicator.ts
- services
  - packages/services/src/social/dialogue-tree-resolver.ts <-> packages/services/src/social/dialogue.ts
- schemas
  - packages/schemas/src/events/index.ts <-> packages/schemas/src/events/types.ts
  - packages/schemas/src/character/sensory.ts <-> multiple sensory helpers (touch, taste, appearance, scent)
  - packages/schemas/src/character/scent/scent-tiers.ts <-> body-regions defaults and character profile
  - packages/schemas/src/body-regions/index.ts <-> resolveSensoryProfile/autoDefaults/characterProfile
  - packages/schemas/src/character/form-types.ts <-> packages/schemas/src/index.ts <-> packages/schemas/src/character/index.ts
- db
  - packages/db/src/schema/faction.ts <-> packages/db/src/schema/index.ts

## Remediation Strategy

### Web

1. Break api client and types cycle
   - Move all API client request/response shapes into a dedicated module: packages/web/src/shared/api/types.ts.
   - Ensure packages/web/src/types.ts does not import the API client; it should only export app-level shared types.
   - Update client to import from shared api types; update any app types to reference these types without pulling in the client.

2. Break character-studio signals and trait applicator cycle
   - Move shared signal types into packages/web/src/features/character-studio/types.ts.
   - Make signals.ts depend only on types and primitives; trait-applicator.ts should import from types instead of signals.
   - If trait-applicator needs helpers from signals, split those helpers into a third module (signals-helpers.ts) that depends only on types.

### Services

1. Split dialogue data from resolution logic
   - Create packages/services/src/social/dialogue-types.ts with pure data types and schema helpers.
   - Refactor dialogue.ts to import from dialogue-types and export only data-oriented helpers.
   - Refactor dialogue-tree-resolver.ts to depend on dialogue-types and any pure helpers, but not dialogue.ts.
   - If dialogue.ts currently imports resolver logic, move that logic into resolver.ts or a separate orchestrator module.

### Schemas

1. Events index cycle
   - Make packages/schemas/src/events/index.ts a thin export that only re-exports from types.ts and schema.ts without those modules importing index.ts.
   - If types.ts currently imports index.ts, invert that dependency by moving shared constants into a new events/constants.ts used by both.

2. Sensory domain separation
   - Create packages/schemas/src/character/sensory/types.ts for sensory data types and zod schemas.
   - Move non-schema logic out of sensory.ts. Only re-export schemas/types from sensory.ts.
   - Refactor touch, taste, appearance, scent helpers to import from sensory/types.ts instead of sensory.ts.

3. Scent and body-regions cycle cleanup
   - Introduce packages/schemas/src/character/scent/types.ts for scent tiers and base scent shapes.
   - Move scent tier definitions out of scent-tiers.ts if it currently imports body-regions or character profile.
   - Move default hygiene and scent data into packages/schemas/src/body-regions/hygiene-data.ts (per user preference).
   - Keep body region defaults purely data-driven and independent of character profile or sensory resolution logic.
   - Ensure resolveSensoryProfile uses only body-regions data and sensory types, not the other way around.

4. Character profile and body regions
   - Move cross-domain shared types to packages/schemas/src/types.ts where applicable.
   - Ensure characterProfile imports body-regions data through a narrow interface, not via index.ts or resolvers.
   - Restrict body-regions/index.ts to re-export data and types only, with no imports from character or scent resolvers.

5. Form types and index cycles
   - Remove form-types.ts dependency on packages/schemas/src/index.ts.
   - Prefer direct imports from packages/schemas/src/character/form-types.ts or a new character/types.ts barrel that does not import packages/schemas/src/index.ts.

### DB

1. Schema index cycle
   - Make packages/db/src/schema/index.ts re-export schemas without those schema modules importing index.ts.
   - If faction.ts requires shared schema types, move them to packages/db/src/schema/types.ts and import directly.

## Sequencing

1. Web cycles
2. Services cycle
3. Schemas cycles (events, sensory, scent/body-regions, form-types)
4. DB cycle

## Acceptance Criteria

- [ ] Running `pnpm deps:check` reports zero circular dependency violations.
- [ ] No suppressions, rule relaxations, shims, barrel masking, re-export facades, or lazy-import cycle breaks were added.
- [ ] Sensory schema files contain only data structure definitions, with logic moved into dedicated helper modules.
- [ ] Hygiene and scent defaults live in packages/schemas/src/body-regions/hygiene-data.ts with granular regions grouped under parent regions.
- [ ] All module boundaries follow one-directional imports and avoid index.ts back-references.
