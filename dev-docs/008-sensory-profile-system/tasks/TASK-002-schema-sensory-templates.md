# TASK-002: Create SensoryTemplate Types and Initial Data

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 2h
**Plan**: PLAN-1.0
**Depends On**: TASK-001

---

## Description

Define the `SensoryTemplate` type and create initial template data (3-5 templates) that can be selected by users in the UI. Templates provide pre-authored sensory fragments for common character archetypes.

## Technical Notes

### Template Schema

```typescript
// packages/schemas/src/body-regions/sensoryTemplate.ts

import { z } from 'zod';
import { BodyRegionDataSchema } from './body-map.js';

export const SensoryTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  suggestedFor: z
    .object({
      races: z.array(z.string()).optional(),
      occupations: z.array(z.string()).optional(),
      alignments: z.array(z.string()).optional(),
    })
    .optional(),
  affectedRegions: z.array(z.string()), // e.g., ['hair', 'skin', 'hands']
  fragments: z.record(z.string(), BodyRegionDataSchema.partial()),
});

export type SensoryTemplate = z.infer<typeof SensoryTemplateSchema>;
```

### Example Template

```typescript
export const WOODLAND_SPIRIT_TEMPLATE: SensoryTemplate = {
  id: 'woodland-spirit',
  name: 'Woodland Spirit',
  description: 'Forest-dweller with earthy, natural notes',
  tags: ['nature', 'forest', 'earthy'],
  suggestedFor: {
    races: ['Elf', 'Half-Elf', 'Firbolg'],
    occupations: ['ranger', 'druid', 'herbalist'],
  },
  affectedRegions: ['hair', 'skin', 'breath'],
  fragments: {
    hair: {
      scent: { description: 'earthy, moss, wildflowers' },
      texture: { description: 'silken with occasional leaf debris' },
    },
    skin: {
      scent: { description: 'forest loam, morning dew' },
    },
    breath: {
      scent: { description: 'herbal, mint-touched' },
    },
  },
};
```

### Helper Functions

```typescript
// packages/schemas/src/body-regions/sensoryTemplates.ts

export function getSensoryTemplates(): SensoryTemplate[] {
  return [WOODLAND_SPIRIT_TEMPLATE, FORGE_WORKER_TEMPLATE, NOBLE_REFINED_TEMPLATE];
}

export function getSensoryTemplateById(id: string): SensoryTemplate | undefined {
  return getSensoryTemplates().find((t) => t.id === id);
}
```

## Files to Create/Modify

- `packages/schemas/src/body-regions/sensoryTemplate.ts` - Create schema
- `packages/schemas/src/body-regions/sensoryTemplates.ts` - Create template data
- `packages/schemas/src/body-regions/index.ts` - Export new types
- `packages/schemas/src/index.ts` - Re-export

## Dependencies

- TASK-001 (SensoryProfileConfig must exist for type coherence)

## Testing

```bash
cd packages/schemas
pnpm test
pnpm typecheck
```

## Acceptance Criteria

- [x] `SensoryTemplateSchema` Zod schema exists
- [x] Template includes: `id`, `name`, `description`, `tags`, `suggestedFor`, `affectedRegions`, `fragments`
- [x] At least 3 starter templates created: "woodland-spirit", "forge-worker", "noble-refined"
- [x] Templates stored in exportable data file
- [x] `getSensoryTemplates()` function returns all templates
- [x] `getSensoryTemplateById(id)` function returns single template
- [x] Template fragments use existing `BodyRegionData` structure
- [x] TypeScript types exported for frontend use
