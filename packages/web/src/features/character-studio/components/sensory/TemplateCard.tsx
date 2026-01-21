import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { TemplateMetadata } from './useSensoryTemplates.js';

interface TemplateCardProps {
  template: TemplateMetadata;
  selected: boolean;
  weight: number;
  suggested: boolean;
  hasConflict: boolean;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  selected,
  weight,
  suggested,
  hasConflict,
  onToggle,
  onWeightChange,
}) => {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-violet-500 bg-violet-900/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h4 className="font-medium text-slate-200 truncate">{template.name}</h4>
          {suggested && <span className="text-xs text-emerald-400">Suggested for you</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasConflict && (
            <AlertTriangle className="w-4 h-4 text-amber-400" aria-label="Template conflict" />
          )}
          {selected && <Check className="w-5 h-5 text-violet-400" />}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-1">{template.description}</p>

      <div className="flex flex-wrap gap-1 mt-2">
        {template.tags.map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-700/60 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {template.affectedRegions.map((region) => (
          <span key={region} className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">
            {region}
          </span>
        ))}
      </div>

      {selected && (
        <div className="mt-3 pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center justify-between text-xs text-slate-400">
            <span>Intensity</span>
            <span>{Math.round(weight * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={weight}
            onChange={(e) => onWeightChange(parseFloat(e.currentTarget.value))}
            className="w-full mt-1"
            aria-label={`${template.name} intensity`}
          />
        </div>
      )}
    </div>
  );
};
