import React from 'react';

interface AttributionBadgeProps {
  source: string;
}

const COLOR_MAP: Record<string, string> = {
  race: 'bg-blue-900/50 text-blue-300 border-blue-700',
  gender: 'bg-sky-900/50 text-sky-300 border-sky-700',
  age: 'bg-teal-900/50 text-teal-300 border-teal-700',
  template: 'bg-purple-900/50 text-purple-300 border-purple-700',
  override: 'bg-amber-900/50 text-amber-300 border-amber-700',
  occupation: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  default: 'bg-slate-700 text-slate-300 border-slate-600',
};

export const AttributionBadge: React.FC<AttributionBadgeProps> = ({ source }) => {
  const [type, value] = source.includes(':') ? source.split(':') : [source, null];
  const color = COLOR_MAP[type] ?? COLOR_MAP['default'];
  const label = value ? `${type}: ${value}` : type;

  return <span className={`text-xs px-1.5 py-0.5 rounded border ${color}`}>{label}</span>;
};
