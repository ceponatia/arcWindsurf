import React, { useState } from 'react';

/** Collapsible section wrapper */
export const Subsection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen((prev) => !prev); }}
        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-between"
      >
        <span>{title}</span>
        <span className="text-slate-500">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
};

/** Slider for 0-1 values */
export const SliderInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}> = ({ label, value, onChange, lowLabel = 'Low', highLabel = 'High' }) => {
  // Calculate color from red (0) to green (120)
  const hue = value * 120;
  const color = `hsl(${hue}, 70%, 45%)`;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-10">{lowLabel}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
          style={{ accentColor: color }}
        />
        <span className="text-xs text-slate-500 w-10 text-right">{highLabel}</span>
        <span className="text-xs w-8 text-right" style={{ color }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </label>
  );
};

/** Select input for enums */
export const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}> = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace(/-/g, ' ')}
        </option>
      ))}
    </select>
  </label>
);
