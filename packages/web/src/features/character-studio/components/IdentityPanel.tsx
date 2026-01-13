import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { RACES, ALIGNMENTS } from '@minimal-rpg/schemas';
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

  /**
   * Helper to determine completion of Core Identity.
   */
  const getCoreCompletion = () => {
    const fields = [profile.name, profile.age, profile.gender, profile.summary];
    const filled = fields.filter((f) => {
      if (typeof f === 'string') return f.trim().length > 0;
      if (typeof f === 'number') return true;
      return Boolean(f);
    }).length;
    return (filled / fields.length) * 100;
  };

  /**
   * Helper for Backstory completion.
   */
  const getBackstoryCompletion = () => (profile.backstory?.trim().length ? 100 : 0);

  /**
   * Helper for Classification completion.
   */
  const getClassificationCompletion = () => {
    const fields = [profile.race, profile.alignment, profile.tier];
    const filled = fields.filter(Boolean).length;
    return (filled / fields.length) * 100;
  };

  /**
   * Helper for personality sub-maps.
   */
  const getPersonalityCompletion = (key: keyof NonNullable<typeof profile.personalityMap>) => {
    const map = profile.personalityMap?.[key];
    if (!map) return 0;
    if (Array.isArray(map)) return map.length > 0 ? 100 : 0;
    if (typeof map === 'object') return Object.keys(map).length > 0 ? 100 : 0;
    return 0;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Core Identity Card */}
      <IdentityCard
        title="Core Identity"
        defaultOpen={true}
        completionPercent={getCoreCompletion()}
        hasContent={completion.name}
      >
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
                value={((profile as Record<string, unknown>)['gender'] as string) ?? ''}
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
      <IdentityCard
        title="Backstory"
        defaultOpen={false}
        completionPercent={getBackstoryCompletion()}
        hasContent={completion.backstory}
      >
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
      <IdentityCard
        title="Classification"
        defaultOpen={false}
        completionPercent={getClassificationCompletion()}
      >
        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs text-slate-400">Race</span>
            <select
              value={profile.race ?? ''}
              onChange={(e) => updateProfile('race', e.target.value as any)}
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              {RACES.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-400">Alignment</span>
            <select
              value={profile.alignment ?? ''}
              onChange={(e) => updateProfile('alignment', e.target.value as any)}
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

          <label className="block">
            <span className="text-xs text-slate-400">Tier</span>
            <select
              value={profile.tier ?? 'minor'}
              onChange={(e) => updateProfile('tier', e.target.value as any)}
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
            >
              <option value="transient">Commoner</option>
              <option value="background">Notable</option>
              <option value="minor">Elite</option>
              <option value="major">Legendary</option>
            </select>
          </label>
        </div>
      </IdentityCard>

      {/* Personality Dimensions Card */}
      <IdentityCard
        title="Personality Dimensions"
        defaultOpen={true}
        completionPercent={getPersonalityCompletion('dimensions')}
        hasContent={completion.dimensions}
      >
        <BigFiveSliders />
      </IdentityCard>

      {/* Emotional Baseline Card */}
      <IdentityCard
        title="Emotional Baseline"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('emotionalBaseline')}
      >
        <EmotionalBaselineForm />
      </IdentityCard>

      {/* Values Card */}
      <IdentityCard
        title="Values & Motivations"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('values')}
        hasContent={completion.values}
      >
        <ValuesList />
      </IdentityCard>

      {/* Fears Card */}
      <IdentityCard
        title="Fears & Triggers"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('fears')}
        hasContent={completion.fears}
      >
        <FearsList />
      </IdentityCard>

      {/* Social Patterns Card */}
      <IdentityCard
        title="Social Patterns"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('social')}
        hasContent={completion.social}
      >
        <SocialPatternsForm />
      </IdentityCard>

      {/* Speech Style Card */}
      <IdentityCard
        title="Voice & Communication"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('speech')}
        hasContent={completion.speech}
      >
        <SpeechStyleForm />
      </IdentityCard>

      {/* Stress Card */}
      <IdentityCard
        title="Stress Response"
        defaultOpen={false}
        completionPercent={getPersonalityCompletion('stress')}
        hasContent={completion.stress}
      >
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
