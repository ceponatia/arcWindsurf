import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  APPEARANCE_FEET_SIZES,
  getRecordOptional,
  setPartialRecord,
  type BodyRegionData,
  type BodyMap,
  type BodyRegion,
  type RegionFlavor,
  type RegionScent,
  type RegionTexture,
  type RegionVisual,
} from '@minimal-rpg/schemas';
import { characterProfile, updateProfile } from '../signals.js';
import { IdentityCard } from './IdentityCard.js';

/**
 * BodyCard handles manual per-region overrides for a few key regions.
 * These overrides always win over computed defaults/templates.
 */
export const BodyCard: React.FC<{ hasContent?: boolean }> = ({ hasContent }) => {
  useSignals();

  /** Current body map from signal */
  const body: BodyMap = characterProfile.value.body ?? {};

  const HAIR_REGION: BodyRegion = 'hair';
  const FACE_REGION: BodyRegion = 'face';
  const TORSO_REGION: BodyRegion = 'torso';
  const HANDS_REGION: BodyRegion = 'hands';
  const LEFT_FOOT_REGION: BodyRegion = 'leftFoot';
  const RIGHT_FOOT_REGION: BodyRegion = 'rightFoot';

  const updateBodyRegionData = (region: BodyRegion, updates: Partial<BodyRegionData>): void => {
    const currentRegionData = getRecordOptional(body, region) ?? {};
    const nextRegionData: BodyRegionData = { ...currentRegionData };

    if ('visual' in updates) {
      if (updates.visual) nextRegionData.visual = updates.visual;
      else delete nextRegionData.visual;
    }
    if ('scent' in updates) {
      if (updates.scent) nextRegionData.scent = updates.scent;
      else delete nextRegionData.scent;
    }
    if ('texture' in updates) {
      if (updates.texture) nextRegionData.texture = updates.texture;
      else delete nextRegionData.texture;
    }
    if ('flavor' in updates) {
      if (updates.flavor) nextRegionData.flavor = updates.flavor;
      else delete nextRegionData.flavor;
    }
    if ('appearance' in updates) {
      if (updates.appearance) nextRegionData.appearance = updates.appearance;
      else delete nextRegionData.appearance;
    }

    const hasAnyOverrides = Boolean(
      nextRegionData.visual ??
        nextRegionData.scent ??
        nextRegionData.texture ??
        nextRegionData.flavor ??
        nextRegionData.appearance
    );

    const nextBody: BodyMap = { ...body };
    if (!hasAnyOverrides) {
      setPartialRecord(nextBody, region, undefined);
      updateProfile('body', nextBody);
      return;
    }

    setPartialRecord(nextBody, region, nextRegionData);
    updateProfile('body', nextBody);
  };

  const getRegionVisualDescription = (region: BodyRegion): string => {
    const data = getRecordOptional(body, region);
    return data?.visual?.description ?? '';
  };

  const updateRegionVisualDescription = (region: BodyRegion, description: string): void => {
    const trimmed = description.trim();
    const current = getRecordOptional(body, region);

    const nextVisual: RegionVisual | undefined = trimmed
      ? {
          description: trimmed,
          features: current?.visual?.features,
          skinCondition: current?.visual?.skinCondition,
        }
      : undefined;

    updateBodyRegionData(region, { visual: nextVisual });
  };

  const getRegionScentPrimary = (region: BodyRegion): string => {
    const data = getRecordOptional(body, region);
    return data?.scent?.primary ?? '';
  };

  const updateRegionScentPrimary = (region: BodyRegion, primary: string): void => {
    const trimmed = primary.trim();
    const current = getRecordOptional(body, region);

    const nextScent: RegionScent | undefined = trimmed
      ? {
          primary: trimmed,
          notes: current?.scent?.notes,
          intensity: current?.scent?.intensity ?? 0.5,
        }
      : undefined;

    updateBodyRegionData(region, { scent: nextScent });
  };

  const getRegionTexturePrimary = (region: BodyRegion): string => {
    const data = getRecordOptional(body, region);
    return data?.texture?.primary ?? '';
  };

  const updateRegionTexturePrimary = (region: BodyRegion, primary: string): void => {
    const trimmed = primary.trim();
    const current = getRecordOptional(body, region);

    const nextTexture: RegionTexture | undefined = trimmed
      ? {
          primary: trimmed,
          temperature: current?.texture?.temperature ?? 'neutral',
          moisture: current?.texture?.moisture ?? 'normal',
          notes: current?.texture?.notes,
        }
      : undefined;

    updateBodyRegionData(region, { texture: nextTexture });
  };

  const getRegionFlavorPrimary = (region: BodyRegion): string => {
    const data = getRecordOptional(body, region);
    return data?.flavor?.primary ?? '';
  };

  const updateRegionFlavorPrimary = (region: BodyRegion, primary: string): void => {
    const trimmed = primary.trim();
    const current = getRecordOptional(body, region);

    const nextFlavor: RegionFlavor | undefined = trimmed
      ? {
          primary: trimmed,
          notes: current?.flavor?.notes,
          intensity: current?.flavor?.intensity ?? 0.5,
        }
      : undefined;

    updateBodyRegionData(region, { flavor: nextFlavor });
  };

  type FootAppearanceKey = 'size' | 'shape';

  const getRegionAppearanceValue = (region: BodyRegion, key: FootAppearanceKey): string => {
    const data = getRecordOptional(body, region);
    if (key === 'size') return data?.appearance?.['size'] ?? '';
    return data?.appearance?.['shape'] ?? '';
  };

  const updateRegionAppearanceValue = (
    region: BodyRegion,
    key: FootAppearanceKey,
    value: string
  ): void => {
    const trimmed = value.trim();
    const current = getRecordOptional(body, region);
    const currentAppearance = current?.appearance;

    const nextAppearance: Record<string, string> = { ...(currentAppearance ?? {}) };
    if (trimmed) {
      if (key === 'size') nextAppearance['size'] = trimmed;
      else nextAppearance['shape'] = trimmed;
    } else {
      if (key === 'size') delete nextAppearance['size'];
      else delete nextAppearance['shape'];
    }

    const hasAnyAppearance = Object.keys(nextAppearance).length > 0;
    updateBodyRegionData(region, { appearance: hasAnyAppearance ? nextAppearance : undefined });
  };

  return (
    <IdentityCard
      title="Body Region Overrides"
      defaultOpen={false}
      hasContent={hasContent}
      cardId="body"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          These fields are manual overrides. They always win over defaults and templates.
        </p>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hair</span>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              type="text"
              className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="Visual: color, style, length..."
              value={getRegionVisualDescription(HAIR_REGION)}
              onChange={(e) => updateRegionVisualDescription(HAIR_REGION, e.target.value)}
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Scent: lavender shampoo"
                value={getRegionScentPrimary(HAIR_REGION)}
                onChange={(e) => updateRegionScentPrimary(HAIR_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Texture: silky"
                value={getRegionTexturePrimary(HAIR_REGION)}
                onChange={(e) => updateRegionTexturePrimary(HAIR_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Flavor (optional)"
                value={getRegionFlavorPrimary(HAIR_REGION)}
                onChange={(e) => updateRegionFlavorPrimary(HAIR_REGION, e.target.value)}
              />
            </div>
          </div>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Face</span>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <textarea
              className="w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="Visual: facial features, eye color, uniquely shaped nose..."
              value={getRegionVisualDescription(FACE_REGION)}
              onChange={(e) => updateRegionVisualDescription(FACE_REGION, e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Scent: clean soap"
                value={getRegionScentPrimary(FACE_REGION)}
                onChange={(e) => updateRegionScentPrimary(FACE_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Texture: smooth"
                value={getRegionTexturePrimary(FACE_REGION)}
                onChange={(e) => updateRegionTexturePrimary(FACE_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Flavor (optional)"
                value={getRegionFlavorPrimary(FACE_REGION)}
                onChange={(e) => updateRegionFlavorPrimary(FACE_REGION, e.target.value)}
              />
            </div>
          </div>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Torso</span>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              type="text"
              className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="Visual: build, musculature, posture, notable birthmarks..."
              value={getRegionVisualDescription(TORSO_REGION)}
              onChange={(e) => updateRegionVisualDescription(TORSO_REGION, e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Scent: warm skin"
                value={getRegionScentPrimary(TORSO_REGION)}
                onChange={(e) => updateRegionScentPrimary(TORSO_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Texture: firm"
                value={getRegionTexturePrimary(TORSO_REGION)}
                onChange={(e) => updateRegionTexturePrimary(TORSO_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Flavor (optional)"
                value={getRegionFlavorPrimary(TORSO_REGION)}
                onChange={(e) => updateRegionFlavorPrimary(TORSO_REGION, e.target.value)}
              />
            </div>
          </div>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hands</span>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              type="text"
              className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="Visual: calluses, scars, ring marks..."
              value={getRegionVisualDescription(HANDS_REGION)}
              onChange={(e) => updateRegionVisualDescription(HANDS_REGION, e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Scent: smoke, leather"
                value={getRegionScentPrimary(HANDS_REGION)}
                onChange={(e) => updateRegionScentPrimary(HANDS_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Texture: calloused"
                value={getRegionTexturePrimary(HANDS_REGION)}
                onChange={(e) => updateRegionTexturePrimary(HANDS_REGION, e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Flavor (optional)"
                value={getRegionFlavorPrimary(HANDS_REGION)}
                onChange={(e) => updateRegionFlavorPrimary(HANDS_REGION, e.target.value)}
              />
            </div>
          </div>
        </label>

        <div className="pt-4 border-t border-slate-800" />

        <div>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Feet</span>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-slate-500">Left Foot</div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Size</span>
                  <select
                    value={getRegionAppearanceValue(LEFT_FOOT_REGION, 'size')}
                    onChange={(e) =>
                      updateRegionAppearanceValue(LEFT_FOOT_REGION, 'size', e.target.value)
                    }
                    className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    <option value="">(unset)</option>
                    {APPEARANCE_FEET_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Shape</span>
                  <input
                    type="text"
                    value={getRegionAppearanceValue(LEFT_FOOT_REGION, 'shape')}
                    onChange={(e) =>
                      updateRegionAppearanceValue(LEFT_FOOT_REGION, 'shape', e.target.value)
                    }
                    placeholder="e.g., narrow, wide"
                    className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                </label>
              </div>

              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Visual: calluses, dirt, scars..."
                value={getRegionVisualDescription(LEFT_FOOT_REGION)}
                onChange={(e) => updateRegionVisualDescription(LEFT_FOOT_REGION, e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  placeholder="Scent: leather, sweat"
                  value={getRegionScentPrimary(LEFT_FOOT_REGION)}
                  onChange={(e) => updateRegionScentPrimary(LEFT_FOOT_REGION, e.target.value)}
                />
                <input
                  type="text"
                  className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  placeholder="Texture: rough"
                  value={getRegionTexturePrimary(LEFT_FOOT_REGION)}
                  onChange={(e) => updateRegionTexturePrimary(LEFT_FOOT_REGION, e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-500">Right Foot</div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Size</span>
                  <select
                    value={getRegionAppearanceValue(RIGHT_FOOT_REGION, 'size')}
                    onChange={(e) =>
                      updateRegionAppearanceValue(RIGHT_FOOT_REGION, 'size', e.target.value)
                    }
                    className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  >
                    <option value="">(unset)</option>
                    {APPEARANCE_FEET_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Shape</span>
                  <input
                    type="text"
                    value={getRegionAppearanceValue(RIGHT_FOOT_REGION, 'shape')}
                    onChange={(e) =>
                      updateRegionAppearanceValue(RIGHT_FOOT_REGION, 'shape', e.target.value)
                    }
                    placeholder="e.g., narrow, wide"
                    className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                </label>
              </div>

              <input
                type="text"
                className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                placeholder="Visual: calluses, dirt, scars..."
                value={getRegionVisualDescription(RIGHT_FOOT_REGION)}
                onChange={(e) => updateRegionVisualDescription(RIGHT_FOOT_REGION, e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  placeholder="Scent: leather, sweat"
                  value={getRegionScentPrimary(RIGHT_FOOT_REGION)}
                  onChange={(e) => updateRegionScentPrimary(RIGHT_FOOT_REGION, e.target.value)}
                />
                <input
                  type="text"
                  className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
                  placeholder="Texture: rough"
                  value={getRegionTexturePrimary(RIGHT_FOOT_REGION)}
                  onChange={(e) => updateRegionTexturePrimary(RIGHT_FOOT_REGION, e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </IdentityCard>
  );
};
