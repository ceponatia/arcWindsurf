import React from 'react';
import {
  APPEARANCE_REGIONS,
  APPEARANCE_REGION_ATTRIBUTES,
  APPEARANCE_REGION_LABELS,
  getDefaultAttribute,
  type AppearanceRegion,
} from '@minimal-rpg/schemas';
import type { AppearanceEntry } from '../types.js';

interface AppearanceSectionProps {
  appearances: AppearanceEntry[];
  gender: string;
  updateAppearanceEntry: <K extends keyof AppearanceEntry>(
    idx: number,
    key: K,
    value: AppearanceEntry[K]
  ) => void;
  addAppearanceEntry: () => void;
  removeAppearanceEntry: (idx: number) => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  appearances,
  gender,
  updateAppearanceEntry,
  addAppearanceEntry,
  removeAppearanceEntry,
}) => {
  /**
   * Filter body regions based on gender.
   * Gender-specific regions: breasts, nipples (female), penis (male), vagina (female)
   * For 'other' and 'unknown' genders, show all regions.
   */
  const getAvailableRegions = (): readonly AppearanceRegion[] => {
    const genderValue = gender?.trim() || '';

    // If gender is 'other' or 'unknown' or empty, show all regions
    if (!genderValue || genderValue === 'other' || genderValue === 'unknown') {
      return APPEARANCE_REGIONS;
    }

    // Gender-specific regions to conditionally include
    const femaleOnlyRegions: AppearanceRegion[] = ['breasts', 'nipples', 'vagina'];
    const maleOnlyRegions: AppearanceRegion[] = ['penis'];

    return APPEARANCE_REGIONS.filter((region) => {
      // Female-only regions
      if (femaleOnlyRegions.includes(region)) {
        return genderValue === 'female';
      }

      // Male-only regions
      if (maleOnlyRegions.includes(region)) {
        return genderValue === 'male';
      }

      // All other regions are always available
      return true;
    });
  };

  const availableRegions = getAvailableRegions();
  const handleRegionChange = (idx: number, newRegion: AppearanceRegion) => {
    // When region changes, reset attribute to the first available for that region
    const defaultAttr = getDefaultAttribute(newRegion);
    updateAppearanceEntry(idx, 'region', newRegion);
    updateAppearanceEntry(idx, 'attribute', defaultAttr);
    updateAppearanceEntry(idx, 'value', '');
  };

  /**
   * Handle value changes with auto-add functionality.
   * When the last entry's value is populated (all 3 fields filled),
   * automatically add a new empty entry for convenience.
   */
  const handleValueChange = (idx: number, newValue: string) => {
    updateAppearanceEntry(idx, 'value', newValue);

    // Auto-add: if this is the last entry and value is now populated, add a new entry
    const isLastEntry = idx === appearances.length - 1;
    const entry = appearances[idx];
    if (!entry) return;
    const hasRegion = entry.region && entry.region.trim() !== '';
    const hasAttribute = entry.attribute && entry.attribute.trim() !== '';
    const hasValue = newValue.trim() !== '';

    if (isLastEntry && hasRegion && hasAttribute && hasValue) {
      addAppearanceEntry();
    }
  };

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span>Appearance</span>
          <span className="text-xs text-slate-500">Per-region physical attributes</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-slate-400">
          Add physical appearance details for specific body regions. Select a region, choose an
          attribute, and enter the value.
        </p>

        {appearances.map((entry, idx) => {
          const regionAttrs = APPEARANCE_REGION_ATTRIBUTES[entry.region];
          const attrDef = regionAttrs[entry.attribute];
          const hasPresetValues = attrDef?.values && attrDef.values.length > 0;

          return (
            <div
              key={`appearance-${idx}`}
              className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Appearance Entry #{idx + 1}</span>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-red-300"
                  onClick={() => removeAppearanceEntry(idx)}
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Body Region</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={entry.region}
                    onChange={(e) => handleRegionChange(idx, e.target.value as AppearanceRegion)}
                  >
                    {availableRegions.map((region) => (
                      <option key={region} value={region}>
                        {APPEARANCE_REGION_LABELS[region]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Attribute</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={entry.attribute}
                    onChange={(e) => {
                      updateAppearanceEntry(idx, 'attribute', e.target.value);
                      updateAppearanceEntry(idx, 'value', '');
                    }}
                  >
                    {Object.entries(regionAttrs).map(([key, def]) => (
                      <option key={key} value={key}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Value</span>
                  {hasPresetValues ? (
                    <select
                      className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                      value={entry.value}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                    >
                      <option value=""></option>
                      {attrDef.values!.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                      value={entry.value}
                      placeholder={attrDef?.placeholder ?? ''}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                    />
                  )}
                </label>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
          onClick={addAppearanceEntry}
        >
          + Add Appearance Entry
        </button>
      </div>
    </div>
  );
};
