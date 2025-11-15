// src/routes/profiles.ts
import type { Hono } from 'hono';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { LoadedData } from '../data/loader.js';

interface ProfilesRouteDeps {
  getLoaded: () => LoadedData | undefined;
}

export function registerProfileRoutes(app: Hono, deps: ProfilesRouteDeps) {
  // GET /characters - summarized character profiles
  app.get('/characters', (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const mapped = loaded.characters.map((ch: CharacterProfile) => {
      const base: { id: string; name: string; summary: string; tags?: string[] } = {
        id: ch.id,
        name: ch.name,
        summary: ch.summary,
      };
      if (ch.tags && ch.tags.length > 0) base.tags = ch.tags;
      return base;
    });

    return c.json(mapped, 200);
  });

  // GET /settings - summarized setting profiles
  app.get('/settings', (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const mapped = loaded.settings.map((s: SettingProfile) => ({
      id: s.id,
      name: s.name,
      tone: s.tone,
    }));

    return c.json(mapped, 200);
  });
}
