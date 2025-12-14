# NPC & Character Builder Overhaul

> **Status**: PLANNING
> **Last Updated**: December 2024
> **Parent Document**: [opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md)

This document covers two related but distinct systems:

1. **Character Builder UI** - Progressive disclosure, templates, and smart auto-fill for character creation
2. **Runtime NPC Systems** - Dynamic hygiene, sensory state, and activity tracking during gameplay

---

## 1. Tiered Complexity Modes

Instead of showing all ~100 fields at once, offer three complexity modes:

**Quick Mode** (5 fields):

- Name
- Age
- Gender
- Summary (auto-expand from name/age/gender via LLM)
- Profile picture URL

**Standard Mode** (15-20 fields):

- Quick Mode fields +
- Personality traits (simple text list)
- Backstory
- Key appearance (hair, eyes, build)
- Tags

**Advanced Mode** (full ~100 fields):

- Standard Mode fields +
- Detailed physique (structured)
- Body sensory map
- Detailed personality map (Big Five, values, fears, etc.)
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

**Mode Switcher UI**:

```text
┌─────────────────────────────────────────────────────────┐
│  Complexity:  [Quick ○]  [Standard ●]  [Advanced ○]     │
│               5 fields    ~20 fields    ~100 fields     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic Hygiene & Sensory System (Runtime)

> **Note:** This system runs during gameplay, not in the character builder. The builder only sets initial state (default: clean).

### 2.1 Non-Linear Decay Curve

```typescript
interface HygieneConfig {
  bodyPart: string;
  // Points needed to reach each level (cumulative)
  thresholds: [number, number, number, number]; // e.g., [100, 300, 800, 2000]
  // Base points per turn (modified by activity/clothing)
  baseDecayPerTurn: number;
}
// Example: feet
const feetHygiene: HygieneConfig = {
  bodyPart: 'feet',
  thresholds: [100, 300, 800, 2000], // Level 1 at 100pts, level 4 at 2000pts
  baseDecayPerTurn: 5, // ~20 turns (hours) to level 1
};
```

**Decay Math:**

- Level 0→1: 100 points = ~20 turns of idle activity
- Level 1→2: 200 more points = ~40 more turns
- Level 2→3: 500 more points = ~100 more turns (~4 days)
- Level 3→4: 1200 more points = ~240 more turns (~10 days)

### 2.2 Activity & Clothing Modifiers

```typescript
interface HygieneModifier {
  activity: 'idle' | 'walking' | 'running' | 'labor' | 'combat';
  clothingFactor: number; // 1.0 = normal, 1.5 = heavy/sealed, 0.5 = breathable
  multiplier: number; // Applied to baseDecayPerTurn
}
const activityModifiers: Record<string, number> = {
  idle: 0.5,
  walking: 1.0,
  running: 2.0,
  labor: 2.5,
  combat: 3.0,
};
// Clothing examples
const clothingModifiers = {
  barefoot: 0.3, // Feet air out
  sandals: 0.5,
  shoes_with_socks: 1.0,
  shoes_no_socks: 1.8, // Sweat trapped, no absorption
  boots_heavy: 1.5,
  boots_sealed: 2.0, // Rubber/waterproof
};
```

### 2.3 Per-Turn Hygiene Update Tool

```typescript
interface HygieneUpdateInput {
  npcId: string;
  turnActivity: 'idle' | 'walking' | 'running' | 'labor' | 'combat';
  clothing: Record<string, string>; // bodyPart → clothing type
  environment?: 'dry' | 'humid' | 'rain' | 'swimming';
}
// Tool: update_npc_hygiene
// Called automatically at end of each turn by governor
// Analyzes turn narrative to infer activity level
// Updates hygiene points for each body part
```

### 2.4 Sensory Description Generation

At runtime, hygiene level modifies base sensory descriptions:

```typescript
function getSensoryDescription(
  npcId: string,
  bodyPart: string,
  senseType: 'smell' | 'touch' | 'taste'
): string {
  const base = getBaseDescription(npcId, bodyPart, senseType);
  const hygieneLevel = getHygieneLevel(npcId, bodyPart);
  const modifier = hygieneModifierText[senseType][hygieneLevel];
  return `${base} ${modifier}`;
}
// Example modifiers for smell
const smellModifiers = {
  0: '', // Fresh - no modifier
  1: 'with a faint hint of perspiration',
  2: 'with a noticeable musk',
  3: 'with a strong, earthy scent',
  4: 'with an overpowering odor',
};
```

> This keeps the character builder simple (just set base descriptions or use defaults) while the runtime dynamically adjusts based on gameplay.

### 2.5 Scope Clarification

**Engineering Response:** Agreed on the scope separation. To clarify the architecture:
**Character Builder (Design Time):**

- Sets `initialHygieneLevel` per body part (default: 0 = clean)
- Defines base sensory descriptions (or inherits from archetype defaults)
- User only touches this in Advanced mode; Quick/Standard use defaults
  **Runtime NPC State (Game Time):**
- `npc_hygiene_state` table tracks current points/levels per body part per NPC instance
- Governor calls `update_npc_hygiene` tool at end of each turn
- Sensory tool reads runtime state, not character profile
  **Sensory Reference File:**

Good call on the reference file pattern. Structure:

```typescript
// data/sensory-modifiers.json
{
  "bodyParts": {
    "feet": {
      "smell": {
        "0": "",
        "1": "with a faint hint of salt, vinegar",
        "2": "with a noticeable cheesy musk",
        "3": "with a pungent, acrid, earthy odor",
        "4": "with an overpowering stench"
      },
      "touch": {
        "0": "smooth and dry",
        "1": "slightly damp",
        "2": "noticeably moist",
        "3": "slick with sweat",
        "4": "sticky and clammy"
      },
      "taste": {
        "0": "with a clean, neutral taste",
        "1": "with a faint salty tang",
        "2": "with a distinct salty flavor",
        "3": "with an intense, salty bitterness",
        "4": "with an overwhelming, acrid taste"
      }
    },
    "hair": { /* different progression */ },
    "armpits": { /* faster decay rates */ }
  },
  "decayRates": {
    "feet": { "base": 5, "thresholds": [100, 300, 800, 2000] },
    "armpits": { "base": 8, "thresholds": [80, 200, 500, 1200] },
    "hair": { "base": 2, "thresholds": [150, 400, 1000, 2500] }
  }
}
```

This file becomes the single source of truth for sensory progression, loaded at runtime like the intent aliases were.

---

## 3. Smart Defaults & Auto-Fill

**LLM-Assisted Field Population**:

- User enters name + basic traits
- "Expand" button generates consistent details
- Can regenerate individual sections

**Template Characters**:

- "Modern Professional"
- "Fantasy Adventurer"
- "Sci-Fi Engineer"
- Templates provide sensible defaults for the selected genre

---

## 4. Implementation Plan

### Phase 1: Mode System

- [ ] Add mode selector to CharacterBuilder
- [ ] Implement section visibility based on mode
- [ ] Preserve data when switching modes (don't lose advanced fields)

### Phase 2: Template System

- [ ] Create `character_templates` table
- [ ] Build template selector UI with "Load" confirmation
- [ ] Seed initial templates (Modern Professional, Fantasy Adventurer, etc.)

### Phase 3: Hygiene System (Backend)

- [ ] Add `npc_hygiene_state` table
- [ ] Create `update_npc_hygiene` tool for governor
- [ ] Implement activity inference from turn narrative
- [ ] Add hygiene modifier to sensory description generation

### Phase 4: Sensory Defaults

- [ ] Create `sensory_defaults` table by archetype
- [ ] Implement default inheritance in character creation
- [ ] Add "Reset to defaults" option in Advanced mode

### Phase 5: Smart Autofill

- [ ] Create `expand_character_profile` LLM tool
- [ ] Add per-section "Regenerate" buttons
- [ ] Implement context-aware field generation

---

## 5. Related Documents

- [opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md) - Parent planning document
- [02-character-schema.md](../02-character-schema.md) - Character data model
- [19-body-map-and-sensory-system.md](../19-body-map-and-sensory-system.md) - Sensory system design
