# Session Builder & UI Overhaul - Phased Implementation Plan

> **Status**: APPROVED FOR IMPLEMENTATION
> **Created**: December 2024
> **Source Documents**:
>
> - [opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md) (primary source of truth)
> - [gpt-session-builder-overhaul-time-locations-multi-npc.md](gpt-session-builder-overhaul-time-locations-multi-npc.md)
> - [npc-design-overhaul.md](npc-design-overhaul.md)

This document consolidates the planning work into an actionable phased implementation plan.

---

## Executive Summary

The current UI suffers from fragmentation (6+ isolated builders), complexity overload (100-field character builder), and missing features (locations, time config, multi-NPC). The solution is a unified **Session Workspace** with progressive disclosure, visual tools, and sensible defaults.

**Key Decisions (Finalized)**:

| Decision               | Resolution                                                                    |
| ---------------------- | ----------------------------------------------------------------------------- |
| Tech Stack             | Stay with TypeScript/React. LLM latency is the bottleneck, not language perf. |
| Session Workspace Flow | Selection-first with inline creation. Non-linear navigation.                  |
| Draft Persistence      | Auto-save every 60s + on step change. Zustand for state management.           |
| Location Editor        | React Flow-based node canvas with semantic zoom and prefab support.           |
| Multi-exit Locations   | Named ports per location, connections link specific exit→entrance pairs.      |
| Transient NPCs         | Template-based spawning with soft-delete on defeat. Separate builder.         |
| Sensory/Hygiene System | Dynamic state machine with runtime modifiers. Data file for sensory text.     |
| Tag Injection          | Session tags → Governor, NPC tags → NPC agent, Location tags → context.       |
| Validation             | Per-step validation (not just at review).                                     |

---

## Phase 0: Critical Foundations

> **Goal**: Fix blocking issues and establish API patterns before UI work begins.

### 0.1 Fix Persona Builder Save Errors

**Priority**: CRITICAL (blocks Phase 1)

The Persona Builder currently errors on save. This must be fixed before the Session Workspace can reliably create sessions with personas.

- [x] Debug and identify root cause of save failures
- [x] Fix API endpoint or validation logic
- [x] Add error handling and user feedback
- [x] Verify persona data is correctly loaded by LLM context

### 0.2 Transactional Session Creation API

**Priority**: CRITICAL (blocks Phase 1)

Replace the fragile multi-request session creation flow with a single atomic endpoint.

```typescript
// POST /sessions/create-full
interface CreateFullSessionRequest {
  settingId: string;
  personaId?: string;
  startLocationId?: string;
  startTime?: { year?: number; month?: number; day?: number; hour: number; minute: number };
  secondsPerTurn?: number;
  npcs: Array<{
    characterId: string;
    role: 'primary' | 'supporting' | 'background' | 'antagonist';
    tier: 'major' | 'minor' | 'transient';
    startLocationId?: string;
  }>;
  relationships?: Array<{
    fromActorId: string;
    toActorId: string;
    label: string;
    affinitySeed?: { trust?: number; fondness?: number; fear?: number };
  }>;
  tags?: Array<{ tagId: string; scope: 'session' | 'npc'; targetId?: string }>;
}
```

- [x] Create `/sessions/create-full` endpoint
- [x] Implement transactional creation (all-or-nothing)
- [x] Return complete session state including all created instances
- [x] Add validation for all nested entities

### 0.3 Draft Persistence Schema

**Priority**: HIGH

Create the database schema for workspace draft persistence.

```sql
CREATE TABLE session_workspace_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Future: link to users table
  workspace_state JSONB NOT NULL,
  current_step VARCHAR(50) NOT NULL,
  validation_state JSONB, -- Per-step completion status
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

- [x] Create migration for `session_workspace_drafts` table
- [x] Create API endpoints: `GET/POST/PUT /workspace-drafts`
- [x] Add auto-cleanup for stale drafts (>30 days)

---

## Phase 1: Session Workspace Foundation

> **Goal**: Replace the current SessionBuilder with a guided workspace that supports draft persistence and multi-NPC selection.

### 1.1 Workspace Shell & Navigation

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION WORKSPACE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Setting  │→ │ Locations│→ │   NPCs   │→ │  Player  │→ │  Review  │  │
│  │ & World  │  │  & Map   │  │ & Roles  │  │ & Start  │  │ & Launch │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:

- [x] Create `SessionWorkspace.tsx` with step navigation
- [x] Implement Zustand store for workspace state
- [x] Add localStorage persistence middleware (instant recovery)
- [x] Add server sync middleware (debounced writes to drafts table)
- [x] Non-linear navigation: steps are guides, not gates
- [x] Completed steps show checkmarks; incomplete show missing requirements

### 1.2 State Management (Zustand Store)

```typescript
interface SessionWorkspaceStore {
  // Navigation
  currentStep: 'setting' | 'locations' | 'npcs' | 'player' | 'review';
  setStep: (step: string) => void;

  // Step Data
  setting: SettingWorkspaceState | null;
  locations: LocationMapState | null;
  npcs: NpcSessionConfig[];
  player: PlayerSessionConfig | null;
  tags: TagSelection[];

  // Actions
  updateSetting: (partial: Partial<SettingWorkspaceState>) => void;
  addNpc: (npc: NpcSessionConfig) => void;
  removeNpc: (npcId: string) => void;
  updatePlayer: (partial: Partial<PlayerSessionConfig>) => void;

  // Persistence
  draftId: string | null;
  isDirty: boolean;
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  clearDraft: () => void;

  // Launch
  validate: () => ValidationResult;
  createSession: () => Promise<string>; // Returns session ID
}
```

- [x] Implement Zustand store with TypeScript types
- [x] Add `persist` middleware for localStorage
- [x] Add custom `syncToServer` middleware with 60s debounce
- [x] Add step change auto-save trigger

### 1.3 Power User Mode (Compact Builder)

For returning users with existing entities:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  [○ Wizard Mode]  [● Compact Mode]                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ Setting: [Whisperwood ▼]│  │         SESSION SUMMARY             │   │
│  │ Location: [Main Hall ▼] │  │                                     │   │
│  │ Time: [09:00 Morning ▼] │  │  Setting: Whisperwood Academy       │   │
│  │ ─────────────────────── │  │  Start: Main Hall @ 09:00           │   │
│  │ NPCs:                   │  │  NPCs: 4 (2 major, 2 minor)         │   │
│  │  ☑ Elena (Major)        │  │  Player: Alex                       │   │
│  │  ☑ Marcus (Major)       │  │                                     │   │
│  │  [+ Add NPC]            │  │       [ ★ Start Adventure ★ ]       │   │
│  │ ─────────────────────── │  │                                     │   │
│  │ Player: [Alex ▼]        │  │                                     │   │
│  └─────────────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

- [x] Create `CompactBuilder.tsx` component
- [x] Two-panel layout: selectors left, live summary right
- [x] Default to Compact Mode for users with 3+ existing sessions
- [x] Store mode preference (future: user settings)

### 1.4 Step 1: Setting & World

**Selection-first approach**: Pick existing → Quick-create → Full builder link

- [x] Create `SettingStep.tsx` component
- [x] Setting library selector with search/filter
- [x] "Quick Create" inline form (name, lore, genre preset)
- [x] Link to full SettingBuilder (saves and returns to workspace)
- [x] Genre presets that set sensible defaults:
  - Modern Urban: Earth calendar, 24h days
  - High Fantasy: Custom calendar, witching hour
  - Sci-Fi Station: 20h cycles, shift-based periods

**Time Config Surface** (collapsed by default):

```text
┌─────────────────────────────────────────────────────────┐
│ Time Configuration                                       │
├─────────────────────────────────────────────────────────┤
│ Preset: [Modern Earth ▼]                                │
│ Turn Duration: [60 seconds ▼]                           │
│ Starting Time: [09:00 ▼] [Day 1 ▼]                     │
│ [▶ Show Advanced Options]                               │
└─────────────────────────────────────────────────────────┘
```

- [x] Add TimeConfigEditor component
- [x] Integrate with Setting advanced section
- [x] Session-level overrides: start time + seconds per turn only

### 1.5 Step 3: NPCs & Cast

**Primary selection with optional additional NPCs**:

- [x] Create `NpcStep.tsx` component
- [x] Character library picker for NPC selection
- [x] Support for adding multiple NPCs to cast
- [x] Per-NPC configuration:
  - Role: primary, supporting, background, antagonist
  - Tier: major, minor, transient
  - Starting location (from map, if available)
- [x] "Create New" links to Character Builder

**NPC Session Config**:

```typescript
interface NpcSessionConfig {
  npcId: string;
  role: 'primary' | 'supporting' | 'background' | 'antagonist';
  tier: 'major' | 'minor' | 'transient';
  startingLocationId?: string;
  initialAffinity?: Partial<AffinityScores>;
  npcRelationships?: NpcRelationship[];
}
```

### 1.6 Step 4: Player Configuration

- [x] Create `PlayerStep.tsx` component
- [x] Persona library selector
- [x] Quick-create persona form (name, age, gender, summary)
- [x] Starting location selection
- [x] Starting inventory (items from library)

### 1.7 Step 5: Rules & Tags

- [x] Create `TagsStep.tsx` component
- [x] Tag selection with scope assignment (session-wide or per-NPC)
- [x] Visual grouping by scope
- [x] "Create Custom Tag" link

**MVP Tag Scopes**:

- Session-wide (affects Governor prompts)
- Per-NPC (affects NPC agent prompts)
- Location-scoped: **TODO for later phase** (requires location detection in Governor)

### 1.8 Step 6: Review & Launch

```text
┌─────────────────────────────────────────────────────────┐
│                   Session Summary                        │
├─────────────────────────────────────────────────────────┤
│ Setting: "Whisperwood Academy"                          │
│ Genre: Fantasy │ Time: Day 1, 09:00 (Morning)           │
│                                                          │
│ Locations: 12 (3 regions, 5 buildings, 4 rooms)         │
│ Starting at: Main Hall                                  │
│                                                          │
│ NPCs: 4 (2 major, 2 minor)                             │
│ - Elena (Major) - Library                               │
│ - Marcus (Major) - Training Grounds                     │
│                                                          │
│ Player: "Alex" starting at Main Hall                    │
│                                                          │
│ [Edit Setting] [Edit Locations] [Edit NPCs] [Edit Player]
│              [ ★ Start Adventure ★ ]                    │
└─────────────────────────────────────────────────────────┘
```

- [x] Create `ReviewStep.tsx` component
- [x] Compact summary with entity counts
- [x] Expandable sections for large casts/locations
- [x] Per-step validation with clear error messages
- [x] Quick-edit links back to relevant steps
- [x] Launch button calls transactional API

---

## Phase 2: Location System

> **Goal**: Implement location CRUD, hierarchy view, and visual map editor simultaneously.

### 2.1 Location Data Model

```typescript
interface LocationMap {
  id: string;
  settingId: string;
  name: string;
  description?: string;
  isTemplate: boolean;
  sourceTemplateId?: string;
  nodeLayout?: Record<string, { x: number; y: number }>; // Relative coords 0-1
  edges: LocationConnection[];
}

interface LocationNode {
  id: string;
  name: string;
  type: 'region' | 'building' | 'room';
  parentId: string | null;
  depth: number; // For semantic zoom
  properties: BuiltLocation;
  exits: LocationExit[]; // Named ports
}

interface LocationExit {
  id: string;
  name: string; // "Front Door", "Back Alley Exit"
  direction?: string; // "north", "up"
}

interface LocationConnection {
  id: string;
  fromLocationId: string;
  fromExitId: string;
  toLocationId: string;
  toExitId: string;
  bidirectional: boolean; // Default true
  travelMinutes?: number;
  locked?: boolean;
  lockReason?: string;
}
```

- [x] Create migration for `location_maps` table
- [x] Create migration for `locations` table with named exits
- [x] Create migration for `location_connections` table
- [x] Create API endpoints: CRUD for maps, locations, connections

### 2.2 Location Builder UI

**Two-tab interface** (ship both simultaneously per PM/Opus agreement):

- [x] Create `LocationBuilder.tsx` with tab navigation
- [x] Tab 1: Hierarchy View (tree)
- [x] Tab 2: Graph View (visual canvas)

**Hierarchy View**:

```text
┌─────────────────────────────────────────────────────────┐
│ Location Hierarchy                                       │
├─────────────────────────────────────────────────────────┤
│ ▼ City Center (Region)                                  │
│   ▼ Market District (Building)                          │
│     • Blacksmith Shop (Room)                            │
│     • General Store (Room)                              │
│   ▼ Temple Quarter (Building)                           │
│     • Main Shrine (Room)                                │
│                                                          │
│ [+ Add Location]                                        │
└─────────────────────────────────────────────────────────┘
```

- [x] Tree component with expand/collapse
- [x] Inline add/edit/delete
- [x] Drag-and-drop reordering

**Graph View** (React Flow):

```text
┌─────────────────────────────────────────────────────────┐
│ Location Map                    [Zoom: Region ▼]        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│     ┌─────────┐        ┌───────────┐                    │
│     │ Market  │───────▶│  Plaza    │                    │
│     │ District│        │           │                    │
│     └─────────┘        └───────────┘                    │
│          │                   │                          │
│          ▼                   ▼                          │
│     ┌─────────┐        ┌───────────┐                    │
│     │  Shops  │        │ Fountain  │                    │
│     └─────────┘        └───────────┘                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

- [x] Install and configure React Flow (XYFlow)
- [x] Custom node component with location info
- [x] Multi-handle nodes for named exits
- [x] Edge drawing between specific exit/entrance ports
- [x] Zoom/pan controls
- [x] Semantic zoom: filter nodes by depth level

### 2.3 Prefab System

- [ ] Create `location_prefabs` table
- [ ] Prefab = saved location subgraph with entry points
- [ ] "Save as Prefab" action on any building/region
- [ ] Prefab library in location builder
- [ ] Drop prefab → pick which entry point connects to target

```typescript
interface LocationPrefab {
  id: string;
  name: string;
  description?: string;
  nodes: LocationNode[];
  connections: LocationConnection[];
  entryPoints: string[]; // Exit IDs that can connect to parent
}
```

### 2.4 Location Quick-Add

```text
┌─────────────────────────────────────────────────────────┐
│ Add Location                                             │
├─────────────────────────────────────────────────────────┤
│ Parent: [City Center ▼]                                 │
│ Type:   [Building ▼]                                    │
│ Name:   [________________]                              │
│                                                          │
│ Template: [None ▼]                                      │
│   • Tavern (common room, kitchen, guest rooms)          │
│   • Shop (storefront, back room, storage)               │
│   • House (living room, bedroom, kitchen)               │
│                                                          │
│           [Cancel] [Add Location]                       │
└─────────────────────────────────────────────────────────┘
```

- [x] Create quick-add modal
- [x] Template selection pre-fills structure
- [x] Templates reference prefabs

### 2.5 Travel Time Integration

Travel time advances the game clock:

$$\text{turnsToAdvance} = \left\lceil \frac{\text{travelMinutes} \times 60}{\text{secondsPerTurn}} \right\rceil$$

- [x] Add `travelMinutes` to connection schema
- [x] Governor integration: advance time on location change
- [x] Display travel time in UI on connections

### 2.6 Session Workspace Integration

- [x] Add `LocationsStep.tsx` to workspace
- [x] Map selector (existing maps for setting)
- [x] "Create New Map" opens LocationBuilder
- [x] Starting location picker from map
- [x] Mini-map preview in Review step

---

## Phase 3: Relationships & Scoped Tags

> **Goal**: Add relationship configuration and tag scoping to the Session Workspace.

### 3.1 Relationship Data Model

```typescript
interface SessionRelationshipState {
  edges: RelationshipEdge[];
  history?: RelationshipChange[]; // For tracking evolution
}

interface RelationshipEdge {
  fromActorId: string;
  toActorId: string;
  kind: 'player-npc' | 'npc-npc';
  label: string; // stranger, friend, rival, family, romantic, colleague
  affinitySeed?: {
    trust?: number;
    fondness?: number;
    fear?: number;
  };
  notes?: string;
}
```

- [x] Create migration for `session_relationship_state` table (or JSON field on session)
- [x] API endpoints for relationship CRUD
- [x] Default relationship = "stranger" with neutral affinity (0.5)

### 3.2 Relationship Matrix UI

**For small casts (<6 NPCs)**: Full matrix

```text
┌─────────────────────────────────────────────────────────┐
│                   NPC Relationships                      │
├─────────────────────────────────────────────────────────┤
│           │ Elena   │ Marcus  │ Sofia   │ Player        │
│ ──────────┼─────────┼─────────┼─────────┼───────        │
│ Elena     │    -    │ friend  │ sister  │ [set]         │
│ Marcus    │ friend  │    -    │ rival   │ [set]         │
│ Sofia     │ sister  │ rival   │    -    │ [set]         │
└─────────────────────────────────────────────────────────┘
```

**For larger casts**: List view

- [x] Create `RelationshipMatrix.tsx` component
- [x] Click cell → dropdown of relationship presets + "Other..."
- [ ] Visual relationship graph: **TODO for future** (polish phase)

### 3.3 Scoped Tags Implementation

```typescript
interface TagDefinition {
  id: string;
  name: string;
  target: 'session' | 'npc' | 'location' | 'persona';
  promptText: string;
  shortDescription: string;
}

interface TagSelection {
  tagId: string;
  scope: 'session' | 'npc';
  targetId?: string; // Required if scope is 'npc'
}
```

**MVP Scopes** (Phase 3):

- Session-wide: Injected into Governor system prompt
- Per-NPC: Injected into specific NPC agent prompts

**Deferred**:

- Location-scoped tags: Requires location detection in Governor (see TODO)

- [x] Update tag schema with `target` field
- [x] Update tag selection UI with scope dropdown
- [x] Update Governor to inject session tags
- [ ] Update NPC agents to inject per-NPC tags

### 3.4 TODO: Location Detection in Governor

> **Future Work**: To support location-scoped tags, the Governor needs to track the current location and inject relevant tags.

---

## Phase 4: Character Builder Progressive Disclosure

> **Goal**: Overhaul the character builder to use tiered complexity modes and smart defaults.

### 4.1 Tiered Complexity Modes

```text
┌─────────────────────────────────────────────────────────┐
│  Complexity:  [Quick ○]  [Standard ●]  [Advanced ○]     │
│               5 fields    ~20 fields    ~100 fields     │
└─────────────────────────────────────────────────────────┘
```

**Quick Mode** (5 fields):

- Name
- Age
- Gender
- Summary (auto-expand via LLM)
- Profile picture URL

**Standard Mode** (~20 fields):

- Quick Mode fields +
- Personality traits (simple text list)
- Backstory
- Key appearance (hair, eyes, build)
- Tags

**Advanced Mode** (full ~100 fields):

- Standard Mode fields +
- Detailed physique (structured)
- Body sensory map
- Detailed personality (Big Five, values, fears)
- Custom details

```typescript
type CharacterBuilderMode = 'quick' | 'standard' | 'advanced';

interface CharacterBuilderConfig {
  mode: CharacterBuilderMode;
  showSections: {
    basics: boolean; // Always true
    appearance: boolean; // Standard+
    personality: boolean; // Standard+
    body: boolean; // Advanced only
    details: boolean; // Advanced only
  };
}
```

- [x] Add mode selector to CharacterBuilder
- [x] Implement section visibility based on mode
- [x] Preserve data when switching modes (don't lose advanced fields)
- [x] Default to Standard mode for new characters

### 4.2 Template Characters

- [ ] Create `character_templates` table
- [ ] Seed initial templates:
  - Modern Professional
  - Fantasy Adventurer
  - Sci-Fi Engineer
  - Generic NPC
- [ ] Template selector UI with preview
- [ ] "Load Template" applies defaults, user can customize

### 4.3 Smart Auto-Fill (LLM-Assisted)

- [ ] Create `expand_character_profile` LLM tool
- [ ] Input: name, age, gender, basic traits
- [ ] Output: consistent expanded details
- [ ] Per-section "Regenerate" buttons
- [ ] Context-aware: use setting/genre for appropriate details

### 4.4 Transient NPC Templates

Transient NPCs (goblins, guards) are spawned from templates, not hand-built:

```typescript
interface NpcTemplate {
  id: string;
  name: string; // "Goblin", "Town Guard"
  baseProfile: Partial<CharacterProfile>;
  varianceRanges: {
    age?: { min: number; max: number };
    traits?: string[]; // Pool to randomly select from
    // etc.
  };
}
```

- [ ] Create `npc_templates` table
- [ ] Separate builder UI for templates (simpler than full character)
- [ ] Spawn function: generate instance with randomized stats within variance
- [ ] Soft-delete defeated transients (`status: 'defeated'`, `defeatedAt`)
- [ ] Cleanup job: delete defeated > 30 days old

---

## Phase 5: Dynamic Hygiene & Sensory System (Runtime)

> **Goal**: Implement the runtime hygiene state machine and sensory description generation.

### 5.1 Hygiene State Model

```typescript
interface HygieneState {
  npcId: string;
  bodyPart: string;
  points: number; // Accumulated decay points
  level: 0 | 1 | 2 | 3 | 4; // Computed from points
  lastUpdated: Date;
}

interface HygieneConfig {
  bodyPart: string;
  thresholds: [number, number, number, number]; // Points for levels 1-4
  baseDecayPerTurn: number;
}
```

- [x] Create `npc_hygiene_state` table
- [x] Default: all body parts start at level 0 (clean)
- [x] Character builder (Advanced mode): set initial hygiene level

### 5.2 Sensory Modifier Data File

Create `data/sensory-modifiers.json`:

```json
{
  "bodyParts": {
    "feet": {
      "smell": {
        "0": "",
        "1": "with a faint hint of salt",
        "2": "with a noticeable cheesy musk",
        "3": "with a pungent, earthy odor",
        "4": "with an overpowering stench"
      },
      "touch": { ... },
      "taste": { ... }
    },
    "armpits": { ... },
    "hair": { ... }
  },
  "decayRates": {
    "feet": { "base": 5, "thresholds": [100, 300, 800, 2000] },
    "armpits": { "base": 8, "thresholds": [80, 200, 500, 1200] },
    "hair": { "base": 2, "thresholds": [150, 400, 1000, 2500] }
  }
}
```

- [x] Create sensory modifiers data file
- [x] Loader function to read at runtime
- [x] Validation schema for data file

### 5.3 Hygiene Update Tool

```typescript
interface HygieneUpdateInput {
  npcId: string;
  turnActivity: 'idle' | 'walking' | 'running' | 'labor' | 'combat';
  clothing: Record<string, string>; // bodyPart → clothing type
  environment?: 'dry' | 'humid' | 'rain' | 'swimming';
}
```

Activity modifiers:

| Activity | Multiplier |
| -------- | ---------- |
| idle     | 0.5        |
| walking  | 1.0        |
| running  | 2.0        |
| labor    | 2.5        |
| combat   | 3.0        |

Clothing modifiers:

| Clothing         | Multiplier |
| ---------------- | ---------- |
| barefoot         | 0.3        |
| sandals          | 0.5        |
| shoes_with_socks | 1.0        |
| shoes_no_socks   | 1.8        |
| boots_heavy      | 1.5        |
| boots_sealed     | 2.0        |

- [x] Create `update_npc_hygiene` tool for Governor
- [x] Activity inference from turn narrative (LLM tool call)
- [x] Apply modifiers and update state

### 5.4 Sensory Description Generation

```typescript
function getSensoryDescription(
  npcId: string,
  bodyPart: string,
  senseType: 'smell' | 'touch' | 'taste'
): string {
  const base = getBaseDescription(npcId, bodyPart, senseType);
  const hygieneLevel = getHygieneLevel(npcId, bodyPart);
  const modifier = sensoryModifiers[bodyPart][senseType][hygieneLevel];
  return `${base} ${modifier}`.trim();
}
```

- [x] Implement sensory description function
- [x] Integrate with NPC sensory tool calls
- [x] Read runtime state, not character profile

---

## Phase 6: Schedule Templates & NPC Location Assignment

> **Goal**: Enable intelligent NPC placement and schedule generation.

### 6.1 Schedule Template Model

```typescript
interface ScheduleTemplate {
  id: string;
  name: string; // "Professional", "Student", "Night Owl"
  slots: Array<{
    period: string; // "morning", "afternoon", "evening"
    activity: string; // "home", "work", "skill_practice", "leisure"
    daysOfWeek?: number[]; // [1,2,3,4,5] = weekdays
  }>;
}

interface ScheduleOverride {
  recurrence: 'weekly' | 'monthly' | 'yearly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  activity: string;
  locationId: string;
}
```

- [x] Create `schedule_templates` table
- [x] Seed default templates (Professional, Student, etc.)
- [x] Create schedule template builder UI

### 6.2 LLM Schedule Assignment Tool

`generate_npc_schedule(npc_id, template_id, available_locations[])`

- Input: NPC profile + template + locations
- Output: Concrete schedule with location IDs
- Example: "skill_practice" + dancer profile + [dance_studio, gym] → dance_studio

- [x] Implement `generate_npc_schedule` tool
- [x] Use in Session Workspace for NPCs without explicit locations

### 6.3 Fallback Location Assignment

`assign_npc_location(npc_id, available_locations[])`

For NPCs without a defined starting location:

- Analyze NPC profile (occupation, interests)
- Match against available location types
- Assign best-fit location

- [x] Implement `assign_npc_location` tool
- [x] Use as fallback in Session Workspace

---

## Phase 7: Polish & Integration Testing

> **Goal**: Complete integration, testing, and UX polish.

### 7.1 Cross-Entity Linking

From any entity page, show "Where is this used?":

- Character → sessions that include it
- Setting → sessions started in it
- Location map → settings that reference it

- [x] Add usage tracking (denormalized counts or JOINs)
- [x] Add "Where is this used?" section to entity detail pages
- [x] Add reverse navigation from session to entities

### 7.2 Backend Integration

- [x] Wire location data to LLM context (include description, exits, occupants)
- [x] Implement NPC scheduling with locations
- [x] Time advancement on travel between locations
- [x] Tag injection at correct points (Governor, NPC agents)

### 7.3 Testing & Validation

- [x] Unit tests for workspace state management
- [x] Integration tests for transactional session creation
- [ ] E2E tests for complete session creation flow
- [ ] User testing of new flow
- [ ] Performance profiling and optimization

### 7.4 Future Work (Not in this plan)

- Visual relationship graph editor (currently matrix only)
- Location-scoped tags (requires Governor location detection)
- Real-time collaboration on Session Workspace
- Mobile-specific UI (separate design needed)
- Graphical RPG client integration (Unity/Godot)

---

## Appendix A: API Endpoints Summary

| Endpoint                | Method | Phase | Description                    |
| ----------------------- | ------ | ----- | ------------------------------ |
| `/sessions/create-full` | POST   | 0     | Transactional session creation |
| `/workspace-drafts`     | GET    | 0     | List user's drafts             |
| `/workspace-drafts`     | POST   | 0     | Create new draft               |
| `/workspace-drafts/:id` | PUT    | 0     | Update draft                   |
| `/workspace-drafts/:id` | DELETE | 0     | Delete draft                   |
| `/location-maps`        | CRUD   | 2     | Location map management        |
| `/locations`            | CRUD   | 2     | Individual location management |
| `/location-prefabs`     | CRUD   | 2     | Prefab management              |
| `/schedule-templates`   | CRUD   | 6     | Schedule template management   |
| `/npc-templates`        | CRUD   | 4     | Transient NPC templates        |

---

## Appendix B: Database Migrations Summary

| Table                        | Phase | Description                             |
| ---------------------------- | ----- | --------------------------------------- |
| `session_workspace_drafts`   | 0     | Draft persistence for workspace         |
| `location_maps`              | 2     | Map metadata and layout                 |
| `locations` (update)         | 2     | Add named exits array                   |
| `location_connections`       | 2     | Edge table with port connections        |
| `location_prefabs`           | 2     | Saved location subgraphs                |
| `session_relationship_state` | 3     | Relationship edges (or JSON on session) |
| `tags` (update)              | 3     | Add target/scope fields                 |
| `character_templates`        | 4     | Quick-start character templates         |
| `npc_templates`              | 4     | Transient NPC class definitions         |
| `npc_hygiene_state`          | 5     | Runtime hygiene tracking                |
| `schedule_templates`         | 6     | Schedule pattern definitions            |

---

## Appendix C: Component Summary

| Component                | Phase | Location                                      |
| ------------------------ | ----- | --------------------------------------------- |
| `SessionWorkspace.tsx`   | 1     | `packages/web/src/features/session-workspace` |
| `CompactBuilder.tsx`     | 1     | `packages/web/src/features/session-workspace` |
| `SettingStep.tsx`        | 1     | `packages/web/src/features/session-workspace` |
| `NpcStep.tsx`            | 1     | `packages/web/src/features/session-workspace` |
| `PlayerStep.tsx`         | 1     | `packages/web/src/features/session-workspace` |
| `TagsStep.tsx`           | 1     | `packages/web/src/features/session-workspace` |
| `ReviewStep.tsx`         | 1     | `packages/web/src/features/session-workspace` |
| `LocationBuilder.tsx`    | 2     | `packages/web/src/features/location-builder`  |
| `HierarchyView.tsx`      | 2     | `packages/web/src/features/location-builder`  |
| `GraphView.tsx`          | 2     | `packages/web/src/features/location-builder`  |
| `RelationshipMatrix.tsx` | 3     | `packages/web/src/features/session-workspace` |
| `CharacterBuilder.tsx`   | 4     | Update existing with mode system              |
| `TemplateBuilder.tsx`    | 4     | `packages/web/src/features/template-builder`  |

---

## Related Documents

- [opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md) - Original Opus planning doc
- [gpt-session-builder-overhaul-time-locations-multi-npc.md](gpt-session-builder-overhaul-time-locations-multi-npc.md) - GPT analysis
- [npc-design-overhaul.md](npc-design-overhaul.md) - Character builder and hygiene system
- [05-locations-schema.md](../05-locations-schema.md) - Location data model
- [18-multi-npc-sessions-and-state.md](../18-multi-npc-sessions-and-state.md) - Multi-NPC session design
- [26-time-system.md](../26-time-system.md) - Time configuration
- [28-affinity-and-relationship-dynamics.md](../28-affinity-and-relationship-dynamics.md) - Relationship system
- [30-npc-tiers-and-promotion.md](../30-npc-tiers-and-promotion.md) - NPC tier system
