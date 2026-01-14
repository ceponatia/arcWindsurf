# Character Studio 1.0 Frontend Plan

**Status**: Accepted
**Created**: January 12, 2026
**Prerequisite**: 001-world-bus-backend (Complete)
**Vision**: VISION-character-studio-1.0.md

---

## Overview

This plan details the frontend work required to complete Character Studio 1.0. The backend LLM integration is done; this phase focuses on connecting existing UI components to the signal-based state management and implementing missing UI pieces.

---

## Phase 0: Verification & Fixes (3h)

### 0.1 Test Current State

| Work Item | Description | Est. |
|-----------|-------------|------|
| Test save/load flow | Verify character creation persists to DB and loads correctly | 30m |
| Test conversation | Verify LLM responses stream correctly in UI | 30m |
| Identify blockers | Document any API or persistence issues found | 1h |

### 0.2 Fix Known Issues

| Work Item | Description | Est. |
|-----------|-------------|------|
| Required field handling | Ensure `backstory` and `personality` fields have valid defaults | 30m |
| Signal initialization | Verify `characterProfile` signal populates on load | 30m |

---

## Phase 1: Wire Personality Components to Signals (8h)

The personality form components exist in `packages/web/src/features/character-studio/components/personality/` but are not connected to the signal-based state.

### 1.1 Create Card Wrapper

Create a reusable collapsible card component for consistent UI:

**Location**: `packages/web/src/features/character-studio/components/IdentityCard.tsx`

Features:

- Collapsible with smooth animation
- Completion indicator (optional)
- Consistent styling

### 1.2 Wire Each Personality Component

Each component needs to:

1. Read from `characterProfile.value.personalityMap`
2. Write via `updatePersonalityMap()` action
3. Use `useSignals()` for reactivity

| Component | Signal Path | Est. |
|-----------|-------------|------|
| BigFiveSliders | `personalityMap.dimensions` | 30m |
| EmotionalBaselineForm | `personalityMap.emotionalBaseline` | 30m |
| ValuesList | `personalityMap.values` | 30m |
| FearsList | `personalityMap.fears` | 30m |
| SocialPatternsForm | `personalityMap.social` | 30m |
| SpeechStyleForm | `personalityMap.speech` | 30m |
| StressBehaviorForm | `personalityMap.stress` | 30m |

### 1.3 Integrate into IdentityPanel

Update `IdentityPanel.tsx` to render personality cards:

| Work Item | Est. |
|-----------|------|
| Add Backstory card | 30m |
| Add Classification card (race/alignment/tier) | 1h |
| Add Personality Dimensions card | 15m |
| Add Emotional Baseline card | 15m |
| Add Values & Fears cards | 30m |
| Add Social Patterns card | 15m |
| Add Voice & Communication card | 15m |
| Add Stress Response card | 15m |

---

## Phase 2: Trait Application (2.5h)

Connect the trait inference responses to actual profile updates.

### 2.1 Create Trait Applicator Utility

**Location**: `packages/web/src/features/character-studio/utils/trait-applicator.ts`

```typescript
export function applyTrait(trait: InferredTrait): void
```

Handles:

- Nested path parsing (e.g., `personalityMap.dimensions.openness`)
- Array field appending (values, fears)
- Type coercion where needed

### 2.2 Update acceptTrait Action

Modify the signal action to call `applyTrait()`:

**Location**: `packages/web/src/features/character-studio/signals.ts`

| Work Item | Est. |
|-----------|------|
| Create trait-applicator.ts | 1h |
| Update acceptTrait in signals.ts | 15m |
| Test trait acceptance flow | 30m |
| Handle edge cases (arrays, nested) | 30m |

---

## Phase 3: Body & Appearance (4h)

For 1.0, use simplified form-based approach (not interactive body map).

### 3.1 Create BodyCard Component

**Location**: `packages/web/src/features/character-studio/components/BodyCard.tsx`

Simplified regions: hair, face, torso, hands

Each region has:

- Visual description (text)
- Optional scent/texture/flavor (expandable)

### 3.2 Create AppearanceCard Component

**Location**: `packages/web/src/features/character-studio/components/AppearanceCard.tsx`

Fields for physique:

- Height (text or select)
- Build (select)
- Notable features (text)

| Work Item | Est. |
|-----------|------|
| Create BodyCard | 2h |
| Create AppearanceCard | 1h |
| Integrate into IdentityPanel | 30m |
| Wire to profile signals | 30m |

---

## Phase 4: Validation & Polish (6h)

### 4.1 Form Validation

| Work Item | Est. |
|-----------|------|
| Add required field indicators | 1h |
| Validate before save (name, backstory) | 30m |
| Display validation errors | 30m |

### 4.2 UX Polish

| Work Item | Est. |
|-----------|------|
| Loading states for conversation | 30m |
| Error handling UI for API failures | 30m |
| Card collapse/expand animation | 30m |
| Completion indicators per card | 1h |

### 4.3 End-to-End Testing

| Work Item | Est. |
|-----------|------|
| Create new character flow | 30m |
| Edit existing character flow | 30m |
| Conversation with trait suggestions | 30m |
| Save and reload verification | 30m |

---

## Summary

| Phase | Description | Est. Hours |
|-------|-------------|------------|
| 0 | Verification & Fixes | 3h |
| 1 | Wire Personality Components | 8h |
| 2 | Trait Application | 2.5h |
| 3 | Body & Appearance | 4h |
| 4 | Validation & Polish | 6h |
| **Total** | | **23.5h** |

---

## Files to Create

| File | Purpose |
|------|---------|
| `components/IdentityCard.tsx` | Reusable collapsible card wrapper |
| `components/BodyCard.tsx` | Body region editing |
| `components/AppearanceCard.tsx` | Physique editing |
| `utils/trait-applicator.ts` | Apply inferred traits to profile |

## Files to Modify

| File | Changes |
|------|---------|
| `IdentityPanel.tsx` | Add all identity cards |
| `signals.ts` | Update acceptTrait to apply traits |
| `personality/*.tsx` | Wire each component to signals |

---

## Success Criteria

- [ ] All CharacterProfile fields editable in UI
- [ ] Personality components read/write to signals
- [ ] Trait suggestions appear based on conversation
- [ ] Accepted traits update the character profile
- [ ] Characters save to database correctly
- [ ] Characters load from database correctly
- [ ] Form validation prevents invalid saves
- [ ] No TypeScript errors
- [ ] No console errors in normal usage

---

## Dependencies

### Technical

- `@preact/signals-react` for reactivity
- Existing component library (Lucide icons, TailwindCSS)
- Backend endpoints (verified complete)

### Environment

- API server running
- LLM API key configured (OpenRouter/Ollama/Anthropic)
- Database connection

---

## Risks

| Risk | Mitigation |
|------|------------|
| Component count makes IdentityPanel unwieldy | Progressive disclosure via collapsed cards |
| Signal updates cause excessive re-renders | Use computed signals where appropriate |
| Trait applicator path parsing edge cases | Comprehensive test coverage |
| Form validation UX disrupts flow | Non-blocking validation, save anyway with warnings |
