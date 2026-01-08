# Character Builder Vision: From Form to Living Entity

**Status**: Vision Document
**Wave**: 3.1 (Web Package Refactor)
**Created**: January 2026

---

## Executive Summary

The current character builder is a **form-centric data entry tool** designed for static character profiles. The future state reimagines character creation as **entity instantiation**—where characters become autonomous actors in a living simulation from the moment of creation.

This document maps the current implementation, identifies what to preserve vs. delete, and envisions a radically redesigned character creation experience that integrates with the World Bus architecture.

---

## 1. Current State Analysis

### 1.1 File Inventory

```text
packages/web/src/features/character-builder/
├── CharacterBuilder.tsx          # Main component (400 lines)
├── api.ts                        # API wrapper (19 lines)
├── hooks/
│   ├── index.ts
│   └── useCharacterBuilderForm.ts  # Form state management (133 lines)
├── types.ts                      # Form types & factories (572 lines)
├── transformers.ts               # Profile ↔ Form mapping (509 lines)
├── utils.ts                      # Helper functions (149 lines)
├── components/
│   ├── index.ts
│   ├── BasicsSection.tsx         # Name, age, gender, etc.
│   ├── BodyAppearanceSection.tsx # Body map UI (468 lines)
│   ├── BodyMapSelector.tsx       # Visual body picker
│   ├── DetailsSection.tsx        # Custom details list
│   ├── PersonalitySection.tsx    # Personality controls
│   ├── PreviewSidebar.tsx        # Live preview
│   ├── RadarChart.tsx            # Big Five visualization
│   ├── region-hierarchy.ts       # Region labels
│   └── personality/
│       ├── index.ts
│       ├── BigFiveSliders.tsx
│       ├── EmotionalBaselineForm.tsx
│       ├── FearsList.tsx
│       ├── SocialPatternsForm.tsx
│       ├── SpeechStyleForm.tsx
│       ├── StressBehaviorForm.tsx
│       ├── ValuesList.tsx
│       └── common.tsx            # Shared UI primitives
└── assets/                       # Static images
```

**Total**: ~2,700 lines of TypeScript/TSX

### 1.2 Current Architecture Pattern

```text
┌─────────────────────────────────────────────────────────────┐
│                    CharacterBuilder.tsx                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useCharacterBuilderForm() hook                        │ │
│  │  - FormState management                                │ │
│  │  - Field update handlers                               │ │
│  │  - Load/save via REST API                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐  ┌─────────────────┐  ┌───────────────┐   │
│  │BasicsSection│  │BodyAppearance   │  │PersonalitySection│ │
│  └─────────────┘  └─────────────────┘  └───────────────┘   │
│                            │                                 │
│                            ▼                                 │
│              ┌─────────────────────────┐                    │
│              │   transformers.ts        │                    │
│              │   FormState → Profile    │                    │
│              │   Profile → FormState    │                    │
│              └─────────────────────────┘                    │
│                            │                                 │
│                            ▼                                 │
│              ┌─────────────────────────┐                    │
│              │   REST API (CRUD)        │                    │
│              │   /characters/:id        │                    │
│              └─────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Current Capabilities

| Feature | Implementation | Quality |
|---------|---------------|---------|
| **Mode Switching** | quick/standard/advanced modes | ✅ Good |
| **Big Five Dimensions** | Slider-based 0-1 scores | ✅ Good |
| **Emotional Baseline** | Current emotion + intensity | ✅ Good |
| **Values & Fears** | Dynamic list with priorities | ✅ Good |
| **Social Patterns** | Dropdowns for 6 dimensions | ✅ Good |
| **Speech Style** | 8 dimensions (vocabulary, pace, etc.) | ✅ Good |
| **Stress Behavior** | Fight/flight/freeze/fawn | ✅ Good |
| **Body Map** | Region-based sensory data | ✅ Good |
| **Trait Conflicts** | Validation with warnings | ✅ Good |
| **Auto-generation** | Fill empty fields via generator | ✅ Good |
| **Auto-save** | Draft persistence | ✅ Good |
| **Zod Validation** | Real-time field errors | ✅ Good |

### 1.4 Current Limitations

| Issue | Impact |
|-------|--------|
| **Static output** | Character is just data, not an actor |
| **No preview of behavior** | Can't see how personality affects responses |
| **No World Bus integration** | Character doesn't exist until manually added to session |
| **Form fatigue** | ~100 fields in advanced mode is overwhelming |
| **Linear flow** | Must fill sections in order; no context-aware guidance |
| **No collaboration** | Single-user creation only |
| **No import/clone** | Can't derive from existing characters |
| **No versioning** | Edits overwrite; no history |

---

## 2. Assets to Preserve

### 2.1 Types (KEEP & RELOCATE)

The following types from `types.ts` should move to `@minimal-rpg/schemas`:

| Type | Current Location | Reason to Keep |
|------|-----------------|----------------|
| `PersonalityFormState` | types.ts:281-300 | Matches schema structure |
| `DimensionEntry` | types.ts:205-208 | Reusable for UI |
| `ValueEntry` | types.ts:213-216 | Reusable for UI |
| `FearEntry` | types.ts:221-227 | Reusable for UI |
| `EmotionalBaselineEntry` | types.ts:232-238 | Reusable for UI |
| `SocialPatternEntry` | types.ts:243-250 | Reusable for UI |
| `SpeechStyleEntry` | types.ts:255-264 | Reusable for UI |
| `StressBehaviorEntry` | types.ts:269-276 | Reusable for UI |

**Action**: Create `@minimal-rpg/schemas/src/character/form-types.ts` to house these.

### 2.2 Factory Functions (KEEP & RELOCATE)

| Function | Current Location | Purpose |
|----------|-----------------|---------|
| `createDimensionEntry()` | types.ts:356-361 | Default Big Five entry |
| `createValueEntry()` | types.ts:363-366 | Default value entry |
| `createFearEntry()` | types.ts:368-374 | Default fear entry |
| `createEmotionalBaselineEntry()` | types.ts:376-381 | Default emotional state |
| `createSocialPatternEntry()` | types.ts:383-390 | Default social patterns |
| `createSpeechStyleEntry()` | types.ts:392-400 | Default speech style |
| `createStressBehaviorEntry()` | types.ts:402-408 | Default stress behavior |
| `createPersonalityFormState()` | types.ts:410-420 | Complete defaults |

**Action**: Move to `@minimal-rpg/schemas` alongside types.

### 2.3 Transformers (KEEP & ENHANCE)

| Function | Current Location | Purpose |
|----------|-----------------|---------|
| `buildPersonalityMap()` | transformers.ts:33-161 | Form → PersonalityMap |
| `personalityMapToFormState()` | transformers.ts:261-358 | PersonalityMap → Form |
| `buildProfile()` | transformers.ts:223-256 | FormState → CharacterProfile |
| `mapProfileToForm()` | transformers.ts:360-435 | CharacterProfile → FormState |
| `filterBodyMapByGender()` | transformers.ts:179-198 | Gender-appropriate regions |
| `mergeGeneratedIntoForm()` | transformers.ts:441-508 | Smart merge for generation |
| `mapDetailEntries()` | transformers.ts:200-221 | Details mapping |

**Action**: Keep in web package but refactor to use signals instead of form state.

### 2.4 Utility Functions (KEEP)

| Function | Current Location | Purpose |
|----------|-----------------|---------|
| `clamp()` | utils.ts:18-19 | Numeric bounds |
| `getUsedAppearanceCombinations()` | utils.ts:25-33 | Appearance tracking |
| `findNextAvailableAppearanceEntry()` | utils.ts:44-67 | Smart entry creation |
| `getUsedSensoryCombinations()` | utils.ts:91-99 | Sensory tracking |
| `findNextAvailableSensoryEntry()` | utils.ts:110-130 | Smart entry creation |

**Action**: Move `clamp` to `@minimal-rpg/utils`. Keep others in character feature.

### 2.5 Components (SELECTIVE KEEP)

| Component | Lines | Verdict | Reason |
|-----------|-------|---------|--------|
| `BigFiveSliders.tsx` | 47 | KEEP | Core personality visualization |
| `RadarChart.tsx` | 108 | KEEP | Big Five radar display |
| `EmotionalBaselineForm.tsx` | 92 | REFACTOR | Needs signal binding |
| `ValuesList.tsx` | 73 | REFACTOR | Needs signal binding |
| `FearsList.tsx` | 118 | REFACTOR | Needs signal binding |
| `SocialPatternsForm.tsx` | 82 | REFACTOR | Needs signal binding |
| `SpeechStyleForm.tsx` | 120 | REFACTOR | Needs signal binding |
| `StressBehaviorForm.tsx` | 111 | REFACTOR | Needs signal binding |
| `common.tsx` (Subsection, SelectInput) | 81 | KEEP | Reusable primitives |
| `BodyAppearanceSection.tsx` | 468 | REDESIGN | Needs visual overhaul |
| `BodyMapSelector.tsx` | 55 | DELETE | Replace with 3D/2D interactive |
| `BasicsSection.tsx` | 329 | REDESIGN | Needs guided flow |
| `DetailsSection.tsx` | 150 | REFACTOR | Simplify or merge |
| `PersonalitySection.tsx` | 131 | REFACTOR | Needs signal binding |
| `PreviewSidebar.tsx` | 191 | DELETE | Replace with live behavior preview |
| `region-hierarchy.ts` | 111 | KEEP | Label mappings |

---

## 3. Assets to Delete

### 3.1 Files to Remove Entirely

| File | Reason |
|------|--------|
| `CharacterBuilder.tsx` | Replaced by new component architecture |
| `PreviewSidebar.tsx` | Static preview; replaced by live actor simulation |
| `BodyMapSelector.tsx` | Basic picker; replaced by interactive body view |
| `useCharacterBuilderForm.ts` | Form state replaced by signals |
| `api.ts` | Simple wrapper; inline to new service layer |

### 3.2 Concepts to Eliminate

| Concept | Reason |
|---------|--------|
| **Mode switching (quick/standard/advanced)** | Replace with progressive disclosure & AI guidance |
| **Tab-based navigation** | Replace with unified scrolling canvas |
| **Form state ↔ Profile transformers** | Replace with direct schema manipulation via signals |
| **Manual "Save" button** | Replace with auto-persist + explicit "Finalize" |
| **Static profile picture** | Replace with dynamic avatar generation |

---

## 4. Future State Vision

### 4.1 Core Philosophy

> **Characters are not forms. They are living entities.**

The future character builder should feel like you're **meeting someone for the first time** and gradually learning about them—not filling out a bureaucratic form.

### 4.2 New Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CharacterStudio (Main View)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Inspiration     │  │         Character Canvas               │  │
│  │  Panel           │  │  ┌──────────────────────────────────┐  │  │
│  │                  │  │  │   3D/2D Avatar + Mood Ring       │  │  │
│  │  - Templates     │  │  │   (real-time emotion display)    │  │  │
│  │  - Archetypes    │  │  └──────────────────────────────────┘  │  │
│  │  - Clone from    │  │                                        │  │
│  │  - AI Suggest    │  │  ┌──────────────────────────────────┐  │  │
│  │                  │  │  │   Personality Bloom              │  │  │
│  └──────────────────┘  │  │   (visual trait cluster)         │  │  │
│                        │  └──────────────────────────────────┘  │  │
│  ┌──────────────────┐  │                                        │  │
│  │  Conversation    │  │  ┌──────────────────────────────────┐  │  │
│  │  Sandbox         │  │  │   Identity Cards (expandable)    │  │  │
│  │                  │  │  │   - Core: name, age, background  │  │  │
│  │  "Ask them       │  │  │   - Values: what matters         │  │  │
│  │   anything"      │  │  │   - Fears: what threatens        │  │  │
│  │                  │  │  │   - Voice: how they speak        │  │  │
│  │  Live NPC Actor  │  │  │   - Body: physical description   │  │  │
│  │  responds in     │  │  └──────────────────────────────────┘  │  │
│  │  character       │  │                                        │  │
│  └──────────────────┘  └────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Context Bar: [Undo] [Redo] [Version History] [Finalize →]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Features

#### 4.3.1 Conversation-Driven Creation

Instead of filling forms, users **talk to their character** during creation:

```text
┌──────────────────────────────────────────────────────────────┐
│  Conversation Sandbox                                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  YOU: "What's your biggest fear?"                            │
│                                                               │
│  [CHARACTER]: "I... I don't like talking about this.         │
│  But if I'm honest, it's being forgotten. Fading into        │
│  irrelevance. Does that make sense?"                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💡 Detected: Fear of irrelevance                        │ │
│  │    Suggested: fears.category = 'exposure'               │ │
│  │               fears.specific = 'being forgotten'        │ │
│  │    [Accept] [Edit] [Ignore]                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Type a message...                              [Send]        │
└──────────────────────────────────────────────────────────────┘
```

The conversation spawns a **temporary NpcActor** using the current character profile. As the user chats, the system:
- Runs the actor through the perception/cognition/action loop
- Generates responses using the LLM
- Infers personality traits from the responses
- Suggests schema updates based on detected patterns

#### 4.3.2 Personality Bloom Visualization

Replace static sliders with a **living visualization**:

```text
                    ┌───────────────┐
                    │   Openness    │
                    │     0.8       │
                    └───────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Curious │     │Creative │     │ Dreamy  │
    │  0.9    │     │   0.7   │     │   0.6   │
    └─────────┘     └─────────┘     └─────────┘
         │                │                │
    [intellectual]  [artistic]      [imaginative]
```

- Nodes pulse when the character exhibits that trait in conversation
- Clicking a node expands it for direct editing
- Conflicts are shown as red edges between incompatible nodes

#### 4.3.3 Identity Cards (Progressive Disclosure)

Replace tabs with collapsible **identity cards** that expand on demand:

```text
┌──────────────────────────────────────────────────────────┐
│ ▼ Core Identity                            [✓ Complete]  │
├──────────────────────────────────────────────────────────┤
│  Name: Elena Voss                                        │
│  Age: 34                                                 │
│  Gender: Female                                          │
│  Background: Former soldier turned tavern keeper         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ▶ Values & Motivations                     [3 of 5 set]  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ▶ Fears & Triggers                                [Empty]│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ▶ Voice & Communication                          [AI ✨] │
└──────────────────────────────────────────────────────────┘
```

- Cards show completion status
- "AI ✨" badge indicates AI-generated content
- Cards can be reordered by priority

#### 4.3.4 Interactive Body Map

Replace the dropdown-based body map with an **interactive silhouette**:

```text
        ┌─────┐
        │ 🧑 │ ← Hair: Auburn, shoulder-length
        └──┬──┘
      ┌────┴────┐
      │  Torso  │ ← Click to expand sensory details
      │ (hover) │
      └────┬────┘
     ┌─────┴─────┐
     │    │    │
    👐   │   👐  ← Left/Right independent or linked
         │
    ┌────┴────┐
    │   Legs  │
    └────┬────┘
        🦶
```

- Hover reveals quick summary
- Click opens detail panel for that region
- Drag to select multiple regions
- "Link" toggle for symmetrical body parts

#### 4.3.5 Live Behavior Preview

Replace static preview with a **real-time actor simulation**:

```text
┌──────────────────────────────────────────────────────────┐
│  Behavior Preview                            [Scenario ▾] │
├──────────────────────────────────────────────────────────┤
│  Scenario: "A stranger asks for directions"              │
│                                                           │
│  STRANGER: "Excuse me, do you know the way to the        │
│  market?"                                                 │
│                                                           │
│  [ELENA]: *glances up from wiping the counter*           │
│  "Market's two streets down, take a left at the          │
│  fountain. Watch for pickpockets."                       │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Traits Activated:                                   │ │
│  │ ▪ Helpful (+warmthRate: moderate)                  │ │
│  │ ▪ Cautious (+strangerDefault: guarded)             │ │
│  │ ▪ Direct (+directness: blunt)                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [Try Another Scenario] [Edit Response Style]            │
└──────────────────────────────────────────────────────────┘
```

Scenarios include:
- Meeting a stranger
- Receiving criticism
- Being complimented
- Under stress
- With someone they trust
- With someone they fear

### 4.4 Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         CharacterStudio                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Signal Store (Preact)                       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │ │
│  │  │characterData│ │ previewActor│ │ uiState     │              │ │
│  │  │ (Profile)   │ │ (NpcActor)  │ │ (panels,etc)│              │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│           ┌───────────────┼───────────────┐                         │
│           ▼               ▼               ▼                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌───────────────┐           │
│  │IdentityCards│  │ConversationPane │  │BehaviorPreview│           │
│  │ (direct edit)│  │(temp NpcActor)  │  │(scenario sim) │           │
│  └─────────────┘  └─────────────────┘  └───────────────┘           │
│                           │                                          │
│                           ▼                                          │
│              ┌─────────────────────────┐                            │
│              │     Local World Bus     │                            │
│              │  (sandboxed session)    │                            │
│              └─────────────────────────┘                            │
│                           │                                          │
│                           ▼                                          │
│              ┌─────────────────────────┐                            │
│              │   Persist to API        │                            │
│              │   (on Finalize)         │                            │
│              └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.5 Signal Schema

```typescript
// signals/character-studio.ts
import { signal, computed } from '@preact/signals-react';
import type { CharacterProfile, NpcActorState } from '@minimal-rpg/schemas';

// Core character data (auto-persisted)
export const characterData = signal<CharacterProfile | null>(null);

// Temporary actor for conversation sandbox
export const previewActor = signal<NpcActorState | null>(null);

// UI state
export const activePanel = signal<'core' | 'values' | 'fears' | 'voice' | 'body'>('core');
export const expandedCards = signal<Set<string>>(new Set(['core']));
export const conversationHistory = signal<ConversationMessage[]>([]);

// Computed: completion percentage
export const completionScore = computed(() => {
  const profile = characterData.value;
  if (!profile) return 0;

  let score = 0;
  if (profile.name) score += 10;
  if (profile.age) score += 5;
  if (profile.summary) score += 15;
  if (profile.personalityMap?.dimensions) score += 20;
  if (profile.personalityMap?.values?.length) score += 15;
  if (profile.personalityMap?.fears?.length) score += 15;
  if (profile.personalityMap?.speech) score += 10;
  if (profile.body && Object.keys(profile.body).length > 0) score += 10;

  return score;
});

// Computed: detected traits from conversation
export const inferredTraits = computed(() => {
  // Analyze conversation history to suggest traits
  return analyzeConversationForTraits(conversationHistory.value);
});
```

### 4.6 Component Structure

```text
features/character-studio/
├── CharacterStudio.tsx              # Main container
├── signals.ts                       # Signal definitions
├── components/
│   ├── Avatar/
│   │   ├── AvatarCanvas.tsx         # 2D/3D avatar display
│   │   ├── MoodRing.tsx             # Emotional state indicator
│   │   └── AvatarCustomizer.tsx     # Visual customization
│   ├── IdentityCards/
│   │   ├── CardContainer.tsx        # Collapsible card wrapper
│   │   ├── CoreIdentityCard.tsx     # Name, age, background
│   │   ├── ValuesCard.tsx           # Motivations & values
│   │   ├── FearsCard.tsx            # Fears & triggers
│   │   ├── VoiceCard.tsx            # Speech style
│   │   └── BodyCard.tsx             # Physical description
│   ├── ConversationSandbox/
│   │   ├── Sandbox.tsx              # Chat interface
│   │   ├── MessageBubble.tsx        # Message display
│   │   ├── TraitSuggestion.tsx      # Inferred trait popup
│   │   └── hooks/useSandboxActor.ts # Temp actor management
│   ├── PersonalityBloom/
│   │   ├── BloomVisualization.tsx   # Force-directed graph
│   │   ├── TraitNode.tsx            # Individual trait node
│   │   └── ConflictEdge.tsx         # Conflict visualization
│   ├── BehaviorPreview/
│   │   ├── Preview.tsx              # Scenario runner
│   │   ├── ScenarioSelector.tsx     # Scenario picker
│   │   └── TraitActivation.tsx      # Active traits display
│   ├── InspirationPanel/
│   │   ├── Panel.tsx                # Templates & suggestions
│   │   ├── ArchetypeCard.tsx        # Predefined archetypes
│   │   └── CloneFromCard.tsx        # Clone existing character
│   └── ContextBar/
│       ├── Bar.tsx                  # Bottom action bar
│       ├── UndoRedo.tsx             # History controls
│       └── FinalizeButton.tsx       # Commit to database
├── services/
│   ├── sandbox-bus.ts               # Local World Bus for preview
│   ├── trait-inference.ts           # Conversation → trait detection
│   └── persistence.ts               # API integration
├── hooks/
│   ├── useCharacterData.ts          # Signal-based data management
│   ├── useSandboxActor.ts           # Preview actor lifecycle
│   └── useTraitInference.ts         # Real-time inference
└── types.ts                         # Local types (minimal)
```

---

## 5. Migration Strategy

### Phase 1: Foundation (Week 1)

| Task | Description |
|------|-------------|
| Create `character-studio/` directory | New feature folder |
| Move reusable types to schemas | FormState types → @minimal-rpg/schemas |
| Create signal store | `signals.ts` with core signals |
| Create skeleton components | Empty component files with exports |

### Phase 2: Core Experience (Weeks 2-3)

| Task | Description |
|------|-------------|
| Implement `IdentityCards` | Progressive disclosure UI |
| Migrate `BigFiveSliders` | Convert to signal-driven |
| Migrate personality forms | Convert all personality components |
| Implement auto-persist | Signal → API sync |

### Phase 3: Interactive Features (Weeks 4-5)

| Task | Description |
|------|-------------|
| Implement `ConversationSandbox` | Temp actor + chat UI |
| Implement trait inference | Conversation → traits |
| Implement `BehaviorPreview` | Scenario simulation |
| Implement `PersonalityBloom` | Force-directed visualization |

### Phase 4: Polish & Delete Legacy (Week 6)

| Task | Description |
|------|-------------|
| Delete `character-builder/` | Remove entire legacy folder |
| Update routes | Point to CharacterStudio |
| Integration testing | Full flow validation |
| Documentation | Update dev-docs |

---

## 6. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to create character | ~15 min | ~5 min |
| Fields manually edited | ~40 | ~10 |
| User drop-off rate | Unknown | < 20% |
| Characters with AI-generated content | 0% | > 50% |
| Characters tested via conversation | 0% | > 80% |

---

## 7. Open Questions

1. **Avatar system**: Use existing avatar libraries (Ready Player Me) or build custom?
2. **Trait inference accuracy**: How much LLM processing is acceptable per conversation turn?
3. **Template library**: Should we ship with archetypes (Hero, Villain, Mentor, etc.)?
4. **Multiplayer creation**: Should multiple users be able to co-create a character?
5. **Import formats**: Support importing from D&D Beyond, Pathbuilder, etc.?

---

## 8. Appendix: Full Type Inventory

### Types to KEEP (relocate to @minimal-rpg/schemas)

```typescript
// From types.ts - move to schemas/character/form-types.ts

export interface DimensionEntry {
  dimension: PersonalityDimension;
  score: number;
}

export interface ValueEntry {
  value: CoreValue;
  priority: number;
}

export interface FearEntry {
  category: FearCategory;
  specific: string;
  intensity: number;
  triggers: string;
  copingMechanism: CopingMechanism;
}

export interface EmotionalBaselineEntry {
  current: CoreEmotion;
  intensity: EmotionIntensity;
  blend?: CoreEmotion;
  moodBaseline: CoreEmotion;
  moodStability: number;
}

export interface SocialPatternEntry {
  strangerDefault: StrangerDefault;
  warmthRate: WarmthRate;
  preferredRole: SocialRole;
  conflictStyle: ConflictStyle;
  criticismResponse: CriticismResponse;
  boundaries: BoundaryType;
}

export interface SpeechStyleEntry {
  vocabulary: VocabularyLevel;
  sentenceStructure: SentenceStructure;
  formality: FormalityLevel;
  humor: HumorFrequency;
  humorType?: HumorType;
  expressiveness: ExpressivenessLevel;
  directness: DirectnessLevel;
  pace: PaceLevel;
}

export interface StressBehaviorEntry {
  primary: StressResponse;
  secondary?: StressResponse;
  threshold: number;
  recoveryRate: RecoveryRate;
  soothingActivities: string;
  stressIndicators: string;
}

export interface PersonalityFormState {
  traits: string;
  dimensions: DimensionEntry[];
  emotionalBaseline: EmotionalBaselineEntry;
  values: ValueEntry[];
  fears: FearEntry[];
  attachment: AttachmentStyle;
  social: SocialPatternEntry;
  speech: SpeechStyleEntry;
  stress: StressBehaviorEntry;
}
```

### Types to DELETE

```typescript
// From types.ts - legacy form state, replaced by signals

export interface ModeConfig { ... }           // DELETE: No more modes
export const MODE_CONFIGS = { ... }           // DELETE: No more modes
export interface DetailFormEntry { ... }      // KEEP but simplify
export interface BodySensoryEntry { ... }     // DELETE: Use BodyMap directly
export interface AppearanceEntry { ... }      // DELETE: Use BodyMap directly
export interface FormState { ... }            // DELETE: Use CharacterProfile directly
export type FormKey = keyof FormState;        // DELETE: With FormState
export type FormFieldErrors = ...;            // DELETE: Use Zod inline
export type UpdateFieldFn = ...;              // DELETE: Use signals
```

---

## 9. References

- [WAVE-3-web-package.md](../plan/WAVE-3-web-package.md) - Parent refactor plan
- [world-bus-vs-governor.md](./world-bus-vs-governor.md) - Architecture comparison
- [@minimal-rpg/actors](../../packages/actors/README.md) - NPC actor implementation
- [@minimal-rpg/schemas/character/personality.ts](../../packages/schemas/src/character/personality.ts) - Personality schema
