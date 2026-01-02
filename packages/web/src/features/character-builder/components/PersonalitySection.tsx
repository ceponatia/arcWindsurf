import React, { useCallback } from 'react';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import { validateTraitSet } from '@minimal-rpg/schemas';
import type { FormFieldErrors, FormState, UpdateFieldFn, PersonalityFormState } from '../types.js';
import { BigFiveSliders } from './personality/BigFiveSliders.js';
import { EmotionalBaselineForm } from './personality/EmotionalBaselineForm.js';
import { ValuesList } from './personality/ValuesList.js';
import { FearsList } from './personality/FearsList.js';
import { SocialPatternsForm } from './personality/SocialPatternsForm.js';
import { SpeechStyleForm } from './personality/SpeechStyleForm.js';
import { StressBehaviorForm } from './personality/StressBehaviorForm.js';
import { Subsection, SelectInput } from './personality/common.js';

interface PersonalitySectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
  /** When true, shows all advanced personality subsections */
  isAdvanced?: boolean;
}

export const PersonalitySection: React.FC<PersonalitySectionProps> = ({
  form,
  fieldErrors,
  updateField,
  isAdvanced = false,
}) => {
  const pm = form.personalityMap;

  // Update nested personality map state
  const updatePM = useCallback(
    <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => {
      updateField('personalityMap', { ...pm, [key]: value });
    },
    [pm, updateField]
  );

  // Validate traits as user types
  const traitValidation = React.useMemo(() => {
    if (!pm.traits) return null;
    const traits = pm.traits
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (traits.length === 0) return null;
    return validateTraitSet(traits);
  }, [pm.traits]);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Personality</div>
      <div className="p-4 space-y-4">
        {/* Quick Traits (simple text) - always visible */}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Quick Traits (comma-separated keywords)</span>
          <input
            className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
            value={form.personality}
            onChange={(e) => updateField('personality', e.target.value)}
            placeholder="e.g., friendly, cautious, curious"
            {...getInlineErrorProps('personality', fieldErrors.personality)}
          />
          {fieldErrors.personality && (
            <span id="personality-error" className="text-sm text-red-400">
              {fieldErrors.personality}
            </span>
          )}
        </label>

        {/* Trait prompts (structured) - advanced only */}
        {isAdvanced && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">
              Trait Prompt IDs (e.g., friendliness:high, speech:formal)
            </span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={pm.traits}
              onChange={(e) => updatePM('traits', e.target.value)}
              placeholder="e.g., friendliness:high, trust:low, speech:formal"
            />
            {traitValidation && traitValidation.hardConflicts.length > 0 && (
              <div className="text-xs text-red-400 mt-1">
                Conflicts:{' '}
                {traitValidation.hardConflicts.map((c) => `${c.trait1} ↔ ${c.trait2}`).join(', ')}
              </div>
            )}
            {traitValidation && traitValidation.softConflicts.length > 0 && (
              <div className="text-xs text-yellow-400 mt-1">
                Soft conflicts:{' '}
                {traitValidation.softConflicts.map((c) => `${c.trait1} ↔ ${c.trait2}`).join(', ')}
              </div>
            )}
          </label>
        )}

        {/* Big Five Dimensions - always visible */}
        <BigFiveSliders pm={pm} updatePM={updatePM} />

        {/* Advanced subsections - only visible in advanced mode */}
        {isAdvanced && (
          <>
            <EmotionalBaselineForm pm={pm} updatePM={updatePM} />
            <ValuesList pm={pm} updatePM={updatePM} />
            <FearsList pm={pm} updatePM={updatePM} />

            {/* Attachment Style */}
            <Subsection title="Attachment Style">
              <SelectInput
                label="Attachment Style"
                value={pm.attachment}
                onChange={(v) => updatePM('attachment', v as PersonalityFormState['attachment'])}
                options={[
                  'secure',
                  'anxious-preoccupied',
                  'dismissive-avoidant',
                  'fearful-avoidant',
                ]}
              />
            </Subsection>

            <SocialPatternsForm pm={pm} updatePM={updatePM} />
            <SpeechStyleForm pm={pm} updatePM={updatePM} />
            <StressBehaviorForm pm={pm} updatePM={updatePM} />
          </>
        )}
      </div>
    </div>
  );
};
