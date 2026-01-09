# Character Studio 1.0: Gap Analysis & Vision

**Status**: Vision Document
**Wave**: 3.1 (Web Package Refactor)
**Created**: January 2026
**Parent**: VIS-3.1-character-builder-refactor.md

---

## Executive Summary

After implementing the initial Character Studio scaffold and fixing lint/type errors, **testing reveals the UI is severely incomplete**. The current implementation shows only a "Core Identity" card with 4 fields (Name, Age, Gender, Summary), representing approximately **10% of the CharacterProfile schema** and **0% of the conversation-driven trait inference** that defines the 1.0 vision.

This document identifies the gap between current state and 1.0 requirements, then provides a prioritized roadmap to reach feature completeness.

---

## 1. Current State Inventory

### 1.1 What Is Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| **CharacterStudio.tsx** | ✅ Shell | Main container with 2-column layout |
| **StudioHeader.tsx** | ✅ Complete | Name, completion %, save/cancel buttons |
| **ConversationPane.tsx** | ✅ UI Only | Chat interface renders, but API returns placeholders |
| **ConversationPrompts.tsx** | ✅ Complete | 8 starter prompts displayed |
| **MessageBubble.tsx** | ✅ Complete | User/character message styling |
| **IdentityPanel.tsx** | ⚠️ Minimal | Only Core Identity card (4 fields) |
| **TraitSuggestions.tsx** | ✅ UI Only | Component exists but never receives data |
| **signals.ts** | ✅ Complete | All signals defined |
| **useCharacterStudio.ts** | ✅ Complete | Load/save/reset logic |
| **useConversation.ts** | ✅ Complete | Send message, call API |
| **services/llm.ts** | ✅ Client | API calls implemented |
| **services/api.ts** | ✅ Client | Load/persist character |
| **services/trait-inference.ts** | ✅ Fallback | Client-side keyword matching |

### 1.2 Personality Components (Exist But Disconnected)

These components exist in `components/personality/` but are **not rendered** in IdentityPanel:

| Component | Lines | Status |
|-----------|-------|--------|
| BigFiveSliders.tsx | 47 | ❌ Not connected |
| EmotionalBaselineForm.tsx | 92 | ❌ Not connected |
| FearsList.tsx | 118 | ❌ Not connected |
| SocialPatternsForm.tsx | 82 | ❌ Not connected |
| SpeechStyleForm.tsx | 120 | ❌ Not connected |
| StressBehaviorForm.tsx | 111 | ❌ Not connected |
| ValuesList.tsx | 73 | ❌ Not connected |

### 1.3 API Backend Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /studio/generate` | ⚠️ Placeholder | Returns `[Character response to: "..."]` |
| `POST /studio/infer-traits` | ⚠️ Placeholder | Returns `{ traits: [] }` |

Both endpoints have `TODO` comments indicating LLM integration is pending.

---

## 2. CharacterProfile Schema Coverage

The `CharacterProfileSchema` defines the complete character data structure. Here's what the UI covers:

### 2.1 Core Identity (CharacterBasicsSchema)

| Field | Schema | UI Status |
|-------|--------|-----------|
| `id` | string (uuid) | ✅ Auto-generated |
| `name` | string | ✅ Input field |
| `age` | number | ✅ Input field |
| `gender` | enum | ✅ Select field |
| `summary` | string | ✅ Textarea |
| `backstory` | string (required) | ❌ **Missing** |
| `tags` | string[] | ❌ Not editable |
| `alignment` | enum (7 options) | ❌ **Missing** |
| `race` | enum (9 options) | ❌ **Missing** |
| `tier` | NpcTier | ❌ **Missing** |

### 2.2 Personality (PersonalityMapSchema)

| Field | Schema | UI Status |
|-------|--------|-----------|
| `dimensions` | Big Five (5 scores) | ❌ Component exists, not connected |
| `facets` | Record<string, number> | ❌ **Missing** |
| `traits` | string[] (max 12) | ❌ **Missing** |
| `emotionalBaseline` | EmotionalState | ❌ Component exists, not connected |
| `values` | Value[] (max 5) | ❌ Component exists, not connected |
| `fears` | Fear[] (max 4) | ❌ Component exists, not connected |
| `attachment` | AttachmentStyle | ❌ **Missing** |
| `social` | SocialPattern | ❌ Component exists, not connected |
| `speech` | SpeechStyle | ❌ Component exists, not connected |
| `stress` | StressBehavior | ❌ Component exists, not connected |

### 2.3 Appearance & Body

| Field | Schema | UI Status |
|-------|--------|-----------|
| `personality` | string or string[] | ❌ **Missing** (simple version) |
| `physique` | string or Physique | ❌ **Missing** |
| `profilePic` | URL | ❌ **Missing** |
| `emotePic` | URL | ❌ Not user-editable (by design) |
| `body` | BodyMap (14 regions) | ❌ **Missing** |
| `hygiene` | NpcHygieneState | ❌ Not user-editable (by design) |
| `details` | CharacterDetail[] | ❌ **Missing** |

### 2.4 Coverage Summary

| Category | Fields | Implemented | Coverage |
|----------|--------|-------------|----------|
| Core Identity | 10 | 4 | **40%** |
| Personality | 10 | 0 | **0%** |
| Appearance/Body | 6 | 0 | **0%** |
| **Total** | **26** | **4** | **15%** |

---

## 3. Conversation-Driven Creation Status

The core differentiating feature of Character Studio is **conversation-driven trait inference**. Current status:

### 3.1 Conversation Flow

| Step | Status |
|------|--------|
| User types message | ✅ Works |
| Message sent to API | ✅ Works |
| API generates character response | ❌ Placeholder only |
| Response displayed in chat | ✅ Works |
| Traits inferred from exchange | ❌ Returns empty array |
| Trait suggestions displayed | ❌ Never receives data |
| User accepts/rejects traits | ✅ UI works (no data) |
| Accepted traits applied to profile | ❌ TODO in code |

### 3.2 What's Needed

1. **LLM Integration** in API:
   - `/studio/generate` needs to call LLM with character profile context
   - `/studio/infer-traits` needs to analyze conversation and return structured traits

2. **Trait Application Logic**:
   - `acceptTrait()` function has `// TODO: Apply trait to characterProfile`
   - Need mapping from trait paths to profile updates

---

## 4. Gap Analysis: 1.0 Requirements

Based on VIS-3.1-character-builder-refactor.md and wave-3.1-conversation-driven-creation.md:

### 4.1 Must-Have for 1.0

| Requirement | Status | Priority |
|-------------|--------|----------|
| All identity cards rendered | ❌ 1 of 8 | **P0** |
| Personality components connected | ❌ 0 of 7 | **P0** |
| Backstory field | ❌ Missing | **P0** |
| LLM-powered conversation | ❌ Placeholder | **P0** |
| Trait inference from chat | ❌ Placeholder | **P0** |
| Trait acceptance updates profile | ❌ TODO | **P0** |
| Save character to database | ⚠️ Untested | **P0** |
| Load existing character | ⚠️ Untested | **P0** |

### 4.2 Should-Have for 1.0

| Requirement | Status | Priority |
|-------------|--------|----------|
| Race/Alignment/Tier fields | ❌ Missing | **P1** |
| Body map editing | ❌ Missing | **P1** |
| Physique/Appearance editing | ❌ Missing | **P1** |
| Profile picture upload | ❌ Missing | **P1** |
| Validation with error display | ❌ Missing | **P1** |
| Auto-save drafts | ❌ Missing | **P1** |

### 4.3 Nice-to-Have (Post-1.0)

| Requirement | Status | Priority |
|-------------|--------|----------|
| Personality Bloom visualization | ❌ Not started | **P2** |
| Behavior Preview scenarios | ❌ Not started | **P2** |
| Inspiration Panel (templates) | ❌ Not started | **P2** |
| Clone from existing character | ❌ Not started | **P2** |
| Version history | ❌ Not started | **P2** |

---

## 5. Technical Gaps

### 5.1 Frontend

1. **IdentityPanel.tsx** needs 7 more collapsible cards:
   - Backstory Card
   - Classification Card (race, alignment, tier)
   - Values & Motivations Card (uses ValuesList)
   - Fears & Triggers Card (uses FearsList)
   - Social Patterns Card (uses SocialPatternsForm)
   - Voice & Communication Card (uses SpeechStyleForm)
   - Emotional Baseline Card (uses EmotionalBaselineForm, BigFiveSliders, StressBehaviorForm)

2. **Body/Appearance editing** requires:
   - New BodyCard component
   - New AppearanceCard component
   - Interactive body region selector (or simplified form)

3. **Trait application** requires:
   - Mapping `InferredTrait.path` to profile updates
   - Deep object update logic for nested paths

### 5.2 Backend

1. **`/studio/generate`** needs:
   - LLM provider integration (OpenAI, Anthropic, etc.)
   - System prompt construction from character profile
   - Conversation history formatting
   - Response streaming (optional for 1.0)

2. **`/studio/infer-traits`** needs:
   - LLM call with structured output
   - Trait extraction from conversation
   - Confidence scoring
   - Mapping to PersonalityMap paths

### 5.3 Missing Files

| File | Purpose |
|------|---------|
| `components/BackstoryCard.tsx` | Backstory editing |
| `components/ClassificationCard.tsx` | Race, alignment, tier |
| `components/BodyCard.tsx` | Body map editing |
| `components/AppearanceCard.tsx` | Physique editing |
| `components/ProfilePicUpload.tsx` | Image upload |
| `utils/trait-applicator.ts` | Apply traits to profile |

---

## 6. Proposed 1.0 Scope

### 6.1 In Scope

- All identity cards with full form fields
- Personality components connected and functional
- LLM-powered conversation (basic, non-streaming)
- Trait inference with accept/reject
- Save/load characters
- Basic validation

### 6.2 Out of Scope (Post-1.0)

- Personality Bloom visualization
- Behavior Preview scenarios
- Inspiration Panel
- Streaming responses
- Auto-save
- Version history
- Avatar generation

---

## 7. Success Criteria for 1.0

| Metric | Target |
|--------|--------|
| Schema field coverage | 80%+ |
| Conversation generates real responses | Yes |
| Trait suggestions appear in UI | Yes |
| Accepted traits update profile | Yes |
| Characters save to database | Yes |
| Characters load from database | Yes |
| No TypeScript errors | Yes |
| No console errors in normal flow | Yes |

---

## 8. Next Steps

1. Create detailed implementation plan (PLAN-character-studio-1.0.md)
2. Prioritize P0 items for immediate development
3. Integrate LLM provider in API
4. Connect existing personality components
5. Add missing identity cards
6. Test full save/load flow
