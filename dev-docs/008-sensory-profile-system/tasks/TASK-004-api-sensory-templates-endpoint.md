# TASK-004: Create GET /api/sensory/templates Endpoint

**Priority**: P2
**Status**: ✅ Ready for Review
**Estimate**: 1h
**Plan**: PLAN-1.0
**Depends On**: TASK-002

---

## Description

Create an API endpoint that returns available sensory templates with their metadata. This enables the frontend to display template options without bundling all template data.

## Technical Notes

### Endpoint Implementation

```typescript
// packages/api/src/routes/sensory.ts

import { Hono } from 'hono';
import { getSensoryTemplates } from '@minimal-rpg/schemas';

export function registerSensoryRoutes(app: Hono): void {
  // GET /api/sensory/templates - List available templates
  app.get('/api/sensory/templates', (c) => {
    const templates = getSensoryTemplates();

    return c.json({
      ok: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        tags: t.tags,
        suggestedFor: t.suggestedFor,
        affectedRegions: t.affectedRegions,
        // Note: fragments intentionally excluded for lightweight response
      })),
    });
  });
}
```

### Response Type

```typescript
interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  suggestedFor?: {
    races?: string[];
    occupations?: string[];
    alignments?: string[];
  };
  affectedRegions: string[];
}

interface TemplatesResponse {
  ok: true;
  templates: TemplateMetadata[];
}
```

### Route Registration

```typescript
// In packages/api/src/serverImpl.ts
import { registerSensoryRoutes } from './routes/sensory.js';

// ... in server setup
registerSensoryRoutes(app);
```

## Files to Create/Modify

- `packages/api/src/routes/sensory.ts` - Create new route file
- `packages/api/src/serverImpl.ts` - Register routes

## Dependencies

- TASK-002 (templates must exist in schemas package)

## Testing

```bash
# Manual test
curl http://localhost:3000/api/sensory/templates

# Expected response
{
  "ok": true,

## Acceptance Criteria

- [x] `GET /api/sensory/templates` endpoint exists
- [x] Returns list of templates with metadata (id, name, description, tags, suggestedFor, affectedRegions)
- [x] Does NOT return full fragment data (keeps response lightweight)
- [x] Response matches `{ ok: true, templates: TemplateMetadata[] }`
- [ ] Endpoint is publicly accessible (no auth required)
- [ ] Response time < 50ms

## Validation Notes

- Auth middleware applies globally; the route is only public when auth is disabled. No explicit public-route exception was verified.
- Response time was not measured during validation.
  "templates": [
    {
      "id": "woodland-spirit",
      "name": "Woodland Spirit",
      "description": "Forest-dweller with earthy, natural notes",
      "tags": ["nature", "forest", "earthy"],
      "suggestedFor": { "races": ["Elf", "Half-Elf"] },
      "affectedRegions": ["hair", "skin", "breath"]
    }
  ]
}
```
