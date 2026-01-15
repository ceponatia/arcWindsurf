import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { characterProfile, updateProfile } from '../signals.js';
import { IdentityCard } from './IdentityCard.js';
import { SelectInput } from '../../../shared/components/common.js';

interface Physique {
  height?: string;
  build?: string;
  ageAppearance?: string;
  notableFeatures?: string;
  impression?: string;
}

/**
 * AppearanceCard handles overall physical characteristics.
 */
export const AppearanceCard: React.FC<{ hasContent?: boolean }> = ({ hasContent }) => {
  useSignals();

  /** Current physique from signal, ensuring it's an object for this component */
  const physique = (
    typeof characterProfile.value.physique === 'object' &&
    characterProfile.value.physique !== null &&
    !Array.isArray(characterProfile.value.physique)
      ? characterProfile.value.physique
      : {}
  ) as Physique;

  const updatePhysique = (field: keyof Physique, value: string) => {
    const nextPhysique = { ...physique, [field]: value };
    updateProfile('physique', nextPhysique as CharacterProfile['physique']);
  };

  return (
    <IdentityCard title="Physical Appearance" defaultOpen={false} hasContent={hasContent}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-slate-400">Height</span>
            <input
              type="text"
              value={physique.height ?? ''}
              onChange={(e) => updatePhysique('height', e.target.value)}
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              placeholder="e.g., 5'10 or Tall"
            />
          </label>

          <SelectInput
            label="Build"
            value={physique.build ?? 'average'}
            onChange={(v: string) => updatePhysique('build', v)}
            options={['slight', 'lean', 'average', 'athletic', 'muscular', 'heavy']}
          />
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">Age Appearance</span>
          <input
            type="text"
            value={physique.ageAppearance ?? ''}
            onChange={(e) => updatePhysique('ageAppearance', e.target.value)}
            className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="How old they look..."
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Notable Features</span>
          <textarea
            value={physique.notableFeatures ?? ''}
            onChange={(e) => updatePhysique('notableFeatures', e.target.value)}
            className="mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="Scars, tattoos, distinctive marks..."
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Overall Impression</span>
          <textarea
            value={physique.impression ?? ''}
            onChange={(e) => updatePhysique('impression', e.target.value)}
            className="mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="First impression others have..."
          />
        </label>
      </div>
    </IdentityCard>
  );
};
