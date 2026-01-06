import { type WorldEvent } from '@minimal-rpg/schemas';
import { type BusMiddleware } from './telemetry.js';
// We'll need a way to access the DB. Since @minimal-rpg/bus shouldn't 
// depend on @minimal-rpg/db directly (it's level 1, db is level 1),
// we might need to inject the persistence handler or use a global.
// Actually, the plan says bus imports schemas. db imports schemas.
// Layer 1: bus, llm, db. They are at the same level.
// This means bus shouldn't import db.
// Instead, the persistence handler should be registered by the app layer.

export type PersistenceHandler = (event: WorldEvent) => Promise<void>;

let persistenceHandler: PersistenceHandler | null = null;

export function registerPersistenceHandler(handler: PersistenceHandler) {
  persistenceHandler = handler;
}

export const persistenceMiddleware: BusMiddleware = async (event, next) => {
  if (persistenceHandler) {
    try {
      await persistenceHandler(event);
    } catch (err) {
      console.error('Failed to persist event', err);
      // We continue anyway to not block the bus? 
      // Or should we fail? Usually, for event sourcing, persistence is critical.
    }
  }
  await next();
};
