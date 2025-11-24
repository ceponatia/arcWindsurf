import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
  appendMessage as rawAppendMessage,
} from '@minimal-rpg/db/node';
import type { SessionsClientLike } from '../types.js';

export const createSession = rawCreateSession as SessionsClientLike['createSession'];
export const getSession = rawGetSession as SessionsClientLike['getSession'];
export const listSessions = rawListSessions as SessionsClientLike['listSessions'];
export const deleteSession = rawDeleteSession as SessionsClientLike['deleteSession'];
export const appendMessage = rawAppendMessage as SessionsClientLike['appendMessage'];
