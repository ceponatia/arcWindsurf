# Prompt Tags: Per-Turn Routing MVP Plan

Date: 2025-12-18

This document outlines the MVP implementation plan for routing prompt tag information per turn to the correct targets.

It assumes we will implement the minimal-change approach first:

- The governor remains the primary narrator model.
- NPC-specific and location-specific tag instructions are delivered as structured context to the governor at the time it generates NPC dialogue (rather than making a separate NPC model call).

A later iteration can move NPC dialogue generation into a per-NPC agent call if desired.

## Clarifications from Current Direction

- Active NPC filtering: a tag should only be active for an NPC if that NPC is in the same location as the player (because tags matter primarily during interaction).
- We want MVP to behave close to production. That means:
  - Avoid hardcoding `activation_mode === 'always'` as a permanent rule.
  - But it is acceptable to implement only "bound and enabled" tags for MVP, and treat `activation_mode` as an extension point.

## Definitions

### Targeting

Targeting is represented by `session_tag_bindings` rows with:

- `target_type`: `session | npc | character | location | player | setting`
- `target_entity_id`: nullable

Interpretation:

- `session`: applies globally
- `npc`: applies to all active NPCs (for this turn)
- `character`: applies to one specific character instance (binding references that entity)
- `location`: applies when the player is at that location

### Active NPCs (MVP)

An NPC is active if:

- The NPC has a current location that equals the player's current location.

Data sources:

- Player current location: `session_location_state.state_json.currentLocationId`
- NPC current location: `session_npc_location_state.location_id` for each NPC instance

Fallback behaviors:

- If player location is missing, use session start location or setting default.
- If NPC location is missing, treat NPC as not active (conservative).

## Output Shape: Routed Turn Tags

Create a single canonical structure for the turn snapshot:

- `turnTagContext.session: TagInstruction[]`
- `turnTagContext.byNpcInstanceId: Record<string, TagInstruction[]>`
- `turnTagContext.byLocationId: Record<string, TagInstruction[]>` (optional in MVP)
- `turnTagContext.ignored: { tagId, reason }[]` (debug/telemetry)

Where `TagInstruction` is a normalized, renderable form:

- `tagId: string`
- `tagName: string`
- `targetType: string`
- `bindingId: string`
- `instructionText: string` (rendered from structured parse, else raw fallback)
- `priority?: string`

Note: this structure should not require the governor to understand DB internals.

## Implementation Plan (MVP)

### Step 1: Build a routing function in the API snapshot layer

Create a small domain-focused module responsible for routing and rendering.

Responsibilities:

- Input:
  - enabled tag bindings (joined with prompt tag definitions)
  - player current location
  - npc locations
- Output:
  - `turnTagContext`

Guidelines:

- Keep DB access outside the router. Pass in data.
- Make routing deterministic.

### Step 2: Load required state in the session snapshot endpoint

In the per-turn snapshot builder:

- Load tag bindings:
  - `session_tag_bindings.enabled = true`
  - join `prompt_tags` for name + prompt text + (future) structured prompt fields
- Load player location:
  - `session_location_state` slice
- Load NPC locations:
  - `session_npc_location_state` slice

Then call the router to produce `turnTagContext`.

### Step 3: Inject routed tags into governor prompt composition

Update the governor prompt builder input type from:

- `sessionTags: SessionTag[]`

to something like:

- `turnTagContext: TurnTagContext`

Then:

- Render `turnTagContext.session` into the governor system prompt.

Do not include NPC-specific tag instructions globally.

### Step 4: Apply NPC-specific tag instructions at NPC dialogue time (minimal-change MVP)

Because the current `npc_dialogue` tool path does not call a dedicated NPC agent, we can still achieve NPC-scoped behavior by:

- Including `turnTagContext.byNpcInstanceId[npcInstanceId]` in the payload returned by the `npc_dialogue` tool.
- Instructing the governor (in the tool response or system prompt) to apply those instructions only when writing that NPC's lines.

This keeps a single-model generation flow, but preserves a practical separation of tag scopes.

### Step 5: Enforce co-location rule

In the router:

- Determine `playerLocationId`.
- For each NPC instance:
  - Determine `npcLocationId`.
  - If `npcLocationId !== playerLocationId`, do not apply `npc` or `character` tags for that NPC.

Notes:

- `character` tags are more specific than `npc` tags.
- If a `character` tag targets an NPC not co-located with the player, it should not apply (by the current direction).

### Step 6: Activation mode behavior (MVP)

MVP rule:

- A tag is active if it has a binding with `enabled = true`.

Do not special-case `activation_mode` in routing logic yet.

But:

- Preserve `activation_mode` in the data model and return it in debug output.
- Keep router signature ready to accept per-turn activation overrides later.

Rationale:

- This avoids shipping an MVP that bakes in an incorrect meaning of `manual`.
- It matches production expectations more closely: tags are bound and active, not hardcoded by definition.

### Step 7: Keep persisted chat history clean

This is a separate concern (see the companion doc), but for MVP routing we should:

- Ensure `turnTagContext` is treated as runtime-only prompt context.
- Do not persist tag instruction blocks as messages.

If we want traceability:

- Store tag usage as metadata (e.g., binding IDs applied per turn) rather than as text.

## Testing Strategy

- Unit tests for the routing function:
  - session tags always route to `session`
  - npc tags route only to co-located NPCs
  - character tags route only to the targeted NPC and only if co-located
  - disabled bindings are ignored
- Integration-ish test (if available):
  - snapshot endpoint returns `turnTagContext` with expected shape

## Follow-ups / Next Iterations

- Introduce structured tag parsing and rendering (see `prompt-tags-structured-parsing-and-message-cleanup.md`).
- Implement `activation_mode = manual` semantics once we decide what "manual" means in gameplay.
- Upgrade to per-NPC agent calls for true isolation if desired.

## Companion Doc

See `dev-docs/planning/prompt-tags-structured-parsing-and-message-cleanup.md` for structured tag parsing and the message-cleanup concept.
