# TASK-003: Add UI Toggle for Trait Inference

**Priority**: P2
**Status**: 🔲 TODO
**Estimate**: 1h
**Plan**: PLAN-1.0

---

## Description

Add a toggle near the chat input that allows users to enable/disable automatic trait inference. Persist the setting in `localStorage`.

## Acceptance Criteria

- [ ] Toggle appears near chat input area
- [ ] Label: "Auto-detect personality traits" or similar
- [ ] Default state: ON
- [ ] State persists across page reloads via `localStorage`
- [ ] `traitInferenceEnabled` signal controls async inference behavior
- [ ] Toggle is always visible (not dev-mode only)

## Technical Notes

```typescript
// In signals.ts
export const traitInferenceEnabled = signal<boolean>(
  localStorage.getItem('studio.traitInference') !== 'false'
);

// Toggle handler
export function setTraitInferenceEnabled(enabled: boolean): void {
  traitInferenceEnabled.value = enabled;
  localStorage.setItem('studio.traitInference', String(enabled));
}
```

## UI Placement

Option A: Below chat input as a small checkbox
Option B: In a toolbar row above/below the input
Option C: As a settings gear icon that opens a popover

Recommend Option A for simplicity.

## Files to Modify

- `packages/web/src/features/character-studio/signals.ts` - Add signal
- `packages/web/src/features/character-studio/components/conversation/ConversationPane.tsx` - Add toggle UI

## Dependencies

None

## Notes

- Updated `traitInferenceEnabled` signal in [packages/web/src/features/character-studio/signals.ts](packages/web/src/features/character-studio/signals.ts) to persist state in `localStorage` under the key `studio.traitInference`.
- Added `setTraitInferenceEnabled` action to handle updates and persistence simultaneously.
- Implemented the toggle UI in [packages/web/src/features/character-studio/components/conversation/ConversationPane.tsx](packages/web/src/features/character-studio/components/conversation/ConversationPane.tsx) below the chat input area.
- The toggle is always visible and uses a small checkbox with a label to maintain a clean UI.
- Added SSR safety checks for `localStorage` access in `signals.ts`.
