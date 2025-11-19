// src/routes/profiles.ts
import type { Hono } from 'hono';
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import { prisma } from '@minimal-rpg/db/node';
import { deleteCharacterFile } from '../data/loader.js';
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
    const dbRows = await prisma.characterTemplate.findMany({});
    const dbProfiles: CharacterProfile[] = [];
    for (const t of dbRows) {
      try {
        const json = String((t as { profileJson: string }).profileJson);
        const parsed = CharacterProfileSchema.parse(JSON.parse(json));
        dbProfiles.push(parsed);
      } catch {
        // skip invalid rows silently; could log
      }
    }
    const dbMapped: CharacterSummary[] = dbProfiles.map((ch) => mapCharacterSummary(ch, 'db'));

    return c.json([...fsMapped, ...dbMapped], 200);
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
    // Use provided id or reject if duplicate
    const existingFs = deps.getLoaded()?.characters.find((c) => c.id === profile.id);
    const existingDb = (await prisma.characterTemplate.findUnique({
      where: { id: profile.id },
    })) as { id: string } | null;
    if (existingFs || existingDb) {
      return c.json({ ok: false, error: 'character id already exists' } satisfies ApiError, 409);
    }
    await prisma.characterTemplate.create({
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

    const existing = (await prisma.characterTemplate.findUnique({ where: { id } })) as {
      id: string;
    } | null;
    if (!existing) return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    await prisma.characterTemplate.delete({ where: { id } });
    return c.body(null, 204);
  });

  // GET /settings - summarized setting profiles
  app.get('/settings', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);
    const fsMapped: SettingSummary[] = loaded.settings.map((s) => mapSettingSummary(s, 'fs'));

    // Include dynamic settings from DB if present
    const dbRows = await prisma.settingTemplate.findMany({});
    const dbProfiles: SettingProfile[] = [];
    for (const t of dbRows) {
      try {
        const json = String((t as { profileJson: string }).profileJson);
        const parsed = SettingProfileSchema.parse(JSON.parse(json));
        dbProfiles.push(parsed);
      } catch {
        // skip invalid rows
      }
    }
    const dbMapped: SettingSummary[] = dbProfiles.map((s) => mapSettingSummary(s, 'db'));

    return c.json([...fsMapped, ...dbMapped], 200);
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
    const existing = (await prisma.settingTemplate.findUnique({ where: { id } })) as {
      id: string;
    } | null;
    if (!existing) return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    await prisma.settingTemplate.delete({ where: { id } });
    return c.body(null, 204);
  });
}
