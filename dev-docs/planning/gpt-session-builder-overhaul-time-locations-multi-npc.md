# Session Builder Overhaul: Time Config, Location Maps, Multi-NPC Sessions (Initial Thoughts)

> **Status**: Proposal / UX + data model notes
> **Last Updated**: December 2025

This document is a product + implementation sketch for making the Web UI session creation flow intuitive for brand new users (no pre-existing entities) while also accommodating advanced features (time config, location maps, multi-NPC sessions).

It is explicitly **not** about chat UI yet; it focuses on **session setup** (builder + library) and the missing domain pieces needed to make session setup coherent.

## 0. Current Observations (What Exists Today)

- Session creation UI is a simple 3-panel picker (Character, Setting, Tags) plus a placeholder column in [packages/web/src/features/session-builder/SessionBuilder.tsx](../packages/web/src/features/session-builder/SessionBuilder.tsx).
- Libraries exist for Characters, Settings, Sessions, Tags, Personas, and Items, but they feel like separate "apps" rather than a single coherent workflow.
- Time configuration is already designed and integrated at the Setting level in [dev-docs/26-time-system.md](26-time-system.md), but there is no obvious place in the session creation UI to surface it.
  > PM Notes: I do not think it is actually integrated yet and will need to be refactored anyway.
- Location schemas and runtime occupancy/simulation foundations exist in [dev-docs/05-locations-schema.md]
  (05-locations-schema.md) and [dev-docs/32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md), but Web lacks any builder for locations or a "map" concept.
- Multi-NPC session support is partially wired at the API/governor level (Option A plumbing) in [dev-docs/18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md), but Web does not expose a session "cast" or NPC targeting during setup.

> Opus Notes: Good baseline analysis. The fragmentation is real - we have 6+ builders that don't communicate. The "Option A plumbing" for multi-NPC is indeed partial; the governor can handle multiple NPCs but the session creation flow assumes single-character sessions.

---

> PM Notes: We have to make sure the npc-agent and tool calls also operate on a per-major/minor npc as well. Agents need to access their own npcs data primarily, sometimes other npcs data if they're interacting so they have the proper context.

## 1. Product Goal

Make the first-time-user path feel like: "Start a story" - not "fill out 100 fields".

### 1.1 Design Principles

1. **Progressive disclosure**: show only the minimum to start; advanced depth is optional.

   > PM Notes: Agreed. I like the 3 levels of creation, for example with characters, outlined in [npc-design-overhaul](npc-design-overhaul.md)

2. **Single workflow entrypoint**: the user should not have to discover and mentally connect 6 different builders.

3. **Inline creation from selection flows**: if a required entity is missing, the session wizard should let the user create it without leaving.

   > PM Notes: Yes all **required** entities must be created prior to the session starting. However, a player should be able to leave the builder in a draft state and come back later even if required entities are missin.

4. **Use defaults everywhere**: 80% of users should be able to click through without touching advanced settings.

   > PM Notes: Correct.

5. **Show a session summary at all times**: "You are about to start: Persona X, talk to NPC Y, in Setting Z, at Location L, at Time T".

   > PM Notes: Since there could potentially be dozens of characters and locations we need a better way to visualize this than that sentence.

6. **Selection-first, creation second**: the happy path is selecting from existing libraries; inline creation exists, but should be a side-door.

7. **Draft persistence + non-linear navigation**: users must be able to leave mid-flow and resume later, and jump between steps without losing work.

> Opus Notes: Principles 2 and 3 are the most impactful. The current UX requires users to discover builders independently. A unified entrypoint with inline creation eliminates the "which builder do I need first?" confusion. Principle 5's summary should be a collapsible card, not a sentence - show entity counts with expandable lists.

## 2. Proposed UX: "Session Workspace" (Session Builder 2.0)

This aligns with the Opus + PM proposal: replace the current 4-column picker with a guided workspace that can be resumed, edited, and launched.

### 2.1 Steps (Recommended)

The step order below is a **guide, not a gate**. Users can jump between steps, but we recommend leading with the Setting so presets can drive defaults for locations, NPC templates, and time.

> PM Notes: Yes, the workspace will guide users linearly but they **can** jump ahead if they prefer.

1. **Setting & World**
   - Pick an existing setting or quick-create one.
   - Include time config surface here (simple by default, advanced collapsed).
   - Include genre preset that sets sensible defaults (modern/fantasy/sci-fi/custom).

   > PM Notes: Pick an existing setting, quick-create, OR enter full setting-builder which on-save links back to where the user left off in the workspace, adding the setting they just created/saved.

2. **Locations & Map**
   - Pick an existing map (if present) or create a new one.
   - Choose start location.
   - Allow in-context creation of new locations inside the map editor.

3. **Cast (NPCs)**
   - Choose a **primary NPC** (who you start talking to).
   - Optionally add additional NPCs to the cast (supports multi-NPC sessions).
   - For each NPC: role + label + starting location (optional).

   > PM Notes: There won't be a **primary NPC** in all sessions. Some sessions will be more traditional RPGs where the player manages a party of npcs and interacts with dozens of other npcs. I think the user should be allowed to decide in real time, implicitly, who their **primary NPC** is based on who they like talking to the most.

4. **Player**
   - Pick an existing persona or quick-create a minimal persona.
   - Persona integration needs to be fully implemented as an early phase of this plan.

5. **Rules / Tags**
   - Apply tags with a scope (session-wide vs per-NPC vs location-specific).

6. **Review & Launch**
   - Compact summary with validation + quick links back to edit.

### 2.2 Draft Persistence + Resume (Critical)

The Opus + PM doc calls out a key UX requirement: building a full session can take a while, so we should treat the workspace like a saveable draft.

- Store workspace draft state server-side (for example `session_workspace_drafts`) so it is not lost on refresh or device switch.

> PM Notes:

---

> Opus Notes: Server-side draft storage is correct. Schema suggestion: `{ id, userId, workspaceState: JSON, currentStep: string, createdAt, updatedAt }`. The JSON blob approach is flexible for evolving the wizard without migrations. Consider also storing `validationState` per step to show completion indicators without re-running validation.

- Auto-save triggers:
  - every ~60 seconds
  - on step change
  - on navigation away

- Navigation model:
  - Steps are recommended order but not enforced.
  - Completed steps show a checkmark; incomplete steps show missing requirements.

### 2.2 Power User Mode

Add a toggle like "Compact builder" that shows a 2-panel view:

- Left: entity selectors and overrides
- Right: live session summary + "Start" button

This preserves the speed of the current UI while still supporting the new feature set.

> Opus Notes: Strong addition. The compact mode should be the default for returning users who have existing entities. First-time users get the wizard; power users get the 2-panel view. Store preference in user settings. The live summary panel is key - it should update reactively as selections change.

### 2.3 State Management (Web)

The Session Workspace has cross-step dependencies (setting presets affect locations/time; NPC selection depends on map; etc.). A lightweight store helps avoid prop drilling and makes draft persistence easier.

- Recommendation: a small dedicated store (Zustand is a good fit for wizard flows with persistence middleware).

> Opus Notes: Agreed on Zustand - it's already recommended in the Opus doc. Key middleware: `persist` for localStorage backup (instant recovery), plus a custom `syncToServer` middleware that debounces writes to the draft table. This gives both offline resilience and cross-device sync.

## 3. Where Time Config Should Live in the UI

The time system design strongly suggests: **time config belongs primarily to the Setting**, not to the Session.

### 3.1 Proposed UI Placement

1. **Setting Builder: Time section (primary home)**
   - Keep the full power of `TimeConfig` here for advanced users.
   - Provide presets (Earth-like, Fantasy, Sci-Fi Station) from the schema defaults.

   > PM Notes:

2. **Session Builder: Time step (secondary surface)**
   - Default: "Use setting time config".
   - Allow only a small set of overrides:
     - start time selection
     - optionally seconds-per-turn (pacing) if we want session-specific pacing
   - Show a concise preview: "Day 1, 09:00 (Morning)".

   > PM Notes:

### 3.3 Narrative POV and Time Skips

The Opus doc includes narrative POV mode (player-only vs intimate-dual vs omniscient) and skip limits. These should live beside time config because they are usually authored together.

- Put POV + time-skip guards in the Setting advanced section.

  > PM Notes:

- In Session Workspace, surface only the current choice + allow per-session override only if there is a strong need.

  > PM Notes:

### 3.2 Data Model Recommendation

- Keep `SettingProfile.background.timeConfig` as the source of truth.
- Allow a session override only if we have a clear use case; otherwise store only `session_time_state` at session start.

If we do add session overrides, store them as a small override object:

```ts
export type SessionTimeOverrides = {
  startTime?: { hour: number; minute: number };
  secondsPerTurn?: number;
};
```

> Opus Notes: This override pattern is clean. One addition: include `startDate?: { year, month, day }` for campaigns that span multiple in-game days. The `session_time_state` table already tracks runtime state; these overrides just seed the initial values.

## 4. Location Maps (What They Are and How to Implement)

We need a concept that is more than isolated Location entities: a **map/graph** that defines connectivity and supports navigation and travel time.

### 4.1 MVP Definition of a "Map"

A map is a directed graph:

- **Nodes**: locations (BuiltLocation)
- **Edges**: exits between locations

This lines up with `BuiltLocation.exits` from [dev-docs/05-locations-schema.md](05-locations-schema.md).

> Opus Notes: Correct foundation. The graph model should be **bidirectional by default** (if A->B exists, B->A is implied unless marked one-way). This reduces data entry burden. One-way exits are the exception (trapdoors, one-way portals) and should require explicit flagging.

### 4.2 Two UI Representations (Both Useful)

1. **Hierarchy view (tree)**
   - World -> Region -> Location -> Area/Room
   - Great for users who think in "folders".

2. **Graph view (visual map)**
   - Nodes with drag/drop positions and labeled exits
   - Great for navigation and travel.

My recommendation: ship **hierarchy first**, then add graph visualization as a second tab.

> Opus Notes: Disagree slightly. I'd ship **both simultaneously** with hierarchy as the default tab. The graph view is critical for understanding connectivity, and React Flow makes it low-effort. Without the graph, users will struggle to visualize how exits connect. The hierarchy alone can't show "Room A connects to Room C via a secret passage" - you need the graph for that.

---

> PM Notes: I agree with Opus. Ship both simultaneously.

### 4.2.1 Prefabs + Semantic Zoom (From PM Notes)

The Opus + PM notes propose a very strong direction that I agree with:

- **Prefab nodes**: allow saving a building-with-rooms (or region-with-cities) as a reusable prefab.

- **Semantic zoom / collapse**: let users switch between views that hide/show deeper detail.

Implementation note: this can be modeled as a tree of nodes where the canvas filters by a chosen depth.

### 4.3 Data Model Options

Recommended: introduce a `LocationMap` entity that references locations.

```ts
export type LocationMap = {
  id: string;
  settingId: string;
  name: string;
  description?: string;
  nodeLayout?: Record<string, { x: number; y: number }>; // key: locationId
  edges: Array<{
    fromLocationId: string;
    toLocationId: string;
    label?: string; // "North", "Upstairs", "Gate"
    travelMinutes?: number;
    locked?: boolean;
    lockReason?: string;
  }>;
};
```

- `travelMinutes` becomes the bridge to the time system.

> Opus Notes: The `LocationMap` entity also enables **map templates** - save a dungeon layout and reuse it across settings. Add `isTemplate: boolean` and `sourceTemplateId?: string` for tracking lineage. The `nodeLayout` for canvas positions should use relative coords (0-1 range) so maps scale to any canvas size.

### 4.3.1 Multi-Entrance / Multi-Exit Connections

The PM callout about multiple entrances/exits between the same two nodes is important. A basic node-to-node edge model becomes limiting quickly.

- Recommended: model connections as linking **named ports** (exit/entrance handles) rather than just node IDs.

> Opus Notes: Named ports are the right abstraction. Each location defines `exits: { id: string, name: string, direction?: string }[]`. Edges then connect `{ fromLocationId, fromExitId, toLocationId, toExitId }`. This enables "front door connects to main street" vs "back door connects to alley" on the same building. Critical for prefabs where entry points must be explicit.

### 4.4 How Travel Time Fits

If a player moves from A -> B, travel time can advance the clock by:

$$\text{turnsToAdvance} = \left\lceil \frac{\text{travelMinutes}\cdot 60}{\text{secondsPerTurn}} \right\rceil$$

This is compatible with the time-system "turn-based time" philosophy in [dev-docs/26-time-system.md](26-time-system.md).

## 5. Multi-NPC Sessions in Session Creation (Not Chat Yet)

We already have a solid architectural direction: a session can contain multiple NPC character instances.

### 5.1 Session Builder Needs a "Cast" Step

The session builder should create a session with:

- Primary NPC (required)
- Additional NPCs (optional)

UI suggestions:

- A list of selected NPCs with role + label fields
- "Add NPC" button opens the Character Library picker
- Optional: a "Present in starting location" toggle

> Opus Notes: The "Present in starting location" toggle should default to ON for the first NPC added, OFF for subsequent NPCs. This creates a sensible default scene while allowing spread-out casts. Also add a "Place on map" button that opens a mini-map picker for non-starting locations.

### 5.1.1 NPC Tiers and "Transient" NPCs

The Opus doc highlights tiers (major/minor/transient). For session creation:

- The workspace should primarily manage **major/minor** NPCs as part of the cast.

- "Transient" NPCs (goblins/guards as classes) should be treated as **templates** and spawned at runtime, not hand-built in the workspace.

### 5.2 API Choreography (Likely)

1. Create session: `POST /sessions { characterId, settingId }`
2. Add extra NPCs: `POST /sessions/:id/npcs { templateId, role?, label? }` repeated

This is compatible with [dev-docs/18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md).

> Opus Notes: Multiple sequential requests is fine for MVP, but long-term we should have `POST /sessions` accept the full workspace state in one request: `{ settingId, personaId, startLocationId, startTime, npcs: [...], relationships: [...] }`. The backend can then create everything in a transaction. This also simplifies the draft-to-session conversion.

---

> PM Notes: I prefer to have the full workspace state in one request for MVP rather than sequential requests.

### 5.3 Start Location and NPC Placement

If we want the UI to set up the initial scene, we need to set:

- session start location
- per-NPC location state (where each NPC is at session start)

Schemas exist for `NpcLocationState` and occupancy in [dev-docs/05-locations-schema.md](05-locations-schema.md).

Suggested MVP rule:

- Primary NPC starts in the start location
- Additional NPCs default to "same location" unless user changes

### 5.4 Optional: Assisted NPC Location Assignment

The Opus + PM doc suggests a good fallback: if a user does not specify starting locations for NPCs, an assistant can place them based on NPC profile + available locations (cook -> kitchen).

- This is a great candidate for a tool call (`assign_npc_location`) but should remain an optional helper to keep the UI deterministic.

## 6. Relationships at Game Start (Player <-> NPC, NPC <-> NPC)

The relationship system is complex; the session creation UI must keep it simple.

### 6.1 MVP Relationship Inputs

1. **Player -> NPC relationship label**
   - Examples: stranger, acquaintance, colleague, friend, partner, rival, enemy.

2. **Player -> NPC affinity seed (optional sliders)**
   - Use a few "safe" dimensions (trust, fondness, fear) rather than the full multi-dimensional model.

3. **NPC -> NPC relationship label (optional)**
   - Only for the NPCs in the session cast.
   - This can start as purely descriptive text, used for prompt injection.

### 6.2 UI for Relationships

Two workable UI patterns:

- **Matrix**: table where rows/cols are NPCs and cells are relationship labels
- **Graph editor**: draw edges between portraits (cool, but more work)

Recommendation: ship a **matrix** with defaults of "neutral".

> Opus Notes: Matrix is the pragmatic choice. For small casts (<6 NPCs), show the full matrix. For larger casts, switch to a list view where you select an NPC and see their relationships as a form. The graph editor is polish for later. Key UX: clicking a cell should show a dropdown of relationship presets (stranger, friend, rival, etc.) with an "Other..." option for custom labels.

---

> PM Notes: When we create the final document for this plan, make sure to mark that Graph editor is a later implementation as we do not want to forget about it.

### 6.4 Defaults and Omissions

Aligning with PM notes in Opus:

- If no relationship is defined, assume "stranger" (neutral baseline).

### 6.3 Where to Store Relationships

Option A (fastest): store relationships as part of per-NPC overrides (inside each NPC's `profile_json`).

- Pros: no new table needed, fits the existing "instance + overrides" pattern.
- Cons: NPC-NPC edges are duplicated if stored in both NPCs.

Option B (recommended long-term): a session relationship slice table like `session_relationship_state`.

```ts
export type SessionRelationshipState = {
  edges: Array<{
    fromActorId: string;
    toActorId: string;
    kind: 'player-npc' | 'npc-npc';
    label?: string;
    affinitySeed?: { trust?: number; fondness?: number; fear?: number };
    notes?: string;
  }>;
};
```

This mirrors how time/location/inventory are already session slices.

> Opus Notes: Option B (session slice table) is correct. Relationships are bidirectional data that doesn't belong to either actor. The slice pattern also enables relationship evolution tracking - store snapshots or a changelog to see how relationships changed over the session. Schema addition: `{ ...edges, history?: RelationshipChange[] }`.

## 7. Prompt Tags / Rules (What is Missing)

Tags are currently presented as a simple multi-select in the session builder, but the product needs "instruction scopes".

### 7.1 Proposed Tag Scopes

- Session-wide rules (applies to everything)
- Per-NPC rules (applies to one NPC)
- Location rules (applies to the current scene)
- Persona rules (applies to the player)

### 7.2 UI Suggestion

In the session builder "Rules" step:

- Each tag chip can be assigned a scope (dropdown or segmented control)
- If scope != session, require selecting a target (NPC/location/persona)

> Opus Notes: Scoped tags are powerful but complex. MVP: support only session-wide and per-NPC scopes. Location-scoped tags can wait - they require location detection in the governor which adds complexity. The tag schema needs `scope: 'session' | 'npc' | 'location' | 'persona'` and `targetId?: string`. The UI should group tags by scope for clarity.

---

> PM Notes: Add a TODO in the final plan document to add location detection in the governor. Initially we want tags to be scoped for setting and npc, at the very least.

## 8. Items / Inventory in Session Creation

A coherent session builder should support "starting inventory" even if the full gameplay loop is not complete.

### 8.1 MVP UI

- Choose items from the Item Library
- Specify quantity
- Optional: attach to player vs shared scene inventory

> PM Notes:

### 8.2 Data Model

- If the system already has a session inventory slice, store initial items there.
- If we later need per-actor inventories, evolve to actor-scoped inventory slices.

> Opus Notes: Start with per-actor inventories from day one. The data model already supports `ownerId` on inventory entries. Scene/shared inventory is the exception case (loot piles, shop inventories). This matches player expectations from other RPGs where "my stuff" is separate from "the world's stuff".

## 9. Library Overhaul (Make It Feel Like One Product)

The core issue today is not just missing features: it is that the mental model is fragmented.

### 9.1 Proposed Information Architecture

Replace separate top-level "Libraries" with a single hub:

- **World Library** (Settings)
- **Cast Library** (Characters)
- **Maps** (Location maps + locations)
- **Rules** (Tags)
- **Player** (Personas)
- **Items** (Item definitions)
- **Sessions** (existing)

Each entry shows:

- count
- "missing prerequisites" badges
- a single primary CTA: "Start Session"

> PM Notes:

### 9.2 Cross-Linking

From any entity page, show "Where is this used?":

- Character -> sessions that include it
- Setting -> sessions started in it
- Location map -> settings that reference it

This makes the system feel connected.

> Opus Notes: Cross-linking is essential UX. Also add reverse navigation: from a session, show "Entities in this session" with links back to their library entries. The "Where is this used?" query is a simple JOIN - keep it fast by denormalizing usage counts on the entity records (update on session create/delete).

## 10. Onboarding Path for a Brand New User

A user who wants to create everything from scratch should be able to do:

1. Click "Start Session"
2. In the wizard, see empty states that offer "Quick Create" for each requirement
3. Finish and start the session

Key: The user should never have to remember "I need to go create X first".

> PM Notes:

## 11. Missing or Risky Areas (Callouts)

1. **Persona save errors**: if Persona Builder cannot persist reliably, the wizard should treat persona as optional until fixed.

   > PM Notes: We need to make persona builder reliable as it is critical.

2. **Locations static loading**: location JSON loaders and APIs must exist before the UI can be more than mock data.

3. **Session creation API shape**: if we want a single "create session with cast + start location + time" call, we may need a new endpoint to avoid multiple sequential requests.

4. **Scope-aware tags**: current tag model may not encode scope/target; we likely need schema + DB changes.

> Opus Notes: Item 3 (single session creation endpoint) should be prioritized. The current multi-request flow is fragile - if request 2 of 4 fails, you have a partial session. A transactional endpoint eliminates this. Item 1 (Persona reliability) is indeed critical and should block Phase 1 completion.

## 12. Proposed Phased Delivery

1. **Phase 1 (UX only, minimal backend changes)**
   - Session Workspace shell + draft persistence
   - Cast selection (primary + additional NPCs) using existing `POST /sessions/:id/npcs`
   - Time surface: start-time override only (optional)

2. **Phase 2 (Locations MVP)**
   - Location entity CRUD
   - Basic hierarchy editor + start location selection
   - Simple exits editing (node-to-node)

3. **Phase 3 (Location map visualization + travel time)**
   - Graph view (canvas)
   - Prefabs + semantic zoom
   - Port-based edges + travelMinutes

4. **Phase 4 (Relationships + scope-aware tags)**
   - Relationship matrix UI
   - session relationship slice
   - scoped tags

5. **Phase 5 (Character Builder progressive disclosure)**

This is described in the separate NPC/Character Builder overhaul doc. Key integration point for session setup:

- Inline creation inside the workspace should always use **Quick/Standard** modes; Advanced lives in the full Character Builder.

> Opus Notes: This phasing is well-structured. I'd merge Phases 2 and 3 (Locations) into a single phase - shipping hierarchy without the graph view is incomplete. Also, Phase 1 should include the transactional session creation endpoint to avoid technical debt. Suggested reorder:
>
> 1. Workspace shell + draft persistence + transactional session API
> 2. Locations (hierarchy + graph + prefabs)
> 3. Relationships + scoped tags
> 4. Character builder progressive disclosure (parallel track)

---

## Appendix: Concrete UI Changes Mapped to Existing Web Components

- The current "More Options" placeholder column in the session builder is the natural place to start by adding:
  - Time summary + start time selector
  - Persona selector
  - Starting location selector
  - Additional NPC list (cast)

> Opus Notes: Good incremental approach. The "More Options" column can become a tabbed panel: Overview | NPCs | Location | Time | Rules. Each tab is a mini-form. This preserves the current layout while adding depth. The Overview tab shows the summary card that updates as other tabs change.
