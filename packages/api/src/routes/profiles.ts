// src/routes/profiles.ts
import type { Hono } from 'hono';
import {
  CharacterProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import { prisma } from '../db/prisma.js';
import type { LoadedData } from '../data/loader.js';

interface ProfilesRouteDeps {
  getLoaded: () => LoadedData | undefined;
}

export function registerProfileRoutes(app: Hono, deps: ProfilesRouteDeps) {
  // GET /characters - summarized character profiles
  app.get('/characters', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    // Filesystem characters
    const fsMapped = loaded.characters.map((ch: CharacterProfile) => {
      const base: { id: string; name: string; summary: string; tags?: string[] } = {
        id: ch.id,
        name: ch.name,
        summary: ch.summary,
      };
      if (ch.tags && ch.tags.length > 0) base.tags = ch.tags;
      return base;
    });

    // DB dynamic characters
    const dbTemplates = await prisma.characterTemplate.findMany({});
    const dbProfiles: CharacterProfile[] = [];
    for (const t of dbTemplates) {
      try {
        const parsed = CharacterProfileSchema.parse(JSON.parse(t.profileJson));
        dbProfiles.push(parsed);
      } catch {
        // skip invalid rows silently; could log
      }
    }
    const dbMapped = dbProfiles.map((ch) => {
      const base: { id: string; name: string; summary: string; tags?: string[] } = {
        id: ch.id,
        name: ch.name,
        summary: ch.summary,
      };
      if (ch.tags && ch.tags.length > 0) base.tags = ch.tags;
      return base;
    });

    return c.json([...fsMapped, ...dbMapped], 200);
  });

  // POST /characters - create a new dynamic character template
  app.post('/characters', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' }, 400);
    }
    const parsed = CharacterProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() }, 400);
    }
    const profile = parsed.data;
    // Use provided id or reject if duplicate
    const existingFs = deps.getLoaded()?.characters.find((c) => c.id === profile.id);
    const existingDb = await prisma.characterTemplate.findUnique({ where: { id: profile.id } });
    if (existingFs || existingDb) {
      return c.json({ ok: false, error: 'character id already exists' }, 409);
    }
    await prisma.characterTemplate.create({
      data: {
        id: profile.id,
        profileJson: JSON.stringify(profile),
      },
    });
    return c.json(
      {
        ok: true,
        character: {
          id: profile.id,
          name: profile.name,
          summary: profile.summary,
          tags: profile.tags ?? [],
        },
      },
      201
    );
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
