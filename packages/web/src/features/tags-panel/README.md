# tags-panel

Checkbox panel for selecting prompt tags in session setup.

## Exports

- `TagsPanel` — Multi-select tag list with manage link
- `TagsPanelProps` — TypeScript interface for the component

## Cross-Package Imports

None — this is a local component.

## API Client Imports

From `../../shared/api/client.js`:

- `getTags` — Fetches all available tags on mount

## Local Types

From `../../types.js`:

- `TagSummary` — Tag with id, name, shortDescription, promptText

## Props

- `selectedIds` — Array of currently selected tag IDs
- `onToggle(id)` — Toggle selection callback
- `onEdit` — Navigate to tag management

## Behavior

- Fetches tags on component mount
- Renders checkbox list with tag names
- Shows loading and error states
- Includes "Manage" link to tag builder

## Tracing Notes

This component manages its own data fetching, unlike other panels that receive data via props. It's used in `MobileSidebar` and session setup flows.
