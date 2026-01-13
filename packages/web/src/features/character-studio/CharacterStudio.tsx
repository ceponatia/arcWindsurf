import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { useCharacterStudio } from './hooks/useCharacterStudio.js';
import { completionScore } from './signals.js';
import { ConversationPane } from './components/conversation/ConversationPane.js';
import { TraitSuggestions } from './components/traits/TraitSuggestions.js';
import { IdentityPanel } from './components/IdentityPanel.js';
import { StudioHeader } from './components/StudioHeader.js';

export interface CharacterStudioProps {
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({ id, onSave, onCancel }) => {
  useSignals();

  const { profile, isDirty, saveStatus, isLoading, save, isEditing } = useCharacterStudio({
    id: id ?? null,
    onSave,
  });

  const completion = completionScore.value;

  const handleSave = () => {
    void save();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Character Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <StudioHeader
        characterName={profile.name ?? 'New Character'}
        completion={completion}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={isEditing}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation Pane (Fixed Width) */}
        <div className="w-[450px] flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/10">
          <ConversationPane />
        </div>

        {/* Right: Identity & Traits (Flexible) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Trait Suggestions (top) */}
          <TraitSuggestions />

          {/* Identity Cards (scrollable area) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
              <IdentityPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
