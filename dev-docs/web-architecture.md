# Web Architecture (packages/web)

This document explains the structure, data flow, and navigation for the web client so external tools (and future contributors) can reason about it quickly.

## Overview

- Stack: React 18 + TypeScript + Vite (SPA).
- Module format: ESM with `verbatimModuleSyntax: true`; local imports include `.js` extensions.
- Entry: `packages/web/src/main.tsx` renders either `DbView` (when path is `/dbview`) or the main `App`.
- Navigation: minimal, hash-based toggle for the character builder (`#/character-builder`). Clearing the hash shows the chat view.
- State sources: REST API for characters, settings, sessions; local React state for selection and current session.

## Entry & Routing

- `src/main.tsx`
  - Imports global styles from `src/styles/app.css`.
  - Checks `window.location.pathname` for `/dbview` and renders `DbView` if matched; otherwise renders `App`.
  - Wraps in `React.StrictMode` when `STRICT_MODE` (from `src/config.ts`) is true.
- `src/App.tsx`
  - Layout with sidebar and main content.
  - Sidebar includes characters list, settings selector, a Start Session button, and a sessions list.
  - Main content shows `AppHeader` and either `CharacterBuilder` (when `window.location.hash === '#/character-builder'`) or `ChatPanel` when a session is selected.
  - Selecting or creating a session sets `currentSessionId` and clears the hash to switch to chat.

## Data Flow

- Characters/Settings
  - Fetched via hooks (`useCharacters`, `useSettings`) → rendered in sidebar (`CharactersPanel`, `SettingsSelector`).
- Sessions
  - Fetched via `useSessions` → rendered in `SessionsPanel`. Selection stored in `App` state as `currentSessionId`.
- Chat
  - `ChatPanel` loads a full `Session` and renders messages. Sends messages with optimistic UI, then replaces/extends with server reply.
- Builder
  - `CharacterBuilder` posts a validated `CharacterProfile` to the API. New entries appear in characters list on next load.

## Components

- `src/components/AppHeader.tsx`
  - Props: `characterId?`, `settingId?`, `hasSession?`.
  - Uses hooks to map IDs to names and displays current character/setting (with tone tag) when a session is active.

- `src/components/CharactersPanel.tsx`
  - Props: `selectedId`, `onSelect(id)`.
  - Lists characters and includes a link to `#/character-builder`.

- `src/components/SettingsSelector.tsx`
  - Props: `value`, `onChange(id)`.
  - Renders a `<select>` with settings (`name (tone)`).

- `src/components/SessionsPanel.tsx`
  - Props: `sessions`, `loading?`, `error?`, `activeId?`, `onSelect?`, `onRetry?`.
  - Lists sessions with basic metadata; click invokes `onSelect(id)`.

- `src/components/ChatPanel.tsx`
  - Prop: `sessionId?`.
  - Loads session via `getSession`, renders `messages`, sends via `sendMessage` (timeout configured in `config.ts`).
  - Handles aborts/timeouts and auto-scroll to bottom.

- `src/components/CharacterBuilder.tsx`
  - Large form to create a character. Supports free-text or structured appearance.
  - Client-validates with `@minimal-rpg/schemas` and maps Zod errors to inline fields via `@minimal-rpg/utils` helpers.
  - On save, `POST /characters`.

- `src/components/DbView.tsx`
  - Dev-only database overview at `/dbview`. Uses `/admin/db/overview`.
  - Optional row delete action gated by env (see Config & Env).

## Hooks

- `src/hooks/useCharacters.ts`
  - Returns `{ loading, error, data, retry }`. Fetch-once pattern with abort handling.
- `src/hooks/useSettings.ts`
  - Same shape as `useCharacters` for settings.
- `src/hooks/useSessions.ts`
  - Returns `{ loading, error, data, refresh }`. Meant for refreshable sessions list.

## API Client

- `src/api/client.ts`
  - Thin `http()` wrapper with abort/timeout and best-effort error parsing.
  - Reads base URL and message timeout from `src/config.ts`.
  - Endpoints used by the web client:
    - `GET /characters` → `getCharacters()`
    - `GET /settings` → `getSettings()`
    - `GET /sessions` → `getSessions()`
    - `POST /sessions` → `createSession(characterId, settingId)`
    - `GET /sessions/:id` → `getSession(id)`
    - `POST /sessions/:id/messages` → `sendMessage(id, content)`
    - `GET /sessions/:id/messages` → `getSessionMessages(id)`
    - `PATCH /sessions/:id` → `renameSession(id, title)`
    - `DELETE /sessions/:id` → `deleteSession(id)`
    - `GET /admin/db/overview` → `getDbOverview()` (dev)
    - `DELETE /admin/db/:model/:id` → `deleteDbRow()` (dev)

## Types

- `src/types.ts`
  - `CharacterSummary`: `{ id, name, summary, tags? }`
  - `SettingSummary`: `{ id, name, tone }`
  - `Message`: `{ role: 'user'|'assistant', content, createdAt }`
  - `Session`: `{ id, characterId, settingId, createdAt, messages: Message[] }`
  - `SessionSummary`: `{ id, characterId, settingId, createdAt, characterName?, settingName? }`

## Config & Env

- `src/config.ts`
  - `API_BASE_URL` (default `http://localhost:3001`)
  - `MESSAGE_TIMEOUT_MS` (default `60000`)
  - `STRICT_MODE` (`VITE_STRICT_MODE`)
  - `DB_TOOLS` (`VITE_DB_TOOLS`) — shows delete controls in `/dbview` when enabled and server-side admin is enabled.
- `vite.config.ts`
  - Dev server proxy to the API (characters/settings/sessions paths).

## Styling

- `src/styles/app.css` defines layout (sidebar/main), panels, list and form styles, and chat message classes (`.message.user`, `.message.assistant`, `.message.system`).

## Navigation Notes

- `#/character-builder` shows the character builder. Clearing `window.location.hash` returns to chat.
- Selecting/creating a session sets `currentSessionId` in `App` and clears the hash, switching to chat.
- Visiting `/dbview` (path, not hash) renders `DbView` for dev database inspection.

## Conventions

- Prefer importing schemas directly from `@minimal-rpg/schemas` for runtime validation.
- Keep local imports ESM-correct with explicit `.js` suffixes.
- API failures should surface concise messages in the UI; the client tries to parse error JSON/text for details.

## Dev Tips

- Start web dev server:

  ```bash
  pnpm -F @minimal-rpg/web dev
  ```

- Common env flags:
  - `VITE_API_BASE_URL`: point to a non-default API origin.
  - `VITE_API_MESSAGE_TIMEOUT_MS`: extend message timeouts for long generations.
  - `VITE_STRICT_MODE=true`: enable Strict Mode (expect double effect runs in dev).
  - `VITE_DB_TOOLS=true`: show delete actions in `/dbview` (server must also enable admin).
