import { useEffect } from 'react';
import { isAbortError } from '@minimal-rpg/utils';
import { postSessionHeartbeat } from '../shared/api/client.js';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export interface UseSessionHeartbeatOptions {
  intervalMs?: number;
}

/**
 * Sends periodic session heartbeats while a session view is mounted.
 */
export function useSessionHeartbeat(
  sessionId?: string | null,
  options?: UseSessionHeartbeatOptions
): void {
  const intervalMs = options?.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();

    /**
     * Send a single heartbeat to the API.
     */
    const sendHeartbeat = async (): Promise<void> => {
      try {
        await postSessionHeartbeat(sessionId, controller.signal);
      } catch (error) {
        if (isAbortError(error)) return;
        console.warn('[useSessionHeartbeat] Failed to send heartbeat', error);
      }
    };

    void sendHeartbeat();
    const intervalId = setInterval(() => {
      void sendHeartbeat();
    }, intervalMs);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [intervalMs, sessionId]);
}
