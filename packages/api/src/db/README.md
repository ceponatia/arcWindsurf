# Database Clients

Re-exports Prisma database clients and session-related database operations.

## Overview

- **prismaClient.ts** — Exports the shared Prisma client instance from `@minimal-rpg/db`
- **sessionsClient.ts** — Exports session CRUD operations, message handling, state slice helpers, and prompt tag functions

## Key Exports

### From `prismaClient.ts`

- `db` — The Prisma client for direct database access

### From `sessionsClient.ts`

- Session management: `createSession`, `getSession`, `listSessions`, `deleteSession`
- Messages: `appendMessage`, `appendNpcMessage`, `getNpcMessages`
- State slices: `getLocationState`, `upsertLocationState`, `getInventoryState`, `upsertInventoryState`, `getTimeState`, `upsertTimeState`
- Prompt tags: `listPromptTags`, `getPromptTag`, `createPromptTag`, `updatePromptTag`, `deletePromptTag`
- Tag instances: `createSessionTagInstances`, `getSessionTagInstances`
