# API Package Refactor Plan

This document outlines findings from a comprehensive review of the `packages/api` package, identifying opportunities for:

1. Tool-calling enhancements for the LLM agent
2. Breaking up monolithic files
3. Extracting reusable utilities and components
4. Consolidating and organizing types

## Table of Contents

- [1. Tool-Calling Enhancement Opportunities](#1-tool-calling-enhancement-opportunities)
- [2. Monolithic Files to Break Up](#2-monolithic-files-to-break-up)
- [3. Reusable Code Extraction](#3-reusable-code-extraction)
- [4. Type Consolidation](#4-type-consolidation)
- [5. Implementation Todo List](#5-implementation-todo-list)

---

## 1. Tool-Calling Enhancement Opportunities

### Current State

The API already has a solid foundation for tool-calling with OpenRouter:

- `chatWithOpenRouterTools()` in [openrouter.ts](packages/api/src/llm/openrouter.ts)
- Tool definitions in `@minimal-rpg/governor` package (CORE_TOOLS: `get_sensory_detail`, `npc_dialogue`, `update_proximity`)
- `ToolExecutor` and `ToolBasedTurnHandler` in governor package
- Hybrid mode support via `TURN_HANDLER` env var (`classic`, `tool-calling`, `hybrid`)

### New Tool Opportunities

#### 1.1 Session State Tools (Priority: High)

These tools would allow the LLM to query and modify session state directly:

| Tool Name             | Description                     | Use Case                                               |
| --------------------- | ------------------------------- | ------------------------------------------------------ |
| `get_session_tags`    | Retrieve active session tags    | Allow LLM to adapt behavior based on active style tags |
| `toggle_session_tag`  | Enable/disable a session tag    | Dynamic tone shifts during gameplay                    |
| `get_session_persona` | Retrieve player persona context | Personalized NPC responses                             |
| `query_npc_list`      | List available NPCs in session  | Help LLM determine valid targets                       |

#### 1.2 History & Context Tools (Priority: Medium)

| Tool Name                  | Description                            | Use Case                  |
| -------------------------- | -------------------------------------- | ------------------------- |
| `get_conversation_summary` | Summarize recent conversation          | Context window management |
| `search_history`           | Search past turns for keywords         | Recall previous events    |
| `get_npc_transcript`       | Retrieve NPC-specific dialogue history | Character consistency     |

#### 1.3 Time & Environment Tools (Priority: Medium)

| Tool Name              | Description                      | Use Case                    |
| ---------------------- | -------------------------------- | --------------------------- |
| `advance_time`         | Progress in-game time            | "Time passes..." narratives |
| `get_time_context`     | Get current time-of-day, weather | Environmental descriptions  |
| `describe_environment` | Get current location details     | Scene-setting               |

#### 1.4 Character State Tools (Priority: Medium)

| Tool Name                 | Description                      | Use Case                      |
| ------------------------- | -------------------------------- | ----------------------------- |
| `get_character_mood`      | Query NPC emotional state        | Mood-appropriate responses    |
| `update_character_mood`   | Modify NPC emotional state       | Emotional reactions to events |
| `get_character_knowledge` | What does NPC know about player? | Relationship-aware dialogue   |

#### 1.5 Game Mechanics Tools (Priority: Low - Future)

| Tool Name       | Description                      | Use Case                  |
| --------------- | -------------------------------- | ------------------------- |
| `roll_check`    | Perform skill/luck check         | Random outcomes           |
| `apply_effect`  | Apply status effect to character | Combat, magic, conditions |
| `transfer_item` | Move item between inventories    | Trade, give, take actions |

### Recommended Actions for Tool-Calling

1. **Create `packages/api/src/llm/tools/` directory** for API-specific tool definitions
2. **Add session-aware tools** that leverage existing DB clients
3. **Create tool schemas** in `@minimal-rpg/schemas` for validation
4. **Wire new tools** into `ToolExecutor` via dependency injection pattern

---

## 2. Monolithic Files to Break Up

### 2.1 `src/types.ts` (~500 lines)

**Problem**: Single file contains all API types - DTOs, DB types, LLM types, session types.

**Proposed Split**:

Break up `src/types.ts` into domain-specific `types.ts` files, keeping only truly shared types in the root.

```text
src/
  types.ts              # Shared types (ApiError, RuntimeConfig, ChatRole)
  db/
    types.ts            # DB rows, Client interfaces, DbSession, DbMessage
  llm/
    types.ts            # LLM options, responses, Tool definitions, Prompt types
  sessions/
    types.ts            # Session DTOs, Message DTOs, Overrides
  data/
    types.ts            # LoadedData, Profile Summaries, Mappers
```

### 2.2 `src/routes/turns.ts` (~360 lines)

**Problem**: Single route handler doing too much - loading state, parsing profiles, calling governor, persisting changes, building DTOs.

**Proposed Split**:

```text
src/routes/turns/
  index.ts              # Route registration (thin handler)
  turn-request.ts       # Request validation & parsing
  turn-state-loader.ts  # Load baseline/overrides (use sessions/state-loader.ts)
  turn-result-mapper.ts # Map TurnResult to TurnResultDto
```

**Note**: Much of turns.ts duplicates logic in `sessions/state-loader.ts`. The loader should be used directly.

### 2.3 `src/routes/sessions.ts` (~520 lines)

**Problem**: Single file handles 10+ routes for sessions, messages, NPCs, and effective profiles.

**Proposed Split**:

```text
src/routes/sessions/
  index.ts              # Route registration (re-exports all)
  list-sessions.ts      # GET /sessions
  session-crud.ts       # GET/POST/DELETE /sessions/:id
  session-messages.ts   # POST/PATCH/DELETE /sessions/:id/messages
  session-npcs.ts       # GET/POST /sessions/:id/npcs
  session-effective.ts  # GET /sessions/:id/effective
  session-overrides.ts  # PUT /sessions/:id/overrides/*
```

### 2.4 `src/routes/profiles.ts` (~260 lines)

**Problem**: Handles characters, settings, AND personas in one file.

**Proposed Split**:

```text
src/routes/profiles/
  index.ts              # Route registration
  characters.ts         # /characters CRUD
  settings.ts           # /settings CRUD
  personas.ts           # /personas CRUD (currently duplicated in personas.ts!)
```

**Issue Found**: Both `profiles.ts` and `personas.ts` register `/personas` routes! This is a bug - `personas.ts` is more complete but `profiles.ts` also registers the same endpoints.

### 2.5 `src/routes/personas.ts` (~270 lines)

**Problem**: Duplicates some persona routes from profiles.ts, but adds session-persona attachment.

**Proposed Action**:

- Remove persona CRUD from `profiles.ts`
- Keep `personas.ts` as the canonical source
- Or consolidate into `profiles/personas.ts`

### 2.6 `src/llm/prompt.ts` (~230 lines)

**Problem**: Mixes prompt building with character/setting serialization.

**Proposed Split**:

```text
src/llm/prompts/
  index.ts              # Re-exports
  builder.ts            # buildPrompt() function
  serializers.ts        # serializeCharacter, serializeSetting, etc.
  filters.ts            # simpleContentFilter
  summarizers.ts        # summarizeHistory
```

---

## 3. Reusable Code Extraction

### 3.1 JSON Parsing Utilities (Multiple Files)

**Duplicated In**:

- `turns.ts`: `parseOverrides()` function
- `sessions/instances.ts`: `parseJson()` function
- `sessions/state-loader.ts`: `parseOverrides()` function (copy!)
- `routes/sessions.ts`: `tryParseName()` function
- `routes/profiles.ts`: inline JSON parsing in multiple handlers
- `routes/tags.ts`: inline parsing
- `routes/items.ts`: inline parsing
- `routes/personas.ts`: inline parsing

**Proposed Utility** (`src/util/json.ts`):

```typescript
/** Safely parse JSON with typed fallback */
export function safeParseJson<T>(text: string | null | undefined, fallback: T): T;

/** Parse JSON or return undefined */
export function tryParseJson<T>(text: string | null | undefined): T | undefined;

/** Extract a single field from JSON string */
export function extractJsonField<T>(text: string | null | undefined, field: string): T | undefined;

/** Validate and parse with Zod schema */
export function parseWithSchema<T>(
  text: string | null | undefined,
  schema: ZodSchema<T>
): T | undefined;
```

### 3.2 Profile Resolution Utilities (Multiple Files)

**Duplicated In**:

- `routes/sessions.ts`: `findCharacter()`, `findSetting()` functions
- `routes/profiles.ts`: Similar lookup logic inline
- `sessions/state-loader.ts`: Profile parsing logic

**Proposed Utility** (`src/util/profile-resolver.ts`):

```typescript
interface ProfileResolver {
  findCharacter(loaded: LoadedData, id: string): Promise<CharacterProfile | null>;
  findSetting(loaded: LoadedData, id: string): Promise<SettingProfile | null>;
  findPersona(id: string): Promise<PersonaProfile | null>;
}

export function createProfileResolver(db: PrismaClientLike): ProfileResolver;
```

### 3.3 Request Validation Utilities (Routes)

**Duplicated Pattern** across routes:

1. Try to parse JSON body
2. Return 400 if invalid JSON
3. Validate with Zod schema
4. Return 400 with error details if invalid
5. Extract data if valid

**Proposed Utility** (`src/util/request-validation.ts`):

```typescript
import { Context } from 'hono';
import { ZodSchema } from 'zod';

interface ValidationResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  errorResponse: Response;
}

export async function validateBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>>;

export async function validateOptionalBody<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ValidationResult<T | undefined>>;
```

### 3.4 Error Response Helpers (Routes)

**Duplicated Pattern**: `c.json({ ok: false, error: '...' } satisfies ApiError, statusCode)`

**Proposed Utility** (`src/util/responses.ts`):

```typescript
import { Context } from 'hono';

export function notFound(c: Context, message?: string): Response;
export function badRequest(c: Context, error: string | object): Response;
export function serverError(c: Context, error: string): Response;
export function forbidden(c: Context, message?: string): Response;
export function conflict(c: Context, message?: string): Response;
export function noContent(c: Context): Response;
```

### 3.5 ID Generation (Multiple Files)

**Duplicated In**:

- `routes/sessions.ts`: `safeRandomId()` with try/catch fallback
- `data/loader.ts`: Uses randomUUID directly

**Proposed Utility** (`src/util/id.ts`):

```typescript
/** Generate a UUID, with fallback for edge cases */
export function generateId(): string;

/** Generate a prefixed ID (e.g., "char-abc123") */
export function generatePrefixedId(prefix: string): string;

/** Generate a session-scoped instance ID */
export function generateInstanceId(templateId: string): string;
```

### 3.6 Deep Merge Utility (sessions/instances.ts)

**Location**: `deepMergeReplaceArrays()` in `sessions/instances.ts`

**Problem**: This utility is useful package-wide but buried in instances.ts.

**Proposed Move**: `src/util/object.ts`

```typescript
/** Deep merge with array replacement semantics */
export function deepMergeReplaceArrays<T>(base: T, override: unknown): T;

/** Check if value is a plain object (not array, null, etc.) */
export function isPlainObject(value: unknown): value is Record<string, unknown>;
```

### 3.7 Config Validation (util/config.ts)

**Current**: `getConfig()` reads env vars with minimal validation.

**Enhancement**: Add runtime validation with Zod.

**Proposed** (`src/util/config.ts`):

```typescript
import { z } from 'zod';

const RuntimeConfigSchema = z.object({
  port: z.number().int().positive(),
  contextWindow: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  openrouterApiKey: z.string(),
  openrouterModel: z.string(),
  governorDevMode: z.boolean(),
  intentDebug: z.boolean(),
  turnHandler: z.enum(['classic', 'tool-calling', 'hybrid']),
});

export function getConfig(): RuntimeConfig {
  // Parse and validate
}

export function assertConfigValid(): void {
  // Throw early if config invalid
}
```

---

## 4. Type Consolidation

### 4.1 Current Type Distribution

| Location                  | Types Defined                          | Should Be                  |
| ------------------------- | -------------------------------------- | -------------------------- |
| `src/types.ts`            | 50+ types                              | Split into focused modules |
| `routes/tags.ts`          | `PromptTagRow`, `SessionTagBindingRow` | Move to types              |
| `routes/personas.ts`      | `PersonaSummary` (duplicate!)          | Use from types.ts          |
| `sessions/state-cache.ts` | `DialogueState`, `SessionCacheEntry`   | Move to types/session.ts   |

### 4.2 Proposed Type Organization

```text
src/
  types.ts              # Shared types (ApiError, RuntimeConfig, ChatRole)
  db/
    types.ts            # DB rows, Client interfaces, DbSession, DbMessage
  llm/
    types.ts            # LLM options, responses, Tool definitions, Prompt types
  sessions/
    types.ts            # Session DTOs, Message DTOs, Overrides
  data/
    types.ts            # LoadedData, Profile Summaries, Mappers
```

### 4.3 Component-Level Types

Each component folder should have a `types.ts` for internal types (as described above).

### 4.4 Duplicate Type Issues

| Type                   | Defined In          | Also Defined In      | Resolution                                |
| ---------------------- | ------------------- | -------------------- | ----------------------------------------- |
| `PersonaSummary`       | `types.ts`          | `routes/personas.ts` | Remove from personas.ts, extend if needed |
| `ChatMessage`          | `llm/openrouter.ts` | `llm/ollama.ts`      | Extract to `llm/types.ts`                 |
| `PromptTagRow`         | `routes/tags.ts`    | -                    | Move to `types/session.ts`                |
| `SessionTagBindingRow` | `routes/tags.ts`    | -                    | Move to `types/session.ts`                |

### 4.5 Type Imports from Other Packages

Currently importing types from multiple places:

- `@minimal-rpg/schemas`: CharacterProfile, SettingProfile, etc.
- `@minimal-rpg/governor`: TurnResult, TurnStateContext, etc.
- `@minimal-rpg/db/node`: Various functions (not types)
- `@minimal-rpg/state-manager`: DeepPartial

**Recommendation**: Create a `src/types/external.ts` that re-exports commonly used external types for convenience:

```typescript
// src/types/external.ts
export type { CharacterProfile, SettingProfile, PersonaProfile } from '@minimal-rpg/schemas';
export type { TurnResult, TurnStateContext, ConversationTurn } from '@minimal-rpg/governor';
```

---

## 5. Implementation Todo List

### Phase 1: Foundation (Prerequisites)

These changes must be done first as other refactors depend on them.

- [x] **1.1** Create `src/util/json.ts` with safe JSON parsing utilities
- [x] **1.2** Create `src/util/responses.ts` with standard error response helpers
- [x] **1.3** Create `src/util/id.ts` with ID generation utilities
- [x] **1.4** Move `deepMergeReplaceArrays` to `src/util/object.ts`
- [x] **1.5** Create `src/util/request-validation.ts` with Zod validation helpers

### Phase 2: Type Reorganization

Split the monolithic types.ts file.

- [x] **2.1** Create `src/db/types.ts`
- [x] **2.2** Create `src/llm/types.ts`
- [x] **2.3** Create `src/sessions/types.ts`
- [x] **2.4** Create `src/data/types.ts`
- [x] **2.5** Clean up `src/types.ts` to only contain shared types
- [x] **2.6** Update all imports across the package

### Phase 3: Route Refactoring

Break up monolithic route files.

- [x] **3.1** Create `src/routes/sessions/` directory
- [x] **3.2** Extract session list handler to `sessions/list-sessions.ts`
- [x] **3.3** Extract session CRUD to `sessions/session-crud.ts`
- [x] **3.4** Extract message handlers to `sessions/session-messages.ts`
- [x] **3.5** Extract NPC handlers to `sessions/session-npcs.ts`
- [x] **3.6** Extract effective profiles to `sessions/session-effective.ts`
- [x] **3.7** Create `sessions/index.ts` that registers all routes
- [x] **3.8** Fix duplicate persona routes (remove from profiles.ts)
- [x] **3.9** Refactor `profiles.ts` to use extracted utilities

### Phase 4: Turns Route Refactor

Clean up the complex turns handler.

- [x] **4.1** Use `sessions/state-loader.ts` instead of inline loading in turns.ts
- [x] **4.2** Create `routes/turns/turn-request.ts` for request validation
- [x] **4.3** Create `routes/turns/turn-result-mapper.ts` for response mapping
- [x] **4.4** Simplify `routes/turns.ts` to thin orchestration layer
- [x] **4.5** Remove duplicated `parseOverrides` (use util/json.ts)

### Phase 5: LLM Module Refactor

Split prompt building from LLM interaction.

- [x] **5.1** Create `src/llm/types.ts` for LLM-specific internal types
- [x] **5.2** Create `src/llm/prompts/serializers.ts` for character/setting serialization
- [x] **5.3** Create `src/llm/prompts/summarizers.ts` for history summarization
- [x] **5.4** Create `src/llm/prompts/filters.ts` for content filtering
- [x] **5.5** Simplify `prompt.ts` to use extracted modules
- [x] **5.6** Move `buildProviderOptions` from `providerUtils.ts` to appropriate location

### Phase 6: Tool-Calling Enhancements

Add new tools for enhanced LLM capabilities.

- [x] **6.1** Create `src/llm/tools/` directory structure
- [x] **6.2** Create `src/llm/tools/definitions.ts` for API-specific tools
- [x] **6.3** Implement `get_session_tags` tool
- [x] **6.4** Implement `get_session_persona` tool
- [x] **6.5** Implement `query_npc_list` tool
- [x] **6.6** Implement `get_npc_transcript` tool (uses existing getNpcMessages)
- [x] **6.7** ~~Create tool schemas in `@minimal-rpg/schemas`~~ — Skipped: tool types live in governor; schemas package is Zod-only
- [x] **6.8** Wire new tools into governor's ToolExecutor
- [ ] **6.9** Add environment/time tools (Priority 2)
- [ ] **6.10** Add character state tools (Priority 2)

### Phase 7: Component-Level Types

Add types.ts files to each component.

- [ ] **7.1** Create `src/data/types.ts`
- [ ] **7.2** Create `src/llm/types.ts` (if not done in Phase 5)
- [ ] **7.3** Create `src/routes/types.ts`
- [ ] **7.4** Verify `sessions/types.ts` exists and is complete
- [ ] **7.5** Create `src/db/types.ts` (may just re-export)

### Phase 8: Profile Resolver Service

Extract profile lookup logic into reusable service.

- [ ] **8.1** Create `src/util/profile-resolver.ts`
- [ ] **8.2** Update `routes/sessions.ts` to use ProfileResolver
- [ ] **8.3** Update `routes/profiles.ts` to use ProfileResolver
- [ ] **8.4** Update `sessions/state-loader.ts` to use ProfileResolver

### Phase 9: Testing & Validation

Ensure refactors don't break functionality.

- [ ] **9.1** Run `pnpm -w typecheck` after each phase
- [ ] **9.2** Run `pnpm -w lint` after each phase
- [ ] **9.3** Test API endpoints manually or via scripts
- [ ] **9.4** Rebuild docker container and test full stack

---

## Appendix: File Size Reference

Current file sizes for prioritization:

| File                           | Lines | Priority              |
| ------------------------------ | ----- | --------------------- |
| `src/types.ts`                 | ~500  | High                  |
| `src/routes/sessions.ts`       | ~520  | High                  |
| `src/routes/turns.ts`          | ~360  | High                  |
| `src/routes/personas.ts`       | ~270  | Medium                |
| `src/routes/profiles.ts`       | ~260  | Medium                |
| `src/routes/tags.ts`           | ~250  | Medium                |
| `src/llm/prompt.ts`            | ~230  | Medium                |
| `src/llm/openrouter.ts`        | ~260  | Low (well-structured) |
| `src/sessions/state-cache.ts`  | ~230  | Low (well-structured) |
| `src/sessions/state-loader.ts` | ~210  | Low (well-structured) |

---

## Appendix: Import Path Changes

After refactoring, imports will change from:

```typescript
// Before
import type { ApiError, SessionListItem, LlmResponse, ... } from '../types.js';
```

To:

```typescript
// After (option 1: specific imports)
import type { ApiError } from '../types/api-common.js';
import type { SessionListItem } from '../types/session.js';
import type { LlmResponse } from '../types/llm.js';

// After (option 2: barrel import)
import type { ApiError, SessionListItem, LlmResponse } from '../types/index.js';
```

The barrel import approach is recommended for simplicity.
