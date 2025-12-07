# characters-panel

List panel for selecting characters in the session setup flow.

## Exports

- `CharactersPanel` — Re-exports from `@minimal-rpg/ui`

## Cross-Package Imports

| Import            | Source Package    | Usage                                                      |
| ----------------- | ----------------- | ---------------------------------------------------------- |
| `CharactersPanel` | `@minimal-rpg/ui` | Presentational component for character list with selection |

## API Client Imports

From `../../shared/api/client.js`:

- `deleteCharacter` — Removes a character when delete action is triggered

## Tracing Notes

The view component lives at [packages/ui/src/CharactersPanel.tsx](../../../../../../ui/src/CharactersPanel.tsx). This feature folder is a thin adapter that connects the UI component to the shared API client for delete operations.
