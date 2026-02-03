import React from 'react';
import { PersonasPanel as PersonasPanelView } from '@minimal-rpg/ui';
import type { PersonasPanelProps as PersonasPanelViewProps } from '@minimal-rpg/ui';
import { deletePersona } from '../../shared/api/client.js';

interface PersonasPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (id: string) => void;
  personas?: import('../../types.js').PersonaSummary[] | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const PersonasPanel: React.FC<PersonasPanelProps> = ({
  selectedId,
  onSelect,
  onEdit,
  personas,
  loading,
  error,
  onRefresh,
}) => {
  const data = personas;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this persona?')) return;
    try {
      await deletePersona(id);
      if (selectedId === id) onSelect(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete persona', err);
      alert('Failed to delete persona');
    }
  };

  const viewProps: PersonasPanelViewProps = {
    selectedId,
    onSelect,
    onEdit:
      onEdit ??
      (() => {
        // no-op edit handler when none provided
      }),
    personas: data ?? null,
    loading: loading ?? false,
    error: error ?? null,
    onRefresh:
      onRefresh ??
      (() => {
        // no-op refresh handler when none provided
      }),
    onDeleteRequest: (idToDelete: string) => {
      void handleDelete(idToDelete);
    },
  };

  return <PersonasPanelView {...viewProps} />;
};
