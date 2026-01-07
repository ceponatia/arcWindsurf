import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
  // Per-session state slice helpers
  getLocationState as rawGetLocationState,
  getInventoryState as rawGetInventoryState,
  getTimeState as rawGetTimeState,
  // Enhanced tag functions
  listPromptTags as rawListPromptTags,
  getPromptTag as rawGetPromptTag,
  createPromptTag as rawCreatePromptTag,
  updatePromptTag as rawUpdatePromptTag,
  deletePromptTag as rawDeletePromptTag,
  // Session tag binding functions
  createSessionTagBinding as rawCreateSessionTagBinding,
  getSessionTagsWithDefinitions as rawGetSessionTagsWithDefinitions,
  toggleSessionTagBinding as rawToggleSessionTagBinding,
  deleteSessionTagBinding as rawDeleteSessionTagBinding,
  // Session location map functions
  getSessionLocationMap as rawGetSessionLocationMap,
  createSessionLocationMap as rawCreateSessionLocationMap,
  deleteSessionLocationMap as rawDeleteSessionLocationMap,
} from '@minimal-rpg/db/node';

export const createSession = rawCreateSession;
export const getSession = rawGetSession;
export const listSessions = rawListSessions;
export const deleteSession = rawDeleteSession;

// Per-session state slice helpers
export const getLocationState = rawGetLocationState;
export const getInventoryState = rawGetInventoryState;
export const getTimeState = rawGetTimeState;

// Enhanced tag CRUD functions
export const listPromptTags = rawListPromptTags;
export const getPromptTag = rawGetPromptTag;
export const createPromptTag = rawCreatePromptTag;
export const updatePromptTag = rawUpdatePromptTag;
export const deletePromptTag = rawDeletePromptTag;

// Session tag binding functions
export const createSessionTagBinding = rawCreateSessionTagBinding;
export const getSessionTagsWithDefinitions = rawGetSessionTagsWithDefinitions;
export const toggleSessionTagBinding = rawToggleSessionTagBinding;
export const deleteSessionTagBinding = rawDeleteSessionTagBinding;

// Session location map functions
export const getSessionLocationMap = rawGetSessionLocationMap;
export const createSessionLocationMap = rawCreateSessionLocationMap;
export const deleteSessionLocationMap = rawDeleteSessionLocationMap;

// World functions
export {
  createLocationMap,
  getLocationMap,
  listLocationMaps,
  updateLocationMap,
  deleteLocationMap,
  createLocationPrefab,
  getLocationPrefab,
  listLocationPrefabs,
} from '@minimal-rpg/db/node';

// Actor/Profile/User functions (Migrated)
export {
  listEntityProfiles,
  getEntityProfile,
  createEntityProfile,
  updateEntityProfile,
  deleteEntityProfile,
  getActorState,
  listActorStates,
  saveActorState,
  getOwnerEmail,
  ensureUserAccount,
} from '@minimal-rpg/db/node';

// Re-export Record types for consumers
export type { SessionLocationMapRecord, PlayerInterestRecord } from '@minimal-rpg/db/node';
