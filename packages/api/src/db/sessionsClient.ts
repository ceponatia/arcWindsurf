import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
  appendMessage as rawAppendMessage,
  listPromptTags as rawListPromptTags,
  getPromptTag as rawGetPromptTag,
  createPromptTag as rawCreatePromptTag,
  updatePromptTag as rawUpdatePromptTag,
  deletePromptTag as rawDeletePromptTag,
  createSessionTagInstances as rawCreateSessionTagInstances,
  getSessionTagInstances as rawGetSessionTagInstances,
} from '@minimal-rpg/db/node';
import type { SessionsClientLike } from '../types.js';

export const createSession = rawCreateSession as SessionsClientLike['createSession'];
export const getSession = rawGetSession as SessionsClientLike['getSession'];
export const listSessions = rawListSessions as SessionsClientLike['listSessions'];
export const deleteSession = rawDeleteSession as SessionsClientLike['deleteSession'];
export const appendMessage = rawAppendMessage as SessionsClientLike['appendMessage'];

// Tag helpers (not strictly part of SessionsClientLike yet, but exported here for convenience)
export const listPromptTags = rawListPromptTags;
export const getPromptTag = rawGetPromptTag;
export const createPromptTag = rawCreatePromptTag;
export const updatePromptTag = rawUpdatePromptTag;
export const deletePromptTag = rawDeletePromptTag;
export const createSessionTagInstances = rawCreateSessionTagInstances;
export const getSessionTagInstances = rawGetSessionTagInstances;
