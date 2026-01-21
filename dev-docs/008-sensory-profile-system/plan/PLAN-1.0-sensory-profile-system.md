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

### High-Level UX

Add a new card: "Sensory Profile".

- Mode: Simple
  - Auto-defaults only
  - Preview resolved body map
  - Minimal controls (tone slider, intensity preference)
- Mode: Template Mixer
  - Select templates and weights
  - Preview changes live
- Mode: Expert
  - Region editor that writes to overrides (`CharacterProfile.body`)
  - Optionally import/export text using the existing body parser/formatter

Keep the existing `BodyCard` intact initially to avoid a disruptive UI change.

### Signals and Computed Values

Add derived signals in Character Studio:

- `sensoryProfileConfig` (reads/writes `characterProfile.value.sensoryProfile`)
- `resolvedBodyMap` (computed)

Computation should be triggered by changes to:

- age, gender, race, physique, occupation
- sensory profile config
- body overrides

### Performance

- Use an indexed rule engine: `rulesByKey['age']`, `rulesByKey['race']`, etc.
- Use structural sharing: only clone region objects that change.
- Keep computations synchronous and fast; consider debouncing only for slider-like inputs.

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

## Open Questions

1. Should `CharacterProfile.body` become "overrides only" explicitly, or should we allow persisted resolved values?
2. Do we want a "lock region" feature in v1 (prevent defaults from changing a user-edited region)?
3. Should alignment affect sensory output directly, or should we route it through explicit cultural/ritual tags?
