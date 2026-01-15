import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  RACES,
  ALIGNMENTS,
  RACE_SUBRACES,
  type Race,
  type Subrace,
  type Alignment,
  type Gender,
} from '@minimal-rpg/schemas';
import {
  characterProfile,
  updateProfile,
  fieldErrors,
  clearFieldError,
  sectionCompletion,
} from '../signals.js';
import { IdentityCard } from './IdentityCard.js';
import { BigFiveSliders } from './personality/BigFiveSliders.js';
import { EmotionalBaselineForm } from './personality/EmotionalBaselineForm.js';
import { ValuesList } from './personality/ValuesList.js';
import { FearsList } from './personality/FearsList.js';
import { SocialPatternsForm } from './personality/SocialPatternsForm.js';
import { SpeechStyleForm } from './personality/SpeechStyleForm.js';
import { StressBehaviorForm } from './personality/StressBehaviorForm.js';
import { BodyCard } from './BodyCard.js';
import { AppearanceCard } from './AppearanceCard.js';

export const IdentityPanel: React.FC = () => {
  useSignals();

  const profile = characterProfile.value;
  const completion = sectionCompletion.value;

  return (
    <div className="space-y-4 pb-8">
      {/* Core Identity Card */}
      <IdentityCard title="Core Identity" defaultOpen={true} hasContent={completion.name}>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={profile.name ?? ''}
              onChange={(e) => {
                updateProfile('name', e.target.value);
                clearFieldError('name');
              }}
              className={`mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 ${
                fieldErrors.value.name
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-slate-700 focus:ring-violet-500'
              }`}
              placeholder="Character name"
            />
            {fieldErrors.value.name && (
              <div className="mt-1 text-xs text-red-400">{fieldErrors.value.name}</div>
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Age <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={profile.age ?? ''}
                onChange={(e) => {
                  updateProfile('age', parseInt(e.target.value, 10));
                  clearFieldError('age');
                }}
                className={`mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  fieldErrors.value.age
                    ? 'ring-red-500 focus:ring-red-500'
                    : 'ring-slate-700 focus:ring-violet-500'
                }`}
                placeholder="Age"
              />
              {fieldErrors.value.age && (
                <div className="mt-1 text-xs text-red-400">{fieldErrors.value.age}</div>
              )}
            </label>

            <label className="block">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Gender <span className="text-red-500">*</span>
              </span>
              <select
                value={profile.gender ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value !== '') {
                    updateProfile('gender', value as Gender);
                  }
                  clearFieldError('gender');
                }}
                className={`mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 ${
                  fieldErrors.value.gender
                    ? 'ring-red-500 focus:ring-red-500'
                    : 'ring-slate-700 focus:ring-violet-500'
                }`}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {fieldErrors.value.gender && (
                <div className="mt-1 text-xs text-red-400">{fieldErrors.value.gender}</div>
              )}
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Summary <span className="text-red-500">*</span>
            </span>
            <textarea
              value={profile.summary ?? ''}
              onChange={(e) => {
                updateProfile('summary', e.target.value);
                clearFieldError('summary');
              }}
              className={`mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 ${
                fieldErrors.value.summary
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-slate-700 focus:ring-violet-500'
              }`}
              placeholder="A brief description of who they are..."
            />
            {fieldErrors.value.summary && (
              <div className="mt-1 text-xs text-red-400">{fieldErrors.value.summary}</div>
            )}
          </label>
        </div>
      </IdentityCard>

      {/* Backstory Card */}
      <IdentityCard title="Backstory" defaultOpen={false} hasContent={completion.backstory}>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Character Backstory <span className="text-red-500">*</span>
            </span>
            <textarea
              value={profile.backstory ?? ''}
              onChange={(e) => {
                updateProfile('backstory', e.target.value);
                clearFieldError('backstory');
              }}
              className={`mt-1 w-full min-h-[160px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 ${
                fieldErrors.value.backstory
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-slate-700 focus:ring-violet-500'
              }`}
              placeholder="Describe the character's history and background..."
            />
            {fieldErrors.value.backstory && (
              <div className="mt-1 text-xs text-red-400">{fieldErrors.value.backstory}</div>
            )}
          </label>
        </div>
      </IdentityCard>

      {/* Classification Card */}
      <IdentityCard title="Classification" defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Race <span className="text-red-500">*</span>
              </span>
              <select
                value={profile.race ?? ''}
                onChange={(e) => {
                  const newRace = e.target.value as Race;
                  updateProfile('race', newRace);
                  clearFieldError('race');
                  // Clear subrace if not valid for new race
                  if (profile.subrace && newRace) {
                    const validSubraces = RACE_SUBRACES[newRace] ?? [];
                    if (!validSubraces.includes(profile.subrace)) {
                      updateProfile('subrace', undefined);
                    }
                  }
                }}
                className={`mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 focus:ring-2 ${
                  fieldErrors.value.race
                    ? 'ring-red-500 focus:ring-red-500'
                    : 'ring-slate-700 focus:ring-violet-500'
                }`}
              >
                <option value="">Select...</option>
                {RACES.map((race) => (
                  <option key={race} value={race}>
                    {race}
                  </option>
                ))}
              </select>
              {fieldErrors.value.race && (
                <div className="mt-1 text-xs text-red-400">{fieldErrors.value.race}</div>
              )}
            </label>

            <label className="block">
              <span className="text-xs text-slate-400">Subrace</span>
              <select
                value={profile.subrace ?? ''}
                onChange={(e) => {
                  const value = e.target.value as Subrace | '';
                  updateProfile('subrace', value === '' ? undefined : value);
                }}
                disabled={!profile.race || (RACE_SUBRACES[profile.race]?.length ?? 0) === 0}
                className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">None</option>
                {profile.race &&
                  RACE_SUBRACES[profile.race]?.map((subrace) => (
                    <option key={subrace} value={subrace}>
                      {subrace}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-slate-400">Alignment</span>
            <select
              value={profile.alignment ?? ''}
              onChange={(e) => {
                const value = e.target.value as Alignment | '';
                updateProfile('alignment', value === '' ? undefined : value);
              }}
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              {ALIGNMENTS.map((alignment) => (
                <option key={alignment} value={alignment}>
                  {alignment}
                </option>
              ))}
            </select>
          </label>
        </div>
      </IdentityCard>

      {/* Personality Dimensions Card */}
      <IdentityCard
        title="Personality Dimensions"
        defaultOpen={true}
        hasContent={completion.dimensions}
      >
        <BigFiveSliders />
      </IdentityCard>

      {/* Emotional Baseline Card */}
      <IdentityCard title="Emotional Baseline" defaultOpen={false}>
        <EmotionalBaselineForm />
      </IdentityCard>

      {/* Values Card */}
      <IdentityCard title="Values & Motivations" defaultOpen={false} hasContent={completion.values}>
        <ValuesList />
      </IdentityCard>

      {/* Fears Card */}
      <IdentityCard title="Fears & Triggers" defaultOpen={false} hasContent={completion.fears}>
        <FearsList />
      </IdentityCard>

      {/* Social Patterns Card */}
      <IdentityCard title="Social Patterns" defaultOpen={false} hasContent={completion.social}>
        <SocialPatternsForm />
      </IdentityCard>

      {/* Speech Style Card */}
      <IdentityCard
        title="Voice & Communication"
        defaultOpen={false}
        hasContent={completion.speech}
      >
        <SpeechStyleForm />
      </IdentityCard>

      {/* Stress Card */}
      <IdentityCard title="Stress Response" defaultOpen={false} hasContent={completion.stress}>
        <StressBehaviorForm />
      </IdentityCard>

      {/* Physical & Body Cards */}
      <AppearanceCard hasContent={completion.physique} />
      <BodyCard hasContent={completion.body} />

      {/* Additional cards can be added here */}
      <div className="text-xs text-slate-500 text-center py-4">
        More identity cards coming soon...
      </div>
    </div>
  );
};
