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

- [ ] Component renders with title
- [ ] Click toggles open/closed state
- [ ] Children render when open
- [ ] Optional completion indicator displays
- [ ] TypeScript compiles without errors
- [ ] Exported from components index (if one exists)
