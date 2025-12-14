import React, { useState } from 'react';
import {
  CharacterProfileSchema,
  type BodyMap,
  type CharacterDetail,
  type Physique,
  type CharacterProfile,
  type AppearanceRegion,
  type PersonalityMap,
  type Gender,
} from '@minimal-rpg/schemas';
import { generateCharacter, getTheme } from '@minimal-rpg/generator';
import { mapZodErrorsToFields, parseBodyEntries } from '@minimal-rpg/utils';
import { splitList } from '../shared/stringLists.js';
import { persistCharacter, removeCharacter } from './api.js';
import { AppearanceSection } from './components/AppearanceSection.js';
import { BasicsSection } from './components/BasicsSection.js';
import { BodySection } from './components/BodySection.js';
import { DetailsSection } from './components/DetailsSection.js';
import { PersonalitySection } from './components/PersonalitySection.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';
import {
  useCharacterBuilderForm,
  mapProfileToForm,
  mergeGeneratedIntoForm,
} from './hooks/useCharacterBuilderForm.js';
import {
  type AppearanceEntry,
  type BodySensoryEntry,
  type DetailFormEntry,
  type FormFieldErrors,
  type FormKey,
  type FormState,
  type PersonalityFormState,
} from './types.js';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parsePersonality = (value: string): string | string[] => {
  const parts = splitList(value);
  if (parts.length <= 1) {
    return parts[0] ?? '';
  }
  return parts;
};

/**
 * Build PersonalityMap from form state.
 * Only includes non-default values to keep the JSON compact.
 */
const buildPersonalityMap = (pm: PersonalityFormState): PersonalityMap | undefined => {
  const result: PersonalityMap = {};

  // Traits (comma-separated string → array)
  const traits = splitList(pm.traits);
  if (traits.length > 0) {
    result.traits = traits;
  }

  // Dimensions (only include if any differ from 0.5)
  const dimensionScores = pm.dimensions.filter((d) => d.score !== 0.5);
  if (dimensionScores.length > 0) {
    result.dimensions = {};
    for (const d of dimensionScores) {
      result.dimensions[d.dimension] = d.score;
    }
  }

  // Emotional baseline (only include if non-default)
  const eb = pm.emotionalBaseline;
  const hasEmotionalChanges =
    eb.current !== 'anticipation' ||
    eb.intensity !== 'mild' ||
    eb.blend !== undefined ||
    eb.moodBaseline !== 'trust' ||
    eb.moodStability !== 0.5;
  if (hasEmotionalChanges) {
    result.emotionalBaseline = {
      current: eb.current,
      intensity: eb.intensity,
      moodBaseline: eb.moodBaseline,
      moodStability: eb.moodStability,
      ...(eb.blend ? { blend: eb.blend } : {}),
    };
  }

  // Values
  if (pm.values.length > 0) {
    result.values = pm.values.map((v) => ({
      value: v.value,
      priority: v.priority,
    }));
  }

  // Fears
  if (pm.fears.length > 0) {
    result.fears = pm.fears
      .filter((f) => f.specific.trim())
      .map((f) => ({
        category: f.category,
        specific: f.specific,
        intensity: f.intensity,
        triggers: splitList(f.triggers),
        copingMechanism: f.copingMechanism,
      }));
  }

  // Attachment (only if non-default)
  if (pm.attachment !== 'secure') {
    result.attachment = pm.attachment;
  }

  // Social (only include if any differ from defaults)
  const s = pm.social;
  const hasSocialChanges =
    s.strangerDefault !== 'neutral' ||
    s.warmthRate !== 'moderate' ||
    s.preferredRole !== 'supporter' ||
    s.conflictStyle !== 'diplomatic' ||
    s.criticismResponse !== 'reflective' ||
    s.boundaries !== 'healthy';
  if (hasSocialChanges) {
    result.social = {
      strangerDefault: s.strangerDefault,
      warmthRate: s.warmthRate,
      preferredRole: s.preferredRole,
      conflictStyle: s.conflictStyle,
      criticismResponse: s.criticismResponse,
      boundaries: s.boundaries,
    };
  }

  // Speech (only include if any differ from defaults)
  const sp = pm.speech;
  const hasSpeechChanges =
    sp.vocabulary !== 'average' ||
    sp.sentenceStructure !== 'moderate' ||
    sp.formality !== 'neutral' ||
    sp.humor !== 'occasional' ||
    sp.humorType !== undefined ||
    sp.expressiveness !== 'moderate' ||
    sp.directness !== 'direct' ||
    sp.pace !== 'moderate';
  if (hasSpeechChanges) {
    result.speech = {
      vocabulary: sp.vocabulary,
      sentenceStructure: sp.sentenceStructure,
      formality: sp.formality,
      humor: sp.humor,
      expressiveness: sp.expressiveness,
      directness: sp.directness,
      pace: sp.pace,
      ...(sp.humorType ? { humorType: sp.humorType } : {}),
    };
  }

  // Stress (only include if any differ from defaults)
  const st = pm.stress;
  const hasStressChanges =
    st.primary !== 'freeze' ||
    st.secondary !== undefined ||
    st.threshold !== 0.5 ||
    st.recoveryRate !== 'moderate' ||
    st.soothingActivities.trim() ||
    st.stressIndicators.trim();
  if (hasStressChanges) {
    result.stress = {
      primary: st.primary,
      threshold: st.threshold,
      recoveryRate: st.recoveryRate,
      soothingActivities: splitList(st.soothingActivities),
      stressIndicators: splitList(st.stressIndicators),
      ...(st.secondary ? { secondary: st.secondary } : {}),
    };
  }

  // Return undefined if nothing was set
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Group appearance entries by region and attribute.
 * Returns a map: region → attribute → value
 */
function groupAppearanceEntries(
  entries: AppearanceEntry[]
): Map<AppearanceRegion, Map<string, string>> {
  const grouped = new Map<AppearanceRegion, Map<string, string>>();
  for (const entry of entries) {
    if (!entry.value.trim()) continue;
    if (!grouped.has(entry.region)) {
      grouped.set(entry.region, new Map());
    }
    grouped.get(entry.region)!.set(entry.attribute, entry.value.trim());
  }
  return grouped;
}

/**
 * Build Physique from appearance entries.
 */
const buildPhysique = (form: FormState): CharacterProfile['physique'] | undefined => {
  // If free-text appearance is provided, use that
  const textAppearance = form.appearance.trim();
  if (textAppearance) {
    return textAppearance;
  }

  // Group entries by region
  const grouped = groupAppearanceEntries(form.appearances);
  if (grouped.size === 0) {
    return undefined;
  }

  // Extract values with defaults
  const getValue = (region: AppearanceRegion, attr: string, fallback: string): string => {
    return grouped.get(region)?.get(attr) ?? fallback;
  };

  const physique: Physique = {
    build: {
      height: getValue('overall', 'height', 'average') as Physique['build']['height'],
      torso: getValue('overall', 'build', 'average') as Physique['build']['torso'],
      skinTone: getValue('skin', 'tone', 'pale'),
      arms: {
        build: getValue('arms', 'build', 'average') as Physique['build']['arms']['build'],
        length: getValue('arms', 'length', 'average') as Physique['build']['arms']['length'],
      },
      legs: {
        build: getValue('legs', 'build', 'toned') as Physique['build']['legs']['build'],
        length: getValue('legs', 'length', 'average') as Physique['build']['legs']['length'],
      },
      feet: {
        size: getValue('feet', 'size', 'small') as Physique['build']['feet']['size'],
        shape: getValue('feet', 'shape', 'average'),
      },
    },
    appearance: {
      hair: {
        color: getValue('hair', 'color', 'brown'),
        style: getValue('hair', 'style', 'straight'),
        length: getValue('hair', 'length', 'medium'),
      },
      eyes: {
        color: getValue('eyes', 'color', 'brown'),
      },
    },
  };

  // Add face features if present
  const faceFeatures = getValue('face', 'features', '');
  if (faceFeatures) {
    physique.appearance.features = splitList(faceFeatures);
  }

  return physique;
};

/**
 * Build the body map from body sensory entries.
 * Each entry contains a region, type (scent/texture/visual), and raw text.
 * The raw text is parsed using parseBodyEntries which extracts intensity,
 * temperature, moisture and other attributes from natural language.
 */
const buildBody = (entries: BodySensoryEntry[]): BodyMap | undefined => {
  // Build a single text representation for parsing
  // Format: "region: type: raw text" for each entry
  const lines = entries
    .filter((e) => e.raw.trim())
    .map((e) => `${e.region}: ${e.type}: ${e.raw.trim()}`);

  if (lines.length === 0) {
    return undefined;
  }

  // Join lines with semicolons for the parser
  const input = lines.join('; ');
  const result = parseBodyEntries(input);

  // Check if the map has any non-empty regions
  const hasContent = Object.values(result.bodyMap).some((region) => {
    if (!region) return false;
    const scentKeys = region.scent ? Object.keys(region.scent).length : 0;
    const textureKeys = region.texture ? Object.keys(region.texture).length : 0;
    const visualKeys = region.visual ? Object.keys(region.visual).length : 0;
    return scentKeys > 0 || textureKeys > 0 || visualKeys > 0;
  });

  return hasContent ? result.bodyMap : undefined;
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
  const physique = buildPhysique(form);
  const details = mapDetailEntries(form.details);
  const body = buildBody(form.bodySensory);
  const personalityMap = buildPersonalityMap(form.personalityMap);

  // Cast gender to Gender type if valid
  const genderValue = form.gender.trim();
  const validGenders = ['male', 'female', 'other', 'unknown'] as const;
  const gender = validGenders.includes(genderValue as Gender) ? (genderValue as Gender) : undefined;

  const profilePicTrimmed = form.profilePic?.trim();

  const profile: CharacterProfile = {
    id: form.id.trim(),
    name: form.name.trim(),
    age: Number.parseInt(String(form.age), 10),
    ...(gender ? { gender } : {}),
    summary: form.summary.trim(),
    backstory: form.backstory.trim(),
    tags,
    tier: 'minor', // Default tier for manually created characters
    personality: parsePersonality(form.personality),
    ...(physique ? { physique } : {}),
    ...(details.length ? { details } : {}),
    ...(body ? { body } : {}),
    ...(personalityMap ? { personalityMap } : {}),
    ...(profilePicTrimmed ? { profilePic: profilePicTrimmed } : {}),
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
    setForm,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateDetailEntry,
    addDetailEntry,
    removeDetailEntry,
    updateBodyEntry,
    addBodyEntry,
    removeBodyEntry,
    updateAppearanceEntry,
    addAppearanceEntry,
    removeAppearanceEntry,
    loading,
    loadError,
  } = useCharacterBuilderForm(id);

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditing = Boolean(id);

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    await removeCharacter(id);
    window.location.hash = '';
  };

  /**
   * Generate missing fields using the generator and merge into form.
   * Uses fill-empty mode to preserve user-entered data.
   */
  const handleGenerate = () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Determine theme based on gender (if set)
      const gender = form.gender.trim().toLowerCase() as Gender | '';
      const themeId =
        gender === 'male' ? 'modern-man' : gender === 'female' ? 'modern-woman' : 'base';
      const theme = getTheme(themeId);

      // Generate a complete character
      const { character } = generateCharacter({
        theme,
        mode: 'overwrite-all',
      });

      // Convert generated CharacterProfile to FormState
      const generatedForm = mapProfileToForm(character);

      // Merge generated data into existing form, preserving user values
      setForm((current) => mergeGeneratedIntoForm(current, generatedForm));

      setSuccess('Generated missing fields');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

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
          // Map validation errors for top-level fields
          const top: Record<string, FormKey> = {
            id: 'id',
            name: 'name',
            age: 'age',
            summary: 'summary',
            backstory: 'backstory',
            personality: 'personality',
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
      setSuccess('Saved successfully');
      if (onSaveCallback) onSaveCallback();
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
          <AppearanceSection
            appearances={form.appearances}
            gender={form.gender}
            updateAppearanceEntry={updateAppearanceEntry}
            addAppearanceEntry={addAppearanceEntry}
            removeAppearanceEntry={removeAppearanceEntry}
          />
          <PersonalitySection form={form} fieldErrors={fieldErrors} updateField={updateField} />
          <BodySection
            bodySensory={form.bodySensory}
            gender={form.gender}
            updateBodyEntry={updateBodyEntry}
            addBodyEntry={addBodyEntry}
            removeBodyEntry={removeBodyEntry}
          />
          <DetailsSection
            details={form.details}
            updateDetailEntry={updateDetailEntry}
            addDetailEntry={addDetailEntry}
            removeDetailEntry={removeDetailEntry}
          />
        </div>

        <PreviewSidebar
          form={form}
          disabled={disabled}
          saving={saving}
          generating={generating}
          error={error}
          success={success}
          loadError={loadError}
          onSave={() => {
            void handleSave();
          }}
          onGenerate={handleGenerate}
          onCancel={onCancel}
          onDelete={handleDelete}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
