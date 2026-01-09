# Character Studio 1.0 Implementation Plan

**Status**: Draft
**Wave**: 3.1
**Created**: January 2026
**Vision**: VIS-3.1-character-studio-1.0-gap-analysis.md

---

## Overview

This plan details the work required to bring Character Studio from its current ~15% implementation to 1.0 release quality. The focus is on connecting existing components, implementing missing UI, and integrating LLM-powered conversation.

---

## Phase 0: Verification & Fixes (Day 1)

### 0.1 Verify Save/Load Flow

| Task | Files | Est. |
|------|-------|------|
| Test character creation and save | Manual testing | 30m |
| Test loading existing character | Manual testing | 30m |
| Fix any API/persistence issues found | `services/api.ts`, API routes | 1-2h |

### 0.2 Fix Known Issues

| Task | Files | Est. |
|------|-------|------|
| Ensure `backstory` is populated (required field) | IdentityPanel.tsx | 30m |
| Handle missing `personality` field (required) | signals.ts, transformers | 30m |

---

## Phase 1: Connect Existing Components (Days 1-2)

### 1.1 Expand IdentityPanel with Cards

**File**: `packages/web/src/features/character-studio/components/IdentityPanel.tsx`

Add collapsible cards for each category. Components already exist in `personality/` directory.

| Card | Component(s) to Include | Priority |
|------|------------------------|----------|
| Backstory | Textarea for `backstory` | P0 |
| Classification | Race, Alignment, Tier selects | P1 |
| Personality Dimensions | BigFiveSliders.tsx | P0 |
| Emotional Baseline | EmotionalBaselineForm.tsx | P0 |
| Values & Motivations | ValuesList.tsx | P0 |
| Fears & Triggers | FearsList.tsx | P0 |
| Social Patterns | SocialPatternsForm.tsx | P0 |
| Voice & Communication | SpeechStyleForm.tsx | P0 |
| Stress Response | StressBehaviorForm.tsx | P0 |

### 1.2 Wire Components to Signals

Each personality component needs to:

1. Read from `characterProfile.value.personalityMap`
2. Write via `updatePersonalityMap()` action

**Pattern** (apply to each component):

```typescript
// Example for BigFiveSliders
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updatePersonalityMap } from '../../signals.js';

export const BigFiveSliders: React.FC = () => {
  useSignals();
  const dimensions = characterProfile.value.personalityMap?.dimensions ?? {};

  const handleChange = (dimension: string, value: number) => {
    updatePersonalityMap({
      dimensions: { ...dimensions, [dimension]: value }
    });
  };

  // ... render sliders
};
```

### 1.3 Task List

| Task | File | Est. |
|------|------|------|
| Create card wrapper component | `components/IdentityCard.tsx` | 30m |
| Add Backstory card to IdentityPanel | `IdentityPanel.tsx` | 30m |
| Add Classification card (race/alignment/tier) | `IdentityPanel.tsx` | 1h |
| Wire BigFiveSliders to signals | `personality/BigFiveSliders.tsx` | 30m |
| Add Personality Dimensions card | `IdentityPanel.tsx` | 15m |
| Wire EmotionalBaselineForm to signals | `personality/EmotionalBaselineForm.tsx` | 30m |
| Add Emotional Baseline card | `IdentityPanel.tsx` | 15m |
| Wire ValuesList to signals | `personality/ValuesList.tsx` | 30m |
| Add Values card | `IdentityPanel.tsx` | 15m |
| Wire FearsList to signals | `personality/FearsList.tsx` | 30m |
| Add Fears card | `IdentityPanel.tsx` | 15m |
| Wire SocialPatternsForm to signals | `personality/SocialPatternsForm.tsx` | 30m |
| Add Social Patterns card | `IdentityPanel.tsx` | 15m |
| Wire SpeechStyleForm to signals | `personality/SpeechStyleForm.tsx` | 30m |
| Add Voice card | `IdentityPanel.tsx` | 15m |
| Wire StressBehaviorForm to signals | `personality/StressBehaviorForm.tsx` | 30m |
| Add Stress Response card | `IdentityPanel.tsx` | 15m |

**Total Phase 1**: ~8 hours

---

## Phase 2: LLM Integration (Days 2-3)

### 2.1 API: Character Response Generation

**File**: `packages/api/src/routes/studio.ts`

```typescript
app.post('/studio/generate', async (c) => {
  const body = GenerateRequestSchema.parse(await c.req.json());
  const { profile, history, userMessage } = body;

  // Build system prompt from character profile
  const systemPrompt = buildCharacterSystemPrompt(profile);

  // Format conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  // Call LLM
  const response = await llmProvider.chat(messages);

  return c.json({ content: response.content });
});
```

### 2.2 API: Trait Inference

**File**: `packages/api/src/routes/studio.ts`

```typescript
app.post('/studio/infer-traits', async (c) => {
  const body = InferTraitsRequestSchema.parse(await c.req.json());

  // Build inference prompt
  const inferencePrompt = buildTraitInferencePrompt(
    body.userMessage,
    body.characterResponse,
    body.currentProfile
  );

  // Call LLM with structured output
  const response = await llmProvider.chat([
    { role: 'system', content: TRAIT_INFERENCE_SYSTEM_PROMPT },
    { role: 'user', content: inferencePrompt },
  ]);

  // Parse structured response
  const traits = parseTraitInferenceResponse(response.content);

  return c.json({ traits });
});
```

### 2.3 System Prompts

**New File**: `packages/api/src/routes/studio/prompts.ts`

```typescript
export function buildCharacterSystemPrompt(profile: Partial<CharacterProfile>): string {
  const lines: string[] = [
    `You are ${profile.name ?? 'an unnamed character'}.`,
  ];

  if (profile.age) lines.push(`You are ${profile.age} years old.`);
  if (profile.summary) lines.push(profile.summary);
  if (profile.backstory) lines.push(`Background: ${profile.backstory}`);

  // Add personality traits
  if (profile.personalityMap?.dimensions) {
    lines.push(buildPersonalityPrompt(profile.personalityMap));
  }

  lines.push('');
  lines.push('Respond in character. Stay consistent with your personality.');
  lines.push('Reveal aspects of yourself naturally through conversation.');

  return lines.join('\n');
}

export const TRAIT_INFERENCE_SYSTEM_PROMPT = `
You analyze conversations to infer personality traits.
Given a user question and character response, identify any personality traits revealed.

Return JSON array of traits:
[
  {
    "path": "personalityMap.social.strangerDefault",
    "value": "guarded",
    "confidence": 0.8,
    "source": "Quote that reveals this trait"
  }
]

Only include traits with confidence > 0.5.
Valid paths include:
- personalityMap.dimensions.openness (0-1)
- personalityMap.dimensions.conscientiousness (0-1)
- personalityMap.dimensions.extraversion (0-1)
- personalityMap.dimensions.agreeableness (0-1)
- personalityMap.dimensions.neuroticism (0-1)
- personalityMap.social.strangerDefault (welcoming|neutral|guarded|hostile)
- personalityMap.social.conflictStyle (confrontational|diplomatic|avoidant|passive-aggressive|collaborative)
- personalityMap.values (array of {value, priority})
- personalityMap.fears (array of {category, specific, intensity})
- personalityMap.speech.vocabulary (simple|average|educated|erudite|archaic)
- personalityMap.speech.directness (blunt|direct|tactful|indirect|evasive)
- personalityMap.stress.primary (fight|flight|freeze|fawn)
`;
```

### 2.4 Task List

| Task | File | Est. |
|------|------|------|
| Create LLM provider abstraction | `packages/api/src/llm/provider.ts` | 2h |
| Create prompt builder functions | `packages/api/src/routes/studio/prompts.ts` | 2h |
| Implement `/studio/generate` with LLM | `packages/api/src/routes/studio.ts` | 1h |
| Implement `/studio/infer-traits` with LLM | `packages/api/src/routes/studio.ts` | 2h |
| Test conversation flow end-to-end | Manual | 1h |

**Total Phase 2**: ~8 hours

---

## Phase 3: Trait Application (Day 3)

### 3.1 Trait Applicator Utility

**New File**: `packages/web/src/features/character-studio/utils/trait-applicator.ts`

```typescript
import { characterProfile, updatePersonalityMap, updateProfile } from '../signals.js';
import type { InferredTrait } from '../signals.js';
import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';

export function applyTrait(trait: InferredTrait): void {
  const path = trait.path.split('.');
  const value = trait.value;

  if (path[0] === 'personalityMap') {
    applyPersonalityTrait(path.slice(1), value);
  } else {
    // Top-level profile field
    updateProfile(path[0] as keyof CharacterProfile, value as never);
  }
}

function applyPersonalityTrait(path: string[], value: unknown): void {
  const current = characterProfile.value.personalityMap ?? {};

  if (path.length === 1) {
    // Direct field: personalityMap.attachment
    updatePersonalityMap({ [path[0]]: value });
  } else if (path.length === 2) {
    // Nested field: personalityMap.dimensions.openness
    const [section, field] = path;
    const sectionData = (current as Record<string, unknown>)[section] ?? {};
    updatePersonalityMap({
      [section]: { ...sectionData, [field]: value },
    });
  } else if (path[0] === 'values' || path[0] === 'fears') {
    // Array field: add to existing array
    const existing = (current as Record<string, unknown[]>)[path[0]] ?? [];
    updatePersonalityMap({
      [path[0]]: [...existing, value],
    });
  }
}
```

### 3.2 Update acceptTrait Action

**File**: `packages/web/src/features/character-studio/signals.ts`

```typescript
import { applyTrait } from './utils/trait-applicator.js';

export function acceptTrait(traitPath: string): void {
  const trait = pendingTraits.value.find(t => t.path === traitPath);
  if (!trait) return;

  // Apply to profile
  applyTrait(trait);

  // Mark as accepted
  pendingTraits.value = pendingTraits.value.map(t =>
    t.path === traitPath ? { ...t, status: 'accepted' } : t
  );
}
```

### 3.3 Task List

| Task | File | Est. |
|------|------|------|
| Create trait-applicator.ts | `utils/trait-applicator.ts` | 1h |
| Update acceptTrait to call applyTrait | `signals.ts` | 15m |
| Test trait acceptance flow | Manual | 30m |
| Handle array traits (values, fears) | `trait-applicator.ts` | 30m |

**Total Phase 3**: ~2.5 hours

---

## Phase 4: Body & Appearance (Day 4)

### 4.1 Simplified Body Card

For 1.0, use a form-based approach rather than interactive body map:

**New File**: `packages/web/src/features/character-studio/components/BodyCard.tsx`

```typescript
// Simplified body regions for 1.0
const QUICK_REGIONS = ['hair', 'face', 'torso', 'hands'] as const;

export const BodyCard: React.FC = () => {
  // Form fields for each region's visual description
  // Scent/texture/flavor as optional expandable sections
};
```

### 4.2 Appearance Card

**New File**: `packages/web/src/features/character-studio/components/AppearanceCard.tsx`

```typescript
// Simple textarea for physique description
// Or structured Physique form with height, build, etc.
```

### 4.3 Task List

| Task | File | Est. |
|------|------|------|
| Create simplified BodyCard | `components/BodyCard.tsx` | 2h |
| Create AppearanceCard | `components/AppearanceCard.tsx` | 1h |
| Add cards to IdentityPanel | `IdentityPanel.tsx` | 30m |
| Wire to profile.body and profile.physique | signals integration | 30m |

**Total Phase 4**: ~4 hours

---

## Phase 5: Validation & Polish (Day 5)

### 5.1 Form Validation

| Task | File | Est. |
|------|------|------|
| Add required field indicators | All card components | 1h |
| Validate before save (name, backstory required) | `useCharacterStudio.ts` | 30m |
| Display validation errors | `StudioHeader.tsx` or new component | 30m |

### 5.2 UX Polish

| Task | File | Est. |
|------|------|------|
| Add loading states for conversation | `ConversationPane.tsx` | 30m |
| Add error handling for API failures | `useConversation.ts` | 30m |
| Improve card collapse/expand animation | `IdentityCard.tsx` | 30m |
| Add completion indicators per card | `IdentityPanel.tsx` | 1h |

### 5.3 Testing

| Task | Est. |
|------|------|
| Create new character end-to-end | 30m |
| Edit existing character end-to-end | 30m |
| Conversation generates real responses | 30m |
| Trait suggestions appear and can be accepted | 30m |
| Save and reload character | 30m |
| Verify all fields persist correctly | 30m |

**Total Phase 5**: ~6 hours

---

## Summary

| Phase | Description | Est. Hours |
|-------|-------------|------------|
| 0 | Verification & Fixes | 3h |
| 1 | Connect Existing Components | 8h |
| 2 | LLM Integration | 8h |
| 3 | Trait Application | 2.5h |
| 4 | Body & Appearance | 4h |
| 5 | Validation & Polish | 6h |
| **Total** | | **31.5h** |

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `components/IdentityCard.tsx` | Reusable collapsible card wrapper |
| `components/BackstoryCard.tsx` | Backstory editing (or inline in IdentityPanel) |
| `components/ClassificationCard.tsx` | Race, alignment, tier |
| `components/BodyCard.tsx` | Body region editing |
| `components/AppearanceCard.tsx` | Physique editing |
| `utils/trait-applicator.ts` | Apply inferred traits to profile |
| `packages/api/src/routes/studio/prompts.ts` | System prompts for LLM |
| `packages/api/src/llm/provider.ts` | LLM provider abstraction |

### Modified Files

| File | Changes |
|------|---------|
| `IdentityPanel.tsx` | Add all identity cards |
| `signals.ts` | Update acceptTrait to apply traits |
| `personality/*.tsx` | Wire each to signals |
| `packages/api/src/routes/studio.ts` | Implement LLM calls |

---

## Dependencies

### Required for LLM Integration

- LLM API key (OpenAI, Anthropic, or local)
- Environment variable configuration
- Rate limiting consideration

### Optional Enhancements

- Streaming responses (improves UX but not required for 1.0)
- Response caching (performance optimization)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM latency affects UX | Add loading indicators, consider caching |
| Trait inference inaccurate | Use confidence threshold, allow manual override |
| Large personality form overwhelming | Progressive disclosure via collapsible cards |
| API rate limits | Implement debouncing, show warnings |

---

## Success Criteria

- [ ] All CharacterProfile fields editable in UI
- [ ] Conversation generates contextual character responses
- [ ] Trait suggestions appear based on conversation
- [ ] Accepted traits update the character profile
- [ ] Characters save to database correctly
- [ ] Characters load from database correctly
- [ ] No TypeScript errors
- [ ] No console errors in normal usage
- [ ] Completion percentage updates accurately
