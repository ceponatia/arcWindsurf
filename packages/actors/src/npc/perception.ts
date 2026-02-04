import type { WorldEvent } from '@minimal-rpg/schemas';
import type { PerceptionContext, NpcRuntimeState } from './types.js';

/**
 * Perception layer - filters and processes events for an NPC.
 */
export class PerceptionLayer {
  /**
   * Filter events relevant to this NPC.
   */
  static filterRelevantEvents(events: WorldEvent[], state: NpcRuntimeState): WorldEvent[] {
    return events.filter((event) => this.isRelevant(event, state));
  }

  /**
   * Check if an event is relevant to this NPC.
   */
  static isRelevant(event: WorldEvent, state: NpcRuntimeState): boolean {
    const rawEvent = event as Record<string, unknown>;
    const payload = rawEvent['payload'] as Record<string, unknown> | undefined;

    // Session filter
    const eventSessionId =
      (rawEvent['sessionId'] as string | undefined) ??
      (payload?.['sessionId'] as string | undefined);
    if (eventSessionId && eventSessionId !== state.sessionId) {
      return false;
    }

    // Location-based relevance
    const locationCandidates = [
      rawEvent['locationId'],
      rawEvent['toLocationId'],
      rawEvent['fromLocationId'],
      payload?.['locationId'],
      payload?.['toLocationId'],
      payload?.['fromLocationId'],
    ].filter((value): value is string => typeof value === 'string');

    const uniqueLocationIds = Array.from(new Set(locationCandidates));
    const hasLocation = uniqueLocationIds.length > 0;
    const isInNpcLocation = uniqueLocationIds.includes(state.locationId);

    if (hasLocation && !isInNpcLocation) {
      // Event is in a different location - not relevant unless it's a TICK or session-level event
      if (event.type !== 'TICK' && !event.type.includes('SESSION')) {
        return false;
      }
    }

    // Actor-specific events
    const targetActorId =
      (rawEvent['targetActorId'] as string | undefined) ??
      (payload?.['targetActorId'] as string | undefined);
    if (targetActorId && targetActorId !== state.id) {
      return false;
    }

    return true;
  }

  /**
   * Build perception context from recent events.
   */
  static buildContext(events: WorldEvent[], state: NpcRuntimeState): PerceptionContext {
    const relevantEvents = this.filterRelevantEvents(events, state);

    // Extract nearby actors from MOVED events
    const nearbyActors = new Set<string>();
    for (const event of relevantEvents) {
      if (event.type === 'MOVED') {
        const rawEvent = event as Record<string, unknown>;
        const actorId = rawEvent['actorId'] as string | undefined;
        const toLocationId = rawEvent['toLocationId'] as string | undefined;

        if (actorId && toLocationId === state.locationId) {
          nearbyActors.add(actorId);
        }
      }
    }

    return {
      relevantEvents,
      nearbyActors: Array.from(nearbyActors),
    };
  }

  /**
   * Summarize perception for logging/debugging.
   */
  static summarize(context: PerceptionContext): string {
    const eventTypes = context.relevantEvents.map((e) => e.type).join(', ');
    return `Perceived ${context.relevantEvents.length} events: ${eventTypes}. Nearby: ${context.nearbyActors.length} actors.`;
  }
}
