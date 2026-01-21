# TASK-001: Add SensoryProfileConfig to CharacterProfileSchema

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 1.5h
**Plan**: PLAN-1.0

---

## Description

Add the `sensoryProfile` field and `occupation` field to `CharacterProfileSchema`. This creates the data structure for storing user sensory preferences without affecting existing character data.

## Technical Notes

### Schema Definition

```typescript
// packages/schemas/src/character/sensoryProfileConfig.ts

import { z } from 'zod';

export const AutoDefaultsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  excludeRegions: z.array(z.string()).optional(),
});

export const TemplateSelectionSchema = z.object({
  templateId: z.string(),
  weight: z.number().min(0).max(1).default(1),
});

export const TemplateBlendConfigSchema = z.object({
  templates: z.array(TemplateSelectionSchema).default([]),
  blendMode: z.enum(['weighted', 'layered']).default('weighted'),
});

export const SensoryProfileConfigSchema = z.object({
  autoDefaults: AutoDefaultsConfigSchema.default({ enabled: true }),
  templateBlend: TemplateBlendConfigSchema.optional(),
  conditionalAugmentations: z.record(z.string(), z.boolean()).optional(),
});

export type SensoryProfileConfig = z.infer<typeof SensoryProfileConfigSchema>;
export type TemplateBlendConfig = z.infer<typeof TemplateBlendConfigSchema>;
export type AutoDefaultsConfig = z.infer<typeof AutoDefaultsConfigSchema>;
```

### CharacterProfile Update

```typescript
// In characterProfile.ts
import { SensoryProfileConfigSchema } from './sensoryProfileConfig.js';

export const CharacterProfileSchema = z.object({
  // ... existing fields
  sensoryProfile: SensoryProfileConfigSchema.optional(),
});

// In characterBasics.ts or similar
export const CharacterBasicsSchema = z.object({
  // ... existing fields
  occupation: z.string().optional(),
});
```

## Files to Modify

- `packages/schemas/src/character/sensoryProfileConfig.ts` - Create new file
- `packages/schemas/src/character/characterProfile.ts` - Add sensoryProfile field
- `packages/schemas/src/character/index.ts` - Export new types
- `packages/schemas/src/index.ts` - Re-export if needed

## Dependencies

None - foundational schema task

## Testing

```bash
cd packages/schemas
pnpm test
pnpm typecheck
```

## Acceptance Criteria

- [x] `SensoryProfileConfigSchema` Zod schema exists with all required fields
- [x] `CharacterProfileSchema` includes optional `sensoryProfile` field
- [x] `CharacterBasicsSchema` includes optional `occupation` field
- [x] Schema exports types: `SensoryProfileConfig`, `TemplateBlendConfig`, `AutoDefaultsConfig`
- [x] Existing characters without `sensoryProfile` remain valid (no breaking changes)
- [ ] Unit tests pass for schema validation
- [ ] TypeScript compilation succeeds across all packages

## Validation Notes

- Unit test coverage for the new schema changes was not executed during validation.
- Full monorepo typecheck was not executed during validation.
