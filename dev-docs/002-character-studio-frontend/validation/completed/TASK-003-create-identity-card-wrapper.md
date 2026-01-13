# TASK-003: Create IdentityCard Wrapper Component

**Priority**: P0
**Estimate**: 45 minutes
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-001, TASK-002

---

## Objective

Create a reusable collapsible card component that will wrap each personality section in the IdentityPanel.

## File to Create

`packages/web/src/features/character-studio/components/IdentityCard.tsx`

## Requirements

### Props

```typescript
interface IdentityCardProps {
  title: string;
  defaultOpen?: boolean;
  completionPercent?: number; // 0-100, optional
  children: React.ReactNode;
}
```

### Features

- Collapsible with header click
- Chevron icon indicating open/closed state
- Optional completion indicator (progress bar or percentage)
- Consistent padding and border styling
- Smooth height transition on collapse/expand

### Styling

- Use existing TailwindCSS classes
- Match overall Character Studio styling
- Border radius and shadow consistent with other panels

## Example Usage

```tsx
<IdentityCard title="Personality Dimensions" defaultOpen={true}>
  <BigFiveSliders />
</IdentityCard>
```

## Acceptance Criteria

- [x] Component renders with title
- [x] Click toggles open/closed state
- [x] Children render when open
- [x] Optional completion indicator displays
- [x] TypeScript compiles without errors
- [x] Exported from components index (if one exists)

---

## Completion Log (2026-01-12)

- Created [IdentityCard.tsx](packages/web/src/features/character-studio/components/IdentityCard.tsx) with support for collapsible sections and progress indicators.
- Migrated "Core Identity" section in [IdentityPanel.tsx](packages/web/src/features/character-studio/components/IdentityPanel.tsx) to use the new component.
- Switched from manual Unicode arrows to `Lucide` icons for a cleaner UI.
- Verified smooth transitions and functionality in the browser.
