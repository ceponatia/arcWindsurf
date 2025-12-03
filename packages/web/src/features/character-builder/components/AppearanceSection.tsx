import React from 'react';
import {
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_HEIGHTS,
  APPEARANCE_LEGS_BUILD,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_TORSOS,
} from '@minimal-rpg/schemas';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import type { FormFieldErrors, FormState, UpdateFieldFn } from '../types.js';

interface AppearanceSectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  form,
  fieldErrors,
  updateField,
}) => {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Appearance</div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Hair Color</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apHairColor}
              onChange={(e) => updateField('apHairColor', e.target.value)}
              {...getInlineErrorProps('apHairColor', fieldErrors.apHairColor ?? undefined)}
            />
            {fieldErrors.apHairColor && (
              <span id="apHairColor-error" className="text-sm text-red-400">
                {fieldErrors.apHairColor}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Hair Style</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apHairStyle}
              onChange={(e) => updateField('apHairStyle', e.target.value)}
              {...getInlineErrorProps('apHairStyle', fieldErrors.apHairStyle ?? undefined)}
            />
            {fieldErrors.apHairStyle && (
              <span id="apHairStyle-error" className="text-sm text-red-400">
                {fieldErrors.apHairStyle}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Hair Length</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apHairLength}
              onChange={(e) => updateField('apHairLength', e.target.value)}
              {...getInlineErrorProps('apHairLength', fieldErrors.apHairLength ?? undefined)}
            />
            {fieldErrors.apHairLength && (
              <span id="apHairLength-error" className="text-sm text-red-400">
                {fieldErrors.apHairLength}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Eye Color</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apEyesColor}
              onChange={(e) => updateField('apEyesColor', e.target.value)}
              {...getInlineErrorProps('apEyesColor', fieldErrors.apEyesColor ?? undefined)}
            />
            {fieldErrors.apEyesColor && (
              <span id="apEyesColor-error" className="text-sm text-red-400">
                {fieldErrors.apEyesColor}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Height</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apHeight ?? ''}
              onChange={(e) => updateField('apHeight', e.target.value as FormState['apHeight'])}
              {...getInlineErrorProps('apHeight', fieldErrors.apHeight ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_HEIGHTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apHeight && (
              <span id="apHeight-error" className="text-sm text-red-400">
                {fieldErrors.apHeight}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Torso Build</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apTorso ?? ''}
              onChange={(e) => updateField('apTorso', e.target.value as FormState['apTorso'])}
              {...getInlineErrorProps('apTorso', fieldErrors.apTorso ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_TORSOS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apTorso && (
              <span id="apTorso-error" className="text-sm text-red-400">
                {fieldErrors.apTorso}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-slate-400">Skin Tone</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apSkinTone}
              onChange={(e) => updateField('apSkinTone', e.target.value)}
              {...getInlineErrorProps('apSkinTone', fieldErrors.apSkinTone ?? undefined)}
            />
            {fieldErrors.apSkinTone && (
              <span id="apSkinTone-error" className="text-sm text-red-400">
                {fieldErrors.apSkinTone}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-slate-400">Features (comma)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apFeatures}
              onChange={(e) => updateField('apFeatures', e.target.value)}
              {...getInlineErrorProps('apFeatures', fieldErrors.apFeatures ?? undefined)}
            />
            {fieldErrors.apFeatures && (
              <span id="apFeatures-error" className="text-sm text-red-400">
                {fieldErrors.apFeatures}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Arms Build</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apArmsBuild ?? ''}
              onChange={(e) =>
                updateField('apArmsBuild', e.target.value as FormState['apArmsBuild'])
              }
              {...getInlineErrorProps('apArmsBuild', fieldErrors.apArmsBuild ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_ARMS_BUILD.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apArmsBuild && (
              <span id="apArmsBuild-error" className="text-sm text-red-400">
                {fieldErrors.apArmsBuild}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Arms Length</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apArmsLength ?? ''}
              onChange={(e) =>
                updateField('apArmsLength', e.target.value as FormState['apArmsLength'])
              }
              {...getInlineErrorProps('apArmsLength', fieldErrors.apArmsLength ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_ARMS_LENGTH.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apArmsLength && (
              <span id="apArmsLength-error" className="text-sm text-red-400">
                {fieldErrors.apArmsLength}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Legs Build</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apLegsBuild ?? ''}
              onChange={(e) =>
                updateField('apLegsBuild', e.target.value as FormState['apLegsBuild'])
              }
              {...getInlineErrorProps('apLegsBuild', fieldErrors.apLegsBuild ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_LEGS_BUILD.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apLegsBuild && (
              <span id="apLegsBuild-error" className="text-sm text-red-400">
                {fieldErrors.apLegsBuild}
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Legs Length</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.apLegsLength ?? ''}
              onChange={(e) =>
                updateField('apLegsLength', e.target.value as FormState['apLegsLength'])
              }
              {...getInlineErrorProps('apLegsLength', fieldErrors.apLegsLength ?? undefined)}
            >
              <option value=""></option>
              {APPEARANCE_LEGS_LENGTH.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldErrors.apLegsLength && (
              <span id="apLegsLength-error" className="text-sm text-red-400">
                {fieldErrors.apLegsLength}
              </span>
            )}
          </label>
        </div>
      </div>
    </div>
  );
};
