import type { Hono } from 'hono';
import { getLiveSensoryTemplates } from '../services/sensoryTemplates.js';

export function registerSensoryRoutes(app: Hono): void {
  app.get('/api/sensory/templates', (c) => {
    const templates = getLiveSensoryTemplates();

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

  app.get('/api/sensory/templates/full', (c) => {
    const templates = getLiveSensoryTemplates();

    return c.json({
      ok: true,
      templates,
    });
  });
}
