import React from 'react';
import { CharactersPanel as CharactersPanelView } from '@minimal-rpg/ui';
import type { CharactersPanelProps as CharactersPanelViewProps } from '@minimal-rpg/ui';
import { deleteCharacter } from '../api/client.js';

export interface CharactersPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (id: string) => void;
  characters?: import('../types.js').CharacterSummary[] | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({
  selectedId,
  onSelect,
  onEdit,
  characters,
  loading,
  error,
  onRefresh,
}) => {
  const data = characters;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    try {
      await deleteCharacter(id);
      if (selectedId === id) onSelect(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete character', err);
      alert('Failed to delete character');
    }
  };

  const viewProps: CharactersPanelViewProps = {
    selectedId,
    onSelect,
    onEdit:
      onEdit ??
      (() => {
        // no-op edit handler when none provided
      }),
    characters: data ?? null,
    loading: loading ?? false,
    error: error ?? null,
    onRefresh:
      onRefresh ??
      (() => {
        // no-op refresh handler when none provided
      }),
    onDeleteRequest: (idToDelete) => {
      void handleDelete(idToDelete);
    },
  };

  return <CharactersPanelView {...viewProps} />;
};
