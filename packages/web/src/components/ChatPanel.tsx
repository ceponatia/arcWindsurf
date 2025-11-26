import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { Message, Session } from '../types.js';
import { getSession, sendMessage, updateMessage, deleteMessage } from '../api/client.js';
import { MessageContent } from './MessageContent.js';

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const effectiveSessionId = useMemo(() => sessionId ?? undefined, [sessionId]);

  const doScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
        // scroll after load
        setTimeout(doScrollToBottom, 0);
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
    // keep pinned to bottom when messages change
    doScrollToBottom();
  }, [session?.messages.length]);

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
        <div
          className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-0 py-4 space-y-2"
          ref={scrollRef}
        >
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
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div
        className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-0 py-4 space-y-3"
        ref={scrollRef}
      >
        {loading && (
          <div className="text-center text-sm text-slate-500 font-mono">Loading session…</div>
        )}
        {error && <div className="text-center text-sm text-red-400 font-mono">{error}</div>}
        {!loading && !error && (
          <div className="prose prose-invert max-w-none">
            {(session?.messages ?? []).map((m, idx) => (
              <div key={idx} className="mb-3 group relative">
                {editingIdx === idx ? (
                  <div className="rounded-lg bg-slate-800/70 px-3 py-2 font-sans border border-violet-500/50">
                    <textarea
                      className="w-full bg-transparent text-slate-200 outline-none resize-none p-1"
                      rows={Math.max(3, m.content.split('\n').length)}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        className="text-xs text-slate-400 hover:text-slate-300"
                        onClick={() => setEditingIdx(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded"
                        onClick={() => {
                          void onSaveEdit(idx);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity pr-2 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          className="text-slate-400 hover:text-white p-1 rounded"
                          onClick={() => {
                            setEditingIdx(idx);
                            setEditDraft(m.content);
                          }}
                          title="Edit message"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5"
                          >
                            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                          </svg>
                        </button>
                        <button
                          className="text-slate-500 hover:text-red-400 p-1 rounded"
                          onClick={() => {
                            void onDeleteMessage(idx);
                          }}
                          title="Delete message"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {m.role === 'user' ? (
                      <div className="rounded-lg bg-slate-800/70 px-3 py-2 font-sans">
                        <MessageContent content={m.content} />
                      </div>
                    ) : (
                      <div className="font-serif leading-relaxed">
                        <MessageContent content={m.content} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="px-2 sm:px-0 py-3">
        <div className="mx-auto max-w-3xl rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm p-2">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 text-slate-200 placeholder:text-slate-500 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              placeholder={sending ? 'Waiting for assistant…' : 'Type a message...'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                disabled || draft.trim().length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              } ${sending ? 'animate-pulse' : ''}`}
              onClick={() => {
                void onSend();
              }}
              disabled={disabled || draft.trim().length === 0}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
