// src/routes/profiles.ts
import type { Hono } from 'hono';
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import { deleteCharacterFile } from '../data/loader.js';
import { db } from '../db/prismaClient.js';
import type { LoadedDataGetter, CharacterSummary, SettingSummary, ApiError } from '../types.js';
import { mapCharacterSummary, mapSettingSummary } from '../mappers/profileMappers.js';

interface ProfilesRouteDeps {
  getLoaded: LoadedDataGetter;
}

export function registerProfileRoutes(app: Hono, deps: ProfilesRouteDeps): void {
  // GET /characters - summarized character profiles
  app.get('/characters', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const fsMapped: CharacterSummary[] = loaded.characters.map((ch) =>
      mapCharacterSummary(ch, 'fs')
    );

    // DB dynamic characters
    const dbRows = await db.characterTemplate.findMany();
    const dbProfiles: CharacterProfile[] = [];
    for (const t of dbRows) {
      try {
        const json = t.profileJson;
        const parsed = CharacterProfileSchema.parse(JSON.parse(json));
        dbProfiles.push(parsed);
      } catch {
        // skip invalid rows silently; could log
      }
    }
    const dbMapped: CharacterSummary[] = dbProfiles.map((ch) => mapCharacterSummary(ch, 'db'));

    return c.json([...fsMapped, ...dbMapped], 200);
  });

  // GET /characters/:id - get full character profile
  app.get('/characters/:id', async (c) => {
    const id = c.req.param('id');
    const loaded = deps.getLoaded();

    // Check filesystem
    const fsChar = loaded?.characters.find((ch) => ch.id === id);
    if (fsChar) {
      return c.json(fsChar, 200);
    }

    // Check DB
    const dbChar = await db.characterTemplate.findUnique({
      where: { id },
    });
    if (dbChar) {
      try {
        const json = dbChar.profileJson;
        const parsed = CharacterProfileSchema.parse(JSON.parse(json));
        return c.json(parsed, 200);
      } catch {
        return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
      }
    }

    return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
  });

  // POST /characters - create a new dynamic character template
  app.post('/characters', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }
    const parsed = CharacterProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }
    const profile = parsed.data;
    // Use provided id or reject if duplicate (unless updating DB char)
    const existingFs = deps.getLoaded()?.characters.find((c) => c.id === profile.id);
    if (existingFs) {
      return c.json(
        { ok: false, error: 'cannot edit filesystem character' } satisfies ApiError,
        409
      );
    }

    const existingDb = await db.characterTemplate.findUnique({
      where: { id: profile.id },
    });

    if (existingDb) {
      await db.characterTemplate.update({
        where: { id: profile.id },
        data: {
          profileJson: JSON.stringify(profile),
        },
      });
      const summary: CharacterSummary = mapCharacterSummary(profile, 'db');
      return c.json({ ok: true, character: summary }, 200);
    }

    await db.characterTemplate.create({
      data: {
        id: profile.id,
        profileJson: JSON.stringify(profile),
      },
    });
    const summary: CharacterSummary = mapCharacterSummary(profile, 'db');
    return c.json({ ok: true, character: summary }, 201);
  });

  // DELETE /characters/:id — delete a dynamic character template from DB or filesystem
  app.delete('/characters/:id', async (c) => {
    const id = c.req.param('id');
    const loaded = deps.getLoaded();

    // Check filesystem first
    const fsCharIndex = loaded?.characters.findIndex((ch) => ch.id === id);
    if (fsCharIndex !== undefined && fsCharIndex !== -1) {
      const deleted = await deleteCharacterFile(id);
      if (deleted) {
        loaded?.characters.splice(fsCharIndex, 1);
        return c.body(null, 204);
      }
      return c.json(
        { ok: false, error: 'failed to delete filesystem character' } satisfies ApiError,
        500
      );
    }

    const existing = await db.characterTemplate.findUnique({
      where: { id },
    });
    if (!existing) return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    await db.characterTemplate.delete({ where: { id } });
    return c.body(null, 204);
  });

  // GET /settings - summarized setting profiles
  app.get('/settings', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);
    const fsMapped: SettingSummary[] = loaded.settings.map((s) => mapSettingSummary(s, 'fs'));

    // Include dynamic settings from DB if present
    const dbRows = await db.settingTemplate.findMany();
    const dbProfiles: SettingProfile[] = [];
    for (const t of dbRows) {
      try {
        const json = t.profileJson;
        const parsed = SettingProfileSchema.parse(JSON.parse(json));
        dbProfiles.push(parsed);
      } catch {
        // skip invalid rows
      }
    }
    const dbMapped: SettingSummary[] = dbProfiles.map((s) => mapSettingSummary(s, 'db'));

    return c.json([...fsMapped, ...dbMapped], 200);
  });

  // GET /settings/:id - get full setting profile
  app.get('/settings/:id', async (c) => {
    const id = c.req.param('id');
    const loaded = deps.getLoaded();

    // Check filesystem
    const fsSet = loaded?.settings.find((s) => s.id === id);
    if (fsSet) {
      return c.json(fsSet, 200);
    }

    // Check DB
    const dbSet = await db.settingTemplate.findUnique({
      where: { id },
    });
    if (dbSet) {
      try {
        const json = dbSet.profileJson;
        const parsed = SettingProfileSchema.parse(JSON.parse(json));
        return c.json(parsed, 200);
      } catch {
        return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
      }
    }

    return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
  });

  // POST /settings - create or update a dynamic setting template
  app.post('/settings', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }
    const parsed = SettingProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }
    const profile = parsed.data;

    // Use provided id or reject if duplicate (unless updating DB setting)
    const existingFs = deps.getLoaded()?.settings.find((s) => s.id === profile.id);
    if (existingFs) {
      return c.json({ ok: false, error: 'cannot edit filesystem setting' } satisfies ApiError, 409);
    }

    const existingDb = await db.settingTemplate.findUnique({
      where: { id: profile.id },
    });

    if (existingDb) {
      await db.settingTemplate.update({
        where: { id: profile.id },
        data: {
          profileJson: JSON.stringify(profile),
        },
      });
      const summary: SettingSummary = mapSettingSummary(profile, 'db');
      return c.json({ ok: true, setting: summary }, 200);
    }

    await db.settingTemplate.create({
      data: {
        id: profile.id,
        profileJson: JSON.stringify(profile),
      },
    });
    const summary: SettingSummary = mapSettingSummary(profile, 'db');
    return c.json({ ok: true, setting: summary }, 201);
  });

  // DELETE /settings/:id — delete a dynamic setting template from DB (filesystem settings are read-only)
  app.delete('/settings/:id', async (c) => {
    const id = c.req.param('id');
    // If this id exists in filesystem-loaded settings, disallow deletion here
    const loaded = deps.getLoaded();
    if (loaded?.settings.some((s) => s.id === id)) {
      return c.json(
        { ok: false, error: 'filesystem settings cannot be deleted' } satisfies ApiError,
        405
      );
    }
    const existing = await db.settingTemplate.findUnique({
      where: { id },
    });
    if (!existing) return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    await db.settingTemplate.delete({ where: { id } });
    return c.body(null, 204);
  });
}
