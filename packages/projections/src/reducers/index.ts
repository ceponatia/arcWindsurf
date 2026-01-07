export * from './session.js';
export * from './location.js';
export * from './npc.js';

import { sessionProjection } from './session.js';
import { locationProjection } from './location.js';
import { npcProjection } from './npc.js';

export const allProjections = {
  session: sessionProjection,
  location: locationProjection,
  npcs: npcProjection,
};
