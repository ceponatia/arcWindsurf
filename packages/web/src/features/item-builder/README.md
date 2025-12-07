# item-builder

Form-based item creation and editing UI with category-specific properties.

## Exports

- `ItemBuilder` — Main form component for creating/editing item definitions

## Cross-Package Imports

| Import                                                           | Source Package         | Usage                                        |
| ---------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| `ItemDefinitionSchema`                                           | `@minimal-rpg/schemas` | Validates item data before submission        |
| `ItemDefinition`, `ItemCategory`, `ClothingSlot`                 | `@minimal-rpg/schemas` | Types for item structure and categories      |
| `BuilderActionPanel`                                             | `@minimal-rpg/ui`      | Reusable save/cancel/delete button panel     |
| `getErrorMessage`, `mapZodErrorsToFields`, `getInlineErrorProps` | `@minimal-rpg/utils`   | Error handling and form validation utilities |

## API Client Imports

From `../../shared/api/client.js`:

- `getItem` — Fetches existing item by ID for edit mode
- `saveItem` — Persists item definition (create or update)
- `deleteItem` — Removes item by ID

## Local Imports

- `splitList` from `../shared/stringLists.js` — Parses comma/newline-separated strings into arrays

## Form Sections

The form dynamically renders property fields based on `category`:

- **clothing** — slot, style, material, color, condition, warmth
- **weapon** — handedness, damage types, reach, material
- **generic/trinket/accessory/consumable** — material, size, weight

## Tracing Notes

Schema validation uses `ItemDefinitionSchema` from [packages/schemas/src/items/index.ts](../../../../../../schemas/src/items/index.ts). The `BuilderActionPanel` is at [packages/ui/src/BuilderActionPanel.tsx](../../../../../../ui/src/BuilderActionPanel.tsx).
