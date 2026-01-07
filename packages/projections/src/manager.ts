import { Projector } from './projector.js';
import { sessionProjection, type SessionState } from './reducers/session.js';
import { locationProjection, type LocationsState } from './reducers/location.js';
import { npcProjection, type NpcsState } from './reducers/npc.js';
import { patchReducer } from './reducers/patch.js';
import { saveProjectionState } from './snapshot/store.js';
import type { ReplayOptions } from './types.js';

/**
 * Manages all projections for a single session.
 */
export class ProjectionManager {
  public session: Projector<SessionState>;
  public location: Projector<LocationsState>;
  public npcs: Projector<NpcsState>;
  public inventory: Projector<Record<string, unknown>>;
  public time: Projector<Record<string, unknown>>;

  constructor(private sessionId: string) {
    this.session = new Projector(sessionProjection, sessionId);
    this.location = new Projector(locationProjection, sessionId);
    this.npcs = new Projector(npcProjection, sessionId);

    // Generic patch projectors for inventory and time
    this.inventory = new Projector(
      {
        name: 'inventory',
        reducer: patchReducer,
        initialState: Object.create(null) as Record<string, unknown>,
      },
      sessionId
    );
    this.time = new Projector(
      {
        name: 'time',
        reducer: patchReducer,
        initialState: Object.create(null) as Record<string, unknown>,
      },
      sessionId
    );
  }

  /**
   * Initialize all projectors by loading snapshots and replaying events.
   */
  async init(options: ReplayOptions = {}): Promise<void> {
    const projectors = [this.session, this.location, this.npcs, this.inventory, this.time];

    await Promise.all(projectors.map((p) => p.loadSnapshot()));
    await Promise.all(projectors.map((p) => p.replay(options)));
  }

  /**
   * Save current state of all projections as snapshots.
   */
  async saveSnapshots(): Promise<void> {
    const projectors = [this.session, this.location, this.npcs, this.inventory, this.time];

    await Promise.all(
      projectors.map((p) =>
        saveProjectionState({
          sessionId: this.sessionId,
          name: p.projection.name,
          state: p.getState(),
          lastEventSeq: p.getLastSequence(),
        })
      )
    );
  }

  /**
   * Get combined state of all projections.
   */
  getState() {
    return {
      session: this.session.getState(),
      location: this.location.getState(),
      npcs: this.npcs.getState(),
      inventory: this.inventory.getState(),
      time: this.time.getState(),
    };
  }
}
