import React from 'react';

export interface ConversationPromptsProps {
  onSelect: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  "Tell me about yourself",
  "What's your biggest fear?",
  "What do you value most in life?",
  "How do you handle stress?",
  "What makes you angry?",
  "Tell me about your family",
  "What are your goals?",
  "How do you act around strangers?",
];

export const ConversationPrompts: React.FC<ConversationPromptsProps> = ({
  onSelect,
}) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 text-center">
        Start a conversation to discover your character's personality
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            "{prompt}"
          </button>
        ))}
      </div>
    </div>
  );
};
