# Web Package Test Coverage Review

## Scope

Package: `@minimal-rpg/web`

Focus: Vite React frontend, feature modules, shared hooks, and API/stream helpers.

## Existing Tests

- `test/stringLists.test.ts`
  - Covers `splitList` newline/comma splitting.
- `test/setting-builder-utils.test.ts`
  - Covers `generateId`, `createInitialFormState`, `mapProfileToForm`, and `buildProfile` transformations.
- `test/stream.test.ts`
  - Covers `connectStream` open/message/error handling and disconnect.
- `test/trait-applicator.test.ts`
  - Covers `applyTrait` updating profile/personality map for inferred traits.
- `test/character-studio-utils.test.ts`
  - Covers appearance/sensory combination tracking and next-available entry selection.
- `test/useInputMode.test.tsx`
  - Covers `useInputMode` cycling, marker insertion, and cleanup.
- `test/buildTurnDebugSlices.test.ts`
  - Covers debug slice construction from metadata.
- `test/useIsMobile.test.tsx`
  - Covers `useIsMobile` width detection and resize behavior.
- `src/shared/hooks/useFetchOnce.test.ts`
  - Covers initial fetch, retry flow, and error retention with previous data.
- `test/appshell-resize.spec.ts`
  - Playwright coverage for responsive AppShell state preservation and sessionStorage view mode.
- `test/AppShell.auth.todo.test.tsx`
  - Placeholder for auth wiring (no assertions yet).

## Notably Untested or Under-tested Areas

### App Shell, Routing, and Layouts

- `App.tsx`, layouts (`ShellHeader`, `ShellComponents`, `MobileDrawer`, `AppFooter`), and hash routing flows are not tested.
- Auth gating (`RequireSignIn`, `RequireAdmin`, `useAuth`, token helpers) lacks coverage beyond the TODO test.
- Responsive shell behavior outside the resize integration test is not unit-tested.

### Shared Hooks and API

- `useRefreshOnViewEnter`, `useSessionTabCoordination`, `useWorldBus`, `useAutoSave`, and entity hooks (`useCharacters`, `useSettings`, `useItems`, `usePersonas`, `useTags`, `useEntityUsage`) are untested.
- API client wiring in `shared/api/*` and Supabase client helpers lack tests.

### Feature Modules

- Most feature components (Character Studio UI, Session Builder, Tag Builder, Location Builder, Prefab Builder, Persona Builder, Item Builder, libraries/panels) have no component tests.
- Character Studio services (`services/api`, `services/llm`, `services/trait-inference`), transformers, validation, and hooks (`useCharacterStudio`, `useConversation`) are not tested.
- Setting Builder components and hooks are not tested beyond transformer utilities.
- Chat/Debug UI components (`ChatPanel`, `TurnDebugPanel`, `TurnDebugBubble`) are not tested beyond `buildTurnDebugSlices`.

### Streaming and Realtime

- `connectStream` retry backoff and max retries behavior are not tested.
- Stream error parsing and JSON parse failure handling are untested.

### Mobile Shell

- `useIsMobile` UA detection path is not tested (only width).
- Mobile header/sidebar component behavior is untested.

## Suggested Test Additions (Prioritized)

1. Add component tests for major screens and layouts (AppShell, Character Studio, Session Builder) covering navigation and basic rendering.
2. Add tests for shared hooks and API clients (`useRefreshOnViewEnter`, `useAuth`, data hooks, Supabase client).
3. Extend streaming tests for retry/backoff and JSON parse failure behavior.
4. Add Character Studio service and validation tests (trait inference, transformers, validation).
5. Expand Playwright E2E coverage for core user flows (create session, send message, save character, builder save/delete).
6. Optional: visual regression checks for key screens to catch styling/layout regressions.

## Notes

- Most existing tests focus on utilities/hooks; the majority of UI and feature modules remain untested.
- Vitest is sufficient for logic and component tests, but E2E and visual regression are the most useful complements for frontend changes.
