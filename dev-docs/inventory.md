# Minimal RPG Codebase Inventory

**Last Updated**: January 12, 2026

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Packages** | 15 |
| **Total Source Files** | 666 |
| **Total Directories** | 284 |
| **Total Lines of Code** | 74,330 |
| **Average LOC per File** | 112 |
| **Average Files per Package** | 44 |

---

## Package Breakdown

| Package | Files | LOC | Avg LOC/File | Purpose |
|---------|-------|-----|--------------|---------|
| `@minimal-rpg/web` | 197 | 25,938 | 132 | React frontend, UI features |
| `@minimal-rpg/schemas` | 140 | 15,997 | 114 | Zod schemas, domain types |
| `@minimal-rpg/api` | 79 | 10,871 | 138 | Hono HTTP server, routes |
| `@minimal-rpg/db` | 42 | 5,028 | 120 | PostgreSQL, Drizzle ORM |
| `@minimal-rpg/generator` | 22 | 4,033 | 183 | Content generation |
| `@minimal-rpg/utils` | 35 | 2,366 | 68 | Shared utilities |
| `@minimal-rpg/services` | 18 | 2,081 | 116 | Physics, social, time, rules |
| `@minimal-rpg/retrieval` | 18 | 1,727 | 96 | Knowledge retrieval, RAG |
| `@minimal-rpg/ui` | 25 | 1,511 | 60 | Shared UI components |
| `@minimal-rpg/llm` | 26 | 1,314 | 51 | LLM abstraction, providers |
| `@minimal-rpg/actors` | 17 | 1,043 | 61 | XState NPC/player actors |
| `@minimal-rpg/characters` | 22 | 835 | 38 | Character data structures |
| `@minimal-rpg/projections` | 10 | 720 | 72 | Event projections, read models |
| `@minimal-rpg/workers` | 8 | 521 | 65 | Background workers |
| `@minimal-rpg/bus` | 7 | 345 | 49 | WorldBus, Redis pub/sub |

---

## Largest Files (Top 10)

| File | LOC | Package |
|------|-----|---------|
| `db/src/utils/client.ts` | 1,175 | db |
| `web/src/layouts/AppShell.tsx` | 978 | web |
| `web/src/features/library/LocationPrefabLibrary.tsx` | 905 | web |
| `web/src/shared/api/client.ts` | 895 | web |
| `schemas/src/character/personality.ts` | 895 | schemas |
| `web/src/features/session-workspace/store.ts` | 877 | web |
| `web/src/features/prefab-builder/store.ts` | 775 | web |
| `api/src/services/simulation-hooks.ts` | 707 | api |
| `schemas/src/schedule/utils.ts` | 623 | schemas |
| `schemas/src/affinity/utils.ts` | 600 | schemas |

---

## Smallest Files

Most 1-line files are barrel exports (`index.ts`), such as:

- `packages/actors/src/player/index.ts`
- `packages/actors/src/registry/index.ts`
- `packages/schemas/src/utils/index.ts`
- `packages/web/src/features/*/index.ts`

---

## Test Coverage

| Metric | Value |
|--------|-------|
| **Test Files** | 26 |
| **Test LOC** | 3,333 |
| **Test/Source Ratio** | 4.5% |

---

## File Type Distribution

| Extension | Count | Description |
|-----------|-------|-------------|
| `.ts` | ~500 | TypeScript source |
| `.tsx` | ~166 | React components |
| `.json` | ~50 | Config files |
| `.md` | ~40 | Documentation |
| `.css/.scss` | ~16 | Stylesheets |

---

## Architecture Notes

### Code Distribution

```text
Frontend (web):     35% of LOC
Schemas/Types:      22% of LOC
API Server:         15% of LOC
Database:            7% of LOC
Everything Else:    21% of LOC
```

### Package Dependencies (Layer Model)

```text
Layer 0 (Foundation):
  └── schemas

Layer 1 (Infrastructure):
  ├── bus
  ├── db
  └── llm

Layer 2 (Domain):
  ├── services
  ├── actors
  ├── projections
  └── retrieval

Layer 3 (Application):
  ├── api
  ├── characters
  ├── generator
  └── workers

Layer 4 (Presentation):
  ├── ui
  └── web
```

---

## Observations

1. **Frontend-heavy**: `web` package has 35% of total LOC
2. **Schema-rich**: Strong typing with 16k LOC in schemas
3. **Low test coverage**: Only 4.5% test-to-source ratio
4. **Some large files**: 6 files over 800 LOC - candidates for refactoring
5. **Many barrel exports**: Index files are minimal, good organization

---

## History

| Date | Total LOC | Files | Notes |
|------|-----------|-------|-------|
| 2026-01-12 | 74,330 | 666 | Initial inventory |
