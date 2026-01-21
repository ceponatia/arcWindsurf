# TASK-003: Create resolveSensoryProfile Resolver Function

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 3h
**Plan**: PLAN-1.0
**Depends On**: TASK-001, TASK-002

---

## Description

Create the core `resolveSensoryProfile()` function that merges auto-defaults, template fragments, conditional augmentations, and manual overrides into a final `resolvedBodyMap`. This is the heart of the sensory profile system.

## Technical Notes

### Function Signature

```typescript
// packages/schemas/src/body-regions/resolveSensoryProfile.ts

import type { CharacterProfile } from '../character/characterProfile.js';
import type { SensoryProfileConfig } from '../character/sensoryProfileConfig.js';
import type { BodyMap } from './body-map.js';

export interface ResolvedBodyMap extends BodyMap {
  _meta?: {
    resolvedAt: string;
    sources: string[];
  };
}

export interface ResolvedRegionData {
  visual?: { description: string; _attribution?: string[] };
  scent?: { description: string; _attribution?: string[] };
  texture?: { description: string; _attribution?: string[] };
  taste?: { description: string; _attribution?: string[] };
  sound?: { description: string; _attribution?: string[] };
}

export function resolveSensoryProfile(
  profile: Partial<CharacterProfile>,
  config?: SensoryProfileConfig
): ResolvedBodyMap;
```

### Merge Algorithm

```typescript
export function resolveSensoryProfile(
  profile: Partial<CharacterProfile>,
  config?: SensoryProfileConfig
): ResolvedBodyMap {
  const result: ResolvedBodyMap = {};
  const effectiveConfig = config ?? { autoDefaults: { enabled: true } };

  // Layer 1: Auto-defaults based on race/gender/age
  if (effectiveConfig.autoDefaults.enabled) {
    applyAutoDefaults(result, profile);
  }

  // Layer 2: Template fragments (weighted blend)
  if (effectiveConfig.templateBlend?.templates.length) {
    applyTemplateBlend(result, effectiveConfig.templateBlend);
  }

  // Layer 3: Conditional augmentations (occupation, etc.)
  if (effectiveConfig.conditionalAugmentations) {
    applyConditionalAugmentations(result, effectiveConfig, profile);
  }

  // Layer 4: Manual overrides (always win)
  if (profile.body) {
    applyManualOverrides(result, profile.body);
  }

  return result;
}
```

### Attribution Tracking

Each sensory value should track its source:

```typescript
function applyWithAttribution(
  target: ResolvedRegionData,
  source: Partial<BodyRegionData>,
  attribution: string
): void {
  for (const [sense, data] of Object.entries(source)) {
    if (data?.description) {
      target[sense] = {
        description: data.description,
        _attribution: [...(target[sense]?._attribution ?? []), attribution],
      };
    }
  }
}
```

### Edge Cases to Handle

1. **Empty config**: Return auto-defaults only
2. **No templates selected**: Skip template layer
3. **Template not found**: Log warning, skip that template
4. **Zero weight template**: Exclude from blend
5. **Conflicting templates**: Last-write-wins per sense, but track all attributions

## Files to Create/Modify

- `packages/schemas/src/body-regions/resolveSensoryProfile.ts` - Create resolver
- `packages/schemas/src/body-regions/autoDefaults.ts` - Create auto-default logic
- `packages/schemas/src/body-regions/index.ts` - Export resolver
- `packages/schemas/src/body-regions/__tests__/resolveSensoryProfile.test.ts` - Unit tests

## Dependencies

- TASK-001 (SensoryProfileConfig schema)
- TASK-002 (SensoryTemplate types and data)

## Testing

```bash
cd packages/schemas
pnpm test -- resolveSensoryProfile
```

### Test Cases

1. Empty profile returns sensible defaults
2. Auto-defaults populate race-appropriate values
3. Single template applies correctly
4. Multiple templates blend by weight
5. Manual overrides always win
6. Attribution tracks all sources correctly
7. Performance under 50ms for complex profiles

## Acceptance Criteria

- [ ] `resolveSensoryProfile(profile, config)` function exists
- [ ] Returns `ResolvedBodyMap` with all body regions populated
- [ ] Merge priority: auto-defaults → templates → augmentations → overrides
- [ ] Template weights correctly blend multiple templates
- [ ] Missing regions filled with sensible defaults
- [ ] `_attribution` field tracks source of each sensory value
- [ ] Function handles edge cases: empty config, missing templates, zero weights
- [ ] Unit tests cover all merge scenarios
- [ ] Performance acceptable for real-time UI updates (<50ms)

## Notes

- Added unit tests under packages/schemas/test/resolveSensoryProfile.test.ts to align with the Vitest include pattern (test/\*_/_.test.ts).
