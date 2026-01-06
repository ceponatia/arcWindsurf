/**
 * Turn State Persistence
 *
 * Handles persisting state changes, messages, and logs after a turn.
 */
import {
  appendMessage,
  appendNpcMessage,
  appendStateChangeLog,
  appendSessionHistoryEntry,
  upsertLocationState,
  upsertInventoryState,
  upsertTimeState,
} from '../../../db/sessionsClient.js';
import { db } from '../../../db/prismaClient.js';
import { persistSessionState } from '../../../services/index.js';
import type { TurnResult } from '@minimal-rpg/governor';
import type { ProximityState } from '@minimal-rpg/schemas';
import type { Speaker } from '../../../types.js';
import type { TurnPersistenceData } from './types.js';

/**
 * Persist player input as a message.
 *
 * @param ownerEmail - Owner key for tenancy scoping
 * @param sessionId - Session ID
 * @param input - Player input text
 */
export async function persistPlayerInput(
  ownerEmail: string,
  sessionId: string,
  input: string
): Promise<void> {
  await appendMessage(ownerEmail, sessionId, 'user', input);
}

/**
 * Persist assistant response message with speaker metadata.
 *
 * @param sessionId - Session ID
 * @param message - Response text
 * @param speaker - Speaker metadata (optional)
 */
export async function persistAssistantMessage(
  ownerEmail: string,
  sessionId: string,
  message: string,
  speaker?: Speaker
): Promise<void> {
  if (!message.trim()) return;

  const speakerForDb = speaker
    ? {
        id: speaker.id,
        name: speaker.name,
        ...(speaker.profilePic ? { profilePic: speaker.profilePic } : {}),
      }
    : undefined;

  await appendMessage(ownerEmail, sessionId, 'assistant', message, speakerForDb);
}

/**
 * Persist state changes from turn result.
 *
 * @param data - Turn persistence data
 * @param turnResult - Turn result from governor
 */
export async function persistStateChanges(
  ownerEmail: string,
  data: TurnPersistenceData,
  turnResult: TurnResult
): Promise<void> {
  const { sessionId, loadedState, turnIdx } = data;
  const { stateChanges } = turnResult;

  if (!stateChanges?.patchCount || stateChanges.patchCount === 0) {
    return;
  }

  const effective = stateChanges.newEffectiveState;
  const npcInstanceId = loadedState.instances.activeNpc.id;
  const npcIsPrimary = loadedState.npcIsPrimary;

  if (effective) {
    const { character, setting, location, inventory, time, npc } = effective;

    // Persist character slice if present
    if (character && loadedState.instances.primaryCharacter.id) {
      await db.characterInstance.update({
        where: { id: loadedState.instances.primaryCharacter.id },
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
    if (setting && loadedState.instances.setting.id) {
      await db.settingInstance.update({
        where: { id: loadedState.instances.setting.id },
        data: { profileJson: JSON.stringify(setting) },
      });
    }

    // Persist per-session slices for location, inventory, and time
    if (location) {
      await upsertLocationState(ownerEmail, sessionId, location);
    }
    if (inventory) {
      await upsertInventoryState(ownerEmail, sessionId, inventory);
    }
    if (time) {
      await upsertTimeState(ownerEmail, sessionId, time);
    }

    // Persist proximity state to session cache
    const newProximity = effective['proximity'] as ProximityState | undefined;
    if (newProximity) {
      persistSessionState({
        sessionId,
        proximity: newProximity,
        turnNumber: turnIdx,
      });
    }
  }

  // Persist overrides
  const newOverrides = stateChanges.newOverrides;
  if (newOverrides) {
    const primaryOverridesUpdate =
      npcIsPrimary && newOverrides.npc ? newOverrides.npc : newOverrides.character;

    if (primaryOverridesUpdate && loadedState.instances.primaryCharacter.id) {
      await db.characterInstance.update({
        where: { id: loadedState.instances.primaryCharacter.id },
        data: { overridesJson: JSON.stringify(primaryOverridesUpdate) },
      });
    }

    if (!npcIsPrimary && newOverrides.npc && npcInstanceId) {
      await db.characterInstance.update({
        where: { id: npcInstanceId },
        data: { overridesJson: JSON.stringify(newOverrides.npc) },
      });
    }

    if (newOverrides.setting && loadedState.instances.setting.id) {
      await db.settingInstance.update({
        where: { id: loadedState.instances.setting.id },
        data: { overridesJson: JSON.stringify(newOverrides.setting) },
      });
    }
  }

  // Audit state changes for debugging/tuning
  await appendStateChangeLog({
    ownerEmail,
    sessionId,
    turnIdx,
    patchCount: stateChanges.patchCount,
    modifiedPaths: stateChanges.modifiedPaths ?? [],
    agentTypes: turnResult.metadata?.agentsInvoked ?? [],
    metadata: {
      success: turnResult.success,
    },
  });
}

/**
 * Persist per-NPC transcript when NPC agent replied.
 *
 * @param sessionId - Session ID
 * @param playerInput - Player's input text
 * @param turnResult - Turn result from governor
 * @param activeNpcId - ID of active NPC instance
 * @param primaryCharacterId - ID of primary character instance
 */
export async function persistNpcTranscript(
  ownerEmail: string,
  sessionId: string,
  playerInput: string,
  turnResult: TurnResult,
  activeNpcId: string,
  primaryCharacterId: string
): Promise<void> {
  const npcOutputs = turnResult.metadata?.agentOutputs?.filter((o) => o.agentType === 'npc');
  if (!npcOutputs || npcOutputs.length === 0) return;

  // Access intent via bracket notation since it may be dynamically added
  const metadata = turnResult.metadata as Record<string, unknown> | undefined;
  const intent = metadata?.['intent'] as { params?: { npcId?: string } } | undefined;
  const detectedNpcId = intent?.params?.npcId;
  const npcId =
    detectedNpcId && detectedNpcId.trim().length > 0
      ? detectedNpcId
      : (activeNpcId ?? primaryCharacterId);

  // Record the player's utterance for this NPC transcript
  await appendNpcMessage(ownerEmail, sessionId, npcId, 'player', playerInput);

  // Record NPC replies (typically one per turn)
  for (const npc of npcOutputs) {
    const narrative = npc.output.narrative?.trim() ?? '';
    if (narrative) {
      await appendNpcMessage(ownerEmail, sessionId, npcId, 'npc', narrative);
    }
  }
}

/**
 * Persist session history entry with debug info.
 *
 * @param data - Turn persistence data
 * @param turnResult - Turn result from governor
 */
export async function persistSessionHistory(
  ownerEmail: string,
  data: TurnPersistenceData,
  turnResult: TurnResult
): Promise<void> {
  const { sessionId, playerInput, turnIdx, sessionTags, persona, baseline, overrides } = data;

  // Access dynamic fields via bracket notation
  const metadata = turnResult.metadata as Record<string, unknown> | undefined;

  const historyContext = {
    intent: metadata?.['intent'],
    sessionTags,
    npcId: data.loadedState.instances.activeNpc.id ?? undefined,
    turnNumber: turnIdx,
    baseline,
    overrides,
    persona,
  };

  const historyDebug = {
    phaseTiming: turnResult.metadata?.phaseTiming,
    agentsInvoked: turnResult.metadata?.agentsInvoked,
    nodesRetrieved: turnResult.metadata?.nodesRetrieved,
    intentDebug: metadata?.['intentDebug'],
    agentOutputs: turnResult.metadata?.agentOutputs?.map((o) => ({
      agentType: o.agentType,
      narrative: o.output.narrative,
      diagnostics: o.output.diagnostics,
    })),
    events: turnResult.events.map((evt) => ({
      ...evt,
      timestamp: evt.timestamp instanceof Date ? evt.timestamp.toISOString() : evt.timestamp,
    })),
    stateChanges: turnResult.stateChanges,
  };

  try {
    await appendSessionHistoryEntry({
      ownerEmail,
      sessionId,
      turnIdx,
      playerInput,
      ownerUserId: null,
      context: historyContext,
      debug: historyDebug,
    });
  } catch (err) {
    console.warn('[turns] Failed to append session history:', (err as Error).message);
  }
}
