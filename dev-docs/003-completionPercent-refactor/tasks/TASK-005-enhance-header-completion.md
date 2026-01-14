# TASK-005: Enhance Header Completion Display

**Priority**: P1
**Estimate**: 45 minutes
**Phase**: 4 - Header Enhancement
**Depends On**: TASK-003, TASK-004

---

## Objective

Update `StudioHeader` to prominently display the overall completion percentage based on the 6 required fields, with optional tooltip showing which fields are missing.

## File to Modify

`packages/web/src/features/character-studio/components/StudioHeader.tsx`

## Current Implementation

Check current header for existing completion display.

## Target Implementation

### 1. Prominent Completion Indicator

```tsx
import { completionScore, requiredFieldsCompletion } from '../signals.js';

// In component
const score = completionScore.value;
const fields = requiredFieldsCompletion.value;

// Render
<div className="flex items-center gap-2">
  <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
    <div
      className="h-full bg-violet-500 transition-all duration-300"
      style={{ width: `${score}%` }}
    />
  </div>
  <span className="text-sm text-slate-400">{score}% complete</span>
</div>
```

### 2. Missing Fields Tooltip (Optional Enhancement)

Show which required fields are missing on hover:

```tsx
const missingFields = Object.entries(fields)
  .filter(([_, filled]) => !filled)
  .map(([field]) => field);

// Tooltip content
{missingFields.length > 0 && (
  <div className="text-xs text-slate-500">
    Missing: {missingFields.join(', ')}
  </div>
)}
```

### 3. Visual States

- **0%**: Red/orange indicator
- **1-99%**: Violet indicator
- **100%**: Green indicator with checkmark

## Acceptance Criteria

- [x] Completion percentage displays in header
- [x] Progress bar shows visual fill
- [x] Percentage updates reactively as fields are filled
- [x] 100% shows success state (green/checkmark)
- [x] Missing fields list accessible (tooltip or inline)
- [x] Styling matches existing header design
- [x] Mobile responsive
