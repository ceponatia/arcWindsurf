/**
 * Setting Step - Select or configure the world setting
 */

import React, { useState } from 'react';
import { useWorkspaceStore, useSettingState } from '../store.js';
import { SelectableCard } from '../components/SelectableCard.js';
import type { SettingSummary } from '../../../types.js';
import type { SettingProfile } from '@minimal-rpg/schemas';

interface SettingStepProps {
  settings: SettingSummary[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateToBuilder: () => void;
}

export const SettingStep: React.FC<SettingStepProps> = ({
  settings,
  loading,
  onRefresh,
  onNavigateToBuilder,
}) => {
  const settingState = useSettingState();
  const { selectSetting, clearSetting, updateSetting } = useWorkspaceStore();
  const [showTimeConfig, setShowTimeConfig] = useState(false);

  const handleSelectSetting = (setting: SettingSummary) => {
    // TODO: Fetch full setting profile from API
    // For now, create a minimal profile from summary
    const profile: SettingProfile = {
      id: setting.id,
      name: setting.name,
      lore: setting.tone ?? '',
    };
    selectSetting(setting.id, profile);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Choose Your Setting</h2>
        <p className="text-sm text-slate-400 mt-1">
          Select a world for your adventure. Each setting defines the lore, tone, and atmosphere.
        </p>
      </div>

      {/* Setting Selection Grid */}
      <div className="border border-slate-800 rounded-lg bg-slate-900/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Available Settings</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onNavigateToBuilder}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              + Create New
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading settings...</p>
          ) : settings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-3">No settings available</p>
              <button
                onClick={onNavigateToBuilder}
                className="text-sm px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-500"
              >
                Create Your First Setting
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settings.map((setting) => (
                <SelectableCard
                  key={setting.id}
                  title={setting.name}
                  description={setting.tone}
                  selected={settingState.settingId === setting.id}
                  onClick={() => void handleSelectSetting(setting)}
                  badges={
                    settingState.settingId === setting.id ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-600/30 text-violet-300">
                        Selected
                      </span>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Configuration (collapsed by default) */}
      {settingState.settingId && (
        <div className="border border-slate-800 rounded-lg bg-slate-900/30">
          <button
            onClick={() => setShowTimeConfig(!showTimeConfig)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-slate-300">Time Configuration</span>
            <span className="text-slate-500">{showTimeConfig ? '▼' : '▶'}</span>
          </button>

          {showTimeConfig && (
            <div className="px-4 pb-4 space-y-4">
              {/* Turn Duration */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Seconds Per Turn</label>
                <select
                  value={settingState.secondsPerTurn ?? 60}
                  onChange={(e) => updateSetting({ secondsPerTurn: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                >
                  <option value={30}>30 seconds (fast-paced)</option>
                  <option value={60}>60 seconds (standard)</option>
                  <option value={300}>5 minutes (relaxed)</option>
                  <option value={900}>15 minutes (slow)</option>
                </select>
              </div>

              {/* Starting Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Starting Hour</label>
                  <select
                    value={settingState.startTime?.hour ?? 9}
                    onChange={(e) =>
                      updateSetting({
                        startTime: {
                          ...settingState.startTime,
                          hour: parseInt(e.target.value, 10),
                          minute: settingState.startTime?.minute ?? 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Starting Minute</label>
                  <select
                    value={settingState.startTime?.minute ?? 0}
                    onChange={(e) =>
                      updateSetting({
                        startTime: {
                          ...settingState.startTime,
                          hour: settingState.startTime?.hour ?? 9,
                          minute: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Setting Summary */}
      {settingState.settingId && settingState.settingProfile && (
        <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-400">Selected Setting</p>
              <p className="font-medium text-slate-200">{settingState.settingProfile.name}</p>
            </div>
            <button
              onClick={clearSetting}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
