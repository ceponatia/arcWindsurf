import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { Message, Session, TurnMetadata, StreamEvent } from '../../types.js';
import {
  getSession,
  getSessionNpcs,
  sendMessage,
  updateMessage,
  deleteMessage,
  getRuntimeConfig,
  getSessionMessages,
} from '../../shared/api/client.js';
import { ChatView, type ChatViewMessage } from '@minimal-rpg/ui';
import { DebugSidebar } from '../chat/components/index.js';
import { WorldMap, EventLog } from '../game/index.js';
import { useWorldBus } from '../../hooks/useWorldBus.js';
import { useSessionHeartbeat } from '../../hooks/useSessionHeartbeat.js';
import { GOVERNOR_DEV_MODE } from '../../config.js';
import type { NpcInstanceSummary } from '../../types.js';

// Types for turn events from the API
interface TurnEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface StateChanges {
  patchCount: number;
  modifiedPaths: string[];
  patches?: {
    op: string;
    path: string;
    value?: unknown;
  }[];
}

interface TurnDebugData {
  metadata: TurnMetadata | null;
  events: TurnEvent[];
  stateChanges: StateChanges | null;
}

export interface ChatPanelProps {
  sessionId?: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [serverGovernorDevMode, setServerGovernorDevMode] = useState(false);
  const [npcs, setNpcs] = useState<NpcInstanceSummary[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [npcError, setNpcError] = useState<string | null>(null);
  const [npcsLoading, setNpcsLoading] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'debug' | 'game'>('game');
  const [lastTurnDebug, setLastTurnDebug] = useState<TurnDebugData>({
    metadata: null,
    events: [],
    stateChanges: null,
  });
  const ctrlRef = useRef<AbortController | null>(null);
  const messageCtrlRef = useRef<AbortController | null>(null);
  const refreshTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const effectiveSessionId = useMemo(() => sessionId ?? undefined, [sessionId]);

  const clearRefreshTimers = useCallback(() => {
    refreshTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    refreshTimersRef.current = [];
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!effectiveSessionId) return;
    messageCtrlRef.current?.abort();
    const ctrl = new AbortController();
    messageCtrlRef.current = ctrl;

    try {
      const messages = await getSessionMessages(effectiveSessionId, ctrl.signal);
      setSession((prev) => (prev ? { ...prev, messages } : prev));
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      console.warn('[ChatPanel] Failed to refresh session messages', e);
    }
  }, [effectiveSessionId]);

  const scheduleMessageRefreshSequence = useCallback(
    (delays: number[]) => {
      clearRefreshTimers();
      delays.forEach((delay) => {
        refreshTimersRef.current.push(
          setTimeout(() => {
            void refreshMessages();
          }, delay)
        );
      });
    },
    [clearRefreshTimers, refreshMessages]
  );

  const handleWorldBusEvent = useCallback(
    (event: StreamEvent) => {
      if (event.type === 'SPOKE') {
        scheduleMessageRefreshSequence([200]);
      }
    },
    [scheduleMessageRefreshSequence]
  );

  const worldBusOptions = useMemo(() => ({ onEvent: handleWorldBusEvent }), [handleWorldBusEvent]);

  // Connect to the World Bus SSE stream
  useWorldBus(effectiveSessionId ?? null, worldBusOptions);
  useSessionHeartbeat(effectiveSessionId ?? null);

  const refresh = () => {
    if (!effectiveSessionId) return;
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    const run = async () => {
      try {
        const s = (await getSession(effectiveSessionId, ctrl.signal)) as unknown as Session;
        setSession(s);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        const msg = getErrorMessage(e, 'Failed to load session');
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    void run();
  };

  useEffect(() => {
    setSession(null);
    setDraft('');
    setEditingIdx(null);
    if (!effectiveSessionId) return;
    refresh();
    return () => {
      ctrlRef.current?.abort();
      messageCtrlRef.current?.abort();
      clearRefreshTimers();
    };
  }, [effectiveSessionId]);

  useEffect(() => {
    setNpcs([]);
    setSelectedNpcId(null);
    setNpcError(null);
    if (!effectiveSessionId) return;
    const ctrl = new AbortController();
    let active = true;

    const loadNpcs = async () => {
      setNpcsLoading(true);
      try {
        const results = await getSessionNpcs(effectiveSessionId, ctrl.signal);
        if (!active) return;
        setNpcs(results);
        setNpcError(null);
        setSelectedNpcId((prev) => {
          if (!results.length) return null;
          if (prev && results.some((npc) => npc.id === prev)) return prev;
          const primary = results.find((npc) => npc.role === 'primary') ?? results[0];
          if (!primary) return null;
          return primary.id;
        });
      } catch (err) {
        if (!active || isAbortError(err)) return;
        const msg = getErrorMessage(err, 'Failed to load NPCs');
        setNpcError(msg);
      } finally {
        if (active) setNpcsLoading(false);
      }
    };

    void loadNpcs();

    return () => {
      active = false;
      ctrl.abort();
      setNpcsLoading(false);
    };
  }, [effectiveSessionId]);

  useEffect(() => {
    if (!GOVERNOR_DEV_MODE) return;
    const ctrl = new AbortController();
    let active = true;
    const loadConfig = async () => {
      try {
        const cfg = await getRuntimeConfig(ctrl.signal);
        if (!active) return;
        setServerGovernorDevMode(Boolean(cfg.governorDevMode));
      } catch (err) {
        if (!active || isAbortError(err)) return;
        console.warn('[ChatPanel] Failed to load runtime config', err);
      }
    };
    void loadConfig();
    return () => {
      active = false;
      ctrl.abort();
    };
  }, []);

  const debugUiEnabled = GOVERNOR_DEV_MODE && serverGovernorDevMode;

  // No longer render inline debug panels - we use the sidebar instead
  const renderDebugAfterMessage = useCallback((_message: ChatViewMessage, _idx: number) => {
    void _message;
    void _idx;
    return null;
  }, []);

  const onSend = async () => {
    if (!effectiveSessionId) return;
    const text = draft.trim();
    if (!text || sending) return;

    setDraft('');
    setSending(true);
    setError(null);

    const userMsg: Message = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));

    try {
      const res = await sendMessage(effectiveSessionId, text, undefined, {
        npcId: selectedNpcId ?? null,
      });
      const assistant = res.message;
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, assistant] } : prev));

      const hasNpcSpoke = Array.isArray(res.events)
        ? res.events.some((event) => {
            if (typeof event !== 'object' || event === null) return false;
            const record = event as Record<string, unknown>;
            if (record['type'] !== 'SPOKE') return false;
            const actorId = record['actorId'];
            return typeof actorId === 'string' && !actorId.startsWith('player');
          })
        : false;

      const isPlaceholder = assistant.content.trim() === 'The world is quiet.';

      if (!hasNpcSpoke || isPlaceholder) {
        scheduleMessageRefreshSequence([800, 2000, 3500]);
      }

      // Capture turn debug data for the sidebar
      if (debugUiEnabled) {
        setLastTurnDebug({
          metadata: assistant.turnMetadata ?? null,
          events: (res.events ?? []) as TurnEvent[],
          stateChanges: (res.stateChanges as StateChanges | null) ?? null,
        });
      }
    } catch (e) {
      setDraft(text);
      const msg = getErrorMessage(e, 'Failed to send message');
      setError(msg);
      // revert optimistic append by reloading session
      refresh();
    } finally {
      setSending(false);
    }
  };

  const onSaveEdit = async (idx: number) => {
    if (!effectiveSessionId) return;
    const text = editDraft.trim();
    if (!text) return;

    const message = session?.messages.at(idx);
    const sequence = message?.idx;

    if (sequence === undefined) {
      console.warn('[ChatPanel] Cannot edit message without index/sequence');
      return;
    }

    // Optimistic update
    setSession((prev) => {
      if (!prev) return prev;
      const targetIndex = Number(idx);
      const newMessages = prev.messages.map((msg, index) =>
        index === targetIndex ? { ...msg, content: text } : msg
      );
      return { ...prev, messages: newMessages };
    });
    setEditingIdx(null);

    try {
      await updateMessage(effectiveSessionId, sequence, text);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to update message');
      setError(msg);
      refresh(); // Revert on error
    }
  };

  const onDeleteMessage = async (idx: number) => {
    if (!effectiveSessionId) return;
    const message = session?.messages.at(idx);
    const sequence = message?.idx;

    if (sequence === undefined) {
      console.warn('[ChatPanel] Cannot delete message without index/sequence');
      return;
    }

    const confirmed = window.confirm('Delete this message? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteMessage(effectiveSessionId, sequence);
      // Exit edit mode and remove from local state after successful delete
      setEditingIdx(null);
      setEditDraft('');
      setSession((prev) => {
        if (!prev) return prev;
        const newMessages = prev.messages.filter((m) => m.idx !== sequence);
        return { ...prev, messages: newMessages };
      });
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to delete message');
      setError(msg);
      refresh();
    }
  };

  const onRedo = async (idx: number) => {
    if (!effectiveSessionId || sending) return;

    const messages = session?.messages;
    const targetIdx = Number(idx);
    const userMessage = messages?.at(targetIdx) ?? null;

    if (userMessage?.role !== 'user') return;

    const userContent = userMessage.content;
    const userSequence = userMessage.idx;

    if (userSequence === undefined) {
      console.warn('[ChatPanel] Cannot redo message without sequence');
      return;
    }

    // Find the assistant message that follows this user message (if any)
    const nextMessage = messages?.at(idx + 1);
    const hasAssistantResponse = nextMessage?.role === 'assistant';
    const assistantSequence = hasAssistantResponse ? nextMessage.idx : null;

    setSending(true);
    setError(null);

    try {
      // Delete the assistant response first (if exists), then the user message
      if (assistantSequence !== null && assistantSequence !== undefined) {
        await deleteMessage(effectiveSessionId, assistantSequence);
      }
      await deleteMessage(effectiveSessionId, userSequence);

      // Update local state to remove both messages
      setSession((prev) => {
        if (!prev) return prev;
        const newMessages = prev.messages.filter((m) => {
          if (m.idx === userSequence) return false;
          if (assistantSequence !== null && m.idx === assistantSequence) return false;
          return true;
        });
        return { ...prev, messages: newMessages };
      });

      // Add back user message optimistically (temporary, will be replaced by refresh or next send)
      const userMsg: Message = {
        role: 'user',
        content: userContent,
        createdAt: new Date().toISOString(),
      };
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));

      // Re-send the message to get new response
      const res = await sendMessage(effectiveSessionId, userContent, undefined, {
        npcId: selectedNpcId ?? null,
      });

      // Instead of manual appending, we should probably refresh the session to get the guaranteed order
      // But for UX, we append the response. Note: the sequence will be missing until refresh.
      const assistant = res.message;
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, assistant] } : prev));

      const hasNpcSpoke = Array.isArray(res.events)
        ? res.events.some((event) => {
            if (typeof event !== 'object' || event === null) return false;
            const record = event as Record<string, unknown>;
            if (record['type'] !== 'SPOKE') return false;
            const actorId = record['actorId'];
            return typeof actorId === 'string' && !actorId.startsWith('player');
          })
        : false;

      const isPlaceholder = assistant.content.trim() === 'The world is quiet.';

      if (!hasNpcSpoke || isPlaceholder) {
        scheduleMessageRefreshSequence([800, 2000, 3500]);
      }

      // Capture turn debug data for the sidebar
      if (debugUiEnabled) {
        setLastTurnDebug({
          metadata: assistant.turnMetadata ?? null,
          events: (res.events ?? []) as TurnEvent[],
          stateChanges: (res.stateChanges as StateChanges | null) ?? null,
        });
      }
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to regenerate response');
      setError(msg);
      refresh(); // Reload session to get consistent state
    } finally {
      setSending(false);
    }
  };

  const disabled = !effectiveSessionId || sending;

  if (!effectiveSessionId) {
    return (
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-0 py-4 space-y-2">
          <div className="text-center text-sm text-slate-500 font-mono">
            Start or select a session to begin chatting.
          </div>
        </div>
        <div className="px-2 sm:px-0 py-3">
          <div className="mx-auto max-w-3xl rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm p-2">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-900 text-slate-200 placeholder:text-slate-500 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                }}
                disabled
              />
              <button
                className="px-3 py-2 rounded-md bg-slate-800 text-slate-500 cursor-not-allowed"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const npcAccessory =
    npcs.length > 0 || npcError || npcsLoading ? (
      <div className="flex flex-col gap-1 text-xs text-slate-300">
        <div className="px-1 text-[11px] uppercase tracking-wide text-slate-400">Target NPC</div>
        <select
          className="bg-slate-900 text-slate-200 ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 rounded-md px-2 py-1 text-sm"
          value={selectedNpcId ?? ''}
          onChange={(e) => {
            const next = e.target.value.trim();
            setSelectedNpcId(next === '' ? null : next);
          }}
          disabled={disabled || npcsLoading}
        >
          <option value="">Auto (primary/default)</option>
          {npcs.map((npc) => {
            const label = npc.label ?? npc.name ?? npc.role;
            return <option key={npc.id} value={npc.id}>{`${label} - ${npc.role}`}</option>;
          })}
        </select>
        {npcsLoading ? (
          <div className="px-1 text-[11px] text-slate-400">Loading NPCs...</div>
        ) : null}
        {npcError ? <div className="px-1 text-[11px] text-red-400">{npcError}</div> : null}
      </div>
    ) : null;

  const chatView = (
    <ChatView
      messages={session?.messages ?? []}
      loading={loading}
      error={error}
      draft={draft}
      sending={sending}
      disabled={disabled}
      editingIdx={editingIdx}
      editDraft={editDraft}
      onDraftChange={(value: string) => {
        if (editingIdx !== null) {
          setEditDraft(value);
        } else {
          setDraft(value);
        }
      }}
      onSend={onSend}
      onStartEdit={(idx: number, currentContent: string) => {
        setEditingIdx(idx);
        setEditDraft(currentContent);
      }}
      onCancelEdit={() => {
        setEditingIdx(null);
        setEditDraft('');
      }}
      onSaveEdit={(idx: number) => {
        void onSaveEdit(idx);
      }}
      onDeleteMessage={(idx: number) => {
        void onDeleteMessage(idx);
      }}
      onRedo={(idx: number) => {
        void onRedo(idx);
      }}
      renderAfterMessage={renderDebugAfterMessage}
      inputAccessory={npcAccessory}
    />
  );

  // When debug mode is enabled, show the debug sidebar on the right (sticky)
  if (debugUiEnabled) {
    return (
      <div className="flex h-full">
        {/* Chat takes remaining space and scrolls independently */}
        <div className="flex-1 min-w-0 overflow-hidden">{chatView}</div>
        {/* Sidebar area */}
        <div className="w-80 flex-shrink-0 hidden lg:flex flex-col border-l border-slate-800 bg-slate-950 sticky top-0 h-screen overflow-hidden">
          {/* Sidebar Toggle */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => {
                setSidebarMode('game');
              }}
              className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                sidebarMode === 'game'
                  ? 'bg-slate-900 text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              World
            </button>
            <button
              onClick={() => {
                setSidebarMode('debug');
              }}
              className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                sidebarMode === 'debug'
                  ? 'bg-slate-900 text-amber-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Debug
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {sidebarMode === 'game' ? (
              <div className="h-full flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar">
                <div className="h-2/3 min-h-[300px]">
                  <WorldMap />
                </div>
                <div className="h-1/3 min-h-[150px]">
                  <EventLog />
                </div>
              </div>
            ) : (
              <DebugSidebar
                metadata={lastTurnDebug.metadata}
                events={lastTurnDebug.events}
                stateChanges={lastTurnDebug.stateChanges}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return chatView;
};
