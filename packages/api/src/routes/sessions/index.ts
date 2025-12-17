/**
 * Session routes module
 * Registers all session-related routes
 */
import type { Hono } from 'hono';
import type { LoadedDataGetter } from '../../data/types.js';
import { handleListSessions } from './list-sessions.js';
import { handleGetSession, handleCreateSession, handleDeleteSession } from './session-crud.js';
import { handleCreateFullSession } from './session-create-full.js';
import { handlePostMessage, handlePatchMessage, handleDeleteMessage } from './session-messages.js';
import { handleListNpcs, handleCreateNpc } from './session-npcs.js';
import { handleGetEffective } from './session-effective.js';
import { handlePutCharacterOverrides, handlePutSettingOverrides } from './session-overrides.js';

interface SessionRouteDeps {
  getLoaded: LoadedDataGetter;
}

export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps): void {
  // Session list
  app.get('/sessions', (c) => handleListSessions(c, deps.getLoaded));

  // Session creation (specific route before parameterized routes)
  app.post('/sessions/create-full', (c) => handleCreateFullSession(c, deps.getLoaded));
  app.post('/sessions', (c) => handleCreateSession(c, deps.getLoaded));

  // Session CRUD (parameterized routes after specific routes)
  app.get('/sessions/:id', (c) => handleGetSession(c));
  app.delete('/sessions/:id', (c) => handleDeleteSession(c));

  // Session messages
  app.post('/sessions/:id/messages', (c) => handlePostMessage(c, deps.getLoaded));
  app.patch('/sessions/:id/messages/:idx', (c) => handlePatchMessage(c));
  app.delete('/sessions/:id/messages/:idx', (c) => handleDeleteMessage(c));

  // Session NPCs
  app.get('/sessions/:id/npcs', (c) => handleListNpcs(c));
  app.post('/sessions/:id/npcs', (c) => handleCreateNpc(c, deps.getLoaded));

  // Session effective profiles
  app.get('/sessions/:id/effective', (c) => handleGetEffective(c, deps.getLoaded));

  // Session overrides (deprecated)
  app.put('/sessions/:id/overrides/character', (c) =>
    handlePutCharacterOverrides(c, deps.getLoaded)
  );
  app.put('/sessions/:id/overrides/setting', (c) => handlePutSettingOverrides(c, deps.getLoaded));
}
