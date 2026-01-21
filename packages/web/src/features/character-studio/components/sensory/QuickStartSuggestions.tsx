import React, { useMemo } from 'react';
import type { TemplateMetadata } from './useSensoryTemplates.js';

interface QuickStartSuggestionsProps {
  templates: TemplateMetadata[];
  race?: string | undefined;
  occupation?: string | undefined;
  onSelect: (templateId: string) => void;
}

export const QuickStartSuggestions: React.FC<QuickStartSuggestionsProps> = ({
  templates,
  race,
  occupation,
  onSelect,
}) => {
  const suggestions = useMemo(() => {
    const lowerOccupation = occupation?.toLowerCase();
    return templates.filter((template) => {
      const matchesRace = race ? template.suggestedFor?.races?.includes(race) : false;
      const matchesOccupation = lowerOccupation
        ? template.suggestedFor?.occupations?.includes(lowerOccupation)
        : false;
      return matchesRace ? true : matchesOccupation;
    });
  }, [templates, race, occupation]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
      <p className="text-xs text-slate-400 uppercase tracking-wider">Quick Start</p>
      <p className="text-xs text-slate-500 mt-1">
        Suggested templates based on race or occupation.
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {suggestions.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
};
