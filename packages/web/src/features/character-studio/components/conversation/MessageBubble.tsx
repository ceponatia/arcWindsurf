import React from 'react';
import type { ConversationMessage } from '../../signals.js';

export interface MessageBubbleProps {
  message: ConversationMessage;
  characterName: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  characterName,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center text-xs text-slate-500 py-2">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
          }`}
      >
        {!isUser && (
          <div className="text-xs text-slate-400 mb-1 font-medium">
            {characterName}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};
