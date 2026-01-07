import { type SignalStore } from '../types.js';
import * as session from './session.js';
import * as actors from './actors.js';
import * as events from './events.js';
import * as ui from './ui.js';

export const signals: SignalStore = {
  session: {
    status: session.sessionStatus,
    id: session.currentSessionId,
    turnKey: session.turnKey,
  },
  actors: {
    states: actors.actorStates,
    activeIds: actors.activeActorIds,
  },
  events: {
    log: events.eventLog,
    lastEvent: events.lastEvent,
  },
  ui: {
    viewMode: ui.viewMode,
    overlayOpen: ui.overlayOpen,
    selectedActorId: ui.selectedActorId,
  },
};

export * from './session.js';
export * from './actors.js';
export * from './events.js';
export * from './ui.js';
