/**
 * Transactional Session Creation API
 * POST /sessions/create-full
 *
 * Creates a complete session with all related entities in a single atomic transaction.
 * This replaces the fragile multi-request session creation flow.
 */
import type { Context } from 'hono';
import { z } from 'zod';
import {
  drizzle,
  sessions,
  sessionProjections,
  actorStates,
  sessionTags,
  promptTags,
  inArray,
} from '@minimal-rpg/db/node';
import { ensureUserByEmail } from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import { badRequest, serverError, notFound } from '../../../utils/responses.js';
import { generateId, generateInstanceId } from '@minimal-rpg/utils';
import { findCharacter, findSetting } from './shared.js';
import { getAuthUser } from '../../../auth/middleware.js';
import { toSessionId, toId, toIds } from '../../../utils/uuid.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { validateBody } from '../../../utils/request-validation.js';

/**
 * Request schema for creating a full session
 */
const CreateFullSessionRequestSchema = z.object({
  /** Required: Setting to use for this session */
  settingId: z.string().min(1),

  /** Optional: Persona ID for the player character */
  personaId: z.string().optional(),

  /** Optional: Starting location ID */
  startLocationId: z.string().optional(),

  /** Optional: Starting time configuration */
  startTime: z
    .object({
      year: z.number().optional(),
      month: z.number().min(1).max(12).optional(),
      day: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
    })
    .optional(),

  /** Optional: Seconds per turn (defaults to setting value or 60) */
  secondsPerTurn: z.number().min(1).optional(),

  /** Required: NPCs to include in the session */
  npcs: z
    .array(
      z.object({
        /** Character template ID */
        characterId: z.string().min(1),
        /** Role in the session */
        role: z.enum(['primary', 'supporting', 'background', 'antagonist']).default('supporting'),
        /** NPC tier for detail level */
        tier: z.enum(['major', 'minor', 'transient']).default('minor'),
        /** Optional starting location for this NPC */
        startLocationId: z.string().optional(),
        /** Optional label for identifying this NPC instance */
        label: z.string().optional(),
      })
    )
    .min(1, 'at least one npc is required'),

  /** Optional: Initial relationships between entities */
  relationships: z
    .array(
      z.object({
        fromActorId: z.string().min(1),
        toActorId: z.string().min(1),
        relationshipType: z.string().default('stranger'),
        affinitySeed: z
          .object({
            trust: z.number().min(0).max(1).optional(),
            fondness: z.number().min(0).max(1).optional(),
            fear: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .optional(),

  /** Optional: Tags to attach to the session */
  tags: z
    .array(
      z.union([
        // Legacy (v1) payload
        z.object({
          tagId: z.string().min(1),
          scope: z.enum(['session', 'npc']),
          /** Optional: NPC character template ID (resolved to instance ID) */
          targetId: z.string().optional(),
        }),
        // New (v2) payload
        z.object({
          tagId: z.string().min(1),
          targetType: z.enum(['session', 'character', 'npc', 'player', 'location', 'setting']),
          targetEntityId: z.string().nullable().optional(),
        }),
      ])
    )
    .optional(),
});

export type CreateFullSessionRequest = z.infer<typeof CreateFullSessionRequestSchema>;

/**
 * Response type for full session creation
 */
export interface CreateFullSessionResponse {
  id: string;
  settingId: string;
  playerCharacterId: string;
  personaId: string | null;
  startLocationId: string | null;
  secondsPerTurn: number;
  createdAt: string;
  npcs: {
    instanceId: string;
    templateId: string;
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[];
  tagBindings: {
    id: string;
    tagId: string;
    targetType: string;
    targetEntityId: string | null;
  }[];
  relationships: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
  }[];
}

/**
 * Handle POST /sessions/create-full
 * Creates a session with all related entities in a single transaction.
 */
export async function handleCreateFullSession(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  console.log('[API] POST /sessions/create-full request received');

  const user = getAuthUser(c);
  const ownerEmail = user?.email ?? user?.identifier;

  if (!ownerEmail) {
    return badRequest(c, 'authenticated user required with email/identifier');
  }

  // sessions.owner_email references user_accounts.email via FK.
  // Ensure a matching user row exists to prevent FK violations.
  try {
    await ensureUserByEmail({
      email: ownerEmail,
      identifier: ownerEmail,
      displayName: user?.identifier ?? null,
      role: user?.role === 'admin' ? 'admin' : 'user',
    });
  } catch (err) {
    console.error('[API] Failed to ensure user account for owner email', {
      ownerEmail,
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError(c, 'failed to ensure user account');
  }

  const loaded = getLoaded();
  if (!loaded) {
    console.error('[API] Data not loaded');
    return serverError(c, 'data not loaded');
  }

  const bodyResult = await validateBody(c, CreateFullSessionRequestSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;

  const request = bodyResult.data;

  // Validate setting exists
  const setting = await findSetting(loaded, request.settingId);
  if (!setting) {
    return notFound(c, `setting not found: ${request.settingId}`);
  }

  // Validate all NPC characters exist
  const npcCharacters = new Map<string, (typeof loaded)['characters'][0]>();
  for (const npc of request.npcs) {
    const character = await findCharacter(loaded, npc.characterId);
    if (!character) {
      return notFound(c, `character not found: ${npc.characterId}`);
    }
    npcCharacters.set(npc.characterId, character);
  }

  // Validate persona exists if provided
  let personaProfile: CharacterProfile | Record<string, unknown> | null = null;
  if (request.personaId) {
    const personaResult = await drizzle
      .select()
      .from(actorStates)
      .where(inArray(actorStates.actorId, [request.personaId] as string[]))
      .limit(1);

    if (personaResult.length === 0 || !personaResult[0]?.state) {
      return notFound(c, `persona not found: ${request.personaId}`);
    }
    const personaState = personaResult[0].state as Record<string, unknown>;
    const profileFromState =
      (personaState['profile'] as CharacterProfile | Record<string, unknown> | undefined) ??
      personaState;
    personaProfile = profileFromState;
  }

  // Validate tags exist if provided
  if (request.tags && request.tags.length > 0) {
    const tagIds = request.tags.map((t) => t.tagId);
    const tagResult = await drizzle
      .select()
      .from(promptTags)
      .where(inArray(promptTags.id, toIds(tagIds)));
    const foundTagIds = new Set(tagResult.map((r) => r.id));
    const missingTags = tagIds.filter((id) => !foundTagIds.has(id));
    if (missingTags.length > 0) {
      return notFound(c, `tags not found: ${missingTags.join(', ')}`);
    }
  }

  // Generate IDs
  const sessionId = generateId();
  const secondsPerTurn = request.secondsPerTurn ?? 60;
  const createdAt = new Date().toISOString();

  // Prepare NPC instance data
  const npcInstances: {
    id: string;
    characterId: string;
    character: (typeof loaded)['characters'][0];
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[] = [];

  for (const npc of request.npcs) {
    const character = npcCharacters.get(npc.characterId);
    if (character) {
      npcInstances.push({
        id: generateInstanceId(npc.characterId),
        characterId: npc.characterId,
        character,
        role: npc.role,
        tier: npc.tier,
        label: npc.label ?? null,
        startLocationId: npc.startLocationId ?? null,
      });
    }
  }

  if (npcInstances.length === 0) {
    return badRequest(c, 'at least one npc is required');
  }

  // Determine primary NPC (first one with role 'primary', or first NPC)
  const primaryNpc = npcInstances.find((n) => n.role === 'primary') ?? npcInstances[0];

  try {
    const responseData = await drizzle.transaction(async (tx) => {
      // 1. Create session
      console.log('[API] Creating session:', sessionId);
      await tx.insert(sessions).values({
        id: toId(sessionId),
        ownerEmail,
        name: `Session ${sessionId.substring(0, 8)}`,
        // Note: many built-in/test profiles use non-UUID IDs (e.g. "test-setting-001").
        // These session columns are UUID foreign keys, so we intentionally leave them null
        // and rely on actor state + projections for runtime behavior.
        playerCharacterId: null,
        settingId: null,
        status: 'active',
      });

      // 2. Create session projection
      await tx.insert(sessionProjections).values({
        sessionId: toSessionId(sessionId),
        location: request.startLocationId ? { currentLocationId: request.startLocationId } : {},
        inventory: {},
        time: request.startTime
          ? {
            current: {
              year: request.startTime.year ?? 1,
              month: request.startTime.month ?? 1,
              day: request.startTime.day ?? 1,
              hour: request.startTime.hour,
              minute: request.startTime.minute,
            },
            secondsPerTurn,
          }
          : {},
        worldState: {},
        lastEventSeq: 0n,
      });

      // Helper to resolve actor ID (template ID or 'player') to instance ID or 'player'
      const resolveActorId = (actorId: string): string | null => {
        if (actorId === 'player') return 'player';
        const instance = npcInstances.find((n) => n.characterId === actorId);
        return instance ? instance.id : null;
      };

      // 3. Create NPC actor states
      for (const npc of npcInstances) {
        console.log('[API] Creating character instance:', npc.id);

        interface AffinityState {
          relationshipType: string;
          affinity: {
            trust: number;
            fondness: number;
            fear: number;
          };
          createdAt: string;
        }

        const affinity = new Map<string, AffinityState>();
        if (request.relationships) {
          for (const rel of request.relationships) {
            const fromInstanceId = resolveActorId(rel.fromActorId);
            const toInstanceId = resolveActorId(rel.toActorId);

            if (toInstanceId === npc.id && fromInstanceId) {
              affinity.set(fromInstanceId, {
                relationshipType: rel.relationshipType,
                affinity: {
                  trust: rel.affinitySeed?.trust ?? 0.5,
                  fondness: rel.affinitySeed?.fondness ?? 0.5,
                  fear: rel.affinitySeed?.fear ?? 0.0,
                },
                createdAt,
              });
            }
          }
        }

        const affinityState = Object.fromEntries(affinity);

        await tx.insert(actorStates).values({
          id: toId(generateId()),
          sessionId: toSessionId(sessionId),
          actorType: 'npc',
          actorId: npc.id,
          entityProfileId: null,
          state: {
            role: npc.role,
            tier: npc.tier,
            label: npc.label,
            name: npc.character.name,
            profileJson: JSON.stringify(npc.character),
            location: npc.startLocationId ? { currentLocationId: npc.startLocationId } : undefined,
            affinity: affinityState,
            status: 'active',
          },
          lastEventSeq: 0n,
        });
      }

      // 4. Attach persona to session if provided
      if (request.personaId && personaProfile) {
        console.log('[API] Attaching persona:', request.personaId);
        await tx.insert(actorStates).values({
          id: toId(generateId()),
          sessionId: toSessionId(sessionId),
          actorType: 'player',
          actorId: 'player',
          entityProfileId: null,
          state: {
            profile: personaProfile,
            status: 'active',
          },
          lastEventSeq: 0n,
        });
      }

      // 5. Create tag bindings
      const tagBindings: {
        id: string;
        tagId: string;
        targetType: string;
        targetEntityId: string | null;
      }[] = [];

      const insertedTagIds = new Set<string>();

      if (request.tags) {
        for (const tag of request.tags) {
          const bindingId = generateId();
          const normalized = (
            'scope' in tag
              ? {
                tagId: tag.tagId,
                targetType: tag.scope,
                targetEntityId: tag.targetId ?? null,
              }
              : {
                tagId: tag.tagId,
                targetType: tag.targetType,
                targetEntityId: tag.targetEntityId ?? null,
              }
          ) as { tagId: string; targetType: string; targetEntityId: string | null };

          let targetEntityId: string | null = normalized.targetEntityId;

          // If binding targets a character/NPC by template ID, resolve to the instance ID created in this session.
          if (
            (normalized.targetType === 'npc' || normalized.targetType === 'character') &&
            targetEntityId
          ) {
            const npcInstance = npcInstances.find((n) => n.characterId === targetEntityId);
            targetEntityId = npcInstance?.id ?? targetEntityId;
          }

          // The current DB model stores tags at the session level (unique by sessionId+tagId).
          // The UI may expand a single tag into multiple bindings (e.g. per-character targets),
          // so we dedupe inserts to avoid unique constraint violations.
          if (!insertedTagIds.has(normalized.tagId)) {
            insertedTagIds.add(normalized.tagId);
            await tx.insert(sessionTags).values({
              id: toId(bindingId),
              sessionId: toSessionId(sessionId),
              tagId: toId(normalized.tagId),
              enabled: true,
            });
          }

          tagBindings.push({
            id: bindingId,
            tagId: normalized.tagId,
            targetType: normalized.targetType,
            targetEntityId,
          });
        }
      }

      // 6. Relationship Results
      const relationshipResults: {
        fromActorId: string;
        toActorId: string;
        relationshipType: string;
      }[] = [];
      if (request.relationships) {
        for (const rel of request.relationships) {
          relationshipResults.push({
            fromActorId: rel.fromActorId,
            toActorId: rel.toActorId,
            relationshipType: rel.relationshipType,
          });
        }
      }

      return {
        tagBindings,
        relationshipResults,
      };
    });

    console.log('[API] Session created successfully:', sessionId);

    // Build response
    const response: CreateFullSessionResponse = {
      id: sessionId,
      settingId: request.settingId,
      playerCharacterId: primaryNpc?.characterId ?? '',
      personaId: request.personaId ?? null,
      startLocationId: request.startLocationId ?? null,
      secondsPerTurn,
      createdAt,
      npcs: npcInstances.map((npc) => ({
        instanceId: npc.id,
        templateId: npc.characterId,
        role: npc.role,
        tier: npc.tier,
        label: npc.label,
        startLocationId: npc.startLocationId,
      })),
      tagBindings: responseData.tagBindings,
      relationships: responseData.relationshipResults,
    };

    return c.json(response, 201);
  } catch (err) {
    console.error('[API] Failed to create full session:', err);
    return serverError(c, `failed to create session: ${(err as Error).message}`);
  }
}
