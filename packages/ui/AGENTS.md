# @minimal-rpg/ui

## Purpose

Shared React component library for Minimal RPG frontends. Provides reusable UI primitives styled with Tailwind CSS.

## Scope

- Shared UI components, layouts, and primitives
- Styling tokens, themes, and Tailwind helpers
- UI-specific hooks and composition helpers
- Build configuration for bundling components

## Package Connections

- **schemas**: Uses types for component props (e.g., message shapes)
- **web**: Web frontend imports and composes UI components

This package is presentation-only. It has no dependencies on game logic packages.

## Public API

### Chat

- `ChatView`: Main chat interface component
- `MessageContent`: Markdown renderer for messages
- Types: `ChatViewProps`, `ChatViewMessage`, `ChatViewSpeaker`

### Data Display

- `CharactersPanel`: List view for characters
- `SessionsPanel`: List view for game sessions
- `PersonasPanel`: List view for personas
- `EntityUsagePanel`: Usage tracking display
- Types: `CharactersPanelProps`, `SessionsPanelProps`, `PersonasPanelProps`, `EntityUsagePanelProps`

### Feedback

- `HelpIcon`: Tooltip icon for quick help
- `HelpPopover`: Detailed help content popover
- Types: `HelpIconProps`, `HelpPopoverProps`

### Forms

- `BuilderActionPanel`: Standard action buttons (Save, Delete, etc.)
- Types: `BuilderActionPanelProps`

### Layout

- `AppHeader`: Standard application header
- `PreviewSidebarLayout`: Layout for builder preview sidebars
- Types: `AppHeaderProps`, `PreviewSidebarLayoutProps`

### Utilities

- `cn`: Tailwind class merger
