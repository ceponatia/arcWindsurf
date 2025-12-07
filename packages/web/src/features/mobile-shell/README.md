# mobile-shell

Mobile-responsive navigation shell with header and slide-out sidebar.

## Exports

- `MobileHeader` — Sticky header with menu toggle and session status
- `MobileSidebar` — Slide-out drawer containing selection panels
- `MobileHeaderProps`, `MobileSidebarProps` — TypeScript interfaces (from `../../types.js`)

## Cross-Package Imports

| Import          | Source Package    | Usage                                  |
| --------------- | ----------------- | -------------------------------------- |
| `SessionsPanel` | `@minimal-rpg/ui` | Session list panel embedded in sidebar |

## Local Feature Imports

- `CharactersPanel` from `../characters-panel/CharactersPanel.js`
- `SettingsPanel` from `../settings-panel/SettingsPanel.js`
- `TagsPanel` from `../tags-panel/index.js`

## Components

### MobileHeader

Displays:

- Hamburger menu toggle
- Current character and setting names (when session active)
- Green indicator dot for active sessions

### MobileSidebar

Full-height drawer containing:

- `CharactersPanel` — Character selection
- `SettingsPanel` — Setting selection
- `TagsPanel` — Tag toggles
- Start Session button
- `SessionsPanel` — Session history list

Features escape-key close and body scroll lock when open.

## Tracing Notes

The `SessionsPanel` component is defined at [packages/ui/src/SessionsPanel.tsx](../../../../../../ui/src/SessionsPanel.tsx). Panel props flow from the parent page component that manages all selection state.
