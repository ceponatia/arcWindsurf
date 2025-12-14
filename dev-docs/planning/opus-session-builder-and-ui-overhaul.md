# Session Builder and UI Overhaul

> **Status**: PLANNING
> **Last Updated**: December 2024
> **Engineering Review**: December 2024

This document outlines a comprehensive plan to overhaul the web UI's builder and library system, focusing on making session creation more intuitive and integrating features like time configuration, location maps, and multi-NPC sessions.

## 1. Current State Analysis

### 1.1 Pain Points Identified

**Session Builder ([SessionBuilder.tsx](../packages/web/src/features/session-builder/SessionBuilder.tsx))**:

- Only selects a single character and setting
- Tags panel exists but purpose is unclear
- "More Options" panel is a placeholder ("Items, Locations, and more coming soon")
- No time configuration
- No location selection or map
- No NPC configuration for multi-NPC sessions
- No persona (player) selection

**Character Builder ([CharacterBuilder.tsx](../packages/web/src/features/character-builder/CharacterBuilder.tsx))**:

- Nearly 100 fields across multiple sections (Basics, Appearance, Personality, Body, Details)
- Visually daunting for new users
- No progressive disclosure - all complexity shown upfront
- "Generate" button exists but only fills missing fields

**Setting Builder ([SettingBuilder.tsx](../packages/web/src/features/setting-builder/SettingBuilder.tsx))**:

- Very minimal: ID, Name, Lore, Themes, Tags
- Purpose is unclear to users
- Missing time configuration integration
- No location management

**Other Builders**:

- **Persona Builder**: Exists but errors on save, LLM may not recognize personas
- **Item Builder**: Exists but not integrated into sessions ("TBD")
- **Tag Builder**: Exists but unclear how tags affect sessions
- **Location Builder**: Not implemented

> PM Notes:

### 1.2 Current User Flow (New User)

1. Create character (daunting - nearly 100 fields)
2. Create setting (unclear purpose)
3. Create location(s) - not implemented
4. Create setting tags - unclear how they're used
5. Create persona - errors, may not work
6. Create items - not integrated
7. Create session - only picks character + setting

> PM Notes:

---

## 2. Proposed Architecture: Unified Session Workspace

### 2.1 Core Concept: "Session Workspace"

Instead of creating entities in isolation and then assembling them in SessionBuilder, introduce a **Session Workspace** that provides a unified, guided experience:

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

**Key Principles**:

1. **Guided Flow**: Step-by-step wizard with clear progression
2. **Progressive Disclosure**: Show complexity only when needed
3. **Defaults & Templates**: Provide sensible defaults, allow customization
4. **In-Context Creation**: Create entities within the session context, not in isolation
5. **Visual Feedback**: Show a preview of what the session will look like

> PM Notes:

### 2.2 Step 1: Setting & World Configuration

Combines current SettingBuilder with TimeConfig from [26-time-system.md](26-time-system.md).

**Required Fields**:

- Name
- Lore/Description (what kind of world is this?)
- Genre preset (modern, fantasy, sci-fi) - sets sensible defaults

**Optional/Advanced** (collapsed by default):

- Themes (tags)
- Custom time configuration
  - Seconds per turn (default: 60)
  - Hours per day (default: 24)
  - Day periods (dawn, morning, afternoon, evening, night)
  - Calendar (month/day names, seasons, holidays)
  - Starting date/time
- Narrative POV mode (player-only, intimate-dual, omniscient)
- Time skip limits

**Genre Presets** (one-click defaults):

- **Modern Urban**: Earth calendar, 24h days, standard periods
- **High Fantasy**: Custom calendar, witching hour, festivals
- **Sci-Fi Station**: 20h cycles, shift-based periods
- **Custom**: Start from scratch

```typescript
interface SettingWorkspaceState {
  settingId: string | null; // existing or new
  name: string;
  lore: string;
  genre: 'modern' | 'fantasy' | 'scifi' | 'custom';
  timeConfig: TimeConfig;
  narrativePOV: NarrativePOVMode;
}
```

> PM Notes: The problem I have with this flow is that it could take quite a long time if the user needs to build a lot of characters and locations, so I think it makes sense to have that part of the flow mainly geared toward selecting entities you've already created and saved, but _does_ link the player to the respective builders if needed. This flow needs to have checkpoint saving so people can pick up where they left off, so if they get through the locations & map step but decide to leave and come back later, they can resume with their saved locations & map and move on to characters (or refine locations & map, it is **important** they be able to go back and edit anything they've already saved.)
> **Engineering Response:** Agreed. The workspace should be:
>
> 1. **Selection-first** with "Create New" as secondary action
> 2. **Draft persistence** via `session_workspace_drafts` table with JSON blob of current state
> 3. **Non-linear navigation** - wizard steps are guides, not gates (user can jump to any completed step)
> 4. Auto-save on: step change, 60s interval, and before any navigation away

### 2.2.1 Power User Mode

For returning users with existing entities, offer a **Compact Builder** toggle:

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
│  │  ☐ Prof. Vale           │  │  ─────────────────────────────────  │   │
│  │  [+ Add NPC]            │  │                                     │   │
│  │ ─────────────────────── │  │       [ ★ Start Adventure ★ ]       │   │
│  │ Player: [Alex ▼]        │  │                                     │   │
│  └─────────────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

- Two-panel view: selectors on left, live summary on right
- All selections visible at once (no step navigation)
- Summary updates reactively as selections change
- Default to Compact Mode for users with 3+ existing sessions
- Store preference in user settings

### 2.3 Step 2: Locations & Map

Introduces location management with a visual map editor.

**Location Map Concept**:

```text
                    ┌─────────────────┐
                    │   City Center   │
                    │    (Region)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────┴────┐        ┌─────┴─────┐       ┌────┴────┐
    │  Market │        │   Plaza   │       │ Temple  │
    │ District│        │           │       │ Quarter │
    └────┬────┘        └─────┬─────┘       └────┬────┘
         │                   │                   │
    ┌────┴────┐        ┌─────┴─────┐       ┌────┴────┐
    │  Shops  │        │ Fountain  │       │ Shrine  │
    │ (rooms) │        │  Square   │       │  (room) │
    └─────────┘        └───────────┘       └─────────┘
```

**Features**:

- **Hierarchy**: Region → Building → Room (matches schema in [05-locations-schema.md](05-locations-schema.md))
- **Visual Node Editor**: Drag-and-drop location nodes, draw connections
- **Connection Types**: Adjacent, same-building, distant (affects travel time)
- **Starting Location**: Select where the session begins
- **Quick Templates**: "Apartment Building", "Fantasy Tavern", "Space Station"

**Location Node Properties**:

- Name, description
- Type (region, building, room)
- Exits to other locations
- Tags for flavor
- Capacity (for occupancy system)

**Implementation Approach**:

```typescript
interface LocationMapState {
  nodes: LocationNode[];
  connections: LocationConnection[];
  startingLocationId: string | null;
}

interface LocationNode {
  id: string;
  name: string;
  type: 'region' | 'building' | 'room';
  position: { x: number; y: number }; // For visual editor
  parentId: string | null; // Hierarchy
  properties: BuiltLocation;
}

interface LocationConnection {
  fromId: string;
  toId: string;
  type: 'door' | 'stairs' | 'path' | 'portal';
  bidirectional: boolean;
  travelTime?: number; // In turns
}
```

**Named Ports for Multi-Exit Locations** (from GPT analysis):

Locations with multiple exits (front door, back door, secret passage) need explicit port definitions:

```typescript
interface LocationExit {
  id: string; // Unique within location
  name: string; // "Front Door", "Back Alley Exit"
  direction?: string; // "north", "up", etc.
}

interface LocationConnectionV2 {
  fromLocationId: string;
  fromExitId: string; // Which exit on the source location
  toLocationId: string;
  toExitId: string; // Which entrance on the destination
  bidirectional: boolean;
  travelMinutes?: number;
  locked?: boolean;
  lockReason?: string;
}
```

This enables prefabs to define multiple named entry points that users select when connecting to parent locations.

> PM Notes: I love the idea of a visual node editor. What I envision is dragging and dropping nodes and either selecting a pre-existing location for that node or clicking a button _inside_ that node to let them create a new location. To make this even better, locations can be nested and we should be able to save prefabbed location maps, for example a building with many rooms can be saved as a prefab node and dragging/dropping that node adds the building with all its rooms intact. For this, the prefabbed nodes would need an entry/exit point defined which is used when players drag & drop, so for example a tavern prefab with an entryway, kitchen, and rooms is dropped onto a location map "main street" node. The entryway automatically links to the main street node. The other rooms in the tavern are not linked to the main street node because you must go through the entryway to get to them. We should be able to collapse these "building" or even "region" node maps so users can zoom in or out between levels of complexity. Maybe they prefer to only work on regions right now so they don't need to see all the cities and buildings in them, for example. But then they can zoom in on a region and see all its cities, then zoom in further to see all the buildings, then rooms. These don't need to be explicitly defined levels like "region", "city", etc., rather just views so they can be reused any way the user wants.
> **Engineering Response:** Excellent design. Implementation approach:
>
> 1. **Prefab System**: `location_prefabs` table with `nodes: JSON`, `connections: JSON`, `entryPoints: string[]`
> 2. **Semantic Zoom**: Nodes have `depth` property; canvas has `viewDepth` filter. Collapse = hide children, show aggregate node.
> 3. **Multi-exit Prefabs**: Entry points are named (`main_entrance`, `side_door`). When dropped, user picks which entry connects to parent.
> 4. **Library**: React Flow or XYFlow for the canvas - battle-tested node editors with zoom/pan/grouping built-in.

### 2.4 Step 3: NPCs & Relationships

Configure which NPCs appear in the session and their starting relationships.

**NPC Selection**:

- Choose existing characters from library (as NPCs)
- Create new NPCs inline (simplified character form)
- Set NPC role: `primary`, `supporting`, `background`, `antagonist`

**NPC Tier System** (from [30-npc-tiers-and-promotion.md](30-npc-tiers-and-promotion.md)):

- **Major NPCs**: Full personality, schedules, affinity tracking
- **Minor NPCs**: Simpler profiles, basic routines
- **Transient NPCs**: Generated on-the-fly, minimal persistence

**Relationship Configuration**:

```typescript
interface NpcSessionConfig {
  npcId: string; // character_instances.id
  role: 'primary' | 'supporting' | 'background' | 'antagonist';
  tier: 'major' | 'minor' | 'transient';

  // Starting location (from map)
  startingLocationId: string;

  // Starting affinity with player (from [28-affinity-and-relationship-dynamics.md])
  initialAffinity: Partial<AffinityScores>;

  // Relationships with other NPCs
  npcRelationships: NpcRelationship[];

  // Schedule (optional for minor/transient)
  scheduleId?: string;
}

interface NpcRelationship {
  targetNpcId: string;
  relationshipType: 'friend' | 'rival' | 'family' | 'romantic' | 'colleague' | 'stranger';
  affinity: Partial<AffinityScores>;
  notes?: string; // "Elena's sister, competitive but loving"
}
```

**Visual Relationship Editor**:

```text
┌─────────────────────────────────────────────────────────┐
│                   NPC Relationships                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│     [Elena] ──friend── [Marcus]                         │
│        │                   │                            │
│      sister              rival                          │
│        │                   │                            │
│     [Sofia] ──colleague── [Dr. Chen]                    │
│                                                          │
│     [Player] ──?── (define at runtime)                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> PM Notes:

### 2.5 Step 4: Player Configuration

Configure the player's persona and starting state.

**Player Persona**:

- Select existing persona or create new
- Simplified persona form (name, age, gender, summary, appearance)
- Starting inventory (items from library or quick-create)

**Starting Conditions**:

- Starting location (from map)
- Initial relationships with NPCs (or let them develop naturally)
- Starting time (uses TimeConfig from Step 1)
- Session tags (modifiers that affect the whole session)

```typescript
interface PlayerSessionConfig {
  personaId: string | null;
  startingLocationId: string;
  startingTime: GameTime;
  startingInventory: string[]; // Item IDs
  sessionTags: string[]; // Tag IDs for session modifiers
}
```

> PM Notes: I like having this extra config for relationships. We shoul also have a fallback state where if a relationship is not defined we assume they are unfamiliar with the persona / other npcs. Also if they don't have a starting location on the map, maybe try to assign them somewhat randomly based on their profile? This could be an LLM tool use which determines what kind of npc it is and then looks at locations to see where they fit. Like a tavern cook would be automatically placed in the tavern kitchen rather than in a bank. But that is only a fallback if the user leaves it undefined/null.
> On the note of transient npcs, they would have far less detail than a major or minor npc so I think we are going to eventually need a unique builder for them. A transient npc is something like a "goblin" which is more of a class than a unique npc. When the system needs a goblin, for a random encounter or something like that, it spins up an instance of one with its own health, traits (within thresholds), etc. When that goblin is destroyed or otherwise removed from play, the instance is deleted from the db or otherwise stored in a way that indicates it is defeated (idk if deleting or updating status is better. I can't think of an instance in which a defeated transient npc would need to be referenced again apart from debugging)
> **Engineering Response:**
>
> 1. **Default relationship = "stranger"** with neutral affinity (0.5 across all axes). Already supported by schema.
> 2. **LLM location assignment**: Good use of `assign_npc_location` tool. Input: NPC profile + available locations. Output: best-fit location ID with reasoning.
> 3. **Transient NPC Templates**: Create `npc_templates` table (not full characters). Schema:
>    - `id`, `name` ("Goblin", "Town Guard"), `baseProfile: JSON`, `varianceRanges: JSON`
>    - At spawn: generate instance with randomized stats within variance
> 4. **Defeated transients**: Soft-delete with `status: 'defeated'` + `defeatedAt` timestamp. Useful for:
>    - "You've killed 47 goblins this session" stats
>    - Potential resurrection/necromancy mechanics
>    - Debugging as you mentioned
>    - Cleanup via scheduled job (delete defeated > 30 days old)

### 2.6 Step 5: Review & Launch

Preview the complete session configuration before starting.

**Review Panel**:

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
│ - Prof. Vale (Minor) - Classroom                        │
│ - Cook (Minor) - Kitchen                                │
│                                                          │
│ Player: "Alex" starting at Main Hall                    │
│ Inventory: 3 items                                      │
│                                                          │
│ [Edit Setting] [Edit Locations] [Edit NPCs] [Edit Player]
│                                                          │
│              [ ★ Start Adventure ★ ]                    │
└─────────────────────────────────────────────────────────┘
```

> PM Notes: Agreed, although it would have to be fairly simplified otherwise it'd be unwieldy for large sessions.

---

## 3. Character Builder Overhaul

> **Moved to separate document:** [npc-design-overhaul.md](npc-design-overhaul.md)
>
> Covers: Progressive disclosure modes, dynamic hygiene system, sensory defaults, smart auto-fill, and template characters.

---

## 4. Location System Integration

### 4.1 Location Builder Component

New component: `LocationBuilder.tsx`

**Features**:

- Visual tree view of location hierarchy
- Node editor for individual locations
- Connection manager for exits
- Drag-and-drop reordering

**Location Quick-Add**:

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

> PM Notes: The node system will probably need some iterative testing but I like the initial idea. I do want to implement the "complexity zoom" levels so we can zoom to rooms in a building, buildings/streets/etc. in a town, towns/cities/etc. in a region, and so on. Sci-Fi settings could have planets for example. Again, the zoom levels shouldn't be pre-defined but the system would understand how they are linked.

### 4.2 Location-NPC Binding

**Schedule Integration**:

- When adding an NPC to session, assign their schedule
- Schedule references locations from the map
- Visual indicator of where NPCs are at different times

**Location Awareness in Prompts**:

- Include current location description in LLM context
- Include who else is present (from occupancy system)
- Include available exits

> PM Notes: We could also potentially include a template schedule system. It would rely on an LLM tool call to see what locations are available, what the character profile is, and intelligently assign them to the right areas. For example a Character is named Taylor Swift, the pop star. Her template schedule is home > skill practice > work. The LLM sees that, looks at locations and Taylor's profile and sees she's a pop star who dances, writes music, and performs. It looks at locations and sees a dance studio and a recording studio. It assigns skill practice to dance studio and work to recording studio. That's a very simple example because we would want characters to have schedules that differ by day / week / etc. For example once a month Taylor could "work" at an arena to perform a concert.

> **Engineering Response: Template Schedule System**
> Great idea. Implementation:
>
> **1. Schedule Templates:**
>
> ```typescript
> interface ScheduleTemplate {
>   id: string;
>   name: string; // "Professional", "Student", "Night Owl"
>   slots: {
>     period: string; // "morning", "afternoon", "evening"
>     activity: string; // "home", "work", "skill_practice", "leisure"
>     daysOfWeek?: number[]; // [1,2,3,4,5] = weekdays
>   }[];
> }
> ```
>
> **2. LLM Assignment Tool:**
> `generate_npc_schedule(npc_id, template_id, available_locations[])`
>
> - Input: NPC profile + template + locations
> - Output: Concrete schedule with location IDs
> - Example: "skill_practice" + dancer profile + [dance_studio, gym] → assigns dance_studio
>
> **3. Recurring Events:**
>
> ```typescript
> interface ScheduleOverride {
>   recurrence: 'weekly' | 'monthly' | 'yearly';
>   dayOfWeek?: number; // For weekly
>   dayOfMonth?: number; // For monthly
>   activity: string;
>   locationId: string;
> }
> ```
>
> - Monthly concert: `{ recurrence: 'monthly', dayOfMonth: 15, activity: 'perform', locationId: 'arena' }`

---

## 5. Time Configuration UI

### 5.1 Time Config Editor

Embed in Setting Builder, Step 1 of Session Workspace.

**Simple Mode**:

```text
┌─────────────────────────────────────────────────────────┐
│ Time Configuration                                       │
├─────────────────────────────────────────────────────────┤
│ Preset: [Modern Earth ▼]                                │
│                                                          │
│ Turn Duration: [60 seconds ▼]                           │
│ (1 minute │ 30 seconds │ 2 minutes │ custom)            │
│                                                          │
│ Starting Time: [09:00 ▼] [Day 1 ▼] [Month 1 ▼]         │
│                                                          │
│ [▶ Show Advanced Options]                               │
└─────────────────────────────────────────────────────────┘
```

**Advanced Mode**:

```text
┌─────────────────────────────────────────────────────────┐
│ Advanced Time Configuration                              │
├─────────────────────────────────────────────────────────┤
│ Hours per Day: [24]                                     │
│ Days per Week: [7]                                      │
│ Days per Month: [30]                                    │
│ Months per Year: [12]                                   │
│                                                          │
│ Day Periods:                                            │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Night    │ 00:00-05:00 │ [Edit] [Delete]          │  │
│ │ Dawn     │ 05:00-07:00 │ [Edit] [Delete]          │  │
│ │ Morning  │ 07:00-12:00 │ [Edit] [Delete]          │  │
│ │ ...      │             │                          │  │
│ └────────────────────────────────────────────────────┘  │
│ [+ Add Period]                                          │
│                                                          │
│ Calendar Names:                                         │
│ Month Names: [January, February, ...] or [Custom...]    │
│ Day Names: [Sunday, Monday, ...] or [Custom...]         │
│                                                          │
│ Time Skip Limits:                                       │
│ Max Skip: [24 hours ▼]                                  │
└─────────────────────────────────────────────────────────┘
```

> PM Notes: This looks like a good first design

---

## 6. Tag System Clarification

### 6.1 Tag Types and Targets

Tags need clear categorization:

```typescript
type TagTarget =
  | 'session' // Affects whole session behavior
  | 'npc' // Affects specific NPC behavior
  | 'location' // Affects location description/behavior
  | 'character'; // Character traits/categories

interface TagDefinition {
  id: string;
  name: string;
  target: TagTarget;
  promptText: string; // Injected into relevant prompts
  shortDescription: string;
  // Optional: conditions for when tag applies
  conditions?: TagCondition[];
}
```

**Session Tags** (affect LLM behavior globally):

- "Mature Themes" - allows explicit content
- "Action-Focused" - prioritizes combat and adventure
- "Romance-Forward" - emphasizes relationship building
- "Mystery Mode" - NPCs may lie/hide information

**NPC Tags** (affect specific NPC prompting):

- "Talkative" - generates longer responses
- "Secretive" - withholds information
- "Flirtatious" - more romantic dialogue options

**Location Tags** (affect scene setting):

- "Dangerous" - hostile environment
- "Romantic" - intimate atmosphere
- "Busy" - many background NPCs

> PM Notes: The npc/character tags should also be able to target specific characters (they'd be required to already exist for them to be a selectable option). Same with location tags. Session tags get injected into context but for which agent? Npc agents or the main governor?

> **Engineering Response:**
>
> 1. **Targeted Tags**: Add `targetEntityId?: string` to tag bindings. UI shows entity picker when tag target is `npc` or `location`.
> 2. **Session Tag Injection Points**:
>    - **Governor system prompt**: Global session tone/rules ("Mature Themes", "Mystery Mode")
>    - **NPC agent prompts**: Character-specific tags ("Flirtatious" for specific NPC)
>    - **Location context**: Location tags injected when player is in that location
> 3. Current implementation: `getSessionTagsWithDefinitions()` already supports this. The `get_session_tags` tool can filter by category and could be extended to filter by target.

### 6.2 Tag Selection in Session Workspace

```text
┌─────────────────────────────────────────────────────────┐
│ Session Modifiers (Tags)                                 │
├─────────────────────────────────────────────────────────┤
│ Selected:                                               │
│ [× Mature Themes] [× Romance-Forward]                   │
│                                                          │
│ Available:                                              │
│ [+ Action-Focused] [+ Mystery Mode] [+ Slice of Life]   │
│                                                          │
│ [Create Custom Tag...]                                  │
└─────────────────────────────────────────────────────────┘
```

> PM Notes: I like that design!

---

## 7. Implementation Roadmap

### Critical API Changes (Pre-Phase 1)

Before implementing the UI changes, the API needs a transactional session creation endpoint:

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

This eliminates the fragile multi-request session creation flow and enables atomic draft-to-session conversion.

### Phase 1: Foundation

1. **Location System**
   - Create `LocationBuilder.tsx` component
   - Implement location schema validation
   - Add location API endpoints
   - Basic tree view (no visual editor yet)

2. **Time Config UI**
   - Add TimeConfigEditor component
   - Integrate with SettingBuilder
   - Preset templates (modern, fantasy, sci-fi)

3. **Fix Existing Issues**
   - Debug and fix PersonaBuilder save errors
   - Ensure tags are properly saved and loaded

> PM Notes: Yes I would like to test locations and mapping first as it is a very important aspect of sessions.

### Phase 2: Session Workspace

1. **Session Workspace Component**
   - Multi-step wizard component
   - Step navigation and state management
   - Preview panel

2. **Location Map Editor**
   - Visual node editor for locations
   - Connection drawing
   - Starting location selection

3. **NPC Configuration Panel**
   - NPC selection from library
   - Role and tier assignment
   - Starting location binding

> PM Notes: Perhaps this could be session workspace

### Phase 3: Relationships & Polish

1. **Relationship Editor**
   - NPC-NPC relationship configuration
   - Initial affinity settings
   - Visual relationship graph

2. **Character Builder Overhaul**
   - Progressive disclosure modes
   - Smart defaults and templates
   - LLM-assisted field population

3. **Review & Launch Screen**
   - Complete session preview
   - Validation before launch
   - Quick-edit shortcuts

> PM Notes: Agreed

### Phase 4: Integration & Testing

1. **Backend Integration**
   - Wire location data to LLM context
   - Implement NPC scheduling with locations
   - Time advancement in turns

2. **Testing & Refinement**
   - User testing of new flow
   - Performance optimization
   - Bug fixes

> PM Notes: Yes this will be final testing of this collection of systems, although isolated testing will also occur inside phases.

---

## 8. Open Questions

### 8.1 Architectural Decisions

1. **Location Editor Complexity**: Should we build a full visual map editor (like a node-based graph) or start with a simpler tree/list view?

> PM Notes: A full node based system would be ideal. Like a canvas for dragging/dropping and drawing connecting lines between nodes which link the entrances / exits. How would we handle locations that have multiple entrances and exits back to the same node? Like with the prefab buildings, there could be an entrance and a side entrance which both return to the main street.

> **Engineering Response: Multi-Exit Connections**
> Model connections with named ports rather than just node-to-node:
>
> ```typescript
> interface LocationConnection {
>   id: string;
>   fromNodeId: string;
>   fromPort: string; // "main_entrance", "side_door", "window"
>   toNodeId: string;
>   toPort: string; // "street_north", "alley"
>   // ...
> }
> ```
>
> - Each location defines available `exits: string[]` (e.g., `["front_door", "back_door", "window"]`)
> - Connections link specific exit→entrance pairs
> - In gameplay: "You can leave through the front door (to Main Street) or the back door (to the Alley)"
> - React Flow supports this via "handles" on nodes - multiple connection points per node.

2. **NPC Creation Context**: When creating an NPC within the Session Workspace, should it automatically save to the character library, or only exist within that session?

> PM Notes: I think the session workspace's character _creation_ feature should use the character-builder (although it will be radically improved from where it is now). Creating quick template characters using the autofill feature could be done without the builder, but they should still be added to the db / character library for more advanced editing and reuse in different sessions.

3. **Template System**: Should we have pre-built "session templates" that include a setting, locations, and NPCs as a package deal?

> PM Notes: We will, to allow players to just jump in and play. This will take some time to create though and isn't a focus of these phases yet.

4. **Real-time Collaboration**: Should the Session Workspace support multiple users building together (future consideration)?

> PM Notes: Sure, we could allow users to invite other users (once accounts are setup; this is not yet implemented) so that they can work together. We may even allow multi-user dungeons in the future.

### 8.2 UX Questions

1. **Mobile Experience**: The Session Workspace is complex - how should it adapt for mobile?

> PM Notes: For now we'll keep it web based. Mobile is going to probably require a completely different UI rather than simple scaling based on viewport size.

2. **Onboarding**: Should there be a tutorial or guided first-session experience?

> PM Notes: No, documentation will be enough which we will write later.

3. **Saving Progress**: Should the Session Workspace auto-save draft state so users can return later?

> PM Notes: Yes, absolutely. It should save every minute or so automatically and also when users get to a next stage (i.e., they create one character, it saves the state before they create the second. Or they move from the location part to characters, state gets saved.) There should be navigation for them to go back and forth as desired in the process.

### 8.3 Technical Questions

1. **State Management**: Should the Session Workspace use a dedicated state management solution (Zustand, Jotai) vs React state?

> PM Notes: Tell me more about these and offer recommendations for solutions that work best.

> **Engineering Response: State Management Options**
>
> | Solution                      | Complexity | Best For                       | Downsides                     |
> | ----------------------------- | ---------- | ------------------------------ | ----------------------------- |
> | **React useState/useReducer** | Low        | Simple forms, <10 fields       | Prop drilling, no persistence |
> | **React Context**             | Low-Med    | Shared state across components | Re-renders, no devtools       |
> | **Zustand**                   | Medium     | Complex UI state, wizard flows | Another dependency            |
> | **Jotai**                     | Medium     | Atomic state, derived values   | Learning curve                |
> | **TanStack Query**            | Medium     | Server state, caching          | Overkill for local state      |
>
> **Recommendation: Zustand** for Session Workspace because:
>
> 1. Wizard state is complex (5 steps, nested objects, cross-step dependencies)
> 2. Built-in persistence middleware (auto-save to localStorage or API)
> 3. DevTools support for debugging
> 4. Tiny bundle (~1KB) vs Redux (~7KB)
> 5. Works great with TypeScript
>
> ```typescript
> // Example Zustand store for Session Workspace
> interface SessionWorkspaceStore {
>   currentStep: number;
>   setting: SettingWorkspaceState;
>   locations: LocationMapState;
>   npcs: NpcSessionConfig[];
>   player: PlayerSessionConfig;
>   // Actions
>   setStep: (step: number) => void;
>   updateSetting: (partial: Partial<SettingWorkspaceState>) => void;
>   saveDraft: () => Promise<void>;
>   loadDraft: (draftId: string) => Promise<void>;
> }
> ```

2. **Validation**: When should validation run - on each step, or only at review?

> PM Notes: On each step, because we will also probably be using tool calls in this process too.

---

## 9. Additional PM Comments

- At this stage I'd like to decide if TypeScript / React is going to be rapidly outgrown. Should we start planning to migrate to a faster code language like Go, Rust, C#, etc? Give me your recommendations. Right now the web app is light weight but as you can see from just these systems, it is going to get complex fast and I would eventually like to add graphical elements like a more traditional rpg.
- Think about how a traditional isometric or 3d RPG would work with this engine design as it currently is. Do you think LLMs are too slow for this type of behavior currently?

### 9.1 Engineering Response: Technology Stack Assessment

**Short answer: Stay with TypeScript/React for now. The bottleneck is LLM latency, not language performance.**

#### Why TypeScript/React is the Right Choice Today

1. **The Real Bottleneck is LLMs**
   - A typical LLM call takes 500ms-3000ms (network + inference)
   - Your TypeScript code executes in <10ms for most operations
   - Switching to Rust would save ~5ms while the LLM still takes 1500ms
   - **ROI is near zero for language migration**

2. **Complexity ≠ Performance Problem**
   - React handles applications far more complex than this (VS Code, Figma, Notion)
   - The Session Workspace with 100+ components is well within React's capability
   - TypeScript's type system actually helps manage this complexity better than dynamic languages

3. **Migration Cost is Enormous**
   - Rewriting ~15,000+ lines of TypeScript would take months
   - You'd lose all the existing schema validation, type safety, and tooling
   - The monorepo structure, Prisma ORM, and existing patterns all work well

4. **When You WOULD Consider Migration**
   - If you need real-time multiplayer with <16ms tick rates (Unity/Godot territory)
   - If you're processing millions of embeddings locally (Python with CUDA)
   - If you're building a dedicated game client (Unity C#, Unreal C++, Godot GDScript)

#### Graphical RPG Considerations

**For 2D Isometric/Tile-based:**

- **Stay in Web**: Use PixiJS, Phaser, or React-Three-Fiber
- TypeScript works perfectly fine here
- The LLM integration stays as-is (API calls)
- Example: Pokémon-style or Stardew Valley-style graphics work great in browser

**For 3D RPG:**

- **Hybrid Architecture Recommended**:
  - Game client in Unity/Godot/Unreal (handles rendering, physics, animation)
  - Your existing API becomes a headless "game master" service
  - Client sends player actions → API processes with LLM → returns narrative + state changes
  - This is how AI Dungeon and similar games work at scale

#### LLM Speed Reality Check

| Use Case            | LLM Latency | Acceptable?                    |
| ------------------- | ----------- | ------------------------------ |
| Text RPG (current)  | 1-3s        | ✅ Fine for turn-based         |
| Visual novel style  | 1-3s        | ✅ Works with typing animation |
| Tactical turn-based | 1-3s        | ✅ "Thinking..." indicator     |
| Real-time action    | 1-3s        | ❌ Too slow                    |
| Real-time dialogue  | 1-3s        | ⚠️ Marginal (streaming helps)  |

**Mitigations for faster-feeling gameplay:**

1. **Streaming responses** - Text appears as generated (already supported)
2. **Predictive generation** - Pre-generate likely NPC responses during player input
3. **Tiered NPC intelligence** - Major NPCs use LLM, transient NPCs use templates
4. **Local small models** - Run Phi-3 or similar locally for quick responses (future)

#### Recommendation

```text
Phase 1-4 (This Plan): Stay 100% TypeScript/React
Phase 5+ (Graphics):   Evaluate based on graphics requirements
  - 2D/Isometric → Stay in browser (PixiJS + React)
  - 3D/Complex   → Unity/Godot client + TypeScript API backend
```

**Bottom line:** Your architecture is sound. The complexity you're adding is organizational (more features), not computational. TypeScript handles this well. When/if you add graphics, that's a UI layer change, not an engine rewrite.

## 10. Related Documents

- [character-builder-overhaul.md](character-builder-overhaul.md) - **Character Builder redesign (extracted from this doc)**
- [05-locations-schema.md](../05-locations-schema.md) - Location data model
- [18-multi-npc-sessions-and-state.md](../18-multi-npc-sessions-and-state.md) - Multi-NPC session design
- [26-time-system.md](../26-time-system.md) - Time configuration
- [27-npc-schedules-and-routines.md](../27-npc-schedules-and-routines.md) - NPC scheduling
- [28-affinity-and-relationship-dynamics.md](../28-affinity-and-relationship-dynamics.md) - Relationship system
- [30-npc-tiers-and-promotion.md](../30-npc-tiers-and-promotion.md) - NPC tier system

---

## 11. Summary

The current UI suffers from:

1. **Fragmentation**: Builders exist in isolation without clear connection to sessions
2. **Complexity Overload**: Character builder shows everything upfront
3. **Missing Features**: Locations, time config, multi-NPC, items not integrated
4. **Unclear Purpose**: Settings and tags don't have obvious impact

The proposed **Session Workspace** addresses these by:

1. **Unifying the Flow**: One guided experience from world-building to launch
2. **Progressive Disclosure**: Show complexity only when needed
3. **Visual Tools**: Map editor, relationship graph, timeline preview
4. **Sensible Defaults**: Genre presets, templates, LLM-assisted population

This represents a significant undertaking but will dramatically improve the user experience for both new and power users.

---

## 12. Key Decisions Summary (From PM Notes + Engineering Review)

| Decision                   | Resolution                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Tech Stack**             | Stay with TypeScript/React. LLM latency is the bottleneck, not language performance.               |
| **Graphical RPG**          | Future: 2D in browser (PixiJS), 3D via Unity/Godot client + existing API as backend                |
| **Session Workspace Flow** | Selection-first with inline creation option. Non-linear navigation.                                |
| **Draft Persistence**      | Auto-save every 60s + on step change. Zustand for state management.                                |
| **Location Editor**        | React Flow-based node canvas with semantic zoom and prefab support                                 |
| **Multi-exit Locations**   | Named ports per location, connections link specific exit\u2192entrance pairs                       |
| **Transient NPCs**         | Template-based spawning with soft-delete on defeat. Separate builder.                              |
| **Sensory System**         | Dynamic hygiene state machine with defaults. Interactive body map UI.                              |
| **Tag Injection**          | Session tags \u2192 Governor, NPC tags \u2192 NPC agent, Location tags \u2192 context when present |
| **Schedule Templates**     | LLM tool assigns template slots to concrete locations based on NPC profile                         |
| **Validation**             | Per-step validation (not just at review)                                                           |
