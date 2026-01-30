import { useEffect, useRef, useCallback } from 'react';
import { isAbortError } from '@minimal-rpg/utils';
import { postSessionHeartbeat } from '../shared/api/client.js';
import { useSessionTabCoordination } from './useSessionTabCoordination.js';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export interface UseSessionHeartbeatOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface UseSessionHeartbeatResult {
  isLeader: boolean;
  tabId: string;
}

/**
 * Sends periodic session heartbeats while a session view is mounted.
 * Uses multi-tab coordination so only the leader tab sends heartbeats.
 * Sends explicit disconnect on tab close or navigation away.
 */
export function useSessionHeartbeat(
  sessionId?: string | null,
  options?: UseSessionHeartbeatOptions
): UseSessionHeartbeatResult {
  const intervalMs = options?.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  const enabled = options?.enabled ?? true;
  const controllerRef = useRef<AbortController | null>(null);

  const { isLeader, tabId } = useSessionTabCoordination(sessionId);

  const sendHeartbeat = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    try {
      await postSessionHeartbeat(sessionId, controllerRef.current?.signal);
    } catch (error) {
      if (isAbortError(error)) return;
      console.warn('[useSessionHeartbeat] Failed to send heartbeat', error);
    }
  }, [sessionId]);

  const sendDisconnect = useCallback((): void => {
    if (!sessionId) return;
    try {
      navigator.sendBeacon(`/api/sessions/${encodeURIComponent(sessionId)}/disconnect`);
    } catch {
      console.warn('[useSessionHeartbeat] Failed to send disconnect beacon');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !enabled || !isLeader) return;

    controllerRef.current = new AbortController();

    void sendHeartbeat();
    const intervalId = setInterval(() => {
      void sendHeartbeat();
    }, intervalMs);

    const handleBeforeUnload = (): void => {
      sendDisconnect();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        sendDisconnect();
      } else if (document.visibilityState === 'visible') {
        void sendHeartbeat();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDisconnect();
    };
  }, [intervalMs, sessionId, enabled, isLeader, sendHeartbeat, sendDisconnect]);

  return { isLeader, tabId };
}
