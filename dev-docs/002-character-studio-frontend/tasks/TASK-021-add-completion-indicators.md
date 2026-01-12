# TASK-021: Add Completion Indicators

**Priority**: P2
**Estimate**: 1.5 hours
**Phase**: 4 - Validation & Polish
**Depends On**: TASK-013

---

## Objective

Add visual completion indicators to show profile progress and which cards have content.

## Features

### 1. Overall Completion Percentage

Display in header or sidebar showing how much of the profile is filled:

```text
Profile Completion: 45%
████████░░░░░░░░░░░░
```

### 2. Per-Card Indicators

Show a dot or checkmark on collapsed cards that have content:

```text
▼ Basic Info ✓
▶ Backstory ✓
▶ Classification ○  (empty)
▶ Personality Dimensions ✓
```

## Implementation

### 1. Completion Calculator

```typescript
// In signals.ts or utils/

export function calculateCompletion(): number {
  const profile = characterProfile.value;
  const fields = [
    profile.name,
    profile.backstory,
    profile.personalityMap?.dimensions,
    profile.personalityMap?.values?.length,
    profile.personalityMap?.fears?.length,
    profile.personalityMap?.social,
    profile.personalityMap?.speech,
    profile.personalityMap?.stress,
    profile.physique,
    profile.body,
  ];

  const filled = fields.filter(f => {
    if (Array.isArray(f)) return f.length > 0;
    if (typeof f === 'object') return Object.keys(f ?? {}).length > 0;
    return Boolean(f);
  }).length;

  return Math.round((filled / fields.length) * 100);
}
```

### 2. Card Completion Check

```typescript
// Helper for each card
function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}
```

### 3. Update IdentityCard

Add completion prop to IdentityCard:

```tsx
interface IdentityCardProps {
  title: string;
  defaultOpen?: boolean;
  hasContent?: boolean; // Shows indicator
  children: React.ReactNode;
}

// In render:
<div className="flex items-center gap-2">
  <ChevronRight className={`transform ${isOpen ? 'rotate-90' : ''}`} />
  <span>{title}</span>
  {hasContent && <Check className="h-4 w-4 text-green-500" />}
</div>
```

### 4. Overall Progress Bar

```tsx
// In StudioHeader or IdentityPanel header
const completion = calculateCompletion();

<div className="flex items-center gap-2">
  <span className="text-sm text-gray-600">{completion}% complete</span>
  <div className="w-32 h-2 bg-gray-200 rounded-full">
    <div
      className="h-full bg-green-500 rounded-full transition-all"
      style={{ width: `${completion}%` }}
    />
  </div>
</div>
```

## Acceptance Criteria

- [ ] Overall completion percentage displays
- [ ] Progress bar updates as fields are filled
- [ ] Individual cards show content indicator
- [ ] Indicators update in real-time as user edits
- [ ] Empty vs filled state is visually distinct
