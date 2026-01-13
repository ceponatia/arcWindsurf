import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { useConversation } from '../../hooks/useConversation.js';
import { characterProfile } from '../../signals.js';
import { MessageBubble } from './MessageBubble.js';
import { ConversationPrompts } from './ConversationPrompts.js';

export const ConversationPane: React.FC = () => {
  useSignals();

  const { messages, isGenerating, sendMessage } = useConversation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const characterName = characterProfile.value.name ?? 'Character';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    setError(null);
    try {
      await sendMessage(input.trim());
      setInput('');
    } catch (err) {
      setError('Failed to send message. Please try again.');
    }
  }, [input, isGenerating, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const handlePromptSelect = useCallback(
    async (prompt: string) => {
      setError(null);
      try {
        await sendMessage(prompt);
      } catch (err) {
        setError('Failed to process prompt. Please try again.');
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-medium text-slate-200">Conversation with {characterName}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Chat to discover their personality. Traits will be inferred automatically.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-400 p-3 rounded-lg flex items-start justify-between gap-2 text-xs">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {messages.length === 0 && <ConversationPrompts onSelect={handlePromptSelect} />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} characterName={characterName} />
        ))}

        {isGenerating && (
          <div className="flex items-center gap-3 text-slate-400 text-sm px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span>{characterName} is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${characterName} something...`}
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-slate-900 text-slate-200 rounded-lg px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
            disabled={isGenerating}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
