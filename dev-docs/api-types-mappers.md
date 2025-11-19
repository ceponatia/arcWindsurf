# API Types & Mappers

The API package centralizes all externally visible route DTOs, LLM interfaces, and override auditing types in `src/types.ts`. Transformation logic that converts DB/session entities into those DTOs lives in `src/mappers/`.

## Why

- Prevent accidental leakage of raw DB rows (schema drift risks)
- Provide a single discovery point for clients and contributors: _"What does the API respond with?"_ → `types.ts`
- Keep coupling shallow: DB schema changes only require mapper updates.
- Normalize provider outputs so routes/prompt logic stay provider-agnostic.

## Core Types (in `types.ts`)

- **DTOs:** `CharacterSummary`, `SettingSummary`, `SessionListItem`, `MessageResponse`, `CreateSessionRequest/Response`, `MessageRequest`, `MessageResponseBody`.
- **Config & Health:** `RuntimeConfigPublic`, `HelloResponse`, `HealthResponse`.
- **Admin:** `AdminDbOverview`, `AdminDbPathInfo` (aliases of DB helper return types).
- **LLM:** `ChatRole`, `LlmGenerationOptions`, `LlmResponse`, `LlmProvider`.
- **Overrides:** `OverridesObject`, `OverridesAudit`.

## Mappers (in `src/mappers/`)

- `profileMappers.ts` → `mapCharacterSummary`, `mapSettingSummary`
- `sessionMappers.ts` → `mapSessionListItem`
- `messageMappers.ts` → `mapMessageResponse`

Each mapper returns a fully typed DTO and enforces explicit return annotations for drift detection.

## LLM Normalization

Providers implement `generate(messages, model, options)` returning a unified `LlmResponse` with optional namespaced metadata objects (e.g. `openrouterMeta`). This keeps route code stable when adding new providers; legacy local providers (e.g. Ollama) were removed to simplify the surface.

## Overrides Pattern

`OverridesObject` is a plain record of user-supplied fields. `OverridesAudit` contains the captured `baseline` (first-seen template snapshot) plus current `overrides`. Merging uses `deepMergeReplaceArrays` where arrays fully replace template arrays.

## Adding a New Provider

1. Create `src/llm/<provider>.ts` implementing a `generateWith<Provider>` function that conforms to `LlmProvider` semantics.
2. Return `LlmResponse` with any provider-specific metadata nested under `<provider>Meta`.
3. Route code imports and invokes the generate function—no changes to existing prompt or sessions logic required.

## Checklist for New DTOs

- Add the interface/type to `types.ts`.
- Add a mapper if conversion from DB or complex source object is needed.
- Update relevant route to import the new type and mapper.
- Add explicit return type annotations.
- Run `pnpm check` and ensure no `any` leaks appear.

## Verification

Run `pnpm check` and confirm:

- No route returns raw Prisma rows.
- All responses use DTOs or documented aliases.
- No implicit `any` types remain.

This pattern keeps the API surface coherent and easier to evolve safely.
