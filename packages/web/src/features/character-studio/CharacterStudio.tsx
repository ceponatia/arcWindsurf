import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { Loader2 } from 'lucide-react';
import { useCharacterStudio } from './hooks/useCharacterStudio.js';
import { completionScore, fieldErrors } from './signals.js';
import { ConversationPane } from './components/conversation/ConversationPane.js';
import { TraitSuggestions } from './components/traits/TraitSuggestions.js';
import { IdentityPanel } from './components/IdentityPanel.js';
import { StudioHeader } from './components/StudioHeader.js';

export interface CharacterStudioProps {
  id?: string | null;
  onSave?: () => void;
  onDelete?: (id: string) => void;
  onCancel?: () => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  id,
  onSave,
  onDelete,
  onCancel,
}) => {
  useSignals();

  const { profile, isDirty, saveStatus, isLoading, isDeleting, save, deleteCharacter, isEditing } =
    useCharacterStudio({
      id: id ?? null,
      onSave,
      onDelete,
    });

  const handleSave = () => {
    void save();
  };

  const handleDelete = () => {
    void deleteCharacter();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Character Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <StudioHeader
        characterName={profile.name ?? 'New Character'}
        isDirty={isDirty}
        saveStatus={saveStatus}
        isDeleting={isDeleting}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
        isEditing={isEditing}
        hasErrors={Object.keys(fieldErrors.value).length > 0}
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
