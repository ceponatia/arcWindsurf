import React, { useState } from 'react';
import {
  APPEARANCE_REGION_ATTRIBUTES,
  APPEARANCE_REGION_LABELS,
  type BodyRegion,
  type BodyMap,
  type AppearanceRegion,
  type BodyRegionData,
  getFilteredHierarchy,
  REGION_GROUPS,
} from '@minimal-rpg/schemas';
import { SUB_REGION_LABELS } from './region-hierarchy.js';
import { BodyMapSelector } from './BodyMapSelector.js';

interface BodyAppearanceSectionProps {
  body: BodyMap;
  gender: string;
  race?: string;
  updateBody: (newBody: BodyMap) => void;
}

type Tab = 'appearance' | 'sensory';

export const BodyAppearanceSection: React.FC<BodyAppearanceSectionProps> = ({
  body,
  gender,
  race,
  updateBody,
}) => {
  if (!gender || !race) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center border border-slate-800 rounded-lg bg-slate-950/40">
        <div className="text-amber-500 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-1">Missing Information</h3>
        <p className="text-slate-400 max-w-md">
          Please select a <strong>Race</strong> and <strong>Gender</strong> in the Basics tab before
          customizing appearance. These choices determine available body regions.
        </p>
      </div>
    );
  }

  const filteredHierarchy = getFilteredHierarchy(race, gender);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
  const [activeSubRegion, setActiveSubRegion] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const [symmetry, setSymmetry] = useState<Record<string, boolean>>({}); // true = unlinked (asymmetric)

  const handleRegionSelect = (region: string) => {
    setActiveSubRegion(undefined); // Reset sub-region on main region change

    // Check if region belongs to a group
    const groupEntry = Object.entries(REGION_GROUPS).find(([, members]) =>
      members.includes(region as BodyRegion)
    );

    if (groupEntry) {
      const [groupName] = groupEntry;
      // If symmetry is enabled (default, so unlinked is false), select the group
      if (!symmetry[groupName]) {
        setSelectedRegion(groupName);
        return;
      }
    }

    setSelectedRegion(region);
  };

  const getEffectiveRegions = (region: string | undefined): BodyRegion[] => {
    if (!region) return [];
    if (region === 'overall' || region === 'skin') return ['torso'];

    const key = String(region);

    const group = REGION_GROUPS[key];
    const isUnlinked = symmetry[key];

    if (group && !isUnlinked) {
      return group as BodyRegion[];
    }

    return [region as BodyRegion];
  };

  const getRegionData = (region: string): BodyRegionData => {
    const regions = getEffectiveRegions(region);
    if (regions.length === 0) return {};
    const effective = regions[0];
    if (!effective) return {};
    return body[effective] ?? {};
  };

  const updateRegionData = (region: string, updater: (data: BodyRegionData) => BodyRegionData) => {
    const newBody = { ...body };
    const targetRegions = getEffectiveRegions(region);

    targetRegions.forEach((r) => {
      if (r) {
        newBody[r] = updater(newBody[r] ?? {});
      }
    });

    updateBody(newBody);
  };

  const currentTargetRegion = activeSubRegion ?? selectedRegion;

  const updateAppearance = (key: string, value: string) => {
    if (!currentTargetRegion) return;
    updateRegionData(currentTargetRegion, (data) => ({
      ...data,
      appearance: {
        ...(data.appearance ?? {}),
        [key]: value,
      },
    }));
  };

  const updateVisualDescription = (value: string) => {
    if (!currentTargetRegion) return;
    updateRegionData(currentTargetRegion, (data) => ({
      ...data,
      visual: {
        ...(data.visual ?? {}),
        description: value,
      },
    }));
  };

  const updateSensory = (
    type: 'scent' | 'texture' | 'flavor',
    field: string,
    value: string | number
  ) => {
    if (!currentTargetRegion) return;
    updateRegionData(currentTargetRegion, (data) => ({
      ...data,
      [type]: {
        ...(data[type] ?? {}),
        [field]: value,
      },
    }));
  };

  const renderSubRegionSelector = () => {
    if (!selectedRegion) return null;
    const subRegions = filteredHierarchy[selectedRegion];
    if (!subRegions || subRegions.length === 0) return null;

    return (
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-slate-800/50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <button
          onClick={() => setActiveSubRegion(undefined)}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
            !activeSubRegion
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {APPEARANCE_REGION_LABELS[selectedRegion as AppearanceRegion] ?? 'Main'}
        </button>
        {subRegions.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubRegion(sub)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              activeSubRegion === sub
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {SUB_REGION_LABELS[sub] ?? sub}
          </button>
        ))}
      </div>
    );
  };

  const renderAppearanceTab = () => {
    if (!currentTargetRegion) return null;
    const attrs = APPEARANCE_REGION_ATTRIBUTES[currentTargetRegion as AppearanceRegion];

    const regionData = getRegionData(currentTargetRegion);

    return (
      <div className="space-y-4">
        {!attrs && (
          <p className="text-xs text-slate-500 italic mb-2">
            No specific attributes for{' '}
            {SUB_REGION_LABELS[currentTargetRegion] ?? currentTargetRegion}.
          </p>
        )}

        {attrs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(attrs).map(([key, def]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">{def.label}</span>
                {def.values ? (
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={regionData.appearance?.[key] ?? ''}
                    onChange={(e) => updateAppearance(key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {def.values.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={regionData.appearance?.[key] ?? ''}
                    placeholder={def.placeholder}
                    onChange={(e) => updateAppearance(key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Visual Description</span>
          <textarea
            className="min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
            value={regionData.visual?.description ?? ''}
            placeholder={`Describe the visual appearance of ${SUB_REGION_LABELS[currentTargetRegion] ?? currentTargetRegion}...`}
            onChange={(e) => updateVisualDescription(e.target.value)}
          />
        </label>
      </div>
    );
  };

  const renderSensoryTab = () => {
    if (!currentTargetRegion) return null;
    // Only show sensory for actual body regions, not meta regions like 'overall'
    if (['overall'].includes(currentTargetRegion)) {
      return <p className="text-slate-400">Sensory data is not applicable to this region.</p>;
    }

    const regionData = getRegionData(currentTargetRegion);

    return (
      <div className="space-y-6">
        {/* Scent */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Scent</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Primary Scent</span>
              <input
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.scent?.primary ?? ''}
                placeholder="e.g. Musk, Lavender"
                onChange={(e) => updateSensory('scent', 'primary', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Intensity (0-1)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.scent?.intensity ?? 0.5}
                onChange={(e) => updateSensory('scent', 'intensity', parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* Texture */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Texture</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Primary Texture</span>
              <input
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.texture?.primary ?? ''}
                placeholder="e.g. Soft, Rough"
                onChange={(e) => updateSensory('texture', 'primary', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Temperature</span>
              <select
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.texture?.temperature ?? 'neutral'}
                onChange={(e) => updateSensory('texture', 'temperature', e.target.value)}
              >
                <option value="cold">Cold</option>
                <option value="cool">Cool</option>
                <option value="neutral">Neutral</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </label>
          </div>
        </div>

        {/* Flavor */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Flavor</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Primary Flavor</span>
              <input
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.flavor?.primary ?? ''}
                placeholder="e.g. Salty, Sweet"
                onChange={(e) => updateSensory('flavor', 'primary', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Intensity (0-1)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                value={regionData.flavor?.intensity ?? 0.5}
                onChange={(e) => updateSensory('flavor', 'intensity', parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40">
          <h3 className="text-sm font-medium text-slate-300 mb-3">General</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleRegionSelect('overall')}
              className={`w-full px-3 py-2 text-sm rounded-md border transition-colors text-left flex justify-between items-center ${
                selectedRegion === 'overall'
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>Overall Build</span>
              {selectedRegion === 'overall' && <span className="text-xs">Selected</span>}
            </button>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Jump to Region</label>
              <select
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                value={selectedRegion !== 'overall' ? (selectedRegion ?? '') : ''}
                onChange={(e) => {
                  if (e.target.value) handleRegionSelect(e.target.value);
                }}
              >
                <option value="">Select a region...</option>
                {Object.keys(filteredHierarchy).map((region) => (
                  <option key={region} value={region}>
                    {APPEARANCE_REGION_LABELS[region as AppearanceRegion] ?? region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <BodyMapSelector
          selectedRegion={selectedRegion as BodyRegion}
          onSelectRegion={handleRegionSelect}
          gender={gender}
        />
      </div>

      <div className="lg:col-span-2">
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40 h-full">
          {selectedRegion ? (
            <>
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <h3 className="font-medium text-slate-200">
                  {APPEARANCE_REGION_LABELS[selectedRegion as AppearanceRegion] ?? selectedRegion}
                </h3>
                <div className="flex items-center gap-3">
                  {/* @ts-expect-error: REGION_GROUPS access needs index signature fix */}
                  {selectedRegion && REGION_GROUPS[selectedRegion] && (
                    <button
                      onClick={() =>
                        setSymmetry((prev) => ({
                          ...prev,
                          [selectedRegion]: !prev[selectedRegion],
                        }))
                      }
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        symmetry[selectedRegion]
                          ? 'bg-violet-900/30 border-violet-500 text-violet-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                      title={
                        symmetry[selectedRegion]
                          ? 'Unlinked: Editing sides separately'
                          : 'Linked: Editing both sides together'
                      }
                    >
                      {symmetry[selectedRegion] ? 'Unlinked' : 'Linked'}
                    </button>
                  )}
                  <div className="flex gap-1 bg-slate-950 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('appearance')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        activeTab === 'appearance'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Appearance
                    </button>
                    <button
                      onClick={() => setActiveTab('sensory')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        activeTab === 'sensory'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sensory
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {renderSubRegionSelector()}
                {activeTab === 'appearance' ? renderAppearanceTab() : renderSensoryTab()}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <p>Select a body region to edit details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
