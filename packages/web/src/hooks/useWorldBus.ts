import { useEffect } from 'react';
import { connectStream } from '../services/stream.js';
import { API_BASE_URL } from '../config.js';
import {
  updateSessionStatus,
  addEvent,
  updateActorState,
  incrementTick,
  setTick,
} from '../signals/index.js';
import type { StreamEvent } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asStreamEvent(value: unknown): StreamEvent | null {
  if (!isRecord(value)) return null;
  const type = value['type'];
  if (typeof type !== 'string') return null;
  return value as StreamEvent;
}

export interface UseWorldBusOptions {
  onEvent?: (event: StreamEvent) => void;
}

/**
 * useWorldBus hook manages the SSE connection and dispatches events to signals.
 */
export function useWorldBus(sessionId: string | null, options?: UseWorldBusOptions) {
  useEffect(() => {
    if (!sessionId) return;

    const url = new URL(`/stream/${sessionId}`, API_BASE_URL).toString();

    const disconnect = connectStream(url, {
      onStatusChange: (status) => {
        updateSessionStatus(status);
      },
      onMessage: (data: unknown) => {
        const event = asStreamEvent(data);
        if (!event) return;

        options?.onEvent?.(event);

        // Add all events to the log for transparency
        addEvent(event);

        // Minimal UI-derived state updates
        switch (event.type) {
          case 'TICK': {
            const tick = event['tick'];
            if (typeof tick === 'number') {
              setTick(tick);
            } else {
              incrementTick();
            }
            break;
          }

          case 'ACTOR_SPAWN': {
            const actorId = event['actorId'];
            const locationId = event['locationId'];
            if (typeof actorId === 'string' && typeof locationId === 'string') {
              updateActorState(actorId, { locationId });
            }
            break;
          }

          case 'MOVED': {
            const actorId = event['actorId'];
            const toLocationId = event['toLocationId'];
            if (typeof actorId === 'string' && typeof toLocationId === 'string') {
              updateActorState(actorId, { locationId: toLocationId });
            }
            break;
          }
        }
      },
      onError: (err) => {
        console.error('[useWorldBus] Stream error:', err);
      },
    });

    return () => {
      disconnect();
    };
  }, [sessionId, options]);
}
