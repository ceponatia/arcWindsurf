# Player Schema (Persona)

This document outlines how the Minimal RPG system represents player characters using the **Persona** schema. Unlike NPCs (which use `CharacterProfile`), personas are simplified character representations focused on identity and appearance without personality or backstory fields.

## Current Status

**State:** Schema, database, and API fully implemented. Session context integration complete.

The persona schema exists in `@minimal-rpg/schemas` under `packages/schemas/src/persona/`:

- **PersonaProfile** - Main composite schema for player characters
- **PersonaBasics** - Core identity (id, name, age, gender, summary)
- **PersonaAppearance** - Physical description (reuses `PhysiqueSchema` from character schema)
- **Body Map** - Per-region sensory data (shared with character schema)

### What's Implemented

1. **Schema Definition** (`@minimal-rpg/schemas/persona`)
   - `PersonaBasicsSchema` - id, name, age, gender, summary
   - `PersonaAppearanceSchema` - Free-text or structured physique
   - `PersonaProfileSchema` - Composite with basics, appearance, and optional body map

2. **Database Layer** (`packages/db/sql/008_personas.sql`)
   - `personas` table - User-level persona definitions
   - `session_personas` table - Per-session persona attachments with overrides
   - Full CRUD support via db client methods

3. **API Routes** (`packages/api/src/routes/personas.ts`)
   - Persona CRUD endpoints (GET, POST, PUT, DELETE)
   - Session persona attachment/detachment endpoints
   - Session-specific overrides support

4. **Session Context Integration** (`packages/api/src/routes/turns.ts`)
   - Fetches active session persona when processing turns
   - Passes persona data to NPC agents via `AgentInput.persona`
   - **NOT passed to intent detector** - only available to agents

5. **NPC Agent Integration** (`packages/agents/src/npc/npc-agent.ts`)
   - Persona context included in system prompts
   - Clear instruction that persona describes the USER, not the NPC character
   - Includes name, age, gender, summary, and appearance fields

6. **Type Exports** - Full TypeScript types available for import

### What's Not Yet Implemented

1. **Web UI** - No persona builder form in the web client
2. **Persona Library** - No UI for browsing/selecting personas
3. **Session Persona Selector** - No UI for attaching personas to sessions

## Persona Profile Schema

The persona schema is intentionally simpler than the NPC character schema:

### PersonaBasics

| Field     | Type   | Required | Description                       |
| :-------- | :----- | :------- | :-------------------------------- |
| `id`      | string | Yes      | Unique identifier                 |
| `name`    | string | Yes      | Display name (max 120 chars)      |
| `age`     | number | No       | Optional age in years             |
| `gender`  | string | No       | Optional gender identity          |
| `summary` | string | Yes      | Brief description (max 500 chars) |

### PersonaAppearance (Optional)

Can be either:

- **Free-text string** - Simple appearance description
- **Structured Physique object** - Reuses `PhysiqueSchema` from character schema

### Body Map (Optional)

- Reuses `BodyMapSchema` from character schema
- Per-region sensory data (scent, texture, visual, flavor)
- Only specify regions with notable characteristics

## Key Differences: Persona vs. Character

The persona schema intentionally **omits** several fields present in `CharacterProfile`:

### Fields NOT in Persona (Player Controls These)

| Field Omitted    | Reason                                            |
| :--------------- | :------------------------------------------------ |
| `personality`    | Player controls their own behavior                |
| `personalityMap` | No Big Five scores, speech style, etc. for player |
| `backstory`      | Player decides their backstory through play       |
| `tags`           | Simpler categorization (no draft/published state) |
| `details`        | No flexible fact storage (RAG for NPCs only)      |
| `scent` (legacy) | Uses body map exclusively if sensory data needed  |

### Fields Shared with Character

| Field        | Source                 | Notes                           |
| :----------- | :--------------------- | :------------------------------ |
| `id`         | Both                   | Unique identifier               |
| `name`       | Both                   | Display name                    |
| `age`        | Both                   | Optional age                    |
| `gender`     | Both                   | Optional gender identity        |
| `appearance` | Both (as `physique`)   | Persona uses simpler field name |
| `body`       | Shared `BodyMapSchema` | Per-region sensory data         |

## Implementation Roadmap

### Phase 1: Database Schema ✅ COMPLETE

```sql
-- Persona templates (user-created persona definitions)
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- owner of this persona
  profile_json JSONB NOT NULL,  -- PersonaProfile data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active persona in a session (session-scoped instance)
CREATE TABLE session_personas (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,  -- reference to personas table
  profile_json JSONB NOT NULL,  -- snapshot at session start
  overrides_json JSONB DEFAULT '{}'::jsonb,  -- session-specific modifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2: API Routes ✅ COMPLETE

```typescript
// Persona CRUD
GET    /personas?user_id=<id>      // List user's personas
POST   /personas?user_id=<id>      // Create new persona (user_id required)
GET    /personas/:id                // Get persona details
PUT    /personas/:id                // Update persona
DELETE /personas/:id                // Delete persona

// Session persona management
POST   /sessions/:sessionId/persona              // Attach persona to session
GET    /sessions/:sessionId/persona              // Get active session persona
PUT    /sessions/:sessionId/persona/overrides    // Update session overrides
DELETE /sessions/:sessionId/persona              // Detach persona from session
```

### Phase 3: Session Context Integration ✅ COMPLETE

Persona data is now automatically loaded and passed to NPC agents during turn processing:

1. **Load persona** - `turns.ts` fetches session persona if attached
2. **Serialize data** - Converts PersonaProfile to agent-friendly format
3. **Pass to governor** - Included in `TurnInput.persona` field
4. **Skip intent detector** - Persona NOT passed to intent detection
5. **NPC agent prompts** - Persona injected into system prompts with context

The NPC agent receives persona as:

```typescript
{
  name?: string;
  age?: number;
  gender?: string;
  summary?: string;
  appearance?: string;  // Serialized from structured or freeform
}
```

And includes it in system prompts with the instruction:

> "This information describes the USER, not your character."

### Phase 4: Web UI (Not Yet Done)

- **Persona Builder** - Form for creating/editing personas (simpler than character builder)
- **Persona Library** - Browse/select personas
- **Session Persona Selector** - Choose persona at session start
- **Persona Preview** - Show persona in chat UI

## Inventory, Items, and Outfits (Planned)

An inventory system has been discussed but is not currently implemented in code:

- **Inventory/Items**: There is no runtime support yet.
- Historical design ideas are captured in `dev-docs/06-items-inventory-and-outfits.md` and older archive notes, but they are not authoritative and should be treated as exploratory.

The forward-looking design assumes that both NPCs and players will share the same **item/outfit model**:

- Items are defined once (for example, boots, coats, jewelry) and attached to owners via an `item_owners` table.
- Each player avatar is a first-class owner (`ownerType: 'player'`) that can hold and equip items, just like a `character_instance`.
- Prompt builders consume an `EffectiveOutfit` view (per character or player) that resolves the currently equipped items per slot (for example, `slot: 'feet'`).

From a RAG and prompting perspective:

- The player’s **core identity** (name, summary, minimal appearance, core personality) will continue to be serialized into a compact character-like block.
- Detailed clothing and gear (for example, "worn leather boots", "long crimson coat") live in item definitions and are exposed via `EffectiveOutfit` and item-aware knowledge nodes.
- When the user examines the player avatar (for example, "I look at my boots"), retrieval logic can:
  - Look up the player’s equipped items from `item_owners` and `items`.
  - Optionally run vector retrieval over item embeddings.
  - Inject a small `Item Context` block into the prompt with only the relevant outfit details for that turn.

Any future player schema that includes equipment, inventory, or currency should therefore align with the shared item/outfit design rather than duplicating clothing fields inside the player profile.

## Open Questions

Several aspects of a future player schema remain intentionally undecided:

- **Player Stats**: Will the player have stats (HP, XP, attributes, etc.)? If so, where will they be stored (dedicated table vs. embedded JSON state)?
- **Inventory System**: How will items be defined, persisted, and associated with a particular player or avatar?
- **Relationships**: How will relationships between the player and NPCs be tracked—explicitly (e.g., separate tables/fields) or implicitly (e.g., via chat history or extended profile state)?

These questions should be revisited when the design requires a first-class player entity rather than treating the user purely as an external agent.
