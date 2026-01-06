import React, { useRef, useEffect } from 'react';
import { MessageContent } from './MessageContent.js';
import type { ChatViewProps } from './types.js';

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
      clipRule="evenodd"
    />
  </svg>
);

const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.22z"
      clipRule="evenodd"
    />
  </svg>
);

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  loading = false,
  error = null,
  draft,
  sending = false,
  disabled = false,
  editingIdx,
  editDraft,
  onDraftChange,
  onSend,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteMessage,
  onRedo,
  renderAfterMessage,
  inputAccessory,
  autoScroll = true,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Auto-scroll to bottom when messages change or on initial load
  useEffect(() => {
    if (!autoScroll) return;

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll on message count change (new message received)
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      // Small delay to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages.length, autoScroll]);

  // Scroll to bottom on initial load (when loading completes)
  useEffect(() => {
    if (!autoScroll || loading) return;

    // Scroll to bottom when session first loads
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);

    return () => { clearTimeout(timer); };
  }, [loading, autoScroll]);

  const handleSend = () => {
    void onSend();
    // Refocus input after sending so user can continue typing
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col overflow-hidden">
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 sm:px-4 py-4 space-y-3"
        ref={scrollRef}
      >
        {loading && (
          <div className="text-center text-sm text-slate-500 font-mono">Loading session…</div>
        )}
        {error && <div className="text-center text-sm text-red-400 font-mono">{error}</div>}
        {!loading && !error && (
          <div className="space-y-3 overflow-hidden">
            {messages.map((m, idx) => {
              const afterContent = renderAfterMessage?.(m, idx);
              return (
                <div key={idx} className="group relative overflow-hidden">
                  {editingIdx === idx ? (
                    <div className="rounded-lg bg-slate-800/70 px-3 py-2 font-sans border border-violet-500/50">
                      <textarea
                        className="w-full bg-transparent text-slate-200 outline-none resize-none p-1"
                        rows={Math.max(3, m.content.split('\n').length)}
                        value={editDraft}
                        onChange={(e) => onDraftChange(e.target.value)}
                      />
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                        <button
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                          onClick={() => {
                            void onDeleteMessage(idx);
                          }}
                          title="Delete message"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1"
                            onClick={onCancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded"
                            onClick={() => {
                              void onSaveEdit(idx);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Action buttons - always visible on mobile, hover on desktop */}
                      <div className="absolute -right-1 -top-1 flex flex-col gap-0.5 z-10">
                        <button
                          className="p-1.5 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => {
                            onStartEdit(idx, m.content);
                          }}
                          title="Edit message"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        {/* Redo button - only on last user message */}
                        {onRedo &&
                          m.role === 'user' &&
                          idx === messages.findLastIndex((msg) => msg.role === 'user') && (
                            <button
                              className="p-1.5 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() => {
                                void onRedo(idx);
                              }}
                              title="Regenerate response"
                            >
                              <RedoIcon className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                      {m.role === 'user' ? (
                        <div className="rounded-lg bg-slate-800/70 px-3 py-2 font-sans overflow-hidden min-w-0 w-full pr-10">
                          <MessageContent content={m.content} />
                        </div>
                      ) : (
                        <div className="rounded-lg bg-violet-950/40 border border-violet-900/30 px-3 py-2 font-serif leading-relaxed overflow-hidden min-w-0 w-full pr-10">
                          {/* Speaker header with avatar */}
                          {m.speaker && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-violet-900/30">
                              {m.speaker.profilePic ? (
                                <img
                                  src={m.speaker.profilePic}
                                  alt={m.speaker.name}
                                  className="w-8 h-8 rounded-full object-cover border border-violet-700/50"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-violet-800/50 border border-violet-700/50 flex items-center justify-center text-violet-300 text-sm font-sans">
                                  {m.speaker.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-sans text-violet-300/90">
                                {m.speaker.name}
                              </span>
                            </div>
                          )}
                          <MessageContent content={m.content} />
                        </div>
                      )}
                      {afterContent ? <div>{afterContent}</div> : null}
                    </>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="shrink-0 px-2 sm:px-4 py-3 relative">
        {/* Waiting indicator - floats above input */}
        {sending && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-violet-900/90 text-violet-200 text-sm px-4 py-1.5 rounded-full shadow-lg backdrop-blur-sm animate-pulse z-10">
            Waiting for assistant…
          </div>
        )}
        <div className="mx-auto max-w-3xl rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm p-2">
          <div className="flex gap-2">
            {inputAccessory ? <div className="shrink-0 min-w-[160px]">{inputAccessory}</div> : null}
            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-slate-900 text-slate-200 placeholder:text-slate-500 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                disabled || draft.trim().length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              } ${sending ? 'animate-pulse' : ''}`}
              onClick={handleSend}
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
