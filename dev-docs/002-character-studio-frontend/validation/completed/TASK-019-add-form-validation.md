# TASK-019: Add Form Validation

**Priority**: P1
**Estimate**: 1.5 hours
**Phase**: 4 - Validation & Polish
**Depends On**: TASK-013

---

## Objective

Add validation for required fields and display validation errors before save.

## Files to Modify

- `packages/web/src/features/character-studio/signals.ts` (add validation logic)
- `packages/web/src/features/character-studio/components/StudioHeader.tsx` or equivalent (display errors)
- Individual form components (add required indicators)

## Required Fields

| Field | Requirement |
|-------|-------------|
| name | Non-empty string |
| backstory | Non-empty string (minimum length?) |

## Implementation

### 1. Add Validation Signal

```typescript
// In signals.ts
export const validationErrors = signal<Record<string, string>>({});

export function validateProfile(): boolean {
  const errors: Record<string, string> = {};
  const profile = characterProfile.value;

  if (!profile.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!profile.backstory?.trim()) {
    errors.backstory = 'Backstory is required';
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
}
```

### 2. Validate Before Save

```typescript
export async function saveCharacter(): Promise<boolean> {
  if (!validateProfile()) {
    return false; // Don't save with validation errors
  }

  // ... existing save logic
}
```

### 3. Display Errors

```tsx
// In form field
<input
  className={`border rounded p-2 ${validationErrors.value.name ? 'border-red-500' : ''}`}
  value={characterProfile.value.name ?? ''}
  onChange={(e) => updateProfile('name', e.target.value)}
/>
{validationErrors.value.name && (
  <p className="text-red-500 text-sm">{validationErrors.value.name}</p>
)}
```

### 4. Add Required Indicators

```tsx
<label>
  Name <span className="text-red-500">*</span>
</label>
```

## Acceptance Criteria

- [x] Required fields marked with asterisk
- [x] Validation runs on save attempt
- [x] Errors display inline with fields
- [x] Save blocked when validation fails
- [x] Errors clear when field is corrected
- [x] User can still navigate away (no hard blocking)
