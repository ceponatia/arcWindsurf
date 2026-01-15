# Investigation-002 - Studio Page Refreshes when Web Tools Panel Expanded

## Summary

When the web tools panel is expanded, the studio page refreshes. This is a bug most likely related to viewport size triggering a different AppShell layout. If possible, we need the layout to load the existing chat view so we don't lose data.

---

## Investigation Notes (Jan 15, 2026)

### Likely Repro Steps

1. Open Character Studio and begin a conversation (enough messages to be obvious).
2. Expand the Web Tools panel (or otherwise reduce viewport width by resizing the browser).
3. If the viewport width crosses the mobile breakpoint (default 768px), the UI switches layouts.
4. The Character Studio conversation history is cleared, which looks like a refresh.

### Data Flow Analysis

```text
Viewport width changes (Web Tools panel expanded)
  ↓ window.resize event
packages/web/src/hooks/useIsMobile.ts
  ↓ isMobile flips true/false around 768px
packages/web/src/layouts/AppShell.tsx
  ↓ AppShell swaps <DesktopLayout> ↔ <MobileLayout>
     (unmounts + remounts main content subtree)
packages/web/src/features/character-studio/hooks/useCharacterStudio.ts
  ↓ useEffect([id]) runs on mount
  ↓ resetStudioSession() clears conversation signals
packages/web/src/features/character-studio/signals.ts
  ↓ conversationHistory/studioSessionId/pendingTraits/summary reset to empty
```

### Root Cause

The layout breakpoint switch unmounts and remounts the Character Studio view. On mount, `useCharacterStudio()` currently calls `resetStudioSession()` unconditionally, which clears the in-memory conversation state.

- Layout switch: [packages/web/src/layouts/AppShell.tsx](packages/web/src/layouts/AppShell.tsx)
- Mobile detection: [packages/web/src/hooks/useIsMobile.ts](packages/web/src/hooks/useIsMobile.ts)
- Studio mount reset: [packages/web/src/features/character-studio/hooks/useCharacterStudio.ts](packages/web/src/features/character-studio/hooks/useCharacterStudio.ts)
- Session reset behavior: [packages/web/src/features/character-studio/signals.ts](packages/web/src/features/character-studio/signals.ts)

This is why it feels like a "refresh": the visible chat history disappears and the studio session ID is cleared, even though the page itself may not be doing a full browser reload.

### Contributing Factors

1. **Hard breakpoint at 768px**: expanding a side panel can easily cross the threshold, especially in VS Code embedded browsers.
2. **Layout swap remounts the route subtree**: Mobile vs Desktop layouts are distinct component trees.
3. **Studio session reset is tied to component mount**: remounts are treated like a "new studio session".

## Recommendations

### Quick Win (Most Targeted)

Gate `resetStudioSession()` so it only runs when the studio actually changes context (new builder id, switching between characters, starting a new character), not on incidental remounts.

Proposed approach:

- Track a persistent "initialized key" in signals (e.g. `studioInitializedKey = id ?? '__new__'`).
- In `useCharacterStudio` mount effect:
  - If `studioInitializedKey.value !== currentKey`, call `resetStudioSession()` and set the key.
  - Otherwise skip the reset.

This preserves conversation state across Desktop/Mobile layout swaps while still clearing when the user truly starts a new studio flow.

### Medium-Term

Refactor AppShell so the main view subtree is not unmounted when the layout flips. For example, keep `MainContent` mounted and only swap navigation chrome.

### Longer-Term

Persist studio conversation state to `sessionStorage` and rehydrate on mount. This would also protect against full reloads, but adds complexity (serialization of timestamps, pending traits, etc.).

## Plan of Action

1. Add a persistent studio initialization key in [packages/web/src/features/character-studio/signals.ts](packages/web/src/features/character-studio/signals.ts).
2. Update [packages/web/src/features/character-studio/hooks/useCharacterStudio.ts](packages/web/src/features/character-studio/hooks/useCharacterStudio.ts) to guard `resetStudioSession()` based on that key.
3. Manual validation:
   - Start a conversation in studio.
   - Expand/collapse the Web Tools panel to cross the 768px breakpoint.
   - Verify the conversation does not clear and the session continues.
4. Optional follow-up: add a small unit test around the guard behavior (ensure session reset happens on `id` changes, not remount).
