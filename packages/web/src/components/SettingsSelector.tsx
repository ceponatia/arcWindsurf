import React from 'react';
import { useSettings } from '../hooks/useSettings.js';

export interface SettingsSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({ value, onChange }) => {
  const { loading, error, data, retry } = useSettings();

  return (
    <section className="border border-slate-800 rounded-lg overflow-hidden">
      <h2 className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 text-sm font-semibold">
        Settings
      </h2>
      <div className="p-3">
        {loading && <p className="text-slate-400">Loading…</p>}
        {error && (
          <div className="space-y-2">
            <p className="text-red-400">Failed to load: {error}</p>
            <button className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Select setting</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value || null)}
            >
              <option value="">— Choose —</option>
              {(data ?? []).map((s) => {
                const full = `${s.name} (${s.tone})`;
                const display = full.length > 32 ? `${full.slice(0, 29)}…` : full;
                return (
                  <option key={s.id} value={s.id} title={full}>
                    {display}
                  </option>
                );
              })}
            </select>
          </label>
        )}
      </div>
    </section>
  );
};
