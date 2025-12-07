import type { Hono } from 'hono';

import {
  appendMessage,
  appendNpcMessage,
  appendStateChangeLog,
  getSession,
  getLocationState,
  upsertLocationState,
  getInventoryState,
  upsertInventoryState,
  getTimeState,
  upsertTimeState,
  getSessionTagsWithDefinitions,
} from '../db/sessionsClient.js';
import type { ApiError, TurnResultDto } from '../types.js';
import { createGovernorForRequest } from '../governor/composition.js';
import type {
  TurnStateContext,
  ConversationTurn,
  StateObject,
  SessionTag,
} from '@minimal-rpg/governor';
import { db } from '../db/prismaClient.js';
import { CharacterProfileSchema, SettingProfileSchema } from '@minimal-rpg/schemas';
import type { CharacterInstanceRow } from '../types.js';

interface TurnRequestBody {
  input: string;
  npcId?: string;
}

function isTurnRequestBody(body: unknown): body is TurnRequestBody {
  return Boolean(
    body &&
      typeof body === 'object' &&
      typeof (body as { input?: unknown }).input === 'string' &&
      (body as { input: string }).input.length > 0 &&
      (typeof (body as { npcId?: unknown }).npcId === 'undefined' ||
        typeof (body as { npcId?: unknown }).npcId === 'string')
  );
}

export function registerTurnRoutes(app: Hono): void {
  // Minimal happy-path governor-backed turn endpoint.
  // POST /sessions/:id/turns { input: string }
  app.post('/sessions/:id/turns', async (c) => {
    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);
    }

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isTurnRequestBody(rawBody)) {
      return c.json({ ok: false, error: 'input is required' } satisfies ApiError, 400);
    }

    const { input, npcId: npcIdRaw } = rawBody;
    const requestedNpcId = typeof npcIdRaw === 'string' ? npcIdRaw.trim() : '';
    const targetNpcId = requestedNpcId.length > 0 ? requestedNpcId : null;

    // Load per-session instances from the database and derive baselines
    // from the stored template snapshots. This avoids any dependency on
    // filesystem-backed JSON data.
    const characterInstances: CharacterInstanceRow[] = await db.characterInstance.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });

    const primaryCharacterInstance =
      characterInstances.find((ci: CharacterInstanceRow) => ci.role === 'primary') ??
      characterInstances[0];

    if (!primaryCharacterInstance) {
      return c.json(
        {
          ok: false,
          error: 'character instance not found for session',
        } satisfies ApiError,
        500
      );
    }

    const activeNpcInstance: CharacterInstanceRow =
      targetNpcId && targetNpcId.length > 0
        ? (characterInstances.find((ci: CharacterInstanceRow) => ci.id === targetNpcId) ??
          primaryCharacterInstance)
        : primaryCharacterInstance;

    const settingInstance = session.settingInstanceId
      ? await db.settingInstance.findUnique({ where: { id: session.settingInstanceId } })
      : await db.settingInstance.findUnique({ where: { sessionId: session.id } });

    if (!settingInstance) {
      return c.json(
        {
          ok: false,
          error: 'setting instance not found for session',
        } satisfies ApiError,
        500
      );
    }

    let primaryCharacterBaseline;
    let activeNpcBaseline;
    let settingBaseline;
    let primaryCharacterOverrides: Record<string, unknown> = {};
    let activeNpcOverrides: Record<string, unknown> = {};
    let settingOverrides: Record<string, unknown> = {};

    const parseOverrides = (raw: string | null | undefined): Record<string, unknown> => {
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
      return {};
    };

    try {
      // Use the mutable instance profiles as baseline; snapshots are only the initial state.
      primaryCharacterBaseline = CharacterProfileSchema.parse(
        JSON.parse(primaryCharacterInstance.profileJson)
      );
      primaryCharacterOverrides = parseOverrides(primaryCharacterInstance.overridesJson);

      if (activeNpcInstance.id === primaryCharacterInstance.id) {
        activeNpcBaseline = primaryCharacterBaseline;
        activeNpcOverrides = primaryCharacterOverrides;
      } else {
        activeNpcBaseline = CharacterProfileSchema.parse(JSON.parse(activeNpcInstance.profileJson));
        activeNpcOverrides = parseOverrides(activeNpcInstance.overridesJson);
      }

      settingBaseline = SettingProfileSchema.parse(JSON.parse(settingInstance.profileJson));
      settingOverrides = parseOverrides(settingInstance.overridesJson);
    } catch (err) {
      console.error('failed to parse character or setting profile', err);
      return c.json(
        { ok: false, error: 'failed to parse character or setting profile' } satisfies ApiError,
        500
      );
    }

    // Load any previously persisted per-session slices; fall back to baselines
    // derived from character/setting profiles when none exist yet.
    const [storedLocation, storedInventory, storedTime] = await Promise.all([
      getLocationState(session.id),
      getInventoryState(session.id),
      getTimeState(session.id),
    ]);

    const locationBaseline =
      storedLocation ??
      (settingBaseline as Record<string, unknown>)['location'] ??
      (primaryCharacterBaseline as Record<string, unknown>)['location'] ??
      {};
    const inventoryBaseline =
      storedInventory ??
      (primaryCharacterBaseline as Record<string, unknown>)['inventory'] ??
      (settingBaseline as Record<string, unknown>)['inventory'] ??
      {};
    const timeBaseline =
      storedTime ??
      (settingBaseline as Record<string, unknown>)['time'] ??
      (primaryCharacterBaseline as Record<string, unknown>)['time'] ??
      {};

    const baseline: TurnStateContext = {
      // Preserve full character profile plus instance metadata so agents can see rich state.
      character: {
        ...primaryCharacterBaseline,
        instanceId: primaryCharacterInstance.id,
        templateId: primaryCharacterInstance.templateId,
        role: primaryCharacterInstance.role,
        ...(primaryCharacterInstance.label ? { label: primaryCharacterInstance.label } : {}),
      } as StateObject,
      // Preserve full setting profile plus instance metadata; location/time slices can hang here when present.
      setting: {
        ...settingBaseline,
        instanceId: settingInstance.id,
        templateId: settingInstance.templateId,
      } as StateObject,
      // Optional slices; populate when data exists.
      location: locationBaseline as StateObject,
      inventory: inventoryBaseline as StateObject,
      time: timeBaseline as StateObject,
    };

    if (activeNpcBaseline) {
      baseline.npc =
        activeNpcInstance.id === primaryCharacterInstance.id
          ? baseline.character
          : ({
              ...activeNpcBaseline,
              instanceId: activeNpcInstance.id,
              templateId: activeNpcInstance.templateId,
              role: activeNpcInstance.role,
              ...(activeNpcInstance.label ? { label: activeNpcInstance.label } : {}),
            } as StateObject);
    }

    const overrides: TurnStateContext = {
      character: primaryCharacterOverrides as StateObject,
      setting: settingOverrides as StateObject,
    };

    if (activeNpcInstance) {
      overrides.npc =
        activeNpcInstance.id === primaryCharacterInstance.id
          ? (primaryCharacterOverrides as StateObject)
          : (activeNpcOverrides as StateObject);
    }

    // Persist the player's input into the main messages table so the
    // governor sees a complete conversation history and the UI can
    // replay the session after refresh.
    await appendMessage(session.id, 'user', input);

    // Re-load session to pick up the newly appended message for
    // conversationHistory.
    const sessionWithMessage = await getSession(session.id);
    if (!sessionWithMessage) {
      return c.json({ ok: false, error: 'session not found after append' } satisfies ApiError, 500);
    }

    // Load active session tags (only enabled, always-mode for Phase 1)
    const tagBindingsWithDefs = await getSessionTagsWithDefinitions(session.id, {
      enabledOnly: true,
    });
    const sessionTags: SessionTag[] = tagBindingsWithDefs
      .filter((b) => b.tag.activation_mode === 'always')
      .map((b) => ({
        id: b.tag_id,
        name: b.tag.name,
        promptText: b.tag.prompt_text,
        shortDescription: b.tag.short_description ?? undefined,
      }));

    const governor = createGovernorForRequest();

    const turnResult = await governor.handleTurn({
      sessionId: session.id,
      playerInput: input,
      baseline,
      overrides,
      conversationHistory: sessionWithMessage.messages.map(
        (m): ConversationTurn => ({
          speaker: m.role === 'user' ? 'player' : 'character',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      ),
      sessionTags,
    });

    // Persist the governor-composed reply as the assistant message so
    // the main messages table reflects the visible conversation.
    if (turnResult.message?.trim()) {
      await appendMessage(session.id, 'assistant', turnResult.message);
    }

    // Persist state changes back to the mutable instance rows when available.
    if (turnResult.stateChanges?.patchCount && turnResult.stateChanges.patchCount > 0) {
      const effective = turnResult.stateChanges.newEffectiveState;
      const npcInstanceId = activeNpcInstance?.id ?? null;
      const npcIsPrimary = npcInstanceId === primaryCharacterInstance.id;

      if (effective) {
        const { character, setting, location, inventory, time, npc } = effective;

        // Persist character slice if present
        if (character && primaryCharacterInstance.id) {
          await db.characterInstance.update({
            where: { id: primaryCharacterInstance.id },
            data: { profileJson: JSON.stringify(character) },
          });
        }

        // Persist active NPC slice when distinct from primary or when only NPC changed
        if (npcInstanceId) {
          const npcPayload = npcIsPrimary && character ? character : npc;
          if (npcPayload) {
            await db.characterInstance.update({
              where: { id: npcInstanceId },
              data: { profileJson: JSON.stringify(npcPayload) },
            });
          }
        }

        // Persist setting slice if present
        if (setting && settingInstance.id) {
          await db.settingInstance.update({
            where: { id: settingInstance.id },
            data: { profileJson: JSON.stringify(setting) },
          });
        }

        // Persist per-session slices for location, inventory, and time.
        if (location) {
          await upsertLocationState(session.id, location as Record<string, unknown>);
        }
        if (inventory) {
          await upsertInventoryState(session.id, inventory as Record<string, unknown>);
        }
        if (time) {
          await upsertTimeState(session.id, time as Record<string, unknown>);
        }
      }

      const newOverrides = turnResult.stateChanges.newOverrides;
      if (newOverrides) {
        const primaryOverridesUpdate =
          npcIsPrimary && newOverrides.npc ? newOverrides.npc : newOverrides.character;

        if (primaryOverridesUpdate && primaryCharacterInstance.id) {
          await db.characterInstance.update({
            where: { id: primaryCharacterInstance.id },
            data: { overridesJson: JSON.stringify(primaryOverridesUpdate) },
          });
        }

        if (!npcIsPrimary && newOverrides.npc && npcInstanceId) {
          await db.characterInstance.update({
            where: { id: npcInstanceId },
            data: { overridesJson: JSON.stringify(newOverrides.npc) },
          });
        }

        if (newOverrides.setting && settingInstance.id) {
          await db.settingInstance.update({
            where: { id: settingInstance.id },
            data: { overridesJson: JSON.stringify(newOverrides.setting) },
          });
        }
      }
    }

    // Audit state changes for debugging/tuning.
    if (turnResult.stateChanges?.patchCount && turnResult.stateChanges.patchCount > 0) {
      await appendStateChangeLog({
        sessionId: session.id,
        turnIdx: sessionWithMessage.messages.at(-1)?.idx ?? null,
        patchCount: turnResult.stateChanges.patchCount,
        modifiedPaths: turnResult.stateChanges.modifiedPaths ?? [],
        agentTypes: turnResult.metadata?.agentsInvoked ?? [],
        metadata: {
          success: turnResult.success,
        },
      });
    }

    // Persist per-NPC transcript when an NPC agent replied. Use the detected npcId when available,
    // falling back to the primary character instance id for backward compatibility.
    const npcOutputs = turnResult.metadata?.agentOutputs?.filter((o) => o.agentType === 'npc');
    if (npcOutputs && npcOutputs.length > 0 && activeNpcInstance) {
      const detectedNpcId = turnResult.metadata?.intent?.params?.npcId;
      const npcId =
        detectedNpcId && detectedNpcId.trim().length > 0
          ? detectedNpcId
          : (activeNpcInstance.id ?? primaryCharacterInstance.id);

      // Record the player's utterance for this NPC transcript
      await appendNpcMessage(session.id, npcId, 'player', input);

      // Record NPC replies (typically one per turn)
      for (const npc of npcOutputs) {
        const narrative = npc.output.narrative?.trim() ?? '';
        if (narrative) {
          await appendNpcMessage(session.id, npcId, 'npc', narrative);
        }
      }
    }

    const dto: TurnResultDto = {
      message: turnResult.message,
      events: turnResult.events,
      stateChanges: turnResult.stateChanges,
      metadata: turnResult.metadata,
      success: turnResult.success,
    };

    return c.json(dto, 200);
  });
}
