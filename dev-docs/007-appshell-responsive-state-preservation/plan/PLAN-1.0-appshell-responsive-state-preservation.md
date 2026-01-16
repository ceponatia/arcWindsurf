# PLAN-1.0: AppShell Responsive State Preservation (No Remount)

**Priority**: P1 - High
**Status**: Accepted
**Created**: January 15, 2026
**Originating From**: [INV-002: Character Studio Refresh on Resize](INV-002-studio-refresh-on-resize.md)

---

## Executive Summary

The current AppShell swaps between `DesktopLayout` and `MobileLayout` when viewport width crosses a breakpoint (default 768px). This unmounts and remounts the active view subtree, which can reset feature state and appear as a page refresh.

This wave refactors AppShell so responsive layout changes do not remount feature views. Instead, the shell reflows the same mounted content into different regions.

This must work for the entire app, not only Character Studio.

---

## Background

### What We Observed (INV-002)

When the Web Tools panel is expanded (or the browser is resized), the viewport can cross the 768px breakpoint. AppShell flips to the mobile layout, which remounts the Character Studio. Character Studio currently resets its studio session on mount, so chat history disappears and the experience looks like a refresh.

Reference:

- [dev-docs/tbd/INV-002-studio-refresh-on-resize.md](../../tbd/INV-002-studio-refresh-on-resize.md)

### Why This Matters Beyond Character Studio

Even if a given feature does not explicitly reset state on mount, remounts can still:

- Reset local React state (`useState`, `useReducer`)
- Reset component internal caches
- Drop in-flight network requests or streaming subscriptions
- Reset scroll positions and focus
- Trigger duplicate fetches (perceived latency)

A responsive shell should behave like a layout reflow, not a navigation.

---

## Goals

1. **No-remount responsive behavior**
   - Resizing across breakpoints must not unmount the active view.
2. **State continuity**
   - In-flight interactions (streaming, forms, scroll) continue smoothly.
3. **App-wide solution**
   - Applies to all views, not just Character Studio.
4. **Minimal storage intrusiveness**
   - Prefer in-memory state; optionally use `sessionStorage` for crash/reload resilience.

---

## Non-Goals

- Full offline support.
- Persisting all app state permanently in `localStorage`.
- Rebuilding the routing system unless needed to achieve no-remount.

---

## Current Architecture (Summary)

AppShell chooses layout by viewport size:

```text
AppShell
  if useIsMobile() then MobileLayout else DesktopLayout

MobileLayout and DesktopLayout each render their own chrome and the main view
```

Key behavior:

- View selection is driven by `viewMode` from the app controller.
- Layout selection is driven by `useIsMobile()` which listens for `window.resize`.

---

## Problem Statement

When the viewport crosses the mobile breakpoint, AppShell swaps between two different layout component trees. This causes the active view subtree to be unmounted and remounted.

We want:

- Resizing to reflow the same mounted view
- No loss of feature state
- No user-visible "refresh"

---

## Design Options

### Option A (Recommended): Single Responsive Shell, One MainContent

Keep a single AppShell component tree mounted at all times. Use responsive CSS (Tailwind breakpoints, CSS Grid/Flex) to rearrange the shell regions:

- Navigation (sidebar vs drawer)
- Header placement
- Auxiliary panels
- Main content region

Crucially: **`MainContent` remains mounted and is never swapped by breakpoint.**

Implementation concept:

```tsx
export const AppShell: React.FC = () => {
  const controller = useAppController();

  return (
    <ResponsiveShell
      nav={<Nav controller={controller} />}
      header={<Header controller={controller} />}
      main={<MainContent {...controllerProps} />}
    />
  );
};
```

`ResponsiveShell` uses CSS-only layout changes.

Pros:

- Best UX and architectural clarity
- Prevents remounts broadly
- Enables consistent focus/scroll handling

Cons:

- Larger refactor than a targeted patch

### Option B: Render Both Layouts, Hide One with CSS

Render both `DesktopLayout` and `MobileLayout` simultaneously and toggle visibility using CSS.

Pros:

- Low-risk change in code structure

Cons:

- Both trees are mounted (double work)
- Risk of duplicate effects, event handlers, or data fetching
- Harder to reason about and debug

### Option C: Add Session Rehydration (Storage-Based)

Accept remounts, but persist and rehydrate view state from `sessionStorage`.

Pros:

- Works even on full reload

Cons:

- Still loses in-flight interactions
- Adds complexity and storage considerations
- Must be implemented per feature to be reliable

---

## Recommended Approach

Primary: **Option A**, with limited use of **Option C** for resilience.

Principles:

1. **Never treat viewport changes as navigation.**
2. **Main content stays mounted.**
3. **Feature state lives outside layout chrome** (signals/Zustand), or is preserved by not remounting.
4. **Storage is optional and minimal** (`sessionStorage` only, small payloads).

---

## Plan of Action

### Phase 0: Audit for Mount-Reset Patterns

- Identify features that reset state on mount (like Character Studio `resetStudioSession()`).
- Move those resets behind explicit intent:
  - User clicks "New"
  - Route/view actually changes to a new entity id
  - User confirms "Reset"

Output:

- A short list of mount-reset callsites and what should trigger them instead.

### Phase 1: Refactor AppShell into a Single Responsive Tree

1. Create a new shell component (working name): `ResponsiveShell`.
2. Extract shared pieces (navigation, header, footer) so they can change behavior without swapping the entire layout.
3. Replace:
   - `return isMobile ? <MobileLayout/> : <DesktopLayout/>`
   with:
   - a single layout tree using responsive CSS

Key requirement:

- `MainContent` must be rendered once and not be conditionally swapped by viewport size.

### Phase 2: Mobile Navigation as Behavior, Not Layout

Implement the mobile drawer pattern without remounting `MainContent`:

- Keep a single nav component.
- Use `position: fixed` overlay drawer on small screens.
- Use responsive classes to switch between "sidebar" and "drawer" presentation.

### Phase 3: Optional Session Resilience (Minimal Storage)

For cases where we still want protection against full reloads, use `sessionStorage` only:

- Store only stable, non-sensitive keys:
  - current `viewMode`
  - selected entity ids (character id, session id)
- Avoid storing large conversation payloads.
- Features can fetch missing content from backend if needed.

This is optional and should be implemented cautiously.

---

## Testing Strategy

### Manual Validation

- Start a Character Studio conversation.
- Resize across the 768px breakpoint in both directions.
- Verify:
  - chat history remains
  - streaming continues
  - focus stays reasonable
  - no duplicated requests

Repeat the same for:

- Session Workspace
- Chat Panel
- Builders (Setting/Item/Persona)

### Automated (Later)

- Add Playwright coverage for "resize does not lose state" for at least one view (Character Studio).

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSS-only responsive layout is tricky | Medium | Build `ResponsiveShell` with small, testable regions |
| Hidden mount-reset patterns | High | Phase 0 audit and move resets to explicit actions |
| Drawer overlay interacts with focus/scroll | Medium | Add focus trap or simple focus management |
| Some features depend on mount for init | Medium | Replace mount-init with id-driven init guarded by stable keys |

---

## Open Questions

1. What exactly is the "Web Tools panel" implementation (VS Code embedded browser, extension panel, etc.) and what viewport behavior does it cause?
2. Do we want to preserve scroll position across breakpoint changes (recommended), and if so, per view or globally?
3. Should we unify navigation with a hash-router library, or keep the existing `window.location.hash` approach?

---

## Proposed Branching Strategy

If the refactor is significant, implement in a dedicated branch (example name):

- `refactor/appshell-responsive-shell`

Keep intermediate commits small:

- Introduce `ResponsiveShell` without changing behavior
- Move `MainContent` to be single-rendered
- Convert sidebar/drawer behavior
- Remove legacy MobileLayout/DesktopLayout

---

## Mount-Reset Audit

The following table identifies features that currently reset state on mount or view render. These are the primary targets for risk during the layout refactor.

| Feature | File + Function | What Resets | Why It Exists | When It Should Actually Trigger |
|---------|-----------------|-------------|---------------|----------------------------------|
| **Character Studio** | `useCharacterStudio.ts` (useEffect) | `resetStudioSession()`, `resetStudio()` | Ensure fresh start for conversation or new character creation. | On entry to feature with a *different* `id`, or explicit "New" button click. |
| **Chat Panel** | `ChatPanel.tsx` (useEffect) | `session`, `draft`, `editingIdx` | Clear message list and input when switching sessions. | Only when `sessionId` actually changes to a different non-null value. |
| **Location Builder** | `LocationBuilder.tsx` (useEffect) | `clearMap()`, then `loadMap`/`createMap` | Clear builder store on exit; initialize on entry. | Only when `mapId` or `settingId` changes. Guard `clearMap()` against layout remounts. |
| **Persona Builder** | `PersonaBuilder.tsx` (useEffect) | `existingPersona` | Initialize form state for specific persona or new. | Only when `id` changes. |
| **Session Workspace** | `SessionWorkspace.tsx` (useEffect) | `maps` (fetch) | Sync available maps with selected setting. | On `settingId` change (correctly handles now, but fetch is duplicate on mount). |

### Recommendations for De-risking

- **Stabilize Keys**: Ensure that `MainContent` and feature components have stable `key` props (eg, `key={viewMode + (entityId ?? '')}`) so that React can track if the component *actually* needs to be replaced.
- **Move to Persistent Stores**: Continue using Signals/Zustand for state that should survive layout reflows.
- **Selective Id Change**: In `useEffect` hooks, use refs to track "previous ID" and only perform destructive resets if the ID has *materially changed*, not just because the component remounted.
- **Explicit Cleanup**: Be cautious with `useEffect` cleanup functions that `reset()` or `clear()` global stores. If the component remounts immediately (layout swap), the cleanup will happen and then the new mount will re-init, possibly losing unsaved work between the two.
