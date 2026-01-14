import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { suggestedPrompts, studioSessionId } from '../../signals.js';

export interface ConversationPromptsProps {
  onSelect: (prompt: string) => void;
  onDilemma: () => void;
}

const STARTER_PROMPTS = [
  'Tell me about yourself',
  "What's your biggest fear?",
  'What do you value most in life?',
  'How do you handle stress?',
  'What makes you angry?',
  'Tell me about your family',
  'What are your goals?',
  'How do you act around strangers?',
];

export const ConversationPrompts: React.FC<ConversationPromptsProps> = ({
  onSelect,
  onDilemma,
}) => {
  useSignals();

  const prompts =
    suggestedPrompts.value.length > 0
      ? suggestedPrompts.value.map((p) => p.prompt)
      : STARTER_PROMPTS;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 text-center">
        {suggestedPrompts.value.length > 0
          ? 'How about exploring these topics?'
          : "Start a conversation to discover your character's personality"}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            "{prompt}"
          </button>
        ))}
        {studioSessionId.value && (
          <button
            onClick={onDilemma}
            className="px-3 py-2 text-sm bg-violet-900/40 border border-violet-800 text-violet-200 rounded-lg hover:bg-violet-800 hover:text-white transition-colors flex items-center gap-2"
          >
            ⚖️ Test Moral Dilemma
          </button>
        )}
      </div>
    </div>
  );
};
