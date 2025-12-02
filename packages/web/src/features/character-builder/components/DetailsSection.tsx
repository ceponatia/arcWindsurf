import React from 'react';
import { CHARACTER_DETAIL_AREAS, type CharacterDetailArea } from '@minimal-rpg/schemas';
import type { DetailFormEntry } from '../types.js';

interface DetailsSectionProps {
  details: DetailFormEntry[];
  updateDetailEntry: <K extends keyof DetailFormEntry>(
    idx: number,
    key: K,
    value: DetailFormEntry[K]
  ) => void;
  addDetailEntry: () => void;
  removeDetailEntry: (idx: number) => void;
}

export const DetailsSection: React.FC<DetailsSectionProps> = ({
  details,
  updateDetailEntry,
  addDetailEntry,
  removeDetailEntry,
}) => (
  <div className="border border-slate-800 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Profile Details</div>
    <div className="p-4 space-y-4">
      {details.map((detail, idx) => (
        <div
          key={`detail-${idx}`}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Detail #{idx + 1}</span>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-red-300"
              onClick={() => removeDetailEntry(idx)}
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Label</span>
              <input
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.label}
                onChange={(e) => updateDetailEntry(idx, 'label', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Area</span>
              <select
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.area}
                onChange={(e) =>
                  updateDetailEntry(idx, 'area', e.target.value as CharacterDetailArea)
                }
              >
                {CHARACTER_DETAIL_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs text-slate-400">Value</span>
              <textarea
                className="min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.value}
                onChange={(e) => updateDetailEntry(idx, 'value', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Importance (0-1)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.importance}
                onChange={(e) => updateDetailEntry(idx, 'importance', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Tags (comma)</span>
              <input
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.tags}
                onChange={(e) => updateDetailEntry(idx, 'tags', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs text-slate-400">Notes (optional)</span>
              <textarea
                className="min-h-[60px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={detail.notes}
                onChange={(e) => updateDetailEntry(idx, 'notes', e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
        onClick={addDetailEntry}
      >
        + Add Detail
      </button>
    </div>
  </div>
);
