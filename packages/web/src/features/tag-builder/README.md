# tag-builder

Form-based tag creation and editing UI.

## Exports

- `TagBuilder` — Main form component for creating/editing prompt tags

## Cross-Package Imports

| Import               | Source Package         | Usage                                    |
| -------------------- | ---------------------- | ---------------------------------------- |
| `CreateTagRequest`   | `@minimal-rpg/schemas` | Type for tag creation payload            |
| `BuilderActionPanel` | `@minimal-rpg/ui`      | Reusable save/cancel/delete button panel |

## API Client Imports

From `../../shared/api/client.js`:

- `getTag` — Fetches existing tag by ID for edit mode
- `createTag` — Creates a new tag
- `updateTag` — Updates an existing tag
- `deleteTag` — Removes tag by ID

## Form Fields

- **Name** — Tag display name (required)
- **Short Description** — Brief summary (optional)
- **Prompt Text** — Full prompt modifier text (required)

## Validation

Basic client-side validation:

- Name is required
- Prompt text is required

## Tracing Notes

The `CreateTagRequest` type is defined at [packages/schemas/src/tags/index.ts](../../../../../../schemas/src/tags/index.ts). Tags are used as session modifiers to inject additional prompt context.
