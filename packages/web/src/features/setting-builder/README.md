# setting-builder

Form-based setting creation and editing UI with tag selection.

## Exports

- `SettingBuilder` — Main form component for creating/editing setting profiles

## Cross-Package Imports

| Import                                        | Source Package         | Usage                                        |
| --------------------------------------------- | ---------------------- | -------------------------------------------- |
| `SettingProfileSchema`                        | `@minimal-rpg/schemas` | Validates setting data before submission     |
| `SettingProfile`, `SettingTag`                | `@minimal-rpg/schemas` | Types for setting structure                  |
| `SETTING_TAGS`                                | `@minimal-rpg/schemas` | Array of available setting tag options       |
| `BuilderActionPanel`                          | `@minimal-rpg/ui`      | Reusable save/cancel/delete button panel     |
| `mapZodErrorsToFields`, `getInlineErrorProps` | `@minimal-rpg/utils`   | Error handling and form validation utilities |

## API Client Imports

From `../../shared/api/client.js`:

- `getSetting` — Fetches existing setting by ID for edit mode
- `saveSetting` — Persists setting profile (create or update)
- `deleteSetting` — Removes setting by ID

## Local Imports

- `splitList` from `../shared/stringLists.js` — Parses comma-separated themes

## Form Fields

- **ID** — Unique identifier
- **Name** — Display name
- **Themes** — Comma-separated list (converted to array)
- **Tags** — Checkbox group from `SETTING_TAGS` constant
- **Lore** — Multi-line world lore text

## Tracing Notes

Schema validation uses `SettingProfileSchema` from [packages/schemas/src/setting/index.ts](../../../../../../schemas/src/setting/index.ts). The `SETTING_TAGS` constant is also exported from the same location.
