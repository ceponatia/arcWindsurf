import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { TemplateMetadata } from './useSensoryTemplates.js';

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function chipCountLabel(hiddenCount: number): string {
  return `+${hiddenCount}`;
}

interface TemplateCardProps {
  template: TemplateMetadata;
  selected: boolean;
  weight: number;
  hasConflict: boolean;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  selected,
  weight,
  hasConflict,
  onToggle,
  onWeightChange,
}) => {
  const maxDescriptionChars = 120;
  const maxTagChips = 3;
  const maxRegionChips = 4;

  const visibleTags = template.tags.slice(0, maxTagChips);
  const hiddenTagCount = Math.max(0, template.tags.length - visibleTags.length);
  const visibleRegions = template.affectedRegions.slice(0, maxRegionChips);
  const hiddenRegionCount = Math.max(0, template.affectedRegions.length - visibleRegions.length);

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-violet-500 bg-violet-900/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      } flex flex-col h-full`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h4 className="font-medium text-slate-200 truncate">{template.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {hasConflict && (
            <AlertTriangle className="w-4 h-4 text-amber-400" aria-label="Template conflict" />
          )}
          {selected && <Check className="w-5 h-5 text-violet-400" />}
        </div>
      </div>

      <p
        className="text-xs text-slate-400 mt-1 overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {truncateText(template.description, maxDescriptionChars)}
      </p>

      <div className="mt-2 flex gap-1 overflow-hidden">
        {visibleTags.map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-700/60 rounded">
            {tag}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-700/60 rounded text-slate-200">
            {chipCountLabel(hiddenTagCount)}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-1 overflow-hidden">
        {visibleRegions.map((region) => (
          <span key={region} className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">
            {region}
          </span>
        ))}
        {hiddenRegionCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-200">
            {chipCountLabel(hiddenRegionCount)}
          </span>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className={selected ? '' : 'opacity-0 pointer-events-none'} aria-hidden={!selected}>
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
            disabled={!selected}
          />
        </div>
      </div>
    </div>
  );
};
