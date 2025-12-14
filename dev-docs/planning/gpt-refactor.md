# GPT Refactor Plan (Consolidated Phased Implementation)

> **Status**: PLANNING
> **Last Updated**: December 2025
> **Sources**:
>
> - [dev-docs/planning/opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md) (source of truth)
> - [dev-docs/planning/gpt-session-builder-overhaul-time-locations-multi-npc.md](gpt-session-builder-overhaul-time-locations-multi-npc.md) (merge candidates, only after Opus notes)
> - [dev-docs/planning/npc-design-overhaul.md](npc-design-overhaul.md) (character builder + runtime NPC systems)

This document merges the three source docs into one phased plan. When there is disagreement, Opus is authoritative.

---

## 0. Product Goal and Non-Goals

### Goal

Build a unified, selection-first **Session Workspace** that lets a new user start a story quickly (defaults everywhere), while enabling advanced users to build richer worlds (time config, location maps, multi-NPC cast, scoped rules/tags, relationships) and to gradually deepen characters via progressive disclosure.

### Non-goals (for these phases)

- Real-time multiplayer and collaboration.
- Mobile-first UI.
- Real-time action gameplay (LLM latency bound).
- Full isometric/3D game client (future UI layer).

---

## 1. Source-of-Truth Decisions (Locked In)

These are the decisions that drive sequencing and acceptance criteria.

- **Session Workspace** is the primary entrypoint (wizard mode), with a **Compact Mode** (two-panel) for power users.
- **Selection-first** with inline creation as a side door (links into builders, returns to workspace).
- **Draft persistence is critical**:
  - Server-side `session_workspace_drafts` JSON blob.
  - Auto-save: ~60s, on step change, on navigation away.
  - Store `validationState` per step to avoid re-running validation.
- **State management in Web**: Zustand store with local persistence + debounced server sync.
- **Transactional session creation API**: create a full session from workspace state in one request (avoid partial sessions).
- **Time config source of truth**: Setting-level `SettingProfile.background.timeConfig`.
  - Session-level overrides should be small and optional (start date/time, seconds-per-turn if needed).
- **Locations** ship with both:
  - Hierarchy view (default)
  - Graph view (canvas) simultaneously
- **Edges use named ports** for multi-exit locations and prefabs.
- **Multi-NPC sessions**: cast supports many NPCs; a single "primary NPC" is not required for all sessions.
- **Relationships UI**: matrix first; graph editor later.
- **Scoped tags**: MVP supports session-wide and per-NPC scopes. Location-scoped tags require governor location detection (explicit TODO).
- **Transient NPCs**: template-based spawning (runtime), not authored as full characters in the workspace.
- **Character builder**: Quick/Standard/Advanced modes; inline creation uses Quick/Standard by default.

---

## 2. System Inventory (What Must Change)

### Packages / layers touched

- `@minimal-rpg/web`: Session Workspace, Map editor, builders integration, draft resume UI.
- `@minimal-rpg/api`: Draft CRUD, transactional session creation endpoint, location map CRUD, tag/relationship APIs.
- `@minimal-rpg/db`: new tables for drafts, maps, relationships, templates (and hygiene state later).
- `@minimal-rpg/schemas`: domain schemas for workspace drafts, maps (ports/edges), tag scopes, relationships.
- `@minimal-rpg/governor` + `@minimal-rpg/agents`: tag injection points, location detection TODO, hygiene tool calls later.
- `data/`: optional shared reference data (sensory modifiers JSON).

---

## 3. Phased Roadmap

Each phase is designed to be shippable without leaving the system in a half-working state.

### Phase 0 - Foundations and Hard Blockers

**Objective**: remove known blockers and establish the primitives we will build on.

**Deliverables**

- Fix **Persona persistence reliability** (blocking for Phase 1 completion per GPT callouts).
- Define **workspace state schema** (Zod) and versioning strategy.
- Add DB + API support for **draft storage** (even if UI comes in Phase 1).
- Add **transactional session creation endpoint** and internal API/service layer.

**DB**

- `session_workspace_drafts`
  - `id`, `user_id` (or nullable if no auth), `workspace_state_json`, `validation_state_json`, `current_step`, `created_at`, `updated_at`
  - Include `schema_version` for forward migrations.

**API**

- `POST /workspace-drafts` (create)
- `PUT /workspace-drafts/:id` (update)
- `GET /workspace-drafts/:id` (read)
- `GET /workspace-drafts` (list, most recent)
- `POST /sessions/create-full` (transactional)

**Acceptance criteria**

- Drafts can be created, updated, loaded, and resumed.
- `POST /sessions/create-full` is atomic (all-or-nothing) and returns a usable session.

---

### Phase 1 - Session Workspace MVP (Wizard + Compact Mode)

**Objective**: replace the fragmented session setup with one coherent workspace flow.

**UX scope**

- Wizard flow steps (recommended order, not gated):
  1. Setting & World
  2. Locations & Map (placeholder in Phase 1 if Phase 2 not done yet)
  3. Cast (NPCs)
  4. Player (Persona)
  5. Rules (Tags)
  6. Review & Launch
- Compact Mode toggle: left selectors + right live summary.
- Summary is a **collapsible card**, not a single sentence; includes counts and expandable lists.

**Web implementation**

- Zustand store:
  - `persist` to localStorage
  - debounced sync middleware to drafts API
  - `validationState` stored per step
- Auto-save triggers:
  - step change
  - timer (~60s)
  - navigation away

**API integration**

- Draft endpoints wired
- `create-full` endpoint wired from Review step

**Acceptance criteria**

- A user can start a workspace, leave, return, and continue.
- Launch creates a session via one API call.
- Compact Mode works end-to-end.

---

### Phase 2 - Locations and Maps (Hierarchy + Graph + Ports)

**Objective**: ship a real map system that supports both hierarchical worldbuilding and navigable graphs.

**Data model (recommended)**

- Introduce `LocationMap` entity referencing locations and defining edges.
- Use **named ports**:

```ts
export type LocationPort = {
  id: string;
  name: string;
  direction?: string;
};

export type LocationMapEdge = {
  id: string;
  fromLocationId: string;
  fromPortId: string;
  toLocationId: string;
  toPortId: string;
  bidirectional: boolean;
  travelMinutes?: number;
  locked?: boolean;
  lockReason?: string;
};
```

**Key behaviors**

- Bidirectional by default unless explicitly one-way.
- `nodeLayout` stored in the map for the canvas; prefer normalized coordinates (0-1) if feasible.

**Web UI**

- Map editor with two tabs:
  - Hierarchy (default)
  - Graph (React Flow/XYFlow canvas)
- Node UI supports:
  - selecting existing location or creating a new one inline
  - editing ports (exits/entrances)
  - drawing port-to-port edges
- Select session start location on the map.

**Prefabs + semantic zoom**

- Prefabs can be saved and dropped (building-with-rooms, region-with-cities).
- Semantic zoom/collapse is supported by depth filtering.

**API/DB**

- `location_maps` table (+ optional `location_prefabs`)
- CRUD endpoints for maps and prefabs

**Time system bridge**

- Travel time advances session time using:

$$\text{turnsToAdvance} = \left\lceil \frac{\text{travelMinutes}\cdot 60}{\text{secondsPerTurn}} \right\rceil$$

(Implementation details live with the time slice; Phase 2 only ensures the data is present and wired.)

**Acceptance criteria**

- Users can build a map, connect locations via specific ports, set a start location.
- Map can be reused across sessions (and optionally saved as a template later).

---

### Phase 3 - Cast, Player, and Inventory (Session Assembly)

**Objective**: make session setup complete: NPC cast + persona + initial inventories + placements.

**Cast (multi-NPC)**

- Add many NPCs to the session.
- Per-NPC config:
  - role/label
  - tier (major/minor; transient excluded from workspace)
  - starting location (map picker)

**Primary NPC**

- Do not require a single primary NPC for all sessions.
- If the system needs a default target, derive it from either:
  - last interacted NPC, or
  - a "present in starting location" heuristic.

**Player (Persona)**

- Persona selection and quick-create.
- Ensure Persona Builder is reliable from Phase 0.

**Starting inventory**

- Choose items from item library and assign quantities.
- Start with per-actor inventories as the default; shared/scene inventory is an exception.

**Optional helper (later in phase, or Phase 4)**

- Assisted NPC location assignment tool (cook -> kitchen) as an explicit button, not an implicit nondeterministic action.

**Acceptance criteria**

- A session can be launched with:
  - setting
  - map + start location
  - multiple NPCs placed on the map
  - persona
  - starting inventory

---

### Phase 4 - Rules (Scoped Tags) and Relationships

**Objective**: make sessions feel controllable and coherent via scoped rules and initial relationship seeds.

**Scoped tags (MVP)**

- Support:
  - session-wide scope
  - per-NPC scope
- Data includes `scope` and optional `targetId`.

**TODO (explicit)**

- Location-scoped tags require **governor location detection** + context injection when the player is present.

**Injection points (authoritative direction)**

- Session tags -> injected into governor system prompt.
- NPC tags -> injected into the relevant NPC agent prompt.
- (Later) Location tags -> injected into context when at that location.

**Relationships (MVP)**

- UI: matrix for small casts; list view for large casts.
- Defaults: missing relationships imply "stranger" (neutral baseline).
- Storage: session slice table (recommended over embedding in individual actors).

**Acceptance criteria**

- Tags affect prompting in the intended scope.
- Relationships can be authored at setup and surfaced in prompts.

---

### Phase 5 - Character Builder Overhaul (Progressive Disclosure)

**Objective**: remove 100-field overload and enable fast creation that still scales to depth.

**UI modes**

- Quick: 5 fields
- Standard: ~15-20 fields
- Advanced: full detail

**Key requirements**

- Switching modes does not lose data.
- Workspace inline creation defaults to Quick/Standard.

**Templates + smart autofill**

- `character_templates` table (seed a few archetypes by genre)
- LLM tool: `expand_character_profile`
  - per-section regeneration
  - context-aware generation

**Acceptance criteria**

- New users can create a usable character in <2 minutes.
- Advanced users can still fully author the detailed profile.

---

### Phase 6 - Runtime NPC Hygiene and Sensory Systems

**Objective**: implement the runtime-only systems (hygiene decay, sensory modifiers) without bloating character creation.

**Runtime state**

- `npc_hygiene_state` table keyed by NPC instance and body part.
- Per-turn tool call: `update_npc_hygiene` invoked by governor.

**Reference data**

- Add a single source of truth file (example):

```text
data/sensory-modifiers.json
```

Loaded at runtime similarly to other reference data.

**Sensory generation integration**

- Sensory descriptions are base text + hygiene modifier by level.

**Acceptance criteria**

- Hygiene changes over turns based on activity/clothing.
- Sensory outputs reflect current runtime state.

---

### Phase 7 - Library IA and Cross-Linking (Polish, High Leverage)

**Objective**: make the product feel like one system, not many disconnected builders.

**UX**

- Single hub: World (Settings), Cast (Characters), Maps, Rules (Tags), Player (Personas), Items, Sessions.
- From any entity page: "Where is this used?" cross-links.
- From session page: "Entities in this session" with links back.

**Performance**

- Consider denormalized usage counts updated on session create/delete.

**Acceptance criteria**

- Users can discover dependencies and reuse entities easily.

---

## 4. Risks and Mitigations

- **Risk: partial sessions / inconsistent state**
  - Mitigation: transactional `create-full` endpoint (Phase 0), draft-to-session conversion is one commit.
- **Risk: map editor complexity**
  - Mitigation: ship hierarchy + graph together, keep hierarchy default; graph is for connectivity.
- **Risk: tag scoping expands too fast**
  - Mitigation: MVP session + NPC scopes only; add location scope after governor location detection.
- **Risk: large-cast relationship UX becomes unwieldy**
  - Mitigation: matrix only for small casts, list UI for larger casts.

---

## 5. Definition of Done (Project-Level)

A "done" implementation of this refactor means:

- Session Workspace is the default way to start a session.
- Drafts are resilient (local + server) and resumable.
- Locations are authorable as both hierarchy and graph, with port-based edges.
- Sessions can launch with multi-NPC cast, persona, start location/time, tags, relationships.
- Character creation supports Quick/Standard/Advanced modes and templates.
- Runtime NPC hygiene/sensory systems exist as gameplay-only state.
