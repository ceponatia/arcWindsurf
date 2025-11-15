import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const ctrlRef = useRef<AbortController | null>(null);

  const effectiveSessionId = useMemo(() => sessionId ?? undefined, [sessionId]);

  const doScrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const refresh = () => {
    if (!effectiveSessionId) return;
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    getSession(effectiveSessionId, ctrl.signal)
      .then((s) => {
        setSession(s);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const msg = (e as Error).message || 'Failed to load session';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
        // scroll after load
        setTimeout(doScrollToBottom, 0);
      });
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
    setSending(true);
    setError(null);
    const userMsg: Message = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));
    try {
      const res = await sendMessage(effectiveSessionId, text);
      const assistant = res.message;
      setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, assistant] } : prev));
      setDraft('');
    } catch (e) {
      const msg = (e as Error).message || 'Failed to send message';
      setError(msg);
      // revert optimistic append by reloading session
      refresh();
    } finally {
      setSending(false);
      setTimeout(doScrollToBottom, 0);
    }
  };

  const disabled = !effectiveSessionId || sending;

  if (!effectiveSessionId) {
    return (
      <div className="chat-panel">
        <div className="chat-messages" ref={scrollRef}>
          <div className="message system">Start or select a session to begin chatting.</div>
        </div>
        <div className="chat-composer">
          <input
            className="chat-input"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled
          />
          <button className="btn" disabled>
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={scrollRef}>
        {loading && <div className="message system">Loading session…</div>}
        {error && <div className="message system">{error}</div>}
        {!loading &&
          !error &&
          (session?.messages ?? []).map((m, idx) => (
            <div key={idx} className={`message ${m.role === 'user' ? 'user' : 'assistant'}`}>
              {m.content}
            </div>
          ))}
      </div>
      <div className="chat-composer">
        <input
          className="chat-input"
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
          className="btn primary"
          onClick={() => {
            void onSend();
          }}
          disabled={disabled || draft.trim().length === 0}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
};
