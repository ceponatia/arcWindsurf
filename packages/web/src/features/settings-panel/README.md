# settings-panel

List panel for selecting settings in the session setup flow.

## Exports

- `SettingsPanel` — Selectable list of world settings with edit/delete actions
- `SettingsPanelProps` — TypeScript interface for the component

## Cross-Package Imports

None — this is a local component with callback props.

## API Client Imports

From `../../shared/api/client.js`:

- `deleteSetting` — Removes a setting when delete action is triggered

## Local Types

From `../../types.js`:

- `SettingSummary` — Minimal setting data (id, name, tone)

## Props

- `selectedId` — Currently selected setting ID
- `onSelect(id)` — Selection callback
- `onEdit(id)` — Edit button callback (optional)
- `settings` — Array of setting summaries
- `loading`, `error` — State flags
- `onRefresh` — Reload callback

## Features

- Hover-reveal edit and delete buttons
- Keyboard navigation support
- Link to Setting Builder at bottom

## Tracing Notes

This component is used by `MobileSidebar` and page-level layouts. Delete operations call the API directly and trigger `onRefresh` to update the list.
