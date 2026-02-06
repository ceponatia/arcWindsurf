import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const sensoryMocks = vi.hoisted(() => ({
  getLiveSensoryTemplatesMock: vi.fn(),
}));

vi.mock('../../src/services/sensoryTemplates.js', () => ({
  getLiveSensoryTemplates: sensoryMocks.getLiveSensoryTemplatesMock,
}));

interface SensoryModule {
  registerSensoryRoutes: (app: Hono) => void;
}

const { registerSensoryRoutes } = (await import(
  '../../src/routes/sensory.js'
)) as SensoryModule;

/**
 * Build a Hono app with sensory routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerSensoryRoutes(app);
  return app;
}

describe('routes/sensory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sensoryMocks.getLiveSensoryTemplatesMock.mockReturnValue([
      {
        id: 'template-1',
        name: 'Rain',
        description: 'Cool mist',
        tags: ['weather'],
        suggestedFor: ['outdoor'],
        affectedRegions: ['hair'],
        extraField: 'ignored',
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns summarized sensory templates', async () => {
    const app = makeApp();
    const res = await app.request('/api/sensory/templates');

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      templates: {
        id: string;
        extraField?: string;
      }[];
    };
    expect(body.ok).toBe(true);
    expect(body.templates[0]?.id).toBe('template-1');
    expect(body.templates[0]?.extraField).toBeUndefined();
  });

  it('returns full sensory templates', async () => {
    const app = makeApp();
    const res = await app.request('/api/sensory/templates/full');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; templates: { extraField?: string }[] };
    expect(body.ok).toBe(true);
    expect(body.templates[0]?.extraField).toBe('ignored');
  });
});
