# UI/Web Refactor TODO

Shared UI extraction tasks to support responsive (web + mobile) frontends.

## High Priority

1. Extract `AppHeader` to `@minimal-rpg/ui`
   - [ ] Create `AppHeader` component in `packages/ui/src/components` with current props (`characterName`, `settingName`, `hasSession`).
   - [ ] Export it from `packages/ui/src/index.ts`.
   - [ ] Update `DesktopApp` (and future mobile shell) to import `AppHeader` from `@minimal-rpg/ui`.

2. Extract `SessionsPanel` to `@minimal-rpg/ui`
   - [ ] Move presentational `SessionsPanel` from `packages/web/src/components` into `packages/ui/src/components`.
   - [ ] Keep the same props: `sessions`, `loading`, `error`, `activeId`, `onSelect`, `onRetry`, `onDelete`.
   - [ ] Export from `packages/ui/src/index.ts` and update imports in `DesktopApp` (and future mobile views).

## Medium Priority

1. Split `CharactersPanel` into container + shared UI
   - [x] Create a purely presentational `CharactersPanel` in `packages/ui/src/components` that:
     - Takes `characters`, `selectedId`, `onSelect`, `onEdit`, `onDeleteRequest`, `onRefresh`.
     - Does **not** call APIs, `window.confirm`, or `alert` directly.
   - [x] Refactor `packages/web/src/components/CharactersPanel.tsx` into a thin container that:
     - Imports `deleteCharacter` and handles confirm/error logic.
     - Delegates all rendering to `@minimal-rpg/ui` `CharactersPanel`.

2. Extract chat view UI from `ChatPanel` to `@minimal-rpg/ui`
   - [x] Identify the presentational parts of `ChatPanel` (message list, edit UI, input area) that depend only on props and `MessageContent`.
   - [x] Create a shared `ChatView` (or `ChatThread`) component in `packages/ui/src/components` that accepts:
     - `messages`, `loading`, `error`, `draft`, `sending`, `editingIdx`, `editDraft`.
     - Callbacks for `onSend`, `onDraftChange`, `onStartEdit`, `onCancelEdit`, `onSaveEdit`, `onDeleteMessage`.
   - [x] Refactor `packages/web/src/components/ChatPanel.tsx` to:
     - Keep all data fetching and mutation logic (`getSession`, `sendMessage`, `updateMessage`, `deleteMessage`, `AbortController`).
     - Render the shared `ChatView` and wire the controller state/handlers into it.

## Lower Priority / Nice-to-Have

1. Consider extracting responsive helpers to `@minimal-rpg/ui`
   - [ ] Generalize `useIsMobile` from `packages/web/src/App.tsx` into a reusable hook in `ui` (e.g., `useIsMobile` or `useBreakpoint`).
   - [ ] Optionally provide a `ResponsiveAppShell` pattern in `ui` that:
     - Accepts `desktop` and `mobile` children/components.
     - Handles breakpoint and user-agent detection in one place.

2. Standardize shared layout primitives
   - [ ] As patterns solidify, consider extracting shared layout primitives (e.g., sidebar panel shell, card sections) used by `CharactersPanel`, `SettingsPanel`, `SessionsPanel`, and chat into small, reusable UI components.
   - [ ] Keep these focused on layout/styling only; keep data and side-effects in the web package.
