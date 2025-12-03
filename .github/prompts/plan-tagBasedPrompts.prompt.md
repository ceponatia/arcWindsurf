## Plan: Tag-Based Prompt Tags & Package Architecture

We’ll keep prompt logic API-local for now, add DB-backed tag definitions and per-session tag instances, and extend API + web to mirror existing character/setting patterns.

### Steps

1. **Confirm LLM placement decision**
   - Keep `buildPrompt` and tag-handling in `packages/api/src/llm`, extending existing prompt assembly rather than creating a new `@minimal-rpg/llm` package right now.
   - Revisit extraction later if other packages (governor/state-manager) need direct prompt-building. Move existing tag prompts to `packages/api/src/llm/tag-prompts/` and store tags created via web ui here as well. Wire this folder into the prompt builder.

2. **Model new DB tables and helper types**
   - Add a `prompt_tag` table for tag definitions (id, owner, name, short_description, prompt_text, timestamps).
   - Add a `session_tag_instance` table linked to `session` (id, session_id, tag_id?, name, short_description, prompt_text, created_at) with cascade on session deletion. Note that owner is not needed in the instance table since it’s tied to the session and by extension only the session owner would be able to delete it anyway.
   - Introduce corresponding TS types in [packages/db/src/types.ts](../../packages/db/src/types.ts) and helpers in [packages/db/src/sessions.ts](../../packages/db/src/sessions.ts) or a new tag module.

3. **Add shared schemas/types for tags**
   - In [packages/schemas/src](../../packages/schemas/src), define `TagDefinitionSchema` and `SessionTagInstanceSchema` (id, name, shortDescription, promptText, owner, etc.), export their types via `index.ts` and re-export as needed via shared.
   - Under `src/api`, add request/response schemas for tag CRUD and for session creation extensions (`CreateTagRequest`, `UpdateTagRequest`, `TagResponse`, `SessionTagSelection`).

4. **Wire tag CRUD and session linkage in the API**
   - Create a tags route (e.g., [packages/api/src/routes/tags.ts](../../packages/api/src/routes/tags.ts)) with list/create/update/delete endpoints for `/tags`, enforcing simple owner rules (assume `admin` in handlers).
   - Extend the session creation route in [packages/api/src/routes](../../packages/api/src/routes) to accept `tagIds` (or similar) in its input schema, create `session_prompt_tag` rows for each selected definition, and load these instances when constructing the LLM prompt.
   - Update [packages/api/src/llm](../../packages/api/src/llm) prompt builder to accept `SessionTagInstance[]` and inject each tag’s `promptText` as additional system message(s) alongside existing setting tags.

5. **Integrate tags into the web UI**
   - Add a tag-management feature (e.g., [packages/web/src/features/tag-builder](../../packages/web/src/features/tag-builder)) with `TagList`, `TagForm`, and `TagBuilderPage` using a small `api.ts` wrapper for `/tags` endpoints; fields: name, shortDescription, promptText.
   - In the settings/session-start flow in [packages/web/src/features](../../packages/web/src/features), fetch tags, render checkboxes to select them for a new session, and submit selected `tagIds` with the session creation request.
   - Optionally, allow settings to store default `tagIds` that pre-populate selections at session start, following how settings/characters configure defaults today.

### Further Considerations

1. Decide whether tags are globally available (current plan) or scoped by setting/character later; current schema keeps them global with an `owner` column.
   Decision: Keep global. All users should have access to the pool of tags but only owners can edit or delete specific tags.
2. Choose how tag prompts render in system messages (single aggregated block vs one message per tag) and document this alongside existing genre/tag conventions in [dev-docs/14-prompting-conventions.md](../../dev-docs/14-prompting-conventions.md).
   Decision: Single aggregated block which is appended to the main system prompt.
3. When user accounts arrive, evolve `owner` from "admin" to a real user ID while keeping the `session_prompt_tag` snapshots stable for historic sessions.
