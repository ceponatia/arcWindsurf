# session-builder

Session creation wizard with character, setting, and tag selection.

## Exports

- `SessionBuilder` — Multi-panel session configuration UI

## Cross-Package Imports

None — this is a pure presentational component with callback props.

## Local Types

From `../../types.js`:

- `CharacterSummary` — Character data for selection cards
- `SettingSummary` — Setting data for selection cards
- `TagSummary` — Tag data for multi-select cards

## Components

### SelectionPanel

Reusable scrollable panel with:

- Title with optional required indicator
- Loading and error states
- Refresh button

### SelectableCard

Interactive card supporting:

- Single selection (violet highlight)
- Multi-selection (emerald highlight with checkmark)
- Tags display with overflow

### SessionBuilder

Four-column grid layout:

1. Character panel (required)
2. Setting panel (required)
3. Tags panel (optional, multi-select)
4. Placeholder for future options

## Props

- `characters`, `settings`, `tags` — Data arrays with loading/error states
- `onRefresh*` — Callbacks to reload each data type
- `onStartSession(characterId, settingId, tagIds)` — Creates the session
- `creating`, `createError` — Submission state

## Tracing Notes

This component is typically rendered by a page that fetches all required data and handles session creation via the API client.
