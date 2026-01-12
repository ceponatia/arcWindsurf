# TASK-018: Integrate Body and Appearance Cards

**Priority**: P1
**Estimate**: 30 minutes
**Phase**: 3 - Body & Appearance
**Depends On**: TASK-016, TASK-017

---

## Objective

Add the BodyCard and AppearanceCard components to the IdentityPanel.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Implementation

Add imports and render the new cards:

```tsx
import { BodyCard } from './BodyCard.js';
import { AppearanceCard } from './AppearanceCard.js';

// In the render, after Stress Response card:

<IdentityCard title="Physical Appearance" defaultOpen={false}>
  <AppearanceCard />
</IdentityCard>

<IdentityCard title="Body Details" defaultOpen={false}>
  <BodyCard />
</IdentityCard>
```

Or if the cards include their own IdentityCard wrapper:

```tsx
<AppearanceCard />
<BodyCard />
```

## Placement

Add after the personality cards, before any final summary section:

1. Basic Info
2. Backstory
3. Classification
4. Personality Dimensions
5. Emotional Baseline
6. Values & Motivations
7. Fears & Triggers
8. Social Patterns
9. Voice & Communication
10. Stress Response
11. **Physical Appearance** ← new
12. **Body Details** ← new

## Acceptance Criteria

- [ ] Both cards appear in IdentityPanel
- [ ] Cards collapse/expand correctly
- [ ] All fields in both cards are functional
- [ ] No duplicate wrapper issues
- [ ] Scroll still works with added content
