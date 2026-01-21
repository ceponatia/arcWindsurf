# TASK-005: Add Sensory Profile Signals to Character Studio

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 1.5h
**Plan**: PLAN-1.0
**Depends On**: TASK-001, TASK-003

---

## Description

Add Preact Signals for sensory profile state management in Character Studio. This includes the config signal, resolved body map computed signal, and update functions.

## Technical Notes

### Signal Definitions

```typescript
// packages/web/src/features/character-studio/signals.ts

import { signal, computed } from '@preact/signals';
import { resolveSensoryProfile } from '@minimal-rpg/schemas';
import type { SensoryProfileConfig, ResolvedBodyMap } from '@minimal-rpg/schemas';

// Sensory profile configuration signal
export const sensoryProfileConfig = signal<SensoryProfileConfig>({
  autoDefaults: { enabled: true },
});

// Computed resolved body map
export const resolvedBodyMap = computed<ResolvedBodyMap>(() => {
  const profile = characterProfile.value;
  const config = sensoryProfileConfig.value;
  return resolveSensoryProfile(profile, config);
});

// Update function
export function updateSensoryProfileConfig(updates: Partial<SensoryProfileConfig>): void {
  sensoryProfileConfig.value = {
    ...sensoryProfileConfig.value,
    ...updates,
  };

  // Persist to character profile
  updateProfile('sensoryProfile', sensoryProfileConfig.value);
}
```

### Integration with Profile Loading

```typescript
// In loadCharacterProfile or similar
export function loadCharacterProfile(profile: CharacterProfile): void {
  characterProfile.value = profile;

  // Initialize sensory config from loaded profile
  if (profile.sensoryProfile) {
    sensoryProfileConfig.value = profile.sensoryProfile;
  } else {
    // Default config for characters without sensory profile
    sensoryProfileConfig.value = { autoDefaults: { enabled: true } };
  }
}
```

### Section Completion Update

```typescript
// Update sectionCompletion to include sensory profile
export const sectionCompletion = computed(() => {
  const profile = characterProfile.value;

  return {
    // ... existing sections
    sensoryProfile: {
      complete: true, // Always "complete" since it's optional
      hasContent: Boolean(
        profile.sensoryProfile?.templateBlend?.templates.length ||
          Object.keys(profile.body ?? {}).length > 0
      ),
    },
  };
});
```

## Files to Modify

- `packages/web/src/features/character-studio/signals.ts` - Add signals
- `packages/web/src/features/character-studio/hooks/useCharacterProfile.ts` - Update if exists

## Dependencies

- TASK-001 (SensoryProfileConfig type)
- TASK-003 (resolveSensoryProfile function)

## Testing

```bash
cd packages/web
pnpm typecheck
pnpm test -- signals
```

### Manual Testing

1. Load existing character without sensoryProfile → defaults applied
2. Load character with sensoryProfile → config restored
3. Change template selection → resolvedBodyMap updates
4. Save character → sensoryProfile persisted

## Acceptance Criteria

- [ ] `sensoryProfileConfig` signal exists with default value
- [ ] `resolvedBodyMap` computed signal derives from profile + config
- [ ] `updateSensoryProfileConfig()` function updates config and triggers recompute
- [ ] Signal initializes from loaded character profile
- [ ] Signal persists changes through `updateProfile()`
- [ ] `sectionCompletion` signal updated to include sensory profile status
- [ ] No performance regression in Character Studio load time
