Plan: Centralize Strong API Types

Create a single `packages/api/src/types.ts` that exports all API-specific types, then refactor API files to import and apply them, replacing `unknown`/implicit `any` with named, reusable types. Keep domain entities from `@minimal-rpg/schemas`, ensure local ESM imports use `.js`, and run typecheck/lint to verify no `any` remains.

Steps (Expanded & Integrated with Refined Considerations)

1. Baseline Types File
   - Create `packages/api/src/types.ts` with domain groupings (Config, Data Loader, DTOs, LLM, Sessions, Errors).
   - Import shared domain types from `@minimal-rpg/schemas` (e.g., `CharacterProfile`, `SettingProfile`, prompt config schemas) rather than redefining.
   - Define API DTOs (e.g., `SessionListItem`, `MessageResponse`, `CharacterSummary`, `SettingSummary`, `CreateSessionRequest/Response`, `LlmResponse`, `BuildPromptOptions/Result`).

2. Mapper Layer Introduction (DB Coupling Strategy)
   - Create `packages/api/src/mappers/` with initial files: `sessionMappers.ts`, `messageMappers.ts`, `profileMappers.ts`.
   - Each mapper: input typed DB entity (from `@minimal-rpg/db/node` or local narrow type) → output API DTO from `types.ts`.
   - Enforce explicit return annotations (`mapDbSession(row): SessionListItem`).

3. Server & Utility Refactor
   - Update `src/server.ts`, `src/util/{config.ts,health.ts,version.ts}` to import `RuntimeConfigPublic`, `ApiError`, `HelloResponse`, `HealthResponse` from `./types.js`.
   - Annotate all Hono handlers with explicit return DTO types; remove inline anonymous response shapes.

4. Data Loader & Profiles Route Refactor
   - Update `src/data/loader.ts` to export a well-typed `LoadedData` and `LoadedDataGetter` via imports from `types.ts`.
   - Refactor `src/routes/profiles.ts` to use mapper functions (`profileMappers.ts`) instead of constructing DTOs inline.
   - Replace `unknown` casts with explicit parsed types from Zod + mapped DTOs.

5. LLM Provider Normalization
   - Define `ChatRole`, `LlmProvider`, `LlmGenerationOptions`, `LlmResponse` in `types.ts` (single normalized surface).
   - Update `src/llm/{openrouter.ts,ollama.ts}` to implement `LlmProvider` and return normalized `LlmResponse` with namespaced metadata (`openrouterMeta?`, `ollamaMeta?`).
   - Refactor `prompt.ts` to consume only provider-agnostic `LlmResponse` and `ChatRole`; expose `BuildPromptOptions/Result` & `ContentFilterResult` from `types.ts`.

6. Sessions & Overrides Refactor
   - Update `src/routes/sessions.ts` to rely on mapper functions for session/message transformations.
   - Introduce `OverridesObject` & `OverridesAudit` in `types.ts`; apply in `src/sessions/instances.ts` and session route logic.
   - Ensure request/response bodies (`CreateSessionRequest`, `MessageRequest`, etc.) are imported from `types.ts`.

7. Admin & Config Routes
   - Refactor `src/routes/adminDb.ts` to output `AdminDbOverview` and `AdminDbPathInfo` types.
   - Refactor `src/routes/config.ts` to surface `RuntimeConfigPublic` only.
   - Remove inline shape duplication by importing these DTOs.

8. Validation Boundaries Enforcement
   - Confirm all inbound JSON bodies pass through Zod parsing before mapping.
   - Outbound complex composites optionally validated (only if high risk of drift); otherwise rely on mapper typing.
   - Remove lingering `unknown` variables; tighten generics where applicable.

9. Explicit Return Type Pass
   - Review all functions in updated files to add explicit return types, especially async route handlers and mapper utilities.
   - Ensure no implicit `any` or inference gaps remain per linter.

10. ESM Path Consistency

- Add `.js` suffix to all local imports referencing `types.ts` and new mapper files.
- Fix any legacy imports lacking suffix due to `verbatimModuleSyntax` settings.

11. Documentation & Discoverability

- Update root `README.md` to mention centralized API types and mapper pattern.
- Add short `dev-docs/api-types-mappers.md` explaining: “DTO definitions in `types.ts`, transformations in `mappers/`”.
- Cross-link from existing architecture docs if relevant.

12. Quality & Lint Sweep

- Run `pnpm check` (typecheck + lint) and address any new errors.
- Run `markdownlint --fix` on new docs if needed.

13. Future Extension Hooks

- Predefine optional fields in `LlmResponse` for future embedding/tool outputs (`embeddingVector?`, `toolsMeta?`).
- Add TODO comment (non-blocking) describing extension pattern—avoid functional code changes now.

14. Final Verification

- Ensure no API route returns raw DB entities; confirm all responses flow through mappers.
- Re-run `pnpm check` to verify stability after fixes.

Further Considerations (Refined)

1. DB Coupling & Mapping Strategy
   - Do not expose raw DB row shapes directly from routes. Define dedicated API DTOs in `packages/api/src/types.ts` (e.g., `SessionListItem`, `MessageResponse`).
   - Introduce mapper functions that translate DB entities into API DTOs under `packages/api/src/mappers/` (alternatively `src/db/` if preferred). Example files: `sessionMappers.ts`, `messageMappers.ts`.
   - Pattern: "What does the API respond with?" → look in `types.ts`. "How are those built from DB rows?" → look in `mappers/*.ts`.
   - Keeps coupling shallow: if DB schema changes, only mapper logic updates—public API contracts remain stable.

2. Validation Boundaries
   - Continue Zod parsing at ingress (request bodies, loaded JSON config/data) and egress (optional sanity for complex composed responses if needed).
   - Keep transport DTOs minimal: only the fields required by the client, derived fields computed in mappers (e.g., preformatted timestamps) to avoid duplication on the frontend.
   - Avoid leaking internal/provider-specific fields unless explicitly namespaced.

3. Extensible LLM Provider Interface
   - Define a `LlmProvider` interface in `types.ts` with consistent `generate(options: LlmGenerationOptions) => Promise<LlmResponse>` signature.
   - Normalize all provider outputs to a stable `LlmResponse` shape with core fields: `id?`, `role: ChatRole`, `content: string`, `model: string`, `usage?` (token counts), `createdAt: string`.
   - Provider-specific metadata placed under optional namespaced objects: `openrouterMeta?`, `ollamaMeta?`, `anthropicMeta?`, etc. This avoids future breaking changes.
   - Ensure `ChatRole` union stays provider-agnostic; extend only if truly universal.
   - Prompt/build logic consumes only normalized `LlmResponse`, so adding a new provider requires no route/prompt refactors—only a new implementation file meeting the interface.

4. Consistency & Discoverability
   - All exported API contract types live in `types.ts`; internal helpers (builders, mappers) should not define alternative external types.
   - Mapper outputs must be explicitly typed to catch drift (e.g., `mapDbSession(row): SessionListItem`).

5. Future Growth
   - Adding embeddings or tool invocation responses: extend `LlmResponse` with optional namespaced blocks (`toolsMeta?`, `embeddingVector?`) rather than altering core primitives.
   - Maintain backward compatibility by never removing existing base fields; only add optional ones.
