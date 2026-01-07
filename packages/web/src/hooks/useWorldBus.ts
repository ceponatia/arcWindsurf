import { useEffect } from 'react';
import { connectStream } from '../services/stream.js';
import {
  updateSessionStatus,
  addEvent,
  updateActorState,
  incrementTick,
} from '../signals/index.js';

/**
 * useWorldBus hook manages the SSE connection and dispatches events to signals.
 */
export function useWorldBus(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const url = `/api/stream/${sessionId}`;

    const disconnect = connectStream(url, {
      onStatusChange: (status) => {
        updateSessionStatus(status);
      },
      onMessage: (data: any) => {
        // Handle different event types from the WorldBus
        if (data.type === 'TICK') {
          incrementTick();
        }

        // If it's an actor state update (NpcState)
        if (data.actorId && data.state) {
          updateActorState(data.actorId, data.state);
        }

        // Add all events to the log for transparency
        addEvent(data);
      },
      onError: (err) => {
        console.error('[useWorldBus] Stream error:', err);
      },
    });

    return () => {
      disconnect();
    };
  }, [sessionId]);
}
