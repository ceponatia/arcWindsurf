import React, { useMemo } from 'react';
import type { TemplateSelection } from '@minimal-rpg/schemas';
import { TemplateCard } from './TemplateCard.js';
import type { TemplateMetadata } from './useSensoryTemplates.js';

interface TemplateCardGridProps {
  selected: TemplateSelection[];
  templates: TemplateMetadata[];
  isLoading?: boolean;
  error?: string | null;
  suggestedFor?: { race?: string | undefined; occupation?: string | undefined };
  onChange: (templates: TemplateSelection[]) => void;
}

export const TemplateCardGrid: React.FC<TemplateCardGridProps> = ({
  selected,
  templates,
  isLoading,
  error,
  suggestedFor,
  onChange,
}) => {
  const selectedIds = useMemo(() => new Set(selected.map((entry) => entry.templateId)), [selected]);

  const selectedTemplates = useMemo(
    () => templates.filter((template) => selectedIds.has(template.id)),
    [templates, selectedIds]
  );

  const conflicts = useMemo(() => {
    const conflictIds = new Set<string>();
    for (const template of selectedTemplates) {
      for (const other of selectedTemplates) {
        if (template.id === other.id) continue;
        const overlap = template.affectedRegions.some((region) =>
          other.affectedRegions.includes(region)
        );
        if (overlap) {
          conflictIds.add(template.id);
        }
      }
    }
    return conflictIds;
  }, [selectedTemplates]);

  const isSelected = (id: string) => selectedIds.has(id);
  const getWeight = (id: string) => selected.find((s) => s.templateId === id)?.weight ?? 1;

  const isSuggested = (template: TemplateMetadata) => {
    if (!suggestedFor) return false;
    const race = suggestedFor.race;
    const occupation = suggestedFor.occupation?.toLowerCase();
    const matchesRace = race ? template.suggestedFor?.races?.includes(race) : false;
    const matchesOccupation = occupation
      ? template.suggestedFor?.occupations?.includes(occupation)
      : false;
    return Boolean(matchesRace || matchesOccupation);
  };

  const toggleTemplate = (id: string) => {
    if (isSelected(id)) {
      onChange(selected.filter((entry) => entry.templateId !== id));
    } else {
      onChange([...selected, { templateId: id, weight: 1 }]);
    }
  };

  const updateWeight = (id: string, weight: number) => {
    const normalized = Math.min(1, Math.max(0, weight));
    onChange(
      selected.map((entry) => (entry.templateId === id ? { ...entry, weight: normalized } : entry))
    );
  };

  if (isLoading) {
    return <p className="text-xs text-slate-500">Loading templates...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  if (templates.length === 0) {
    return <p className="text-xs text-slate-500">No templates available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          selected={isSelected(template.id)}
          weight={getWeight(template.id)}
          suggested={isSuggested(template)}
          hasConflict={conflicts.has(template.id)}
          onToggle={() => toggleTemplate(template.id)}
          onWeightChange={(nextWeight) => updateWeight(template.id, nextWeight)}
        />
      ))}
    </div>
  );
};
