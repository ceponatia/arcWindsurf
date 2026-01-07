export * from './types.js';
export * from './projector.js';
export * from './manager.js';
export * from './reducers/index.js';
export * from './snapshot/store.js';

import { Projector } from './projector.js';
import { allProjections } from './reducers/index.js';

/**
 * Convenience factory to create projectors for all domains in a session.
 */
export async function createSessionProjectors(sessionId: string) {
  const session = new Projector(allProjections.session, sessionId);
  const location = new Projector(allProjections.location, sessionId);
  const npcs = new Projector(allProjections.npcs, sessionId);

  // Load initial snapshots if available
  await Promise.all([session.loadSnapshot(), location.loadSnapshot(), npcs.loadSnapshot()]);

  return {
    session,
    location,
    npcs,
  };
}
