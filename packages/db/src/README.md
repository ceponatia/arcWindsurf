# Database Layer

Core database access layer using raw PostgreSQL with the `pg` driver. Provides a Prisma-like API surface for entity operations.

## Overview

This package provides direct PostgreSQL access without an ORM, using a structured client API that mirrors Prisma's query patterns for familiarity.

## Files

| File          | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `client.ts`   | Connection pool, query utilities, and entity CRUD operations (`db` object)  |
| `sessions.ts` | Session management, messages, NPC transcripts, and per-session state slices |
| `tags.ts`     | Prompt tag definitions and session tag bindings                             |
| `admin.ts`    | Database introspection (`getDbOverview`), path info, and row deletion       |
| `node.ts`     | Re-exports for Node.js environments                                         |
| `types.ts`    | TypeScript type definitions for all database entities                       |
| `migrate.ts`  | SQL migration runner (reads from `sql/` directory)                          |
| `seed.ts`     | Database seeding (currently a no-op placeholder)                            |
| `pgvector.ts` | Typed wrapper for pgvector extension registration                           |

## Key Exports

### From `client.ts`

- `pool` — PostgreSQL connection pool
- `db` — Entity client with Prisma-like API:
  - `db.userSession` — Session CRUD
  - `db.message` — Message CRUD
  - `db.characterProfile` / `db.settingProfile` — Profile CRUD
  - `db.characterInstance` / `db.settingInstance` — Instance CRUD
  - `db.itemDefinition` / `db.itemInstance` — Item CRUD

### From `sessions.ts`

- `createSession`, `getSession`, `listSessions`, `deleteSession`
- `appendMessage`, `appendNpcMessage`, `getNpcMessages`
- `appendStateChangeLog`
- State slices: `getLocationState`, `upsertLocationState`, `getInventoryState`, `upsertInventoryState`, `getTimeState`, `upsertTimeState`

### From `tags.ts`

- `listPromptTags`, `getPromptTag`, `createPromptTag`, `updatePromptTag`, `deletePromptTag`
- `createSessionTagBinding`, `getSessionTagBindings`, `getSessionTagsWithDefinitions`
- `toggleSessionTagBinding`, `deleteSessionTagBinding`, `clearSessionTagBindings`

### From `admin.ts`

- `getDbOverview()` — Introspect tables, columns, and sample data
- `getDbPathInfo()` — Get database URL and connectivity status
- `deleteDbRow(modelName, id)` — Delete a row by model name and ID

## Configuration

Uses `DATABASE_URL` environment variable:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/minirpg
```

## Migrations

SQL migrations are stored in `sql/` and run in alphabetical order:

```bash
pnpm -F @minimal-rpg/db migrate
```

## pgvector Support

The pool automatically registers pgvector types for each new connection, enabling vector similarity search for embeddings.
