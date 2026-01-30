import { useEffect, useRef, useCallback, useState } from 'react';

const LEADER_HEARTBEAT_INTERVAL_MS = 2000;
const LEADER_TIMEOUT_MS = 5000;

type TabRole = 'leader' | 'follower';

interface TabMessage {
  type: 'leader-heartbeat' | 'leader-claim' | 'leader-resign' | 'session-sync';
  tabId: string;
  sessionId: string;
  timestamp: number;
  payload?: unknown;
}

export interface UseSessionTabCoordinationOptions {
  onBecomeLeader?: () => void;
  onBecomeFollower?: () => void;
  onLeaderChanged?: (isLeader: boolean) => void;
}

export interface UseSessionTabCoordinationResult {
  isLeader: boolean;
  tabId: string;
  role: TabRole;
  broadcast: (payload: unknown) => void;
}

/**
 * Coordinates multiple browser tabs viewing the same session.
 * Uses BroadcastChannel API for cross-tab communication with leader election.
 *
 * - One tab is elected "leader" and is responsible for sending heartbeats
 * - If leader tab closes, another tab automatically becomes leader
 * - All tabs can broadcast state updates to each other
 */
export function useSessionTabCoordination(
  sessionId: string | null | undefined,
  options?: UseSessionTabCoordinationOptions
): UseSessionTabCoordinationResult {
  const tabIdRef = useRef<string>(generateTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const leaderHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaderCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLeaderHeartbeatRef = useRef<number>(0);
  const currentLeaderRef = useRef<string | null>(null);

  const [role, setRole] = useState<TabRole>('follower');
  const isLeader = role === 'leader';

  const broadcastMessage = useCallback(
    (message: Omit<TabMessage, 'tabId' | 'sessionId' | 'timestamp'>) => {
      if (!channelRef.current || !sessionId) return;
      const fullMessage: TabMessage = {
        ...message,
        tabId: tabIdRef.current,
        sessionId,
        timestamp: Date.now(),
      };
      channelRef.current.postMessage(fullMessage);
    },
    [sessionId]
  );

  const claimLeadership = useCallback(() => {
    if (role === 'leader') return;
    setRole('leader');
    currentLeaderRef.current = tabIdRef.current;
    broadcastMessage({ type: 'leader-claim' });
    options?.onBecomeLeader?.();
    options?.onLeaderChanged?.(true);
  }, [role, broadcastMessage, options]);

  const resignLeadership = useCallback(() => {
    if (role !== 'leader') return;
    broadcastMessage({ type: 'leader-resign' });
    setRole('follower');
    currentLeaderRef.current = null;
    options?.onBecomeFollower?.();
    options?.onLeaderChanged?.(false);
  }, [role, broadcastMessage, options]);

  const startLeaderHeartbeat = useCallback(() => {
    if (leaderHeartbeatRef.current) return;
    leaderHeartbeatRef.current = setInterval(() => {
      broadcastMessage({ type: 'leader-heartbeat' });
    }, LEADER_HEARTBEAT_INTERVAL_MS);
    broadcastMessage({ type: 'leader-heartbeat' });
  }, [broadcastMessage]);

  const stopLeaderHeartbeat = useCallback(() => {
    if (leaderHeartbeatRef.current) {
      clearInterval(leaderHeartbeatRef.current);
      leaderHeartbeatRef.current = null;
    }
  }, []);

  const checkLeaderTimeout = useCallback(() => {
    if (role === 'leader') return;
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastLeaderHeartbeatRef.current;
    if (timeSinceLastHeartbeat > LEADER_TIMEOUT_MS) {
      claimLeadership();
    }
  }, [role, claimLeadership]);

  const handleMessage = useCallback(
    (event: MessageEvent<TabMessage>) => {
      const message = event.data;
      if (!message || message.sessionId !== sessionId) return;
      if (message.tabId === tabIdRef.current) return;

      switch (message.type) {
        case 'leader-heartbeat':
          lastLeaderHeartbeatRef.current = message.timestamp;
          if (role === 'leader' && message.tabId !== tabIdRef.current) {
            if (message.tabId < tabIdRef.current) {
              resignLeadership();
            }
          }
          if (role === 'follower') {
            currentLeaderRef.current = message.tabId;
          }
          break;

        case 'leader-claim':
          lastLeaderHeartbeatRef.current = message.timestamp;
          if (role === 'leader') {
            if (message.tabId < tabIdRef.current) {
              resignLeadership();
            } else {
              broadcastMessage({ type: 'leader-heartbeat' });
            }
          } else {
            currentLeaderRef.current = message.tabId;
          }
          break;

        case 'leader-resign':
          if (currentLeaderRef.current === message.tabId) {
            currentLeaderRef.current = null;
            setTimeout(() => {
              if (!currentLeaderRef.current) {
                claimLeadership();
              }
            }, Math.random() * 500);
          }
          break;

        case 'session-sync':
          break;
      }
    },
    [sessionId, role, resignLeadership, claimLeadership, broadcastMessage]
  );

  useEffect(() => {
    if (!sessionId) return;

    const channelName = `session-${sessionId}`;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.addEventListener('message', handleMessage);

    lastLeaderHeartbeatRef.current = 0;
    currentLeaderRef.current = null;
    setTimeout(() => {
      if (!currentLeaderRef.current) {
        claimLeadership();
      }
    }, Math.random() * 300 + 100);

    leaderCheckRef.current = setInterval(checkLeaderTimeout, LEADER_TIMEOUT_MS / 2);

    return () => {
      if (role === 'leader') {
        const resignMsg: TabMessage = {
          type: 'leader-resign',
          tabId: tabIdRef.current,
          sessionId,
          timestamp: Date.now(),
        };
        channel.postMessage(resignMsg);
      }

      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;

      if (leaderCheckRef.current) {
        clearInterval(leaderCheckRef.current);
        leaderCheckRef.current = null;
      }
    };
  }, [sessionId, handleMessage, claimLeadership, checkLeaderTimeout, role]);

  useEffect(() => {
    if (role === 'leader') {
      startLeaderHeartbeat();
    } else {
      stopLeaderHeartbeat();
    }

    return () => {
      stopLeaderHeartbeat();
    };
  }, [role, startLeaderHeartbeat, stopLeaderHeartbeat]);

  const broadcast = useCallback(
    (payload: unknown) => {
      broadcastMessage({ type: 'session-sync', payload });
    },
    [broadcastMessage]
  );

  return {
    isLeader,
    tabId: tabIdRef.current,
    role,
    broadcast,
  };
}

function generateTabId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
