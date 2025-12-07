# character-builder

Form-based character creation and editing UI with validation.

## Exports

- `CharacterBuilder` — Main form component for creating/editing character profiles

## Cross-Package Imports

| Import                                                      | Source Package         | Usage                                                          |
| ----------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| `CharacterProfileSchema`                                    | `@minimal-rpg/schemas` | Validates form data before submission                          |
| `parseBodyEntries`, `BodyMap`, `Physique`, `PersonalityMap` | `@minimal-rpg/schemas` | Types and parsers for body and personality sections            |
| `BODY_REGIONS`, `PERSONALITY_DIMENSIONS`                    | `@minimal-rpg/schemas` | Constants defining available body regions and personality axes |
| `formatScent`, `formatTexture`, `formatVisual`              | `@minimal-rpg/schemas` | Formatting functions for sensory descriptors                   |
| `mapZodErrorsToFields`                                      | `@minimal-rpg/utils`   | Converts Zod validation errors to field-level error messages   |

## API Client Imports

From `../../shared/api/client.js`:

- `getCharacter` — Fetches existing character by ID for edit mode
- `saveCharacter` — Persists character profile (create or update)
- `deleteCharacter` — Removes character by ID

## Local Modules

- `api.ts` — Thin wrapper around shared API client functions
- `hooks/useCharacterBuilderForm.ts` — Form state management (field values, validation, dirty tracking)
- `components/` — Sub-form sections (body map, personality sliders, etc.)
- `types.ts` — Local form state types

## Tracing Notes

Schema validation flows from `CharacterProfileSchema` at [packages/schemas/src/character/index.ts](../../../../../../schemas/src/character/index.ts). Error mapping uses `mapZodErrorsToFields` from [packages/utils/src/zod.ts](../../../../../../utils/src/zod.ts).
