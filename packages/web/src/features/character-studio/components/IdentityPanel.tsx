import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, expandedCards, updateProfile } from '../signals.js';

export const IdentityPanel: React.FC = () => {
  useSignals();

  const profile = characterProfile.value;
  const expanded = expandedCards.value;

  const toggleCard = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedCards.value = next;
  };

  return (
    <div className="space-y-4">
      {/* Core Identity Card */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCard('core')}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <span className="font-medium text-slate-200">Core Identity</span>
          <span className="text-xs text-slate-500">
            {expanded.has('core') ? '▼' : '▶'}
          </span>
        </button>

        {expanded.has('core') && (
          <div className="p-4 space-y-4 bg-slate-900/30">
            <label className="block">
              <span className="text-xs text-slate-400">Name</span>
              <input
                type="text"
                value={profile.name ?? ''}
                onChange={(e) => updateProfile('name', e.target.value)}
                className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                placeholder="Character name"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-slate-400">Age</span>
                <input
                  type="number"
                  value={profile.age ?? ''}
                  onChange={(e) => updateProfile('age', parseInt(e.target.value, 10))}
                  className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                  placeholder="Age"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-400">Gender</span>
                <select
                  value={(profile as Record<string, unknown>).gender as string ?? ''}
                  onChange={(e) => updateProfile('gender' as keyof typeof profile, e.target.value)}
                  className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-slate-400">Summary</span>
              <textarea
                value={profile.summary ?? ''}
                onChange={(e) => updateProfile('summary', e.target.value)}
                className="mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                placeholder="A brief description of who they are..."
              />
            </label>
          </div>
        )}
      </div>

      {/* Additional cards can be added here */}
      <div className="text-xs text-slate-500 text-center py-4">
        More identity cards coming soon...
      </div>
    </div>
  );
};
