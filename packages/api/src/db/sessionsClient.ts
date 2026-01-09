import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
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
} from '@minimal-rpg/db/node';

export const createSession: typeof rawCreateSession = rawCreateSession;
export const getSession: typeof rawGetSession = rawGetSession;
export const listSessions: typeof rawListSessions = rawListSessions;
export const deleteSession: typeof rawDeleteSession = rawDeleteSession;

// Per-session state slice helpers
// Deprecated slice helpers removed (use projections instead)

// Enhanced tag CRUD functions
export const listPromptTags: typeof rawListPromptTags = rawListPromptTags;
export const getPromptTag: typeof rawGetPromptTag = rawGetPromptTag;
export const createPromptTag: typeof rawCreatePromptTag = rawCreatePromptTag;
export const updatePromptTag: typeof rawUpdatePromptTag = rawUpdatePromptTag;
export const deletePromptTag: typeof rawDeletePromptTag = rawDeletePromptTag;

// Session tag binding functions
export const createSessionTagBinding: typeof rawCreateSessionTagBinding = rawCreateSessionTagBinding;
export const getSessionTagsWithDefinitions: typeof rawGetSessionTagsWithDefinitions =
  rawGetSessionTagsWithDefinitions;
export const toggleSessionTagBinding: typeof rawToggleSessionTagBinding = rawToggleSessionTagBinding;
export const deleteSessionTagBinding: typeof rawDeleteSessionTagBinding = rawDeleteSessionTagBinding;

// Session location map functions
// Legacy session location map helpers removed in favor of createLocationMap/getLocationMap

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
  listActorStatesForSession,
  upsertActorState,
} from '@minimal-rpg/db/node';

// Re-export Record types for consumers
export type { SessionLocationMapRecord, PlayerInterestRecord } from '@minimal-rpg/db/node';
