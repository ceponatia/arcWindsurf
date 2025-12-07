import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
  appendMessage as rawAppendMessage,
  appendNpcMessage as rawAppendNpcMessage,
  getNpcMessages as rawGetNpcMessages,
  appendStateChangeLog as rawAppendStateChangeLog,
  getLocationState as rawGetLocationState,
  upsertLocationState as rawUpsertLocationState,
  getInventoryState as rawGetInventoryState,
  upsertInventoryState as rawUpsertInventoryState,
  getTimeState as rawGetTimeState,
  upsertTimeState as rawUpsertTimeState,
  // Enhanced tag functions
  listPromptTags as rawListPromptTags,
  getPromptTag as rawGetPromptTag,
  createPromptTag as rawCreatePromptTag,
  updatePromptTag as rawUpdatePromptTag,
  deletePromptTag as rawDeletePromptTag,
  // Session tag binding functions
  createSessionTagBinding as rawCreateSessionTagBinding,
  getSessionTagBindings as rawGetSessionTagBindings,
  getSessionTagsWithDefinitions as rawGetSessionTagsWithDefinitions,
  toggleSessionTagBinding as rawToggleSessionTagBinding,
  deleteSessionTagBinding as rawDeleteSessionTagBinding,
  clearSessionTagBindings as rawClearSessionTagBindings,
} from '@minimal-rpg/db/node';
import type { SessionsClientLike } from '../types.js';

export const createSession = rawCreateSession as SessionsClientLike['createSession'];
export const getSession = rawGetSession as SessionsClientLike['getSession'];
export const listSessions = rawListSessions as SessionsClientLike['listSessions'];
export const deleteSession = rawDeleteSession as SessionsClientLike['deleteSession'];
export const appendMessage = rawAppendMessage as SessionsClientLike['appendMessage'];
export const appendNpcMessage = rawAppendNpcMessage as SessionsClientLike['appendNpcMessage'];
export const getNpcMessages = rawGetNpcMessages as SessionsClientLike['getNpcMessages'];
export const appendStateChangeLog =
  rawAppendStateChangeLog as SessionsClientLike['appendStateChangeLog'];

// Per-session state slice helpers
export const getLocationState = rawGetLocationState;
export const upsertLocationState = rawUpsertLocationState;
export const getInventoryState = rawGetInventoryState;
export const upsertInventoryState = rawUpsertInventoryState;
export const getTimeState = rawGetTimeState;
export const upsertTimeState = rawUpsertTimeState;

// Enhanced tag CRUD functions
export const listPromptTags = rawListPromptTags;
export const getPromptTag = rawGetPromptTag;
export const createPromptTag = rawCreatePromptTag;
export const updatePromptTag = rawUpdatePromptTag;
export const deletePromptTag = rawDeletePromptTag;

// Session tag binding functions
export const createSessionTagBinding = rawCreateSessionTagBinding;
export const getSessionTagBindings = rawGetSessionTagBindings;
export const getSessionTagsWithDefinitions = rawGetSessionTagsWithDefinitions;
export const toggleSessionTagBinding = rawToggleSessionTagBinding;
export const deleteSessionTagBinding = rawDeleteSessionTagBinding;
export const clearSessionTagBindings = rawClearSessionTagBindings;
