import React from 'react';
import type { SettingSummary } from '../../types.js';

interface SettingLibraryProps {
  settings: SettingSummary[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (id: string) => void;
  onCreateNew: () => void;
}

export const SettingLibrary: React.FC<SettingLibraryProps> = ({
  settings,
  loading,
  error,
  onRefresh,
  onEdit,
  onCreateNew,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your world settings and environments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            + New Setting
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading settings…</div>}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && settings.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="text-slate-400 mb-4">No settings yet</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500"
          >
            Create your first setting
          </button>
        </div>
      )}

      {!loading && !error && settings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.map((setting) => (
            <button
              key={setting.id}
              onClick={() => onEdit(setting.id)}
              className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/70 hover:border-violet-600/50 transition-all group"
            >
              <h3 className="font-medium text-slate-100 group-hover:text-violet-300 transition-colors">
                {setting.name}
              </h3>
              <p className="text-sm text-slate-400 mt-2">{setting.tone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
