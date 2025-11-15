import React from 'react';
import { useSettings } from '../hooks/useSettings.js';

export interface SettingsSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({ value, onChange }) => {
  const { loading, error, data, retry } = useSettings();

  return (
    <section className="panel panel-settings">
      <h2 className="panel-title">Settings</h2>
      <div className="panel-body">
        {loading && <p className="muted">Loading…</p>}
        {error && (
          <div>
            <p className="error">Failed to load: {error}</p>
            <button className="btn" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <label className="field">
            <span className="field-label">Select setting</span>
            <select
              className="select"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value || null)}
            >
              <option value="">— Choose —</option>
              {(data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{`${s.name} (${s.tone})`}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
};
