# PLAN-1.0: Sensory Profile System (Defaults, Templates, and Conditional Augmentation)

**Priority**: P1 - High
**Status**: Draft
**Created**: January 19, 2026
**Primary Design Doc**: ../../009-sensory-profile-system.md

---

## Executive Summary

The current sensory system supports rich per-region data (`BodyMap` with `scent`, `texture`, `flavor`, `visual`) but is too costly for users to author manually.

This plan implements a hybrid system:

1. Deterministic auto-defaults composed from trait fragments (race, gender, age, physique, occupation).
2. Optional template blending for fast "vibe" selection.
3. Conditional augmentation rules (trait interactions and context like activity and environment) applied as a transformation pass.
4. User overrides preserved as highest priority edits.

The Character Studio will keep real-time responsiveness by computing a resolved preview body map from config + overrides and only persisting the minimal config/override data.

---

## Current State (Analysis)

### Schemas

- Canonical sensory types live in:
  - `packages/schemas/src/body-regions/sensory-types.ts` (RegionScent/Texture/Flavor/Visual and BodyRegionData)
  - `packages/schemas/src/character/sensory.ts` (BodyMap schema/type)
- `CharacterProfile` already supports:
  - `body?: BodyMap` (per-region sensory data)
  - `hygiene?: NpcHygieneState` (runtime hygiene state)
- Hygiene already has a notion of "augmentation" in schema form:
  - `packages/schemas/src/state/hygiene-types.ts` includes modifier structures such as `HygieneVisualModifier` with append/add/override semantics.

Implication: the data model is already strong; the missing piece is configuration and deterministic resolution.

### Character Studio

- Character Studio state is managed via Preact Signals.
- `IdentityPanel` edits core traits (age, race, gender) via `updateProfile()`.
- `BodyCard` is currently simplified and only edits `visual.description` for a few regions.
- Save-time validation is lightweight and currently does not validate body/sensory completeness.

Implication: we should introduce sensory defaults without making save validation heavier, and we should keep the existing BodyCard functional while adding a new "Sensory Profile" UX.

---

## Goals

1. Auto-generate sensible sensory defaults from character traits.
2. Preserve power-user control via per-region overrides.
3. Support conditional augmentation (cross-trait interactions) for more "alive" NPC profiles.
4. Keep Character Studio responsive with real-time updates when the user changes age/race/gender.
5. Keep persistence backward compatible with existing `CharacterProfile` documents.

## Non-Goals

- Full AI-driven sensory generation as a hard dependency.
- Requiring users to fill all regions.
- Tight coupling of Character Studio UX to runtime NPC state (hygiene, combat, etc.).

---

## Proposed Architecture

### Conceptual Layers

Resolved sensory profile (preview and runtime) is computed as:

```text
resolvedBodyMap = applyOverrides(
  applyAugmentRules(
    mergeFragments(
      mergeTemplates(autoDefaults, templateBlend)
    )
  ),
  userOverrides
)
```

This matches Approach 5 from the design doc, with the important addition that augmentation is a transformation pass (not just "append notes").

### Where Code Lives

- `@minimal-rpg/schemas`
  - Owns types and Zod schemas for config structures.
  - May include data-only fragment libraries.
  - Avoid placing heavy resolution logic here unless it aligns with existing patterns in `schemas/src/character/scent/resolvers.ts`.
- Recommended home for resolution logic:
  - `@minimal-rpg/characters` or `@minimal-rpg/services` as pure functions (deterministic, unit-tested).
  - Web can reuse the same resolver for preview.

---

## Data Model Changes (Schemas)

### Add Sensory Profile Config

Introduce a new config object to describe "how defaults are computed".

- New file:
  - `packages/schemas/src/character/sensory-profile.ts`

```typescript
import { z } from 'zod';
import { BodyMapSchema } from './sensory.js';

export const SENSORY_DEFAULT_SOURCES = ['race', 'gender', 'age', 'physique', 'occupation'] as const;
export type SensoryDefaultSource = (typeof SENSORY_DEFAULT_SOURCES)[number];

export const SensoryProfileConfigSchema = z.object({
  autoDefaults: z
    .object({
      enabled: z.boolean().default(true),
      sources: z.array(z.enum(SENSORY_DEFAULT_SOURCES)).default(['race', 'gender', 'age']),
    })
    .default({ enabled: true, sources: ['race', 'gender', 'age'] }),

  templateBlend: z
    .object({
      templates: z
        .array(z.object({ id: z.string().min(1), weight: z.number().min(0).max(1) }))
        .max(8)
        .default([]),
    })
    .optional(),

  conflictResolution: z.enum(['auto-wins', 'template-wins', 'custom-wins']).default('custom-wins'),

  // Future: allow users to lock regions so defaults do not overwrite them.
  locks: z
    .object({
      regions: z.array(z.string()).default([]),
    })
    .optional(),

  // User overrides stay in CharacterProfile.body for backward compatibility.
  // Keeping them separate makes it easy to compute resolvedBodyMap without changing existing storage.
});

export type SensoryProfileConfig = z.infer<typeof SensoryProfileConfigSchema>;
```

### Extend CharacterProfile

- Add optional field:
  - `sensoryProfile?: SensoryProfileConfig`

This keeps existing profiles valid and allows gradual rollout.

---

## Resolution Engine (Implementation Plan)

### Inputs

- `Partial<CharacterProfile>` for trait sources:
  - race, gender, age, physique, occupation
  - optional: alignment for augmentation
- `SensoryProfileConfig` (which sources enabled, template blend)
- `BodyMap` overrides from `CharacterProfile.body`
- Optional `TraitContext` for runtime-only augmentation:
  - activity level, environment, hygiene level, timeSinceBathMinutes

### Outputs

- `resolvedBodyMap: BodyMap`

### Core Pieces

1. Fragment library
   - Data-only fragments keyed by trait.
   - Stored as plain objects and validated with Zod at load time.
2. Merge function
   - Implements the MergeConfig semantics.
3. Augmentation rules
   - Cross-trait transformations applied after base merge.
   - Index rules by dependency keys to avoid scanning all rules on every small change.
4. Override application
   - Apply user overrides last and always win.

### Hygiene and other existing modifiers

Hygiene already models "append/add/override" patterns. Reuse these patterns for the augmentation operations where possible:

- Visual augmentation should prefer "append description" and "add features" patterns.
- Scent/texture/flavor augmentation should prefer "add notes" and "scale intensity".

---

## Character Studio Integration

### Current IdentityPanel Card Order (Baseline)

The existing `IdentityPanel.tsx` renders cards in this order:

1. **Core Identity** (name, age, gender, summary) — required, `defaultOpen={true}`
2. **Backstory** — required, `defaultOpen={false}`
3. **Classification** (race/subrace/alignment) — `defaultOpen={false}`
4. Personality Dimensions — `defaultOpen={true}`
5. Emotional Baseline
6. Values & Motivations
7. Fears & Triggers
8. Social Patterns
9. Voice & Communication
10. Stress Response
11. **AppearanceCard** (physique)
12. **BodyCard** (hair/face/torso/hands visual descriptions)

### Sensory Profile Card Placement

**Decision**: Insert **"Sensory Profile"** card immediately after **"Classification"** (position 4, before Personality Dimensions).

Rationale:

- Templates are high-level "style overlays" conceptually adjacent to race/alignment.
- They are **not** Core Identity (save-required fields like name/age/gender).
- They are **not** per-region manual editing (that's BodyCard's job).
- Placing before personality keeps the flow: "what you are" → "how you present" → "who you are internally".
- Card should `defaultOpen={false}` to minimize cognitive load for users who don't need it.

**Alternative "lighter touch" option** (deferred to v2):

- Add a "Sensory Template" dropdown inside Classification card with a "Configure..." button.
- Button scrolls to / expands the full Sensory Profile card.
- This reduces card count but mixes mechanical (race) with stylistic (template) concerns.

### Updated Card Order (After Implementation)

1. Core Identity — required
2. Backstory — required
3. Classification (race/subrace/alignment)
4. **Sensory Profile** ← NEW, `defaultOpen={false}`
5. Personality Dimensions
6. Emotional Baseline
7. Values & Motivations
8. Fears & Triggers
9. Social Patterns
10. Voice & Communication
11. Stress Response
12. AppearanceCard (physique)
13. BodyCard (body region overrides)

### High-Level UX Modes

The Sensory Profile card supports progressive disclosure through modes:

- **Mode: Simple** (v1 default)
  - Toggle: "Use sensory defaults" (on/off)
  - Auto-defaults computed from race/gender/age
  - Read-only preview of resolved sensory summary
  - Minimal controls (intensity preference slider optional)

- **Mode: Template Mixer** (v1)
  - Multi-select: templates (from the v1 library)
  - Per-template weight slider (0-100%)
  - Live preview of blended result
  - Optional "Bake to Overrides" action (materialize resolved values into `body`)

- **Mode: Expert** (v2+)
  - Full region editor that writes to `CharacterProfile.body`
  - Import/export via existing body parser (`packages/utils/src/parsers/body-parser`)
  - Per-region lock toggles to prevent defaults from overwriting

### Storage and Data Flow

**Critical principle**: Templates and config never write directly to `CharacterProfile.body`.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CharacterProfile (persisted)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  sensoryProfile: {                    │  body: BodyMap                      │
│    autoDefaults: { enabled, sources } │    ← user overrides (BodyCard)      │
│    templateBlend: { templates[] }     │    ← highest priority               │
│    conflictResolution: 'custom-wins'  │    ← always wins over computed      │
│  }                                    │                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                              │                              │
                              ▼                              │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Resolution Engine (runtime)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. autoDefaults     → fragments from race/gender/age/physique/occupation   │
│  2. templateBlend    → weighted overlay from selected templates             │
│  3. augmentRules     → conditional transformations (trait interactions)     │
│  4. userOverrides    → CharacterProfile.body (BodyCard edits)               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 resolvedBodyMap: BodyMap (computed, not persisted)          │
│  ← used for preview in Sensory Profile card                                 │
│  ← used at runtime for NPC interactions                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this separation matters**:

- Changing templates is cheap and reversible (no data loss).
- User edits in BodyCard **always win** (stored in `body`).
- Save payload stays minimal (config + sparse overrides, not 20+ region blobs).
- Existing BodyCard continues to work unchanged.
- Rollback is trivial: clear `templateBlend.templates` array.

### Relationship Between BodyCard and Sensory Profile Card

| Concern | BodyCard | Sensory Profile Card |
|---------|----------|----------------------|
| **Purpose** | Manual per-region visual descriptions | Template/defaults configuration |
| **Writes to** | `CharacterProfile.body` | `CharacterProfile.sensoryProfile` |
| **Priority** | Highest (overrides everything) | Lower (provides computed base) |
| **Modalities** | Visual only (currently) | All four (scent, texture, flavor, visual) |
| **User intent** | "I want this exact description" | "Give me a vibe, I'll tweak later" |
| **Persistence** | Sparse BodyMap entries | Config object only |

**BodyCard remains intact**: No changes to BodyCard in v1. It continues to write `visual.description` for hair/face/torso/hands. These become overrides that always win.

### Minimal v1 UI Controls (SensoryProfileCard.tsx)

```tsx
// Collapsed state shows: "Sensory Profile • 2 templates active"
<IdentityCard title="Sensory Profile" defaultOpen={false}>
  {/* Toggle for auto-defaults */}
  <Toggle
    label="Use sensory defaults"
    checked={config.autoDefaults.enabled}
    onChange={(v) => updateSensoryConfig({ autoDefaults: { enabled: v } })}
  />

  {/* Template multi-select */}
  <TemplateSelector
    selected={config.templateBlend?.templates ?? []}
    onChange={(templates) => updateSensoryConfig({ templateBlend: { templates } })}
  />

  {/* Per-template weight sliders (shown when templates selected) */}
  {config.templateBlend?.templates.map((t) => (
    <WeightSlider key={t.id} template={t} onChange={...} />
  ))}

  {/* Read-only preview */}
  <SensoryPreview resolvedBodyMap={resolvedBodyMap.value} regions={['hair', 'skin', 'hands', 'breath']} />

  {/* Link to Expert mode (v2) */}
  <Button variant="link" onClick={() => scrollToBodyCard()}>
    Edit individual regions →
  </Button>
</IdentityCard>
```

### Signals and Computed Values

Add to `signals.ts`:

```typescript
// ============================================================================
// Sensory Profile Signals
// ============================================================================

import { resolveSensoryProfile, type SensoryProfileConfig } from '@minimal-rpg/schemas';

/**
 * Convenience accessor for sensory profile config.
 * Reads from characterProfile.sensoryProfile.
 */
export const sensoryProfileConfig = computed<SensoryProfileConfig>(() => {
  return characterProfile.value.sensoryProfile ?? {
    autoDefaults: { enabled: true, sources: ['race', 'gender', 'age'] },
  };
});

/**
 * Resolved body map computed from:
 * 1. Auto-defaults (fragments from race/gender/age/physique/occupation)
 * 2. Template blend (weighted overlays)
 * 3. Augmentation rules (trait interactions)
 * 4. User overrides (CharacterProfile.body)
 *
 * This is the "final answer" for sensory data, used in preview and runtime.
 */
export const resolvedBodyMap = computed<BodyMap>(() => {
  const profile = characterProfile.value;
  const config = sensoryProfileConfig.value;
  const userOverrides = profile.body ?? {};

  return resolveSensoryProfile({
    traits: {
      race: profile.race,
      gender: profile.gender,
      age: profile.age,
      physique: profile.physique,
      occupation: profile.occupation,
    },
    config,
    overrides: userOverrides,
  });
});

/**
 * Action to update sensory profile config.
 */
export function updateSensoryProfileConfig(updates: Partial<SensoryProfileConfig>): void {
  const current = characterProfile.value.sensoryProfile ?? {};
  updateProfile('sensoryProfile', { ...current, ...updates });
}
```

**Reactivity triggers**: `resolvedBodyMap` automatically recomputes when any of these change:

- `characterProfile.value.race`
- `characterProfile.value.gender`
- `characterProfile.value.age`
- `characterProfile.value.physique`
- `characterProfile.value.occupation`
- `characterProfile.value.sensoryProfile`
- `characterProfile.value.body`

### Performance

- Use an indexed rule engine: `rulesByKey['age']`, `rulesByKey['race']`, etc.
- Use structural sharing: only clone region objects that change.
- Keep computations synchronous and fast; debounce only for slider inputs (weight adjustments).
- Memoize fragment lookups by trait combination.

---

## Validation Strategy

- Keep save-time Studio validation focused on UX requirements (name, age, gender, race, summary, backstory).
- Add schema-level validation for `sensoryProfile` via Zod (reject invalid configs at persistence boundaries).
- Add optional non-blocking warnings:
  - "No sensory defaults configured"
  - "Overrides exist but defaults disabled"

---

## Rollout Phases

### Phase 0: Plumbing and Compatibility

- Add `SensoryProfileConfigSchema` and `sensoryProfile` field to `CharacterProfile`.
- Add resolver package location and unit tests.

### Phase 1: Auto-Defaults MVP

- Implement fragments for a small set of races and age categories.
- Compute resolved preview in Character Studio.
- Provide a basic UI toggle to enable/disable defaults.

### Phase 2: Conditional Augmentation

- Add augmentation rule format and a small curated ruleset:
  - race + age interactions
  - activity level interactions
  - environment interactions
- Ensure rule engine is indexed and deterministic.

### Initial Library (v1 Ship Set)

This section defines a concrete, minimal "ship set" for the fragment library and augmentation rules so implementation is not blocked on authoring 100s of entries.

Principles:

- Prefer _broad coverage_ (few traits, many regions via tags) over deep specificity.
- Prefer _evocative but neutral_ descriptors (avoid stereotyping; tie strong signals to occupation/environment/activity).
- Make fragments sparse: only populate regions that most players expect (hair, face, skin/torso, hands, breath/mouth).

#### Fragment library (v1)

Fragments provide baseline defaults. Each fragment should touch a small set of regions and modalities.

| Source               | Key        | Regions (suggested)      | Modalities             | Example baseline output                                               |
| -------------------- | ---------- | ------------------------ | ---------------------- | --------------------------------------------------------------------- |
| race                 | Human      | hair, face, torso, hands | visual, scent, texture | Clean, neutral human baseline; hair has mild "soap/shampoo" note      |
| race                 | Elf        | hair, skin, breath       | scent, texture, visual | Earthy/green notes; cool, smooth skin; tidy hair visual               |
| race                 | Dwarf      | hands, arms, hair, skin  | scent, texture, visual | Earth/metal undertones; hands lean calloused; warm temperature bias   |
| ageCategory          | young      | exposed-skin, face       | scent, texture, visual | Lower scent intensity; smoother texture; brighter visual "fresh" cues |
| ageCategory          | mature     | hands, face              | texture, visual        | Adds wear/lines; slight texture roughening                            |
| ageCategory          | elder      | face, hands              | texture, visual, scent | Adds dryness/roughness; slightly higher scent intensity               |
| gender (light-touch) | female     | hair, skin               | visual, scent          | Optional: subtle grooming notes only (avoid essentialism)             |
| gender (light-touch) | male       | hair, skin               | visual, scent          | Optional: subtle grooming notes only                                  |
| physique             | athletic   | exposed-skin             | texture, visual        | Slightly warmer, firmer descriptors; no sweat by default              |
| physique             | slender    | torso, limbs             | visual                 | Posture/build visuals only                                            |
| physique             | heavyset   | torso                    | visual                 | Build visuals only                                                    |
| occupation           | blacksmith | hands, arms, hair        | scent, visual, texture | Smoke/iron/soot traces; stronger callouses                            |
| occupation           | sailor     | hair, skin               | scent, visual          | Salt/sea-air traces; wind-worn hair visuals                           |
| occupation           | scholar    | hands, face              | visual                 | Ink stains; tired eyes; paper-dust hint (light)                       |
| occupation           | herbalist  | hands, hair, breath      | scent, flavor          | Herbal notes; mild bitterness/sweetness on breath                     |

Notes:

- Use region tags (like `exposed-skin`, `contact-hands`) during resolution rather than hardcoding every region list inside each fragment.
- Keep fragment priorities stable: race (100), gender (150), age (200), physique (250), occupation (300).

#### Conditional augmentation rules (v1)

Augmentations are deterministic transformations applied after the base merge. The v1 ruleset should be small and cover the "wow" moments:

| Rule                  | When (examples)                                      | Targets                                        | Operations (examples)                                     | Why it matters                                          |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `elf-earthy-by-age`   | race=Elf AND ageCategory=young/elder                 | scent on exposed-skin                          | replace primary if earthy; add notes; scale intensity     | Demonstrates trait interaction immediately              |
| `exertion-heat-sheen` | activityLevel=high AND timeSinceBathMinutes>30       | texture+visual on exposed-skin                 | temperature->warm; moisture->damp; add visual sheen/flush | Makes profiles feel stateful for NPCs                   |
| `travel-dust`         | environment=desert OR environment=trail              | visual on exposed-skin+feet                    | add features: dust, grit; optional scent note: dry earth  | Environmental storytelling without LLM                  |
| `rain-freshened`      | environment=rain AND timeSinceBathMinutes>120        | scent on hair+skin                             | reduce intensity slightly; add "rain" note                | Supports weather-driven scene flavor                    |
| `smoke-tavern`        | environment=tavernSmoke                              | scent on hair+clothes-adjacent; visual on face | add smoke notes; add "soot trace" feature                 | Fits common RPG setting                                 |
| `salt-air`            | environment=sea OR occupation=sailor                 | scent on hair+skin                             | add salt; add seaweed/brine note (light)                  | Shows non-combat context                                |
| `ritual-incense`      | tags contains 'ritual' OR alignmentExpression=devout | scent on hair+hands; visual on hands           | add incense/oil notes; add ash trace on fingers           | Allows alignment _expression_ without moral determinism |

Notes:

- In v1, keep rule conditions AND-only, no nested `anyOf`.
- Prefer _small operations_: add 1-3 notes, append 1-2 features.
- Keep dedupe bounded: notes arrays are max 4 for scent/flavor; features max 8 for visual.
- Integrate hygiene later by feeding hygiene-derived modifiers into the same augmentation phase (reuse existing hygiene modifier schemas).

### Phase 3: Template Mixer

- Add template library and weighting UI.
- Implement blending behavior and conflict resolution rules.

### Template library (v1)

Templates are holistic overlays that feel like "select a vibe". They are not meant to replace trait fragments; they should be safe to layer on top.

Rules of thumb:

- Templates should touch 4-8 regions max (use tags/selectors) and 2-3 modalities.
- Avoid hard binding templates to a race/gender; use `suggestedFor` as a hint only.
- Treat templates as style overlays: they should rarely replace core identifiers like eye color or scars.

| Template ID        | Name               | Tags                         | Suggested for (hints)         | What it adds (high-level)                                                                              |
| ------------------ | ------------------ | ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `woodland-spirit`  | Woodland Spirit    | nature, forest, rain, herbal | Elf, ranger, druid, herbalist | Scent: wet leaves, moss, wildflowers; Visual: dew-kissed hair; Texture: cool, smooth                   |
| `forge-worker`     | Forge Worker       | smoke, metal, heat, industry | Dwarf, blacksmith, armorer    | Scent: hot iron, coal, leather; Visual: soot traces on hands/face; Texture: tougher hands              |
| `noble-refined`    | Noble Refinement   | perfume, silk, wealth        | noble, diplomat               | Scent: light perfume, polished wood; Visual: immaculate grooming; Texture: soft, well-kept             |
| `road-worn`        | Road-Worn Traveler | dust, leather, sun           | traveler, mercenary           | Visual: dust/grit features; Scent: sun-warmed cloth/leather; Texture: dry skin notes                   |
| `sea-touched`      | Sea Touched        | salt, wind, brine            | sailor, coastal               | Scent: salt air, brine; Visual: wind-tossed hair; Texture: cool dampness (light)                       |
| `library-ink`      | Library & Ink      | parchment, ink, quiet        | scholar, scribe               | Visual: ink stains on fingers; Scent: paper, candle wax; Flavor: faint tea/herb bitterness             |
| `temple-incense`   | Temple Incense     | incense, oils, ritual        | cleric, devotee               | Scent: incense/oils around hair/hands; Visual: ash trace features; Texture: oil-slicked hair (subtle)  |
| `battle-ready`     | Battle Ready       | steel, sweat, adrenaline     | guard, soldier                | Scent: leather/steel; Visual: fresh scuffs; Texture: firm grip/callouses emphasis (no gore by default) |
| `tavern-smoke`     | Tavern Smoke       | ale, smoke, hearth           | bartender, regular            | Scent: woodsmoke/ale; Visual: smoke haze traces; Flavor: yeast/bitter note (light)                     |
| `apothecary-clean` | Apothecary Clean   | soap, alcohol, herbs         | healer, apothecary            | Scent: clean soap + medicinal alcohol; Visual: tidy hands; Texture: slightly dry from washing          |

Notes:

- Keep the v1 set small and distinct; add more only when UI/search needs it.
- Make templates composable: `road-worn` + `sea-touched` should not fight.
- Prefer additive notes and mild intensity scaling over replacing primaries.

### Phase 4: Expert Editor

- Add region-level editor and import/export text integration using:
  - `packages/utils/src/parsers/body-parser`

---

## Testing Plan (Deterministic)

- Unit tests for:
  - Fragment merge semantics
  - Augmentation rule application order
  - Rule indexing correctness (only relevant rules run)
  - Stability under repeated trait changes (idempotence when inputs unchanged)
- No tests depend on LLM output.

---

## Open Questions (Resolved)

### Q1: Should `CharacterProfile.body` become "overrides only" explicitly?

**Answer**: Yes, conceptually—but no schema change required.

- `body` is already optional and sparse.
- The new `resolvedBodyMap` computed signal provides the "full" answer.
- Document that `body` semantics are "user overrides that always win".
- No migration needed: existing `body` data becomes overrides automatically.

### Q2: Do we want a "lock region" feature in v1?

**Answer**: Deferred to v2.

- v1 behavior: if `body[region]` exists, it overrides computed values for that region.
- This is implicit locking—user edits always win.
- Explicit lock UI (checkboxes per region) adds complexity without clear v1 value.
- Add `sensoryProfile.locks.regions?: string[]` to schema now for future use.

### Q3: Should alignment affect sensory output directly?

**Answer**: Route through tags, not direct binding.

- Alignment is a moral/philosophical stance, not a physical trait.
- Sensory effects come from _expression_ of alignment (rituals, devotion, lifestyle).
- Use `tags` array or `alignmentExpression` field for augmentation rule matching.
- Example: `alignmentExpression: 'devout'` triggers `ritual-incense` augmentation.
- This avoids "chaotic evil characters smell bad" essentialism.

---

## Codebase Validation (January 20, 2026)

This section documents findings from reviewing the actual codebase to verify plan compatibility.

### Validated Alignments ✅

1. **Schema structure matches plan assumptions**
   - `CharacterProfile` already has `body?: BodyMap` and `hygiene?: NpcHygieneState`
   - `BodyRegionData` supports all four modalities (scent, texture, flavor, visual)
   - Existing `resolveRegionScent()` in `packages/schemas/src/character/scent/resolvers.ts` demonstrates the resolver pattern

2. **Hygiene modifier patterns are reusable**
   - `HygieneVisualModifier` in `packages/schemas/src/state/hygiene-types.ts` already implements `descriptionAppend`, `featuresAdd`, `skinConditionOverride`
   - The augmentation operations proposed in this plan can follow the same patterns

3. **Character Studio integration path is clear**
   - Preact Signals pattern confirmed in `packages/web/src/features/character-studio/signals.ts`
   - `updateProfile()` action function is the correct mutation path
   - `BodyCard` currently only edits `visual.description` for 4 regions—new card can coexist

4. **Race/gender/age available on CharacterProfile**
   - `race: z.enum(RACES)` (required)
   - `gender` (required via CoreIdentitySchema)
   - `age` (required via CoreIdentitySchema)

### Issues Requiring Changes ⚠️

#### Issue 1: `occupation` field does not exist

**Problem**: The plan lists `occupation` as a trait source, but `CharacterProfile` and `CharacterBasics` do not have this field.

**Resolution options**:

- A) Add `occupation?: z.string()` to `CharacterBasicsSchema`
- B) Derive occupation from `tags` array (e.g., `tags.includes('blacksmith')`)
- C) Remove `occupation` from v1 and add in a later phase

**Recommendation**: Option A—add the field. It's a natural character attribute, and the UI can surface it in IdentityPanel. This also benefits NPC generation.

**Files to change**:

- `packages/schemas/src/character/basics.ts` — add `occupation` field
- `packages/schemas/src/character/characterProfile.ts` — no change needed (extends basics)
- `packages/web/src/features/character-studio/components/IdentityPanel.tsx` — add occupation input

#### Issue 2: `physique` is a union type

**Problem**: `physique` can be `string | Physique`. The resolver must handle both.

**Resolution**: In the fragment resolver, normalize physique:

```typescript
function normalizePhysique(physique: string | Physique | undefined): string | undefined {
  if (!physique) return undefined;
  if (typeof physique === 'string') return physique;
  // Extract build descriptor from structured physique
  return physique.build ?? physique.appearance?.build ?? undefined;
}
```

#### Issue 3: `ageCategory` derivation not specified

**Problem**: The plan references `ageCategory` (`young`, `mature`, `elder`) but doesn't define the mapping.

**Resolution**: Add a utility function:

```typescript
export type AgeCategory = 'child' | 'young' | 'adult' | 'mature' | 'elder';

export function deriveAgeCategory(age: number, race: Race): AgeCategory {
  // Race-aware thresholds (elves live longer)
  const thresholds = RACE_AGE_THRESHOLDS[race] ?? DEFAULT_AGE_THRESHOLDS;
  if (age < thresholds.young) return 'child';
  if (age < thresholds.adult) return 'young';
  if (age < thresholds.mature) return 'adult';
  if (age < thresholds.elder) return 'mature';
  return 'elder';
}
```

**Files to add/change**:

- `packages/schemas/src/character/age-category.ts` — new file with derivation logic
- Include race-aware thresholds (e.g., Elf young=0-100, Dwarf young=0-50)

#### Issue 4: Region selector tags not defined

**Problem**: Plan references semantic tags like `'exposed-skin'`, `'contact-hands'`, `'breath-adjacent'` but these don't exist.

**Resolution**: Add region tag definitions:

**New file**: `packages/schemas/src/body-regions/region-tags.ts`

```typescript
export const REGION_TAGS = {
  'exposed-skin': ['face', 'neck', 'hands', 'arms', 'chest', 'torso', ...],
  'contact-hands': ['hands', 'leftHand', 'rightHand'],
  'breath-adjacent': ['mouth', 'face', 'nose'],
  'hair-adjacent': ['hair', 'head'],
  'intimate': ['groin', 'breasts', 'buttocks', ...],
} as const;

export function getRegionsByTag(tag: keyof typeof REGION_TAGS): BodyRegion[] {
  return REGION_TAGS[tag] as unknown as BodyRegion[];
}
```

#### Issue 5: Resolution logic location

**Problem**: Plan suggests `@minimal-rpg/characters` or `@minimal-rpg/services`, but existing `resolveRegionScent()` is in `@minimal-rpg/schemas`.

**Resolution**: Place the sensory profile resolver in `@minimal-rpg/schemas` alongside existing resolvers for consistency. This ensures the web package can import it without circular dependencies.

**New files**:

- `packages/schemas/src/character/sensory-profile/index.ts`
- `packages/schemas/src/character/sensory-profile/config.ts` — SensoryProfileConfigSchema
- `packages/schemas/src/character/sensory-profile/fragments.ts` — fragment library
- `packages/schemas/src/character/sensory-profile/resolver.ts` — resolution logic
- `packages/schemas/src/character/sensory-profile/augment.ts` — augmentation rules

#### Issue 6: Generator package conflict

**Problem**: `packages/generator/src/character/generate.ts` has `generateBodyMap()` which randomly generates sensory data. The new deterministic system may conflict.

**Resolution**:

- Keep `generateBodyMap()` for random NPC generation (useful for background NPCs)
- The sensory profile system is for user-created characters in Character Studio
- Document that these are two different use cases:
  - **Generator**: Random/procedural NPCs with configurable theme pools
  - **Sensory Profile**: Deterministic defaults from character traits

### Dependency Graph

```text
@minimal-rpg/schemas (owns all types and resolution logic)
    ├── sensory-profile/config.ts (SensoryProfileConfigSchema)
    ├── sensory-profile/fragments.ts (fragment library data)
    ├── sensory-profile/resolver.ts (resolveSensoryProfile)
    └── sensory-profile/augment.ts (augmentation rules)

@minimal-rpg/web (consumes schemas, computes preview)
    └── character-studio/signals.ts
        └── resolvedBodyMap = computed(() => resolveSensoryProfile(...))

@minimal-rpg/characters (may wrap resolver for service layer)
    └── body-map/service.ts (optional: add resolved map to persistence)
```

### Updated Phase 0 Tasks

Based on validation, Phase 0 should include:

1. **Add `occupation` field to CharacterBasicsSchema**
2. **Add `AgeCategory` derivation utility**
3. **Add region tag definitions**
4. **Create `sensory-profile/` folder in schemas with:**
   - `config.ts` (SensoryProfileConfigSchema)
   - `types.ts` (fragment/rule types)
   - `index.ts` (barrel export)
5. **Add `sensoryProfile?: SensoryProfileConfig` to CharacterProfileSchema**
6. **Unit tests for age category derivation and region tag lookups**

---

## Implementation Checklist

This section provides a comprehensive, ordered task list for implementing the sensory profile system across all packages. Tasks are grouped by phase and package.

### Phase 0: Schema Foundation

#### `@minimal-rpg/schemas`

- [ ] **0.1** Add `occupation?: z.string()` to `CharacterBasicsSchema`
  - File: `packages/schemas/src/character/basics.ts`
  - Update barrel exports

- [ ] **0.2** Create `packages/schemas/src/character/age-category.ts`
  - Define `AgeCategory` type (`'child' | 'young' | 'adult' | 'mature' | 'elder'`)
  - Define `RACE_AGE_THRESHOLDS` constant (race-aware boundaries)
  - Implement `deriveAgeCategory(age: number, race: Race): AgeCategory`
  - Export from character barrel

- [ ] **0.3** Create `packages/schemas/src/body-regions/region-tags.ts`
  - Define `REGION_TAGS` constant mapping tag names to region arrays
  - Tags: `exposed-skin`, `contact-hands`, `breath-adjacent`, `hair-adjacent`, `intimate`
  - Implement `getRegionsByTag(tag: RegionTag): BodyRegion[]`
  - Export from body-regions barrel

- [ ] **0.4** Create `packages/schemas/src/character/sensory-profile/` folder
  - `config.ts` — `SensoryProfileConfigSchema` (as specified in Data Model section)
  - `types.ts` — fragment and rule type definitions
  - `index.ts` — barrel export

- [ ] **0.5** Add `sensoryProfile?: SensoryProfileConfig` to `CharacterProfileSchema`
  - File: `packages/schemas/src/character/characterProfile.ts`
  - Import from sensory-profile barrel

- [ ] **0.6** Unit tests for Phase 0
  - `deriveAgeCategory()` with multiple races and edge cases
  - `getRegionsByTag()` returns correct regions
  - `SensoryProfileConfigSchema` parsing and defaults

### Phase 1: Resolution Engine

#### `@minimal-rpg/schemas`

- [ ] **1.1** Create `packages/schemas/src/character/sensory-profile/fragments.ts`
  - Define `SensoryFragment` type (trait key → partial BodyRegionData)
  - Implement v1 fragment library (Human, Elf, Dwarf, age categories, etc.)
  - Validate fragments with Zod at module load

- [ ] **1.2** Create `packages/schemas/src/character/sensory-profile/merge.ts`
  - Implement `mergeFragments(fragments: SensoryFragment[]): BodyMap`
  - Priority ordering: race (100) < gender (150) < age (200) < physique (250) < occupation (300)
  - Use structural sharing for performance

- [ ] **1.3** Create `packages/schemas/src/character/sensory-profile/templates.ts`
  - Define `SensoryTemplate` type
  - Implement v1 template library (10 templates as specified)
  - Implement `mergeTemplates(base: BodyMap, blend: TemplateBlend): BodyMap`

- [ ] **1.4** Create `packages/schemas/src/character/sensory-profile/resolver.ts`
  - Implement `resolveSensoryProfile(input: ResolutionInput): BodyMap`
  - Compose: autoDefaults → templateBlend → augmentRules → userOverrides
  - Pure function, fully deterministic

- [ ] **1.5** Unit tests for Phase 1
  - Fragment merge priority ordering
  - Template blending with weights
  - Override application always wins
  - Idempotence (same inputs → same outputs)

### Phase 2: Conditional Augmentation

#### `@minimal-rpg/schemas`

- [ ] **2.1** Create `packages/schemas/src/character/sensory-profile/augment.ts`
  - Define `AugmentRule` type (condition → operations)
  - Implement rule engine with indexed lookups by dependency key
  - Implement v1 ruleset (7 rules as specified)

- [ ] **2.2** Integrate augmentation into resolver
  - Add `applyAugmentRules(base: BodyMap, context: TraitContext): BodyMap`
  - Call from `resolveSensoryProfile()` between template merge and overrides

- [ ] **2.3** Unit tests for Phase 2
  - Each v1 rule triggers correctly
  - Rules are indexed (only relevant rules run)
  - Operations (add notes, scale intensity, append features) work correctly

### Phase 3: Character Studio UI

#### `@minimal-rpg/web`

- [ ] **3.1** Add sensory profile signals to `signals.ts`
  - `sensoryProfileConfig` computed signal
  - `resolvedBodyMap` computed signal
  - `updateSensoryProfileConfig()` action function

- [ ] **3.2** Create `SensoryProfileCard.tsx`
  - File: `packages/web/src/features/character-studio/components/SensoryProfileCard.tsx`
  - Wrap in `IdentityCard` with `defaultOpen={false}`
  - Toggle for auto-defaults enabled
  - Template multi-select component
  - Per-template weight sliders
  - Read-only preview of resolved sensory summary

- [ ] **3.3** Create `TemplateSelector.tsx` subcomponent
  - Multi-select UI for templates
  - Show template name, tags, and "suggested for" hints
  - Limit to 8 templates max

- [ ] **3.4** Create `SensoryPreview.tsx` subcomponent
  - Compact summary of resolved sensory data
  - Show 4 key regions: hair, skin, hands, breath
  - Display primary scent, texture summary, visual description snippet

- [ ] **3.5** Integrate into `IdentityPanel.tsx`
  - Import `SensoryProfileCard`
  - Insert after Classification card (position 4)
  - Add `hasContent` prop based on `sectionCompletion`

- [ ] **3.6** Update `sectionCompletion` computed signal
  - Add `sensoryProfile` key
  - True if `sensoryProfile.autoDefaults.enabled` or templates selected

- [ ] **3.7** Add occupation input to Classification or Core Identity card
  - Dropdown or text input for occupation
  - Update `updateProfile('occupation', value)` on change

### Phase 4: Runtime Integration

#### `@minimal-rpg/characters` (or service layer)

- [ ] **4.1** Create body-map resolution service
  - File: `packages/characters/src/body-map/service.ts` (or appropriate location)
  - Wrapper around `resolveSensoryProfile()` for runtime use
  - Accept `TraitContext` for activity/environment augmentation

- [ ] **4.2** Integrate with NPC interaction system
  - When rendering NPC sensory descriptions, use resolved body map
  - Pass runtime context (hygiene, activity, environment) for augmentation

- [ ] **4.3** Update existing body description formatters
  - Ensure they work with resolved body map structure
  - Fallback gracefully if sensory data is missing

### Phase 5: Expert Editor (v2)

- [ ] **5.1** Create region-level editor component
  - Per-region expansion with all four modalities
  - Write directly to `CharacterProfile.body` (overrides)

- [ ] **5.2** Add import/export functionality
  - Integrate with `packages/utils/src/parsers/body-parser`
  - Paste text → parse to body map → apply as overrides

- [ ] **5.3** Add per-region lock toggles
  - UI checkboxes to lock regions
  - Write to `sensoryProfile.locks.regions[]`
  - Resolver skips locked regions from computed values

---

## Game-Wide Impact Summary

The sensory profile system affects multiple parts of the game beyond Character Studio:

### Character Creation Flow

- Users can quickly get sensory defaults by selecting race/gender/age.
- Templates provide one-click "vibe" application.
- Power users can still manually author every region.

### NPC Interactions

- All `describe` and `examine` commands use `resolvedBodyMap`.
- NPCs have consistent, trait-appropriate sensory descriptions.
- Environmental context (rain, smoke, exertion) dynamically augments descriptions.

### Hygiene System Integration

- Hygiene modifiers layer on top of `resolvedBodyMap`.
- Existing `HygieneVisualModifier` patterns reused for augmentation.
- No changes to hygiene system—it consumes the resolved map.

### Generator Package

- `generateBodyMap()` remains for random NPC generation.
- New `resolveSensoryProfile()` is for authored characters.
- Both can coexist; generator may optionally use fragments as theme pools.

### Backward Compatibility

- Existing `CharacterProfile` documents remain valid.
- `body` field becomes overrides (semantic change, no migration).
- Characters without `sensoryProfile` field get defaults (`autoDefaults.enabled: true`).

---

## UX Review and Gaps Analysis

This section critically examines the UI/UX design, identifies gaps, and proposes improvements.

### Current PLAN UI Limitations

The v1 UI controls described are **minimal but functional**. However, several UX concerns exist:

| Gap | Issue | Impact |
|-----|-------|--------|
| **No sensory preview context** | User sees "hair: earthy, moss" but doesn't know _why_ | Confusion about what templates/traits are contributing |
| **Weight sliders are abstract** | 0-100% weight doesn't explain blending behavior | Users may over-tweak without understanding effect |
| **No visual feedback loop** | No indication of which regions are affected by templates | Templates feel like "magic black boxes" |
| **Occupation field missing in UI** | Plan adds `occupation` to schema but no UI for it | Occupation-based fragments won't work without input |
| **No template conflict indicators** | Mixing incompatible templates (e.g., "forge-worker" + "apothecary-clean") | Unexpected blended results |
| **Mobile/responsive not considered** | Sliders and multi-selects can be awkward on mobile | Poor experience on tablets/phones |

### UX Improvements for v1

#### 1. Sensory Preview with Attribution

Instead of just showing resolved values, show _why_ each region has its current value:

```text
┌─ Hair ─────────────────────────────────────────────┐
│ Scent: earthy, moss, wildflowers                   │
│   ← Elf (race) + Woodland Spirit (template 60%)    │
│ Visual: long, silver-streaked, dew-kissed          │
│   ← Manual override                                │
└────────────────────────────────────────────────────┘
```

**Implementation**: Add `attribution` to resolved values:

```typescript
interface ResolvedRegionData extends BodyRegionData {
  _attribution?: {
    scent?: string[];  // e.g., ['race:Elf', 'template:woodland-spirit']
    visual?: string[];
    texture?: string[];
    flavor?: string[];
  };
}
```

#### 2. Template Cards with Visual Previews

Replace plain multi-select with visual template cards:

```text
┌──────────────────────────────────────┐
│ 🌿 Woodland Spirit                   │
│ "Forest-dweller with earthy notes"   │
│ Affects: hair, skin, breath          │
│ [■■■■■□□□□□] 60%                     │
│ Suggested for: Elf, Ranger, Druid    │
└──────────────────────────────────────┘
```

**Benefits**:
- Users see what regions are affected before selecting
- Weight is integrated into the card
- Suggested-for hints guide appropriate selection

#### 3. Conflict Warnings

When templates have overlapping regions with different intents:

```text
⚠️ Template conflict on [hands]:
   • Forge Worker: calloused, soot-stained
   • Apothecary Clean: soft, well-washed
   Result: blend may feel inconsistent
   [Resolve manually] [Accept blend]
```

#### 4. Occupation Input in Classification Card

Add occupation to the Classification card (not Core Identity—it's not required):

```tsx
{/* Inside Classification Card, after Alignment */}
<label className="block">
  <span className="text-xs text-slate-400">Occupation</span>
  <input
    type="text"
    value={profile.occupation ?? ''}
    onChange={(e) => updateProfile('occupation', e.target.value)}
    placeholder="e.g., blacksmith, scholar, healer..."
    list="occupation-suggestions"
  />
  <datalist id="occupation-suggestions">
    <option value="blacksmith" />
    <option value="sailor" />
    <option value="scholar" />
    <option value="herbalist" />
    <!-- etc. -->
  </datalist>
</label>
```

**Rationale**: Occupation is optional but valuable for sensory fragments. Using a text input with datalist allows both predefined options and custom entries.

#### 5. "Quick Start" Templates

For new users, offer one-click sensory setup:

```text
┌─────────────────────────────────────────────────────┐
│ Quick Start: Based on your character (Elf Ranger)   │
│                                                     │
│ [Woodland Spirit]  [Road-Worn Traveler]  [Custom]   │
│                                                     │
│ Or: [Use auto-defaults only]                        │
└─────────────────────────────────────────────────────┘
```

### Required vs Optional Fields

**Sensory Profile should be 100% optional**. No fields should be required for save.

| Field | Required? | Rationale |
|-------|-----------|-----------|
| `sensoryProfile` | No | Entire feature is opt-in |
| `sensoryProfile.autoDefaults.enabled` | No (defaults to `true`) | Safe default behavior |
| `sensoryProfile.templateBlend` | No | Templates are optional enhancement |
| `occupation` | No | Nice-to-have for fragments, not blocking |
| `body` (overrides) | No | User edits are always optional |

**Validation rules**:
- No save-blocking validation for sensory data
- Optional non-blocking warnings:
  - "Sensory defaults disabled but no templates selected"
  - "Template weights sum to 0%"

### API Routes Analysis

#### Existing Routes (No Changes Needed)

The current routes in `@/home/brian/projects/arcWindsurf/packages/api/src/routes/studio.ts` handle:

- `POST /studio/conversation` — conversation with character
- `POST /studio/infer-traits` — trait inference
- `GET/DELETE /studio/session/:id` — session management

**Character profile persistence** happens through `entityProfiles` table, which stores `profileJson` as JSONB. The `sensoryProfile` field will be stored automatically within this JSON—**no route changes needed**.

#### Missing Routes (Recommended Additions)

| Route | Purpose | Priority |
|-------|---------|----------|
| `GET /api/sensory/templates` | List available templates with metadata | P1 (v1) |
| `GET /api/sensory/templates/:id` | Get single template with full region data | P2 (v2) |
| `POST /api/sensory/preview` | Compute resolved body map without saving | P2 (nice-to-have) |

**Template listing route** (recommended for v1):

```typescript
// GET /api/sensory/templates
app.get('/api/sensory/templates', (c) => {
  // Import from @minimal-rpg/schemas
  const templates = getSensoryTemplates();
  return c.json({
    ok: true,
    templates: templates.map(t => ({
      id: t.id,
      name: t.name,
      tags: t.tags,
      suggestedFor: t.suggestedFor,
      affectedRegions: t.affectedRegions,
      description: t.description,
    })),
  });
});
```

**Why**: The frontend needs template metadata for the selector UI. Bundling all template data in the frontend works but increases bundle size. A lightweight metadata endpoint is cleaner.

### Database Analysis

#### No Schema Changes Required

The `entityProfiles` table already stores `profileJson` as JSONB:

```sql
profileJson: jsonb('profile_json').notNull().default({})
```

When we add `sensoryProfile` to `CharacterProfileSchema`, it will be stored within this JSONB column automatically. **No migration needed**.

#### Performance Consideration

If we later need to query by sensory attributes (e.g., "find all characters with 'woodland-spirit' template"), we could add a GIN index:

```sql
CREATE INDEX idx_entity_profiles_sensory_templates
ON entity_profiles USING gin ((profile_json->'sensoryProfile'->'templateBlend'->'templates'));
```

**Verdict**: Not needed for v1. Character lists are filtered client-side or by owner_email.

### Updated v1 UI Component Specification

Based on the analysis, here's the refined `SensoryProfileCard` specification:

```tsx
const SensoryProfileCard: React.FC = () => {
  const config = sensoryProfileConfig.value;
  const resolved = resolvedBodyMap.value;
  const profile = characterProfile.value;

  return (
    <IdentityCard
      title="Sensory Profile"
      defaultOpen={false}
      subtitle={getSubtitle(config)} // e.g., "2 templates active"
    >
      {/* Quick Start (shown only if no config yet) */}
      {!config.templateBlend?.templates.length && (
        <QuickStartSuggestions
          race={profile.race}
          occupation={profile.occupation}
          onSelect={handleQuickStart}
        />
      )}

      {/* Auto-defaults toggle */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-slate-300">Use sensory defaults</span>
        <Toggle
          checked={config.autoDefaults.enabled}
          onChange={(v) => updateSensoryProfileConfig({
            autoDefaults: { ...config.autoDefaults, enabled: v }
          })}
        />
      </div>

      {/* Template cards */}
      <div className="space-y-2 mt-4">
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          Templates
        </span>
        <TemplateCardGrid
          available={SENSORY_TEMPLATES}
          selected={config.templateBlend?.templates ?? []}
          suggestedFor={{ race: profile.race, occupation: profile.occupation }}
          onChange={handleTemplateChange}
        />
      </div>

      {/* Conflict warnings */}
      <TemplateConflictWarnings
        templates={config.templateBlend?.templates ?? []}
      />

      {/* Preview with attribution */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          Preview
        </span>
        <SensoryPreviewWithAttribution
          resolved={resolved}
          regions={['hair', 'skin', 'hands', 'breath']}
        />
      </div>

      {/* Link to BodyCard for manual overrides */}
      <div className="mt-4 text-center">
        <button
          className="text-sm text-violet-400 hover:text-violet-300"
          onClick={() => scrollToCard('body')}
        >
          Edit individual regions manually →
        </button>
      </div>
    </IdentityCard>
  );
};
```

### Summary of Changes Needed

#### Schema Package

- [x] Add `sensoryProfile` to `CharacterProfileSchema` (already in plan)
- [ ] Add `occupation` to `CharacterBasicsSchema` (already in plan)
- [ ] Add `_attribution` to resolver output (new)

#### API Package

- [ ] Add `GET /api/sensory/templates` endpoint (new, P1)

#### Web Package

- [ ] Create `SensoryProfileCard.tsx` with enhanced UX (new)
- [ ] Create `TemplateCardGrid.tsx` component (new)
- [ ] Create `SensoryPreviewWithAttribution.tsx` component (new)
- [ ] Create `QuickStartSuggestions.tsx` component (new)
- [ ] Add occupation input to Classification card (new)
- [ ] Add `scrollToCard()` utility for cross-card navigation (new)

#### Database

- No changes required (JSONB storage handles new fields)
