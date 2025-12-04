import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { Message, Session } from '../../types.js';
import {
  getSession,
  sendMessage,
  updateMessage,
  deleteMessage,
  getRuntimeConfig,
} from '../../shared/api/client.js';
import { ChatView, type ChatViewMessage } from '@minimal-rpg/ui';
import { TurnDebugPanel } from '../chat/index.js';
import { GOVERNOR_DEV_MODE, USE_TURNS_API } from '../../config.js';

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

  const renderDebugAfterMessage = useCallback(
    (message: ChatViewMessage, _idx: number) => {
      void _idx;
      if (!debugUiEnabled) return null;
      const enriched = message as Message;
      if (enriched.role !== 'assistant' || !enriched.turnMetadata) return null;
      return (
        <div className="mt-2">
          <TurnDebugPanel metadata={enriched.turnMetadata} />
        </div>
      );
    },
    [debugUiEnabled]
  );

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
      const res = await sendMessage(effectiveSessionId, text);
      const assistant = res.message;
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, assistant] } : prev));
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
      // Remove from local state only after successful delete
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

  return (
    <ChatView
      messages={session?.messages ?? []}
      loading={loading}
      error={error}
      draft={draft}
      sending={sending}
      disabled={disabled}
      editingIdx={editingIdx}
      editDraft={editDraft}
      onDraftChange={(value) => {
        if (editingIdx !== null) {
          setEditDraft(value);
        } else {
          setDraft(value);
        }
      }}
      onSend={onSend}
      onStartEdit={(idx, currentContent) => {
        setEditingIdx(idx);
        setEditDraft(currentContent);
      }}
      onCancelEdit={() => {
        setEditingIdx(null);
        setEditDraft('');
      }}
      onSaveEdit={(idx) => {
        void onSaveEdit(idx);
      }}
      onDeleteMessage={(idx) => {
        void onDeleteMessage(idx);
      }}
      renderAfterMessage={renderDebugAfterMessage}
    />
  );
};
