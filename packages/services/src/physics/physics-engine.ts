import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';

type MoveIntent = Extract<WorldEvent, { type: 'MOVE_INTENT' }>;
type MovedEffect = Extract<WorldEvent, { type: 'MOVED' }>;

/**
 * PhysicsService
 *
 * Subscribes to movement intents and emits movement effects.
 * This is a thin placeholder until full physics/pathfinding is added.
 */
export class PhysicsService {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    if (event.type !== 'MOVE_INTENT') return;

    const move: MoveIntent = event;
    const raw = move as Record<string, unknown>;
    const actorId = typeof raw['actorId'] === 'string' ? raw['actorId'] : 'unknown';
    const fromLocationId =
      typeof raw['fromLocationId'] === 'string' ? raw['fromLocationId'] : 'unknown';

    const effect: MovedEffect = {
      type: 'MOVED',
      actorId,
      fromLocationId,
      toLocationId: move.destinationId,
    };

    await worldBus.emit(effect);
  };

  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
  }

  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
  }
}

export const physicsService = new PhysicsService();
