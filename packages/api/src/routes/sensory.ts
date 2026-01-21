import type { Hono } from 'hono';
import { getSensoryTemplates } from '@minimal-rpg/schemas';

export function registerSensoryRoutes(app: Hono): void {
  app.get('/api/sensory/templates', (c) => {
    const templates = getSensoryTemplates();

    return c.json({
      ok: true,
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        tags: template.tags,
        suggestedFor: template.suggestedFor,
        affectedRegions: template.affectedRegions,
      })),
    });
  });
}
