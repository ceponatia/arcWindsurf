# UI Package Test Coverage Review

## Scope

Package: `@minimal-rpg/ui`

Focus: React UI components, layout primitives, and shared utilities.

## Existing Tests

- `test/utils.test.ts`
  - Covers `cn` class name merge and tailwind conflict resolution.
- `test/setup.ts`
  - Test setup for `@testing-library/jest-dom` matchers.

## Notably Untested or Under-tested Areas

### Chat

- `ChatView` rendering paths (loading, error, empty state) are not tested.
- Edit mode flows (edit, cancel, save, delete, redo) are not tested.
- Auto-scroll behavior and `autoScroll=false` branch are not tested.
- `MessageContent` markdown rendering and custom element overrides are not tested.

### Data Display

- `CharactersPanel`, `SessionsPanel`, `PersonasPanel`, and `EntityUsagePanel` rendering and interactions are not tested.
- Empty state, error state, and action callbacks (select/edit/delete) are not tested.
- `EntityUsagePanel` collapse toggle and show more/less behavior are not tested.

### Feedback

- `HelpIcon` tooltip display, hash navigation, and size variants are not tested.
- `HelpPopover` open/close behavior, outside click handling, and custom trigger are not tested.

### Forms

- `BuilderActionPanel` delete confirmation modal flows, error/success rendering, and button state variations are not tested.

### Layout

- `AppHeader` session info rendering vs empty state is not tested.
- `PreviewSidebarLayout` composition and prop forwarding to `BuilderActionPanel` are not tested.

## Suggested Test Additions (Prioritized)

1. Add component rendering and interaction tests for `ChatView` and `MessageContent`.
2. Add panel tests for data display components covering empty/error/loading and action callbacks.
3. Add feedback component tests for tooltip and popover behavior.
4. Add form and layout tests for modal flows and prop wiring.
5. Add Playwright smoke coverage for the shared UI package inside the web app (one or two key screens that consume `@minimal-rpg/ui`).
6. Optional: add visual regression (Storybook + snapshots or Playwright screenshots) for high-risk shared components.

## Notes

- The package is presentation-only and has no runtime logic beyond UI state handling, so component rendering tests should be sufficient as a baseline.
- For cross-app UI regressions, E2E smoke tests in `@minimal-rpg/web` or visual regression are the most practical additions.
