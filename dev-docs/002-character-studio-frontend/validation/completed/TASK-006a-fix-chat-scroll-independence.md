# TASK-006a: Fix Chat/Cards Scroll Independence

**Priority**: P1
**Estimate**: 1 hour
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-006

---

## Objective

Separate the left "chat" component from the right "cards" panel so that expanding cards and scrolling the cards section does not move the chat component. Each panel should scroll independently.

## Problem

Currently, when users:
- Expand a personality card on the right
- Scroll through the cards section

The chat component on the left moves along with the scroll, disrupting the conversation context.

## Solution

Implement a split-pane layout where:
1. The chat panel is fixed/sticky on the left
2. The cards panel scrolls independently on the right
3. Each panel has its own scroll container

## Files to Modify

- `packages/web/src/features/character-studio/CharacterStudio.tsx` (or equivalent layout component)
- `packages/web/src/features/character-studio/CharacterStudio.css` (or Tailwind classes)

## Implementation

### Option A: CSS Flexbox with Independent Overflow

```css
.character-studio-layout {
  display: flex;
  height: 100vh; /* or calc(100vh - header-height) */
  overflow: hidden;
}

.chat-panel {
  flex: 0 0 400px; /* fixed width */
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
}

.cards-panel {
  flex: 1;
  overflow-y: auto;
}
```

### Option B: CSS Grid

```css
.character-studio-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  height: 100vh;
  overflow: hidden;
}

.chat-panel {
  overflow-y: auto;
}

.cards-panel {
  overflow-y: auto;
}
```

### Option C: Tailwind Classes

```tsx
<div class="flex h-screen overflow-hidden">
  <div class="w-[400px] flex-shrink-0 overflow-y-auto border-r">
    <ChatPanel />
  </div>
  <div class="flex-1 overflow-y-auto">
    <CardsPanel />
  </div>
</div>
```

## Key Considerations

- Ensure parent container has `overflow: hidden` to prevent document-level scrolling
- Both panels need explicit `overflow-y: auto` for independent scrolling
- Chat panel width should be fixed (not percentage) for consistent UX
- Consider adding a resize handle for power users (optional, out of scope)

## Acceptance Criteria

- [ ] Chat panel stays fixed when scrolling cards
- [ ] Cards panel scrolls independently
- [ ] Expanding a card does not shift the chat panel
- [ ] Both panels can be scrolled to see all content
- [ ] Layout is responsive (or has reasonable min-width behavior)
- [ ] No horizontal scrollbar appears unexpectedly
