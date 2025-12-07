# library

Collection of list/grid views for browsing domain entities.

## Exports

- `CharacterLibrary` — Grid view of character profiles with edit/create actions
- `SettingLibrary` — Grid view of world settings
- `TagLibrary` — Grid view of prompt tags
- `SessionLibrary` — List view of session history
- `ItemLibrary` — Grid view of item definitions

## Cross-Package Imports

None — these are pure presentational components with callback props.

## API Client Imports

From `../../shared/api/client.js`:

- `getTags` — Used by `TagLibrary` to fetch tag list with abort support

## Local Types

From `../../types.js`:

- `CharacterSummary` — Minimal character data for list display
- `SettingSummary` — Minimal setting data for list display
- `TagSummary` — Tag with name, description, and prompt text
- `SessionSummary` — Session with character/setting names and timestamps
- `ItemSummary` — Item with name, category, type, description

## Patterns

Each library component follows the same pattern:

1. Receives data, loading, and error state via props
2. Provides `onRefresh`, `onEdit`, and `onCreateNew` callbacks
3. Renders loading spinner, error state, empty state, or grid of cards

## Tracing Notes

These components are typically wrapped by page-level components that fetch data and manage navigation. The `TagLibrary` is unique in that it fetches its own data internally.
