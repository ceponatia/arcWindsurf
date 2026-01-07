import { ProjectionManager } from '@minimal-rpg/projections';

/**
 * Service for managing world state projections.
 * This effectively replaces the legacy state loading logic by replaying events.
 */
class WorldProjectionService {
  private managers = new Map<string, ProjectionManager>();

  /**
   * Get or create a projection manager for a session.
   */
  async getManager(sessionId: string): Promise<ProjectionManager> {
    let manager = this.managers.get(sessionId);
    if (!manager) {
      manager = new ProjectionManager(sessionId);
      await manager.init();
      this.managers.set(sessionId, manager);
    } else {
      // Replay any new events since last access
      await Promise.all([
        manager.session.replay(),
        manager.location.replay(),
        manager.npcs.replay(),
        manager.inventory.replay(),
        manager.time.replay(),
      ]);
    }
    return manager;
  }

  /**
   * Refresh all projectors for a session and save snapshots if needed.
   */
  async refreshAndSave(sessionId: string): Promise<void> {
    const manager = await this.getManager(sessionId);
    await manager.saveSnapshots();
  }

  /**
   * Remove a manager from memory (e.g. on session end).
   */
  release(sessionId: string): void {
    this.managers.delete(sessionId);
  }
}

export const worldProjectionService = new WorldProjectionService();
