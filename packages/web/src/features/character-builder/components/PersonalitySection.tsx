import React, { useState, useCallback } from 'react';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import {
  PERSONALITY_DIMENSIONS,
  CORE_EMOTIONS,
  EMOTION_INTENSITIES,
  ATTACHMENT_STYLES,
  CORE_VALUES,
  FEAR_CATEGORIES,
  COPING_MECHANISMS,
  STRANGER_DEFAULTS,
  WARMTH_RATES,
  SOCIAL_ROLES,
  CONFLICT_STYLES,
  CRITICISM_RESPONSES,
  BOUNDARY_TYPES,
  VOCABULARY_LEVELS,
  SENTENCE_STRUCTURES,
  FORMALITY_LEVELS,
  HUMOR_FREQUENCIES,
  HUMOR_TYPES,
  EXPRESSIVENESS_LEVELS,
  DIRECTNESS_LEVELS,
  PACE_LEVELS,
  STRESS_RESPONSES,
  RECOVERY_RATES,
  validateTraitSet,
} from '@minimal-rpg/schemas';
import type {
  FormFieldErrors,
  FormState,
  UpdateFieldFn,
  PersonalityFormState,
  ValueEntry,
  FearEntry,
} from '../types.js';
import { createValueEntry, createFearEntry } from '../types.js';

interface PersonalitySectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
  /** When true, shows all advanced personality subsections */
  isAdvanced?: boolean;
}

/** Collapsible section wrapper */
const Subsection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 flex items-center justify-between"
      >
        <span>{title}</span>
        <span className="text-slate-500">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
};

/** Slider for 0-1 values */
const SliderInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}> = ({ label, value, onChange, lowLabel = 'Low', highLabel = 'High' }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-10">{lowLabel}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-violet-500"
      />
      <span className="text-xs text-slate-500 w-10 text-right">{highLabel}</span>
      <span className="text-xs text-violet-400 w-8 text-right">{(value * 100).toFixed(0)}%</span>
    </div>
  </label>
);

/** Select input for enums */
const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}> = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace(/-/g, ' ')}
        </option>
      ))}
    </select>
  </label>
);

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
        <Subsection title="Big Five Dimensions" defaultOpen={true}>
          {PERSONALITY_DIMENSIONS.map((dim) => {
            const entry = pm.dimensions.find((d) => d.dimension === dim);
            const score = entry?.score ?? 0.5;
            return (
              <SliderInput
                key={dim}
                label={dim.charAt(0).toUpperCase() + dim.slice(1)}
                value={score}
                onChange={(newScore) => {
                  const newDimensions = pm.dimensions.map((d) =>
                    d.dimension === dim ? { ...d, score: newScore } : d
                  );
                  updatePM('dimensions', newDimensions);
                }}
              />
            );
          })}
        </Subsection>

        {/* Advanced subsections - only visible in advanced mode */}
        {isAdvanced && (
          <>
            {/* Emotional Baseline */}
            <Subsection title="Emotional Baseline">
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Current Emotion"
              value={pm.emotionalBaseline.current}
              onChange={(v) =>
                updatePM('emotionalBaseline', {
                  ...pm.emotionalBaseline,
                  current: v as (typeof CORE_EMOTIONS)[number],
                })
              }
              options={CORE_EMOTIONS}
            />
            <SelectInput
              label="Intensity"
              value={pm.emotionalBaseline.intensity}
              onChange={(v) =>
                updatePM('emotionalBaseline', {
                  ...pm.emotionalBaseline,
                  intensity: v as (typeof EMOTION_INTENSITIES)[number],
                })
              }
              options={EMOTION_INTENSITIES}
            />
            <SelectInput
              label="Mood Baseline"
              value={pm.emotionalBaseline.moodBaseline}
              onChange={(v) =>
                updatePM('emotionalBaseline', {
                  ...pm.emotionalBaseline,
                  moodBaseline: v as (typeof CORE_EMOTIONS)[number],
                })
              }
              options={CORE_EMOTIONS}
            />
            <SelectInput
              label="Blend (optional)"
              value={pm.emotionalBaseline.blend ?? ''}
              onChange={(v) => {
                const newBlend = v ? (v as (typeof CORE_EMOTIONS)[number]) : undefined;
                const baseEntry = {
                  current: pm.emotionalBaseline.current,
                  intensity: pm.emotionalBaseline.intensity,
                  moodBaseline: pm.emotionalBaseline.moodBaseline,
                  moodStability: pm.emotionalBaseline.moodStability,
                };
                updatePM(
                  'emotionalBaseline',
                  newBlend ? { ...baseEntry, blend: newBlend } : baseEntry
                );
              }}
              options={['', ...CORE_EMOTIONS]}
            />
          </div>
          <SliderInput
            label="Mood Stability"
            value={pm.emotionalBaseline.moodStability}
            onChange={(v) =>
              updatePM('emotionalBaseline', { ...pm.emotionalBaseline, moodStability: v })
            }
            lowLabel="Volatile"
            highLabel="Stable"
          />
        </Subsection>

        {/* Values */}
        <Subsection title="Core Values">
          {pm.values.map((val, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <SelectInput
                label="Value"
                value={val.value}
                onChange={(v) => {
                  const newValues = pm.values.map((item, i) =>
                    i === idx ? { ...item, value: v as ValueEntry['value'] } : item
                  );
                  updatePM('values', newValues);
                }}
                options={CORE_VALUES}
              />
              <label className="flex flex-col gap-1 w-20">
                <span className="text-xs text-slate-400">Priority</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={val.priority}
                  onChange={(e) => {
                    const newValues = pm.values.map((item, i) =>
                      i === idx ? { ...item, priority: parseInt(e.target.value) || 5 } : item
                    );
                    updatePM('values', newValues);
                  }}
                  className="bg-slate-900 text-slate-200 rounded-md px-2 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const newValues = pm.values.filter((_, i) => i !== idx);
                  updatePM('values', newValues);
                }}
                className="px-2 py-2 text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))}
          {pm.values.length < 5 && (
            <button
              type="button"
              onClick={() => updatePM('values', [...pm.values, createValueEntry()])}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Add Value
            </button>
          )}
        </Subsection>

        {/* Fears */}
        <Subsection title="Fears">
          {pm.fears.map((fear, idx) => (
            <div key={idx} className="space-y-2 border-b border-slate-700 pb-2 mb-2">
              <div className="flex gap-2 items-end">
                <SelectInput
                  label="Category"
                  value={fear.category}
                  onChange={(v) => {
                    const newFears = pm.fears.map((f, i) =>
                      i === idx ? { ...f, category: v as FearEntry['category'] } : f
                    );
                    updatePM('fears', newFears);
                  }}
                  options={FEAR_CATEGORIES}
                />
                <SelectInput
                  label="Coping"
                  value={fear.copingMechanism}
                  onChange={(v) => {
                    const newFears = pm.fears.map((f, i) =>
                      i === idx ? { ...f, copingMechanism: v as FearEntry['copingMechanism'] } : f
                    );
                    updatePM('fears', newFears);
                  }}
                  options={COPING_MECHANISMS}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newFears = pm.fears.filter((_, i) => i !== idx);
                    updatePM('fears', newFears);
                  }}
                  className="px-2 py-2 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Specific</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={fear.specific}
                  onChange={(e) => {
                    const newFears = pm.fears.map((f, i) =>
                      i === idx ? { ...f, specific: e.target.value } : f
                    );
                    updatePM('fears', newFears);
                  }}
                  placeholder="What specifically they fear..."
                />
              </label>
              <SliderInput
                label="Intensity"
                value={fear.intensity}
                onChange={(v) => {
                  const newFears = pm.fears.map((f, i) => (i === idx ? { ...f, intensity: v } : f));
                  updatePM('fears', newFears);
                }}
              />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Triggers (comma-separated)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={fear.triggers}
                  onChange={(e) => {
                    const newFears = pm.fears.map((f, i) =>
                      i === idx ? { ...f, triggers: e.target.value } : f
                    );
                    updatePM('fears', newFears);
                  }}
                  placeholder="e.g., darkness, crowds, loud noises"
                />
              </label>
            </div>
          ))}
          {pm.fears.length < 4 && (
            <button
              type="button"
              onClick={() => updatePM('fears', [...pm.fears, createFearEntry()])}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Add Fear
            </button>
          )}
        </Subsection>

        {/* Attachment Style */}
        <Subsection title="Attachment Style">
          <SelectInput
            label="Attachment Style"
            value={pm.attachment}
            onChange={(v) => updatePM('attachment', v as (typeof ATTACHMENT_STYLES)[number])}
            options={ATTACHMENT_STYLES}
          />
        </Subsection>

        {/* Social Patterns */}
        <Subsection title="Social Patterns">
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Stranger Default"
              value={pm.social.strangerDefault}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  strangerDefault: v as (typeof STRANGER_DEFAULTS)[number],
                })
              }
              options={STRANGER_DEFAULTS}
            />
            <SelectInput
              label="Warmth Rate"
              value={pm.social.warmthRate}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  warmthRate: v as (typeof WARMTH_RATES)[number],
                })
              }
              options={WARMTH_RATES}
            />
            <SelectInput
              label="Preferred Role"
              value={pm.social.preferredRole}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  preferredRole: v as (typeof SOCIAL_ROLES)[number],
                })
              }
              options={SOCIAL_ROLES}
            />
            <SelectInput
              label="Conflict Style"
              value={pm.social.conflictStyle}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  conflictStyle: v as (typeof CONFLICT_STYLES)[number],
                })
              }
              options={CONFLICT_STYLES}
            />
            <SelectInput
              label="Criticism Response"
              value={pm.social.criticismResponse}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  criticismResponse: v as (typeof CRITICISM_RESPONSES)[number],
                })
              }
              options={CRITICISM_RESPONSES}
            />
            <SelectInput
              label="Boundaries"
              value={pm.social.boundaries}
              onChange={(v) =>
                updatePM('social', {
                  ...pm.social,
                  boundaries: v as (typeof BOUNDARY_TYPES)[number],
                })
              }
              options={BOUNDARY_TYPES}
            />
          </div>
        </Subsection>

        {/* Speech Style */}
        <Subsection title="Speech Style">
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Vocabulary"
              value={pm.speech.vocabulary}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  vocabulary: v as (typeof VOCABULARY_LEVELS)[number],
                })
              }
              options={VOCABULARY_LEVELS}
            />
            <SelectInput
              label="Sentence Structure"
              value={pm.speech.sentenceStructure}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  sentenceStructure: v as (typeof SENTENCE_STRUCTURES)[number],
                })
              }
              options={SENTENCE_STRUCTURES}
            />
            <SelectInput
              label="Formality"
              value={pm.speech.formality}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  formality: v as (typeof FORMALITY_LEVELS)[number],
                })
              }
              options={FORMALITY_LEVELS}
            />
            <SelectInput
              label="Humor Frequency"
              value={pm.speech.humor}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  humor: v as (typeof HUMOR_FREQUENCIES)[number],
                })
              }
              options={HUMOR_FREQUENCIES}
            />
            {pm.speech.humor !== 'none' && (
              <SelectInput
                label="Humor Type"
                value={pm.speech.humorType ?? ''}
                onChange={(v) => {
                  const newHumorType = v ? (v as (typeof HUMOR_TYPES)[number]) : undefined;
                  const baseSpeech = {
                    vocabulary: pm.speech.vocabulary,
                    sentenceStructure: pm.speech.sentenceStructure,
                    formality: pm.speech.formality,
                    humor: pm.speech.humor,
                    expressiveness: pm.speech.expressiveness,
                    directness: pm.speech.directness,
                    pace: pm.speech.pace,
                  };
                  updatePM(
                    'speech',
                    newHumorType ? { ...baseSpeech, humorType: newHumorType } : baseSpeech
                  );
                }}
                options={['', ...HUMOR_TYPES]}
              />
            )}
            <SelectInput
              label="Expressiveness"
              value={pm.speech.expressiveness}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  expressiveness: v as (typeof EXPRESSIVENESS_LEVELS)[number],
                })
              }
              options={EXPRESSIVENESS_LEVELS}
            />
            <SelectInput
              label="Directness"
              value={pm.speech.directness}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  directness: v as (typeof DIRECTNESS_LEVELS)[number],
                })
              }
              options={DIRECTNESS_LEVELS}
            />
            <SelectInput
              label="Pace"
              value={pm.speech.pace}
              onChange={(v) =>
                updatePM('speech', {
                  ...pm.speech,
                  pace: v as (typeof PACE_LEVELS)[number],
                })
              }
              options={PACE_LEVELS}
            />
          </div>
        </Subsection>

        {/* Stress Behavior */}
        <Subsection title="Stress Behavior">
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Primary Response"
              value={pm.stress.primary}
              onChange={(v) =>
                updatePM('stress', {
                  ...pm.stress,
                  primary: v as (typeof STRESS_RESPONSES)[number],
                })
              }
              options={STRESS_RESPONSES}
            />
            <SelectInput
              label="Secondary Response"
              value={pm.stress.secondary ?? ''}
              onChange={(v) => {
                const newSecondary = v ? (v as (typeof STRESS_RESPONSES)[number]) : undefined;
                const baseStress = {
                  primary: pm.stress.primary,
                  threshold: pm.stress.threshold,
                  recoveryRate: pm.stress.recoveryRate,
                  soothingActivities: pm.stress.soothingActivities,
                  stressIndicators: pm.stress.stressIndicators,
                };
                updatePM(
                  'stress',
                  newSecondary ? { ...baseStress, secondary: newSecondary } : baseStress
                );
              }}
              options={['', ...STRESS_RESPONSES]}
            />
          </div>
          <SliderInput
            label="Stress Threshold"
            value={pm.stress.threshold}
            onChange={(v) => updatePM('stress', { ...pm.stress, threshold: v })}
            lowLabel="Low"
            highLabel="High"
          />
          <SelectInput
            label="Recovery Rate"
            value={pm.stress.recoveryRate}
            onChange={(v) =>
              updatePM('stress', {
                ...pm.stress,
                recoveryRate: v as (typeof RECOVERY_RATES)[number],
              })
            }
            options={RECOVERY_RATES}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Soothing Activities (comma-separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={pm.stress.soothingActivities}
              onChange={(e) =>
                updatePM('stress', { ...pm.stress, soothingActivities: e.target.value })
              }
              placeholder="e.g., reading, walking, music"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Stress Indicators (comma-separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={pm.stress.stressIndicators}
              onChange={(e) =>
                updatePM('stress', { ...pm.stress, stressIndicators: e.target.value })
              }
              placeholder="e.g., pacing, nail-biting, silence"
            />
          </label>
        </Subsection>
          </>
        )}
      </div>
    </div>
  );
};
