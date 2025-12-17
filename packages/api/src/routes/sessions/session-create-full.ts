/**
 * Transactional Session Creation API
 * POST /sessions/create-full
 *
 * Creates a complete session with all related entities in a single atomic transaction.
 * This replaces the fragile multi-request session creation flow.
 */
import type { Context } from 'hono';
import { z } from 'zod';
import { pool } from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../data/types.js';
import { badRequest, serverError, notFound } from '../../util/responses.js';
import { generateId, generateInstanceId } from '../../util/id.js';
import { findCharacter, findSetting } from './shared.js';

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
  npcs: z.array(
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
  ),

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
      z.object({
        tagId: z.string().min(1),
        scope: z.enum(['session', 'npc']),
        /** Required if scope is 'npc' - the NPC character ID to attach the tag to */
        targetId: z.string().optional(),
      })
    )
    .optional(),
});

export type CreateFullSessionRequest = z.infer<typeof CreateFullSessionRequestSchema>;

/**
 * Response type for full session creation
 */
export interface CreateFullSessionResponse {
  id: string;
  settingTemplateId: string;
  settingInstanceId: string;
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

  const loaded = getLoaded();
  if (!loaded) {
    console.error('[API] Data not loaded');
    return serverError(c, 'data not loaded');
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return badRequest(c, 'invalid json body');
  }

  const parseResult = CreateFullSessionRequestSchema.safeParse(body);
  if (!parseResult.success) {
    console.error('[API] Validation failed:', parseResult.error.flatten());
    return badRequest(c, `validation failed: ${JSON.stringify(parseResult.error.flatten())}`);
  }

  const request = parseResult.data;

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
  let personaProfile: unknown = null;
  if (request.personaId) {
    const personaResult = await pool.query(
      'SELECT profile_json FROM personas WHERE id = $1 LIMIT 1',
      [request.personaId]
    );
    if (personaResult.rows.length === 0) {
      // Also check persona_profiles table (alternate location)
      const profileResult = await pool.query(
        'SELECT profile_json FROM persona_profiles WHERE id = $1 LIMIT 1',
        [request.personaId]
      );
      if (profileResult.rows.length === 0) {
        return notFound(c, `persona not found: ${request.personaId}`);
      }
      const row = profileResult.rows[0] as { profile_json: unknown };
      personaProfile = row.profile_json;
    } else {
      const row = personaResult.rows[0] as { profile_json: unknown };
      personaProfile = row.profile_json;
    }
  }

  // Validate tags exist if provided
  if (request.tags && request.tags.length > 0) {
    const tagIds = request.tags.map((t) => t.tagId);
    const tagResult = await pool.query('SELECT id FROM prompt_tags WHERE id = ANY($1)', [tagIds]);
    const foundTagIds = new Set((tagResult.rows as { id: string }[]).map((r) => r.id));
    const missingTags = tagIds.filter((id) => !foundTagIds.has(id));
    if (missingTags.length > 0) {
      return notFound(c, `tags not found: ${missingTags.join(', ')}`);
    }
  }

  // Generate IDs
  const sessionId = generateId();
  const settingInstanceId = generateInstanceId(setting.id);
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
  }[] = request.npcs.map((npc) => ({
    id: generateInstanceId(npc.characterId),
    characterId: npc.characterId,
    character: npcCharacters.get(npc.characterId)!,
    role: npc.role,
    tier: npc.tier,
    label: npc.label ?? null,
    startLocationId: npc.startLocationId ?? null,
  }));

  // Determine primary NPC (first one with role 'primary', or first NPC)
  const primaryNpc = npcInstances.find((n) => n.role === 'primary') ?? npcInstances[0];

  // Start transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create user session
    console.log('[API] Creating session:', sessionId);
    await client.query(
      `INSERT INTO user_sessions (id, character_template_id, setting_template_id)
       VALUES ($1, $2, $3)`,
      [sessionId, primaryNpc?.characterId ?? '', request.settingId]
    );

    // 2. Create setting instance
    console.log('[API] Creating setting instance:', settingInstanceId);
    await client.query(
      `INSERT INTO setting_instances (id, session_id, template_id, template_snapshot, profile_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
      [settingInstanceId, sessionId, setting.id, JSON.stringify(setting), JSON.stringify(setting)]
    );

    // 3. Create NPC character instances
    for (const npc of npcInstances) {
      console.log('[API] Creating character instance:', npc.id);
      await client.query(
        `INSERT INTO character_instances 
         (id, session_id, template_id, template_snapshot, profile_json, overrides_json, role, label)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, '{}'::jsonb, $6, $7)`,
        [
          npc.id,
          sessionId,
          npc.characterId,
          JSON.stringify(npc.character),
          JSON.stringify(npc.character),
          npc.role,
          npc.label,
        ]
      );

      // If NPC has a starting location, create initial location state
      if (npc.startLocationId) {
        await client.query(
          `INSERT INTO session_npc_location_state 
           (id, session_id, npc_id, location_id, activity_json, arrived_at_json, interruptible)
           VALUES ($1, $2, $3, $4, '{"type": "idle"}'::jsonb, '{}'::jsonb, TRUE)`,
          [generateId(), sessionId, npc.id, npc.startLocationId]
        );
      }
    }

    // 4. Attach persona to session if provided
    if (request.personaId && personaProfile) {
      console.log('[API] Attaching persona:', request.personaId);
      await client.query(
        `INSERT INTO session_personas (session_id, persona_id, profile_json, overrides_json)
         VALUES ($1, $2, $3::jsonb, '{}'::jsonb)`,
        [
          sessionId,
          request.personaId,
          typeof personaProfile === 'string' ? personaProfile : JSON.stringify(personaProfile),
        ]
      );
    }

    // 5. Create tag bindings
    const tagBindings: {
      id: string;
      tagId: string;
      targetType: string;
      targetEntityId: string | null;
    }[] = [];

    if (request.tags) {
      for (const tag of request.tags) {
        const bindingId = generateId();
        let targetEntityId: string | null = null;

        if (tag.scope === 'npc' && tag.targetId) {
          // Find the NPC instance ID for this character
          const npcInstance = npcInstances.find((n) => n.characterId === tag.targetId);
          targetEntityId = npcInstance?.id ?? tag.targetId;
        }

        await client.query(
          `INSERT INTO session_tag_bindings (id, session_id, tag_id, target_type, target_entity_id, enabled)
           VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [bindingId, sessionId, tag.tagId, tag.scope, targetEntityId]
        );

        tagBindings.push({
          id: bindingId,
          tagId: tag.tagId,
          targetType: tag.scope,
          targetEntityId,
        });
      }
    }

    // 6. Create initial relationship states
    const relationshipResults: {
      fromActorId: string;
      toActorId: string;
      relationshipType: string;
    }[] = [];

    if (request.relationships) {
      for (const rel of request.relationships) {
        const defaultAffinity = {
          trust: rel.affinitySeed?.trust ?? 0.5,
          fondness: rel.affinitySeed?.fondness ?? 0.5,
          fear: rel.affinitySeed?.fear ?? 0.0,
        };

        const state = {
          relationshipType: rel.relationshipType,
          affinity: defaultAffinity,
          createdAt,
        };

        // Create affinity state for the 'to' actor perspective
        await client.query(
          `INSERT INTO session_affinity_state (id, session_id, npc_id, state_json)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (session_id, npc_id) DO UPDATE SET
             state_json = session_affinity_state.state_json || $4::jsonb,
             updated_at = now()`,
          [generateId(), sessionId, rel.toActorId, JSON.stringify({ [rel.fromActorId]: state })]
        );

        relationshipResults.push({
          fromActorId: rel.fromActorId,
          toActorId: rel.toActorId,
          relationshipType: rel.relationshipType,
        });
      }
    }

    // 7. Initialize time state if start time provided
    if (request.startTime) {
      const timeState = {
        current: {
          year: request.startTime.year ?? 1,
          month: request.startTime.month ?? 1,
          day: request.startTime.day ?? 1,
          hour: request.startTime.hour,
          minute: request.startTime.minute,
        },
        secondsPerTurn,
      };

      await client.query(
        `INSERT INTO session_time_state (id, session_id, state_json)
         VALUES ($1, $2, $3::jsonb)`,
        [generateId(), sessionId, JSON.stringify(timeState)]
      );
    }

    // 8. Initialize player location state if provided
    if (request.startLocationId) {
      await client.query(
        `INSERT INTO session_location_state (id, session_id, state_json)
         VALUES ($1, $2, $3::jsonb)`,
        [generateId(), sessionId, JSON.stringify({ currentLocationId: request.startLocationId })]
      );
    }

    await client.query('COMMIT');
    console.log('[API] Session created successfully:', sessionId);

    // Build response
    const response: CreateFullSessionResponse = {
      id: sessionId,
      settingTemplateId: request.settingId,
      settingInstanceId,
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
      tagBindings,
      relationships: relationshipResults,
    };

    return c.json(response, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[API] Failed to create full session, rolled back:', err);
    return serverError(c, 'failed to create session');
  } finally {
    client.release();
  }
}
