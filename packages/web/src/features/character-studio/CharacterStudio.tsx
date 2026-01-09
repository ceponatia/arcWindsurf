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

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  id,
  onSave,
  onCancel,
}) => {
  useSignals();

  const { profile, isDirty, saveStatus, save, isEditing } = useCharacterStudio({
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
        {/* Left: Conversation Pane */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col">
          <ConversationPane />
        </div>

        {/* Right: Identity & Traits */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Trait Suggestions (top) */}
          <TraitSuggestions />

          {/* Identity Cards (scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <IdentityPanel />
          </div>
        </div>
      </div>
    </div>
  );
};
