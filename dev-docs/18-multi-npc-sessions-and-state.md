# Multi-NPC Sessions and State (Sketch)

**Status**: Partially Implemented (Option A plumbing)
**Last Updated**: December 2025

Implementation snapshot:

- DB: `character_instances` now has `role` (default `primary`) and optional `label`; DB helpers can list instances by session/role.
- API: `/sessions/:id/turns` accepts optional `npcId`, loads the active NPC baseline/overrides, and persists NPC profile/overrides when patches touch `npc`.
- Governor/agents: `TurnStateContext` includes `npc`; intent fallback prefers the active NPC; `NpcAgent` consumes the `npc` slice; NPC transcripts use the resolved `npcId`.
- Still missing: UI-driven targeting/label resolution and any dedicated `npc_instances` or `actor_state` tables; API now exposes `POST /sessions/:id/npcs` to create additional per-session NPC instances from character templates (Option A) and `GET /sessions/:id/npcs` to list all instances for a session.

This document sketches how to extend the current single-NPC governor flow into **multi-NPC sessions** while reusing the existing patterns:

- Mutable per-session baselines (`*_instances` + `overrides_json`)
- Per-session slices (`session_location_state`, `session_inventory_state`, `session_time_state`)
- Governor + state-manager for JSON Patch
- Per-NPC transcripts in `npc_messages`

It is deliberately high-level and meant to guide future work, not describe current behavior.

---

## 1. NPC Identity Model

Today, the system implicitly treats the **session character instance** as the single NPC:

- `npc_messages.npc_id` is the `character_instances.id` for that session.
- Intent detection defaults `npcId` to `baseline.character.instanceId` when the intent is `talk`.
- `NpcAgent` uses `npcConversationHistory` keyed by this single `npcId`.

For **multi-NPC** support we need a first-class NPC identity that:

- Is stable across turns
- Can be referenced in intents (for example, `talk:npc=guard_1`)
- Can be mapped to state slices and transcripts

### 1.1 Option A: NPCs as Character Instances

The minimal extension is to treat **each NPC as its own character instance**:

- Keep the existing `character_profiles` templates.
- Introduce additional rows in `character_instances` for each NPC in a session.
- Use **tags / roles** to distinguish the player-facing main character vs supporting NPCs.

Sketch (now partially implemented):

- `character_instances` already includes:
  - `role TEXT NOT NULL DEFAULT 'primary'` – one of `primary`, `npc` (or more granular later).
  - `label TEXT` – human-friendly handle like `"Captain Aurelia"` or `"Guard #1"`.
- Continue to have at most one `primary` character instance per session (the current behavior).
- Allow **N** `npc` instances per session (creation/management still TODO).

In this model:

- `npc_id` in `npc_messages` remains a **character instance ID**.
- `NpcAgent` receives an explicit `npcId` (from the intent) and uses that to:
  - Load the correct character slice (from `character_instances.profile_json` + overrides)
  - Load the correct NPC transcript via `getNpcMessages(sessionId, npcId)`

Pros:

- Reuses existing character profile + instance machinery
- Keeps NPCs symmetrical with the main character
- No new top-level tables required

Cons:

- Blurs the conceptual line between "player character" and "NPC"; everything is a character instance
- Per-NPC state slices (if needed) must be modeled inside `profile_json` or a new table

### 1.2 Option B: Dedicated npc_instances Table

If we want a clearer separation, we can introduce an explicit `npc_instances` table keyed by session:

```sql
CREATE TABLE IF NOT EXISTS npc_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,      -- references character_profiles.id (or a future npc_profiles table)
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  role TEXT NOT NULL DEFAULT 'npc',  -- e.g. 'guide', 'villain', 'bystander'
  label TEXT,                        -- display name / handle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_npc_instances_session
  ON npc_instances(session_id);
```

In this option:

- `npc_messages.npc_id` becomes an FK to `npc_instances.id`.
- The governor resolves `npcId` into an `npc_instances` row instead of a `character_instances` row.

Pros:

- Clean separation between the **player character instance** and NPC instances
- Allows future NPC-specific schema tweaks without touching `character_instances`

Cons:

- Requires a new table + supporting DB helpers
- Slightly more plumbing to load both character and NPC state in a turn

**Recommendation** (for first pass): start with **Option A** (NPCs as character instances with a `role` column) and only introduce `npc_instances` if the model diverges.

---

## 2. Intents and Targeting NPCs

### 2.1 Current Behavior

- Detected intents for `talk` default `npcId` to `baseline.character.instanceId` when missing.
- The input side (web UI) does not expose explicit targeting; the player just "talks" and the single NPC responds.

### 2.2 Multi-NPC Targeting

We can extend the intent model to support **explicit and implicit** NPC targeting:

- **Explicit**: player chooses a target in the UI (for example, clicking on an NPC portrait); the client sends `npcId` or `npcHandle`.
- **Implicit**: the intent detector infers a likely target from text (for example, "I ask the captain about the storm") and sets `intent.params.npcId`.

Sketch of a richer `AgentIntent` payload:

```ts
interface TalkIntentParams {
  npcId?: string; // canonical ID (characterInstanceId or npcInstanceId)
  npcLabel?: string; // human string for LLM context
}
```

Resolution rules inside the governor:

1. If `npcId` is present, trust it and route to that NPC.
2. Else if only one NPC is present in the scene, use that NPC.
3. Else try to resolve by `npcLabel` or fall back to a default (for example, primary character).

This preserves backward compatibility: sessions with a single NPC behave as before.

---

## 3. Per-NPC State vs Session State

We now have two layers of state:

- **Session-level slices** (already implemented):
  - `session_location_state` – current physical location for the scene
  - `session_inventory_state` – coarse-grained shared inventory slice
  - `session_time_state` – current in-world time for the scene
- **Per-actor state** (partially implemented):
  - `character_instances.profile_json` + `overrides_json` for the main character
  - Future: per-NPC `profile_json` + overrides

### 3.1 What Stays Session-Level

The following should stay **session-scoped singletons**:

- `location` – where the scene is happening (all NPCs share this by default)
- `time` – what time it is in-world
- Shared environmental flags / scene conditions

These slices continue to live in:

- `session_location_state`
- `session_time_state`

### 3.2 What Becomes Per-NPC

The following are good candidates for **per-NPC** state:

- Relationship stats with the player (trust, affection, fear)
- NPC-specific flags (for example, `hasRevealedSecret`, `isInjured`)
- NPC-centric view of the world (for example, what this NPC knows or remembers)

Two approaches:

1. **Embed per-NPC state in `profile_json`** of each NPC instance (Option A or B):
   - Path examples:
     - `/relationships/player/trust`
     - `/flags/hasRevealedSecret`
     - `/knowledge/rumors` (array)
   - Agents emit JSON Patch operations targeting these paths.

2. **Introduce a generic per-actor state table** (only if the above becomes unwieldy):

```sql
CREATE TABLE IF NOT EXISTS actor_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,          -- character instance id or npc instance id
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, actor_id)
);
```

For a first iteration, embedding in `profile_json` is likely sufficient; `actor_state` is a future escape hatch.

---

## 4. Governor Wiring for Multi-NPC

### 4.1 TurnStateContext Shape

The `TurnStateContext` type already supports multiple domains:

- `character`, `setting`, `location`, `inventory`, `time`, `player`, `session`, plus indexed domains.

For multi-NPC, we can keep the **top-level shape unchanged** and use an additional domain for the active NPC:

```ts
interface TurnStateContext {
  character?: StateObject; // primary PC
  setting?: StateObject;
  location?: StateObject;
  inventory?: StateObject;
  time?: StateObject;

  npc?: StateObject; // ACTIVE NPC for this turn
  // ...other domains
}
```

On each turn:

1. Resolve `npcId` for the intent.
2. Load that NPC's effective state into `baseline.npc` / `overrides.npc`.
3. Pass both `character` (PC) and `npc` (target) slices to the agents.

This keeps `TurnStateContext` simple (one active NPC per turn) while still supporting many NPCs across the session.

### 4.2 AgentInput and Slices

`AgentInput.stateSlices` already includes a `character` slice derived from the effective state.

For multi-NPC, the context builder can:

- Keep `character` as the player character
- Add a new `npc` slice representing the active NPC (name, summary, goals, traits)

Example slice:

```ts
interface NpcSlice {
  id: string; // npcId (characterInstanceId or npcInstanceId)
  name: string;
  summary: string;
  personalityTraits?: string[];
  goals?: string[];
}
```

`NpcAgent` then uses `npcSlice` instead of assuming `character`.

### 4.3 Transcripts

The existing `npc_messages` table already supports many NPCs per session via `(session_id, npc_id, idx)`.

The only required change is to **stop assuming** `npc_id === characterInstanceId` and instead:

- Use the resolved `npcId` from the intent when appending NPC messages.
- Record the player's utterance once per targeted NPC:
  - For simple turns, the player speaks to a single NPC, as today.
  - For more complex scenes (addressing multiple NPCs), we can either:
    - Pick a primary target per turn, or
    - Write the same `player` utterance into multiple `npc_messages` streams.

The context builder continues to call `getNpcMessages(sessionId, npcId)` to populate `npcConversationHistory` for the active NPC only.

---

## 5. Migration Path

This section outlines a safe migration path from single-NPC to multi-NPC.

1. **Add role/label columns to character_instances** (Option A) — **DONE**:
   - Default existing rows to `role = 'primary'`.
   - Future NPC instances will use `role = 'npc'`.

2. **Stop assuming npcId === primary character instance** — **DONE (fallback prefers active NPC)**:
   - Intent fallback now uses the active NPC from the request/baseline when missing, otherwise the primary character instance.

3. **Update turn route NPC persistence** — **DONE for active NPC**:
   - `/sessions/:id/turns` accepts `npcId`, loads that NPC baseline/overrides, and persists `npc` patches/overrides.
   - NPC transcripts use the resolved `npcId`; no warning metadata yet when resolution fails.

4. **Add context builder support for npc slice** — **DONE**:
   - Load NPC instance by `npcId` (Option A or B).
   - Expose `npc` slice in `AgentInput.stateSlices` and `npcConversationHistory`.

5. **Gradually add NPC instances to sessions**:
   - Seed demo sessions with 2–3 NPC character instances per setting.
   - Enhance the web UI to list NPCs present in the scene and let the player target one.

6. **Optionally introduce npc_instances** (Option B) later if needed.

---

## 6. Open Questions

- How should **party members** vs antagonists vs background NPCs be modeled? All as `role` variants, or separate tables?
- Should the **player character** also be modeled as an NPC in some flows (for example, internal monologue)?
- How much **per-NPC memory** should be stored inside `profile_json` vs moved into a dedicated `actor_state` table or vector memory?
- How should **UI interactions** expose multi-NPC targeting without overwhelming the player (for example, priority ordering, nearby NPCs only)?

This sketch is intentionally conservative: it reuses the existing baseline/overrides and transcript patterns while carving out clear extension points for multi-NPC identity and state.
