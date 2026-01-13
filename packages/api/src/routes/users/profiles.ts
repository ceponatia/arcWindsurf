import type { Hono } from 'hono';
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import { deleteCharacterFile } from '../../loaders/loader.js';
import {
  listEntityProfiles,
  getEntityProfile,
  createEntityProfile,
  updateEntityProfile,
  deleteEntityProfile,
} from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import type { LoadedDataGetter, CharacterSummary, SettingSummary } from '../../loaders/types.js';
import { mapCharacterSummary, mapSettingSummary } from '../../mappers/profile-mappers.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { toId } from '../../utils/uuid.js';
import crypto from 'node:crypto';

interface ProfilesRouteDeps {
  getLoaded: LoadedDataGetter;
}

export function registerProfileRoutes(app: Hono, deps: ProfilesRouteDeps): void {
  const isUuid = (value: string): boolean =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      value
    );

  // GET /characters - summarized character profiles
  app.get('/characters', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const fsMapped: CharacterSummary[] = loaded.characters.map((ch) =>
      mapCharacterSummary(ch, 'fs')
    );

    // DB dynamic characters
    const dbRows = await listEntityProfiles({
      entityType: 'character',
      ownerEmail,
      visibility: 'public',
    });

    const dbProfiles: CharacterProfile[] = [];
    for (const t of dbRows) {
      try {
        const parsed = CharacterProfileSchema.parse(t.profileJson);
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
    const dbChar = await getEntityProfile(toId(id));
    if (dbChar?.entityType === 'character') {
      try {
        const parsed = CharacterProfileSchema.parse(dbChar.profileJson);
        return c.json(parsed, 200);
      } catch {
        return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
      }
    }

    return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
  });

  // POST /characters - create a new dynamic character template
  app.post('/characters', async (c) => {
    const ownerEmail = getOwnerEmail(c);
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
    const rawProfile = parsed.data;
    const normalizedId = isUuid(rawProfile.id) ? rawProfile.id : crypto.randomUUID();
    const profile: CharacterProfile = { ...rawProfile, id: normalizedId };

    // Check if it's a filesystem character (cannot edit)
    const existingFs = deps.getLoaded()?.characters.find((c) => c.id === profile.id);
    if (existingFs) {
      return c.json(
        { ok: false, error: 'cannot edit filesystem character' } satisfies ApiError,
        409
      );
    }

    const existingDb = await getEntityProfile(toId(profile.id));

    if (existingDb) {
      if (existingDb.ownerEmail !== ownerEmail && existingDb.visibility !== 'public') {
        return c.json({ ok: false, error: 'forbidden' } satisfies ApiError, 403);
      }

      await updateEntityProfile(toId(profile.id), {
        name: profile.name,
        profileJson: profile,
        tags: profile.tags,
      });
      const summary: CharacterSummary = mapCharacterSummary(profile, 'db');
      return c.json({ ok: true, character: summary }, 200);
    }

    await createEntityProfile({
      id: toId(profile.id),
      entityType: 'character',
      name: profile.name,
      ownerEmail,
      profileJson: profile,
      tags: profile.tags,
      visibility: 'private', // Default to private for new templates
    });

    const summary: CharacterSummary = mapCharacterSummary(profile, 'db');
    return c.json({ ok: true, character: summary }, 201);
  });

  // DELETE /characters/:id — delete a dynamic character template from DB or filesystem
  app.delete('/characters/:id', async (c) => {
    const ownerEmail = getOwnerEmail(c);
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

    const existing = await getEntityProfile(toId(id));
    if (existing?.entityType !== 'character') {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    if (existing.ownerEmail !== ownerEmail) {
      return c.json({ ok: false, error: 'forbidden' } satisfies ApiError, 403);
    }

    await deleteEntityProfile(toId(id));
    return c.body(null, 204);
  });

  // GET /settings - summarized setting profiles
  app.get('/settings', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);
    const fsMapped: SettingSummary[] = loaded.settings.map((s) => mapSettingSummary(s, 'fs'));

    // Include dynamic settings from DB if present
    const dbRows = await listEntityProfiles({
      entityType: 'setting',
      ownerEmail,
      visibility: 'public',
    });

    const dbProfiles: SettingProfile[] = [];
    for (const t of dbRows) {
      try {
        const parsed = SettingProfileSchema.parse(t.profileJson);
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
    const dbSet = await getEntityProfile(toId(id));
    if (dbSet?.entityType === 'setting') {
      try {
        const parsed = SettingProfileSchema.parse(dbSet.profileJson);
        return c.json(parsed, 200);
      } catch {
        return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
      }
    }

    return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
  });

  // POST /settings - create or update a dynamic setting template
  app.post('/settings', async (c) => {
    const ownerEmail = getOwnerEmail(c);
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
    const rawProfile = parsed.data;
    const profileId = isUuid(rawProfile.id) ? rawProfile.id : crypto.randomUUID();
    const profile: SettingProfile = { ...rawProfile, id: profileId };

    // Use provided id or reject if duplicate (unless updating DB setting)
    const existingFs = deps.getLoaded()?.settings.find((s) => s.id === profile.id);
    if (existingFs) {
      return c.json({ ok: false, error: 'cannot edit filesystem setting' } satisfies ApiError, 409);
    }

    const existingDb = await getEntityProfile(toId(profile.id));

    if (existingDb) {
      if (existingDb.ownerEmail !== ownerEmail && existingDb.visibility !== 'public') {
        return c.json({ ok: false, error: 'forbidden' } satisfies ApiError, 403);
      }

      await updateEntityProfile(toId(profile.id), {
        name: profile.name,
        profileJson: profile,
      });
      const summary: SettingSummary = mapSettingSummary(profile, 'db');
      return c.json({ ok: true, setting: summary }, 200);
    }

    await createEntityProfile({
      id: toId(profile.id),
      entityType: 'setting',
      name: profile.name,
      ownerEmail,
      profileJson: profile,
      visibility: 'private',
    });

    const summary: SettingSummary = mapSettingSummary(profile, 'db');
    return c.json({ ok: true, setting: summary }, 201);
  });

  // DELETE /settings/:id — delete a setting template from DB
  app.delete('/settings/:id', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    const id = c.req.param('id');
    const existing = await getEntityProfile(toId(id));
    if (existing?.entityType !== 'setting') {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    if (existing.ownerEmail !== ownerEmail) {
      return c.json({ ok: false, error: 'forbidden' } satisfies ApiError, 403);
    }

    await deleteEntityProfile(toId(id));
    return c.body(null, 204);
  });
}
