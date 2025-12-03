import React, { useState } from 'react';
import {
  CharacterProfileSchema,
  SPEECH_DARKNESS_LEVELS,
  SPEECH_FORMALITY_LEVELS,
  SPEECH_HUMOR_LEVELS,
  SPEECH_PACING_LEVELS,
  SPEECH_SENTENCE_LENGTHS,
  SPEECH_VERBOSITY_LEVELS,
  type CharacterDetail,
  type Scent,
  type Physique,
  type CharacterProfile,
} from '@minimal-rpg/schemas';
import { mapZodErrorsToFields } from '@minimal-rpg/utils';
import type { CharacterStyleOverrides, SelectOption } from '../../types.js';
import { splitList } from '../shared/stringLists.js';
import { persistCharacter } from './api.js';
import { AppearanceSection } from './components/AppearanceSection.js';
import { BasicsSection } from './components/BasicsSection.js';
import { DetailsSection } from './components/DetailsSection.js';
import { GoalsAndStyleSection } from './components/GoalsAndStyleSection.js';
import { PersonalitySection } from './components/PersonalitySection.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';
import { ScentSection } from './components/ScentSection.js';
import { useCharacterBuilderForm } from './hooks/useCharacterBuilderForm.js';
import {
  type DetailFormEntry,
  type FormFieldErrors,
  type FormKey,
  type FormState,
  type StyleValue,
} from './types.js';

const HAIR_SCENTS = ['floral', 'citrus', 'fresh', 'herbal', 'neutral'] as const;
const BODY_SCENTS = ['clean', 'fresh', 'neutral', 'light musk'] as const;

const pickOption = <T extends string>(value: SelectOption<T>, fallback: T): T =>
  (value ?? fallback) as T;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parsePersonality = (value: string): string | string[] => {
  const parts = splitList(value);
  if (parts.length <= 1) {
    return parts[0] ?? '';
  }
  return parts;
};

const shouldUseStructuredAppearance = (form: FormState) =>
  Boolean(
    form.apHeight ??
      form.apTorso ??
      form.apSkinTone ??
      form.apFeatures ??
      form.apHairColor ??
      form.apHairStyle ??
      form.apHairLength ??
      form.apEyesColor ??
      form.apArmsBuild ??
      form.apArmsLength ??
      form.apLegsBuild ??
      form.apLegsLength
  );

type AppearanceShape = Physique['appearance'];

const buildAppearance = (form: FormState): AppearanceShape | undefined => {
  const textAppearance = form.appearance.trim();
  if (textAppearance) {
    // When free-text appearance is provided, we represent it via the
    // CharacterProfile.physique string branch instead of structured appearance.
    return undefined;
  }

  if (!shouldUseStructuredAppearance(form)) {
    return undefined;
  }

  const features = splitList(form.apFeatures);

  const appearance: AppearanceShape = {
    hair: {
      color: form.apHairColor || 'brown',
      style: form.apHairStyle || 'straight',
      length: form.apHairLength || 'medium',
    },
    eyes: { color: form.apEyesColor || 'brown' },
    ...(features.length ? { features } : {}),
  };
  return appearance;
};

const buildScent = (form: FormState): Partial<Scent> => {
  const scent: Partial<Scent> = {};
  const hair = form.scentHair.trim();
  if ((HAIR_SCENTS as readonly string[]).includes(hair)) {
    scent.hairScent = hair as Scent['hairScent'];
  }
  const body = form.scentBody.trim();
  if ((BODY_SCENTS as readonly string[]).includes(body)) {
    scent.bodyScent = body as Scent['bodyScent'];
  }
  const perfume = form.scentPerfume.trim();
  if (perfume) {
    scent.perfume = perfume.slice(0, 40);
  }
  return scent;
};

const pickStyleValue = <K extends keyof CharacterStyleOverrides>(
  value: string,
  allowed: readonly string[]
): StyleValue<K> | undefined => (allowed.includes(value) ? (value as StyleValue<K>) : undefined);

const buildStyle = (form: FormState): CharacterStyleOverrides => {
  const style: CharacterStyleOverrides = {};
  const sentenceLength = pickStyleValue<'sentenceLength'>(
    form.styleSentenceLength.trim(),
    SPEECH_SENTENCE_LENGTHS
  );
  if (sentenceLength) style.sentenceLength = sentenceLength;

  const humor = pickStyleValue<'humor'>(form.styleHumor.trim(), SPEECH_HUMOR_LEVELS);
  if (humor) style.humor = humor;

  const darkness = pickStyleValue<'darkness'>(form.styleDarkness.trim(), SPEECH_DARKNESS_LEVELS);
  if (darkness) style.darkness = darkness;

  const pacing = pickStyleValue<'pacing'>(form.stylePacing.trim(), SPEECH_PACING_LEVELS);
  if (pacing) style.pacing = pacing;

  const formality = pickStyleValue<'formality'>(
    form.styleFormality.trim(),
    SPEECH_FORMALITY_LEVELS
  );
  if (formality) style.formality = formality;

  const verbosity = pickStyleValue<'verbosity'>(
    form.styleVerbosity.trim(),
    SPEECH_VERBOSITY_LEVELS
  );
  if (verbosity) style.verbosity = verbosity;

  return style;
};

const mapDetailEntries = (entries: DetailFormEntry[]): CharacterDetail[] => {
  const details: CharacterDetail[] = [];
  for (const entry of entries) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (!label || !value) continue;
    const parsedImportance = Number.parseFloat(entry.importance);
    const importance = Number.isFinite(parsedImportance) ? clamp(parsedImportance, 0, 1) : 0.5;
    const tags = splitList(entry.tags);
    const notes = entry.notes.trim();
    const detail: CharacterDetail = {
      label,
      value,
      area: entry.area ?? 'custom',
      importance,
      tags,
      ...(notes ? { notes } : {}),
    };
    details.push(detail);
  }
  return details;
};

const buildProfile = (form: FormState): CharacterProfile => {
  const tags = splitList(form.tags);
  const appearance = buildAppearance(form);
  const scent = buildScent(form);
  const style = buildStyle(form);
  const details = mapDetailEntries(form.details);

  const physique: CharacterProfile['physique'] | undefined = appearance
    ? {
        build: {
          height: pickOption(form.apHeight, 'average'),
          torso: pickOption(form.apTorso, 'average'),
          skinTone: form.apSkinTone || 'pale',
          arms: {
            build: pickOption(form.apArmsBuild, 'average'),
            length: pickOption(form.apArmsLength, 'average'),
          },
          legs: {
            length: pickOption(form.apLegsLength, 'average'),
            build: pickOption(form.apLegsBuild, 'toned'),
          },
          feet: {
            size: 'small',
            shape: 'average',
          },
        },
        appearance,
      }
    : form.appearance.trim() || undefined;

  const profile: CharacterProfile = {
    id: form.id.trim(),
    name: form.name.trim(),
    age: Number.parseInt(String(form.age), 10),
    summary: form.summary.trim(),
    backstory: form.backstory.trim(),
    tags,
    personality: parsePersonality(form.personality),
    speakingStyle: form.speakingStyle.trim(),
    ...(physique ? { physique } : {}),
    ...(Object.keys(scent).length ? { scent } : {}),
    ...(Object.keys(style).length ? { style } : {}),
    ...(details.length ? { details } : {}),
  };

  return profile;
};

export const CharacterBuilder: React.FC<{
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}> = ({ id, onSave: onSaveCallback, onCancel }) => {
  const {
    form,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateDetailEntry,
    addDetailEntry,
    removeDetailEntry,
    loading,
    loadError,
  } = useCharacterBuilderForm(id);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const profile = buildProfile(form);
    const validation = CharacterProfileSchema.safeParse(profile);
    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
        pathToField: (path: (string | number)[]) => {
          const p = path.map(String);
          if (p[0] === 'appearance') {
            const map: Record<string, FormKey> = {
              'hair.color': 'apHairColor',
              'hair.style': 'apHairStyle',
              'hair.length': 'apHairLength',
              'eyes.color': 'apEyesColor',
              height: 'apHeight',
              torso: 'apTorso',
              skinTone: 'apSkinTone',
              'arms.build': 'apArmsBuild',
              'arms.length': 'apArmsLength',
              'legs.build': 'apLegsBuild',
              'legs.length': 'apLegsLength',
            };
            return map[p.slice(1).join('.')] ?? undefined;
          }
          const top: Record<string, FormKey> = {
            id: 'id',
            name: 'name',
            age: 'age',
            summary: 'summary',
            backstory: 'backstory',
            personality: 'personality',
            speakingStyle: 'speakingStyle',
          };
          const key = p[0];
          if (!key) return undefined;
          return Object.hasOwn(top, key) ? top[key] : undefined;
        },
      });
      setFieldErrors(fieldMap as FormFieldErrors);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }

    try {
      await persistCharacter(profile);
      setSuccess('Character saved.');
      if (onSaveCallback) onSaveCallback();
      window.location.hash = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || loading;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">Character Builder</h2>
      {loading && <p className="text-sm text-slate-400">Loading character…</p>}
      {loadError && !loading && <p className="text-sm text-amber-300">{loadError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <BasicsSection form={form} fieldErrors={fieldErrors} updateField={updateField} />
          <PersonalitySection form={form} fieldErrors={fieldErrors} updateField={updateField} />
          <AppearanceSection form={form} fieldErrors={fieldErrors} updateField={updateField} />
          <DetailsSection
            details={form.details}
            updateDetailEntry={updateDetailEntry}
            addDetailEntry={addDetailEntry}
            removeDetailEntry={removeDetailEntry}
          />
          <ScentSection form={form} updateField={updateField} />
          <GoalsAndStyleSection form={form} fieldErrors={fieldErrors} updateField={updateField} />
        </div>

        <PreviewSidebar
          form={form}
          disabled={disabled}
          saving={saving}
          error={error}
          success={success}
          loadError={loadError}
          onSave={() => {
            void handleSave();
          }}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};
