import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { Message, Session, TurnMetadata } from '../../types.js';
import {
  getSession,
  getSessionNpcs,
  sendMessage,
  updateMessage,
  deleteMessage,
  getRuntimeConfig,
} from '../../shared/api/client.js';
import { ChatView, type ChatViewMessage } from '@minimal-rpg/ui';
import { AgentDebugSidebar } from '../chat/components/index.js';
import { GOVERNOR_DEV_MODE, USE_TURNS_API } from '../../config.js';
import type { NpcInstanceSummary } from '../../types.js';

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
  const [lastTurnMetadata, setLastTurnMetadata] = useState<TurnMetadata | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const effectiveSessionId = useMemo(() => sessionId ?? undefined, [sessionId]);

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
          return primary?.id ?? null;
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

  const debugUiEnabled = GOVERNOR_DEV_MODE && serverGovernorDevMode && USE_TURNS_API;

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

      // Capture turn metadata for the debug sidebar
      if (debugUiEnabled && assistant.turnMetadata) {
        setLastTurnMetadata(assistant.turnMetadata);
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

    // Optimistic update
    setSession((prev) => {
      if (!prev) return prev;
      const newMessages = [...prev.messages];
      if (newMessages[idx]) {
        newMessages[idx] = { ...newMessages[idx], content: text };
      }
      return { ...prev, messages: newMessages };
    });
    setEditingIdx(null);

    const message = session?.messages[idx];
    const dbIdx = message?.idx ?? idx + 1;

    try {
      // Backend uses 1-based index for messages
      await updateMessage(effectiveSessionId, dbIdx, text);
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to update message');
      setError(msg);
      refresh(); // Revert on error
    }
  };

  const onDeleteMessage = async (idx: number) => {
    if (!effectiveSessionId) return;
    const message = session?.messages[idx];
    const dbIdx = message?.idx ?? idx + 1;

    const confirmed = window.confirm('Delete this message? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteMessage(effectiveSessionId, dbIdx);
      // Exit edit mode and remove from local state after successful delete
      setEditingIdx(null);
      setEditDraft('');
      setSession((prev) => {
        if (!prev) return prev;
        const newMessages = prev.messages.filter((m) =>
          m.idx !== undefined ? m.idx !== dbIdx : true
        );
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
    const userMessage = messages?.[idx];
    if (userMessage?.role !== 'user') return;

    const userContent = userMessage.content;
    const userDbIdx = userMessage.idx ?? idx + 1;

    // Find the assistant message that follows this user message (if any)
    const nextMessage = messages?.[idx + 1];
    const hasAssistantResponse = nextMessage?.role === 'assistant';
    const assistantDbIdx = hasAssistantResponse ? (nextMessage.idx ?? idx + 2) : null;

    setSending(true);
    setError(null);

    try {
      // Delete the assistant response first (if exists), then the user message
      if (assistantDbIdx !== null) {
        await deleteMessage(effectiveSessionId, assistantDbIdx);
      }
      await deleteMessage(effectiveSessionId, userDbIdx);

      // Update local state to remove both messages
      setSession((prev) => {
        if (!prev) return prev;
        const newMessages = prev.messages.filter((_, i) => {
          if (i === idx) return false; // Remove user message
          if (hasAssistantResponse && i === idx + 1) return false; // Remove assistant message
          return true;
        });
        return { ...prev, messages: newMessages };
      });

      // Add back user message optimistically
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
      const assistant = res.message;
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, assistant] } : prev));

      // Capture turn metadata for the debug sidebar
      if (debugUiEnabled && assistant.turnMetadata) {
        setLastTurnMetadata(assistant.turnMetadata);
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
                onChange={(e) => setDraft(e.target.value)}
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
            const label = npc.label ?? npc.name ?? npc.role ?? 'NPC';
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

  // When debug mode is enabled, show the agent debug sidebar on the right
  if (debugUiEnabled) {
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0">{chatView}</div>
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <AgentDebugSidebar metadata={lastTurnMetadata} />
        </div>
      </div>
    );
  }

  return chatView;
};
