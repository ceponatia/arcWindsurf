import { worldBus } from '@minimal-rpg/bus';
import type { WorldEvent } from '@minimal-rpg/schemas';

/**
 * DialogueService
 *
 * Converts `SPEAK_INTENT` events into `SPOKE` effects so NPC speech becomes observable
 * and persistable on the World Bus. This keeps the pipeline deterministic and allows
 * downstream consumers (projections, clients) to listen to a single effect type.
 */
export class DialogueService {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    if (event.type !== 'SPEAK_INTENT') return;

    const source = event as Record<string, unknown>;
    const actorId = typeof source['actorId'] === 'string' ? source['actorId'] : 'unknown';
    const sessionId = typeof source['sessionId'] === 'string' ? source['sessionId'] : undefined;

    if (!sessionId) {
      // Speech without session context cannot be persisted or routed safely.
      return;
    }

    const spokeEvent: WorldEvent = {
      type: 'SPOKE',
      actorId,
      content: String(source['content'] ?? ''),
      targetActorId:
        typeof source['targetActorId'] === 'string' ? source['targetActorId'] : undefined,
      sessionId,
      timestamp: source['timestamp'] instanceof Date ? (source['timestamp'] as Date) : new Date(),
    };

    await worldBus.emit(spokeEvent);
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

export const dialogueService = new DialogueService();
