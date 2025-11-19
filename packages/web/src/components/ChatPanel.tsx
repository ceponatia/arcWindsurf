import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { Message, Session } from '../types.js';
import { getSession, sendMessage } from '../api/client.js';

export interface ChatPanelProps {
  sessionId?: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
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
              <div key={idx} className="mb-3">
                {m.role === 'user' ? (
                  <div className="rounded-lg bg-slate-800/70 px-3 py-2 font-sans">{m.content}</div>
                ) : (
                  <div className="font-serif leading-relaxed">{m.content}</div>
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
