/**
 * Session Snapshot Loader
 *
 * Loads session data including messages, tags, persona, and speaker info.
 */
import { getSession, getSessionTagsWithDefinitions } from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import { PersonaProfileSchema, type PersonaProfile } from '@minimal-rpg/schemas';
import type { SessionTag } from '@minimal-rpg/governor';
import type { Speaker } from '../../types.js';
import type { SessionSnapshot } from './types.js';
import type { LoadedTurnState } from '../../sessions/state-loader.js';
import { buildTurnTagContext, type TagBindingWithDefinition } from './tag-routing.js';

/**
 * Load complete session snapshot after player input has been persisted.
 *
 * @param sessionId - Session ID
 * @param loadedState - Previously loaded turn state
 * @returns Session snapshot with messages, tags, persona, and speaker
 */
export async function loadSessionSnapshot(
  ownerEmail: string,
  sessionId: string,
  loadedState: LoadedTurnState
): Promise<SessionSnapshot> {
  // Re-load session to pick up the newly appended message
  const session = await getSession(ownerEmail, sessionId);
  if (!session) {
    throw new Error('session not found after append');
  }

  // Load enabled session tag bindings (MVP: bound + enabled, do not hardcode activation_mode semantics)
  const tagBindingsWithDefs = await getSessionTagsWithDefinitions(ownerEmail, sessionId, {
    enabledOnly: true,
  });

  // Build per-turn routed tag context (session + per-NPC + per-location)
  const npcLocationById = new Map<string, string | undefined>();
  for (const [npcId, loc] of loadedState.npcLocationStates.entries()) {
    npcLocationById.set(npcId, loc.locationId);
  }

  const turnTagContext = buildTurnTagContext({
    bindings: tagBindingsWithDefs as unknown as TagBindingWithDefinition[],
    ...(loadedState.playerLocationId !== undefined && {
      playerLocationId: loadedState.playerLocationId,
    }),
    npcLocationById,
  });

  // Back-compat: governor system prompt currently consumes sessionTags only.
  // Keep these as session-targeted bindings.
  const sessionTags: SessionTag[] = (tagBindingsWithDefs as unknown as TagBindingWithDefinition[])
    .filter((b) => b.target_type === 'session')
    .map((b) => ({
      id: b.id,
      sessionId: sessionId,
      tagId: b.tag_id,
      name: b.tag.name,
      promptText: b.tag.prompt_text,
      shortDescription: b.tag.short_description ?? undefined,
    }));

  // Load session persona if attached (for NPC agent context about the player)
  let persona: PersonaProfile | undefined;
  try {
    const sessionPersona = await db.sessionPersona.findUnique({
      where: { sessionId },
    });
    if (sessionPersona) {
      persona = PersonaProfileSchema.parse(JSON.parse(sessionPersona.profileJson));
    }
  } catch (err) {
    // Log but don't fail the turn if persona data is invalid
    console.warn('[turns] Failed to load session persona:', (err as Error).message);
  }

  // Build speaker metadata from active NPC for persisting with assistant message
  const activeNpcBaseline = loadedState.baseline.npc;
  const speaker: Speaker | undefined = activeNpcBaseline
    ? {
        id: loadedState.instances.activeNpc.templateId ?? sessionId,
        name: (activeNpcBaseline as { name?: string }).name ?? 'Unknown',
        profilePic: (activeNpcBaseline as { profilePic?: string }).profilePic,
        emotePic: (activeNpcBaseline as { emotePic?: string }).emotePic,
      }
    : undefined;

  return {
    sessionId,
    loadedState,
    messages: session.messages,
    sessionTags,
    turnTagContext,
    ...(persona ? { persona } : {}),
    ...(speaker ? { speaker } : {}),
  };
}
