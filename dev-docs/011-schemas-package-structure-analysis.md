# Schemas Package Structure Analysis

## Scope

- Review `packages/schemas` layout for consistency and domain boundaries.
- Identify multi-domain files and propose splits/moves with import/export impact.
- Note schema simplifications and efficiency opportunities.
- Provide guidance on schema-adjacent utilities placement.

## Current Structure Snapshot

- Consistent domain pattern exists in `affinity`, `npc-tier`, `schedule`, `simulation`, `time` (`types.ts`, `schemas.ts`, `defaults.ts`, `utils.ts`).
- Other domains are ad hoc (`inventory/index.ts`, `items/*.ts`, `tags/definitions.ts`, `state/*`, `character/*`).
- `character` has a file/folder name collision (`character/appearance.ts` and `character/appearance/`).
- `location` mixes legacy schemas with V2 and UI/editor models in one folder.
- Utilities and runtime helpers live alongside schemas in multiple domains, despite the schemas package scope stating “no runtime logic beyond validation.”
- Some data is duplicated across packages (e.g., body region hierarchy in `schemas` and `web`).

## Proposed Structure Standard (Recommended Convention)

Use a predictable layout for each domain. Example:

```text
src/<domain>/
  index.ts           # barrel for domain
  schemas.ts         # Zod schemas only
  types.ts           # types and derived TS types
  defaults.ts        # default values
  constants.ts       # enums/const arrays
  utils.ts           # pure helpers operating on schema types
  data/              # large static data (optional)
  legacy/            # v1 schemas (optional)
  v2/                # v2 schemas (optional)
```

Add “usage-layer” subfolders when a domain includes UI/editor or API transport shapes:

```text
src/<domain>/ui/     # builder/editor-specific shapes
src/<domain>/api/    # transport/request/response schemas
```

This keeps “what it is” (domain) separate from “who uses it” (system layer).

## Cross-Domain Or Mixed-Responsibility Candidates

### 1) Body region parsing in `character/regions.ts`

#### Issue

- `packages/schemas/src/character/regions.ts` mixes canonical region lists with input parsing (`resolveBodyRegion`, `isBodyReference`, aliases). This is parsing/intent logic, not schema definition.

#### Proposed split

- Keep canonical types in `packages/schemas/src/body-regions`.
- Move parsing helpers and alias maps to `packages/utils/src/parsers/body-parser/regions.ts` (or `aliases.ts`).

#### Import/export updates

- Update `packages/utils/src/parsers/body-parser/parsers.ts` and `packages/utils/src/parsers/body-parser/index.ts` to import from the new local file (instead of `@minimal-rpg/schemas`).
- Update `packages/schemas/test/character.regions.side.test.ts` to use the new utils path or move the test to utils.
- Update any consumers importing `resolveBodyRegion`/`BODY_REGION_ALIASES` from `@minimal-rpg/schemas` to use `@minimal-rpg/utils` (or a new schemas subpath if you keep it in schemas).

### 2) Body region grouping in `character/body-region-groups.ts`

#### Issue

- Group definitions are body-region taxonomy, but live under `character` and are used by `state/hygiene-events`.

#### Proposed move

- Move to `packages/schemas/src/body-regions/groups.ts` and export via `body-regions/index.ts`.

#### Import/export updates

- Update `packages/schemas/src/state/hygiene-events.ts` to import from `../body-regions/groups.js`.
- Update `packages/schemas/src/character/index.ts` to stop exporting this file (or re-export from `body-regions` if needed).

### 3) Hygiene data under `body-regions`

#### Issue

- `body-regions/*/hygiene-data.ts` depends on `state/hygiene-types.ts` (cross-domain) and is only consumed by `character/scent/default-scents.ts`. This creates a `body-regions -> state` dependency loop risk.

#### Proposed move

- Create `packages/schemas/src/state/hygiene/data/` (or `src/hygiene/data/`) and move all region hygiene data plus `hygiene-data.ts` there.
- Move `flattenHygieneData` into the same hygiene domain (currently in `state/hygiene-types.ts`).

#### Import/export updates

- Update `packages/schemas/src/character/scent/default-scents.ts` to import from the new hygiene data path.
- Update `packages/schemas/src/body-regions/index.ts` to stop exporting hygiene data (or re-export from `state/hygiene`).
- Update all `body-regions/*/hygiene-data.ts` imports of `flattenHygieneData` and `HygieneProfile` if they move.

### 4) UI-focused types in `character/form-types.ts`

#### Issue

- `packages/schemas/src/character/form-types.ts` is UI form state and defaults, not schema definition. It also imports from the root barrel (`../index.js`), creating unnecessary coupling.

#### Proposed move

- Move to `packages/schemas/src/ui/character-builder/form-types.ts` (or into `packages/web`).
- Switch to explicit imports from `character/*` and `body-regions/*` instead of root barrel.

#### Import/export updates

- Update `packages/web/src/features/character-studio/types.ts` and `packages/web/src/features/persona-builder/types.ts` to import from the new UI path.
- Update `packages/schemas/src/character/index.ts` and `packages/schemas/src/index.ts` to re-export from the new UI location if you still want a single entry point.

### 5) Mixed schema/UI config in `character/appearance.ts`

#### Issue

- `packages/schemas/src/character/appearance.ts` mixes physique schema re-exports with UI-specific appearance region attributes and labeling.

#### Proposed split

- Move UI config to `packages/schemas/src/ui/appearance/` (or `character/appearance/ui.ts`).
- Keep schema-related exports in `shared/physique.ts` and `character/appearance/schema.ts` (or just `shared/physique.ts`).

#### Import/export updates

- Update `packages/web/src/features/character-studio/utils.ts`, `packages/web/src/features/persona-builder/types.ts`, and `packages/generator/src/character/filters.ts` to the new UI path for `APPEARANCE_REGIONS` and related helpers.

### 6) Location schemas mixing legacy + editor + v2

#### Issue

- `packages/schemas/src/location` mixes legacy region/building/room schemas, `locationMap` editor state, and `locationV2` DB-prefab schema types.

#### Proposed split

- `location/legacy/` for `building.ts`, `region.ts`, `room.ts`, `builtLocation.ts`.
- `location/map/` for map graph + editor shapes (`locationMap.ts`, `SemanticZoomLevel`, `ViewportState`).
- `location/v2/` for `locationV2.ts` schema family.

#### Import/export updates (key sites)

- `packages/services/src/location/location-service.ts`, `packages/services/src/physics/pathfinding.ts` for map types.
- `packages/api/src/routes/resources/locations.ts` for map types.
- `packages/web/src/features/location-builder/*` for map/editor types.
- `packages/web/src/features/prefab-builder/*` for V2 location types.
- `packages/schemas/test/seed.profiles.test.ts` for map schema.

### 7) Prompt config logic in `schemas/api/promptConfig.ts`

#### Issue

- Contains runtime logic and redefines schemas already declared in `promptConfigSchemas.ts`.

#### Proposed change

- Keep only schemas in `promptConfigSchemas.ts` and move parsing/validation to `packages/api` or `packages/utils`.

#### Import/export updates

- No internal consumers found; if moved, update any future imports to the new package.

### 8) `tags/helpers.ts` duplication

#### Issue

- `incrementVersion` exists both in `schemas` and `db` repository code.

#### Proposed change

- Centralize in `packages/utils/src/tags/versioning.ts` (or similar).
- Import from utils in both `schemas` and `db` or remove from schemas if unused.

#### Import/export updates

- Update `packages/db/src/repositories/tags.ts` to import from the shared helper.
- Update `packages/schemas/src/tags/index.ts` if re-exporting remains needed.

## Efficiency And Simplification Opportunities

- Remove or consolidate unused/duplicated files:
  - `packages/schemas/src/body-regions/hygiene-registry.ts` is unused and duplicates `ALL_HYGIENE_MODIFIERS`.
  - `BODY_REGION_GROUP_KEYS` in `packages/schemas/src/body-regions/types.ts` is unused.
- De-duplicate prompt config schemas between `promptConfigSchemas.ts` and `promptConfig.ts`.
- De-duplicate body-region hierarchy data currently copied into `packages/web/src/features/character-studio/components/region-hierarchy.ts` by importing the schema version from `packages/schemas/src/body-regions/hierarchy.ts`.
- Align `locationMap` and `locationV2` schemas by factoring out common pieces (`LocationTypeSchema`, `LocationPortSchema`) into a `location/shared.ts` to reduce duplication.
- Consider moving `state/hygiene-events.ts` to reuse helper functions from `state/hygiene.ts` (avoid duplicate threshold logic).

## Utilities Placement Guidance

- **Keep in `schemas`** when helpers are tightly coupled to schema types, are pure, and reinforce the canonical shape (e.g., `nullableOptional`, `numericString`, `record-helpers`, `createInitialTimeState`).
- **Move to `utils`** when helpers are about parsing external input, UI shaping, or operational logic (e.g., body-part alias parsing, prompt config loaders, tag versioning helpers used by persistence).
- **Move to domain packages** (`characters`, `services`, `api`) when logic implies behavior beyond validation (e.g., hygiene decay application, simulation prioritization) and risks bloating `schemas` with runtime logic.

A practical rule: if a helper is used by more than one non-schema package and is not strictly about validation, it should live in `packages/utils` or the relevant runtime package, not in `schemas`.

## Suggested Next Actions (Optional)

1. Agree on the target structure and naming conventions (domain vs usage-layer).
2. Tackle moves that reduce cross-domain coupling first (body-region aliases, hygiene data).
3. Normalize `location` folder into `legacy`, `map`, and `v2` to reduce ambiguity.
4. Consolidate duplicates and unused artifacts to keep schemas lean.
