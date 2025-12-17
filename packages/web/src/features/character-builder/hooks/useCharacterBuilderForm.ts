import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CharacterProfile,
  type Physique,
  type BodyMap,
  type PersonalityMap,
  type AppearanceRegion,
  BODY_REGIONS,
  PERSONALITY_DIMENSIONS,
  APPEARANCE_REGION_ATTRIBUTES,
} from '@minimal-rpg/schemas';
import { formatScent, formatTexture, formatFlavor } from '@minimal-rpg/utils';
import { loadCharacter } from '../api.js';
import {
  createDetailEntry,
  createBodySensoryEntry,
  createAppearanceEntry,
  createInitialState,
  createPersonalityFormState,
  type AppearanceEntry,
  type BodySensoryEntry,
  type DetailFormEntry,
  type FormFieldErrors,
  type FormState,
  type PersonalityFormState,
} from '../types.js';

/**
 * Convert a BodyMap to an array of BodySensoryEntry for the form.
 */
function bodyMapToEntries(bodyMap: BodyMap | undefined): BodySensoryEntry[] {
  if (!bodyMap) return [createBodySensoryEntry()];

  const entries: BodySensoryEntry[] = [];

  for (const region of BODY_REGIONS) {
    const data = bodyMap[region];
    if (!data) continue;

    if (data.scent) {
      entries.push({
        region,
        type: 'scent',
        raw: formatScent(data.scent),
      });
    }
    if (data.texture) {
      entries.push({
        region,
        type: 'texture',
        raw: formatTexture(data.texture),
      });
    }
    // Visual is handled by the appearance section, not body sensory
    if (data.flavor) {
      entries.push({
        region,
        type: 'flavor',
        raw: formatFlavor(data.flavor),
      });
    }
  }

  return entries.length > 0 ? entries : [createBodySensoryEntry()];
}

/**
 * Regions that are stored in Physique schema (limited set).
 * All other regions come from body map's visual property.
 */
const PHYSIQUE_REGIONS = new Set<AppearanceRegion>([
  'overall',
  'hair',
  'eyes',
  'skin',
  'arms',
  'legs',
  'feet',
  'face',
]);

/**
 * Convert a Physique object and BodyMap to an array of AppearanceEntry for the form.
 * Physique provides limited regions, body map's visual property provides the rest.
 */
function physiqueToEntries(
  physique: Physique | undefined,
  bodyMap: BodyMap | undefined
): AppearanceEntry[] {
  const entries: AppearanceEntry[] = [];

  // Extract from Physique (limited set of regions)
  if (physique) {
    // Overall build
    if (physique.build.height) {
      entries.push({ region: 'overall', attribute: 'height', value: physique.build.height });
    }
    if (physique.build.torso) {
      entries.push({ region: 'overall', attribute: 'build', value: physique.build.torso });
    }

    // Hair
    if (physique.appearance.hair.color) {
      entries.push({ region: 'hair', attribute: 'color', value: physique.appearance.hair.color });
    }
    if (physique.appearance.hair.style) {
      entries.push({ region: 'hair', attribute: 'style', value: physique.appearance.hair.style });
    }
    if (physique.appearance.hair.length) {
      entries.push({ region: 'hair', attribute: 'length', value: physique.appearance.hair.length });
    }

    // Eyes
    if (physique.appearance.eyes.color) {
      entries.push({ region: 'eyes', attribute: 'color', value: physique.appearance.eyes.color });
    }

    // Skin
    if (physique.build.skinTone) {
      entries.push({ region: 'skin', attribute: 'tone', value: physique.build.skinTone });
    }

    // Arms
    if (physique.build.arms.build) {
      entries.push({ region: 'arms', attribute: 'build', value: physique.build.arms.build });
    }
    if (physique.build.arms.length) {
      entries.push({ region: 'arms', attribute: 'length', value: physique.build.arms.length });
    }

    // Legs
    if (physique.build.legs.build) {
      entries.push({ region: 'legs', attribute: 'build', value: physique.build.legs.build });
    }
    if (physique.build.legs.length) {
      entries.push({ region: 'legs', attribute: 'length', value: physique.build.legs.length });
    }

    // Feet
    if (physique.build.feet.size) {
      entries.push({ region: 'feet', attribute: 'size', value: physique.build.feet.size });
    }
    if (physique.build.feet.shape) {
      entries.push({ region: 'feet', attribute: 'shape', value: physique.build.feet.shape });
    }

    // Face features (convert array to comma-separated entries)
    if (physique.appearance.features && physique.appearance.features.length > 0) {
      entries.push({
        region: 'face',
        attribute: 'features',
        value: physique.appearance.features.join(', '),
      });
    }
  }

  // Extract visual data from body map (for non-Physique regions)
  if (bodyMap) {
    for (const region of BODY_REGIONS) {
      // Skip regions that are already handled by Physique
      if (PHYSIQUE_REGIONS.has(region as AppearanceRegion)) continue;

      const data = bodyMap[region];
      if (!data?.visual) continue;

      const visual = data.visual;

      // Get available attributes for this region
      const regionAttrs = APPEARANCE_REGION_ATTRIBUTES[region as AppearanceRegion];
      if (!regionAttrs) continue;

      // Try to parse the description back into attribute/value pairs
      // Format was "attr: value, attr2: value2"
      if (visual.description) {
        const pairs = visual.description.split(',').map((s) => s.trim());
        for (const pair of pairs) {
          const colonIdx = pair.indexOf(':');
          if (colonIdx > 0) {
            const attr = pair.slice(0, colonIdx).trim();
            const value = pair.slice(colonIdx + 1).trim();
            // Check if this attribute exists for this region
            if (attr in regionAttrs && value) {
              entries.push({
                region: region as AppearanceRegion,
                attribute: attr,
                value,
              });
            }
          } else if (pair) {
            // Single value without attribute - use 'description' if available
            if ('description' in regionAttrs) {
              entries.push({
                region: region as AppearanceRegion,
                attribute: 'description',
                value: pair,
              });
            }
          }
        }
      }

      // Add features if present and region supports it
      if (visual.features && visual.features.length > 0 && 'features' in regionAttrs) {
        entries.push({
          region: region as AppearanceRegion,
          attribute: 'features',
          value: visual.features.join(', '),
        });
      }
    }
  }

  return entries.length > 0 ? entries : [createAppearanceEntry()];
}

/**
 * Convert a PersonalityMap to a PersonalityFormState for the form.
 */
function personalityMapToFormState(pm: PersonalityMap | undefined): PersonalityFormState {
  const base = createPersonalityFormState();
  if (!pm) return base;

  // Traits
  if (pm.traits) {
    base.traits = pm.traits.join(', ');
  }

  // Dimensions
  if (pm.dimensions) {
    base.dimensions = PERSONALITY_DIMENSIONS.map((dim) => ({
      dimension: dim,
      score: pm.dimensions?.[dim] ?? 0.5,
    }));
  }

  // Emotional baseline
  if (pm.emotionalBaseline) {
    const emotionalBase = {
      current: pm.emotionalBaseline.current ?? base.emotionalBaseline.current,
      intensity: pm.emotionalBaseline.intensity ?? base.emotionalBaseline.intensity,
      moodBaseline: pm.emotionalBaseline.moodBaseline ?? base.emotionalBaseline.moodBaseline,
      moodStability: pm.emotionalBaseline.moodStability ?? base.emotionalBaseline.moodStability,
    };
    base.emotionalBaseline = pm.emotionalBaseline.blend
      ? { ...emotionalBase, blend: pm.emotionalBaseline.blend }
      : emotionalBase;
  }

  // Values
  if (pm.values) {
    base.values = pm.values.map((v) => ({
      value: v.value,
      priority: v.priority ?? 5,
    }));
  }

  // Fears
  if (pm.fears) {
    base.fears = pm.fears.map((f) => ({
      category: f.category,
      specific: f.specific,
      intensity: f.intensity ?? 0.5,
      triggers: (f.triggers ?? []).join(', '),
      copingMechanism: f.copingMechanism ?? 'avoidance',
    }));
  }

  // Attachment
  if (pm.attachment) {
    base.attachment = pm.attachment;
  }

  // Social
  if (pm.social) {
    base.social = {
      strangerDefault: pm.social.strangerDefault ?? base.social.strangerDefault,
      warmthRate: pm.social.warmthRate ?? base.social.warmthRate,
      preferredRole: pm.social.preferredRole ?? base.social.preferredRole,
      conflictStyle: pm.social.conflictStyle ?? base.social.conflictStyle,
      criticismResponse: pm.social.criticismResponse ?? base.social.criticismResponse,
      boundaries: pm.social.boundaries ?? base.social.boundaries,
    };
  }

  // Speech
  if (pm.speech) {
    const speechBase = {
      vocabulary: pm.speech.vocabulary ?? base.speech.vocabulary,
      sentenceStructure: pm.speech.sentenceStructure ?? base.speech.sentenceStructure,
      formality: pm.speech.formality ?? base.speech.formality,
      humor: pm.speech.humor ?? base.speech.humor,
      expressiveness: pm.speech.expressiveness ?? base.speech.expressiveness,
      directness: pm.speech.directness ?? base.speech.directness,
      pace: pm.speech.pace ?? base.speech.pace,
    };
    base.speech = pm.speech.humorType
      ? { ...speechBase, humorType: pm.speech.humorType }
      : speechBase;
  }

  // Stress
  if (pm.stress) {
    const stressBase = {
      primary: pm.stress.primary ?? base.stress.primary,
      threshold: pm.stress.threshold ?? base.stress.threshold,
      recoveryRate: pm.stress.recoveryRate ?? base.stress.recoveryRate,
      soothingActivities: (pm.stress.soothingActivities ?? []).join(', '),
      stressIndicators: (pm.stress.stressIndicators ?? []).join(', '),
    };
    base.stress = pm.stress.secondary
      ? { ...stressBase, secondary: pm.stress.secondary }
      : stressBase;
  }

  return base;
}

function mapProfileToForm(profile: CharacterProfile): FormState {
  const next = createInitialState();
  next.id = profile.id;
  next.name = profile.name;
  next.age = profile.age ?? '';
  next.gender = (profile as { gender?: string }).gender ?? '';
  next.summary = profile.summary;
  next.backstory = profile.backstory ?? '';
  next.tags = (profile.tags ?? []).join(', ');
  next.profilePic = profile.profilePic ?? '';
  next.personality = Array.isArray(profile.personality)
    ? profile.personality.join(', ')
    : (profile.personality ?? '');

  // Map personality map to form state
  next.personalityMap = personalityMapToFormState(profile.personalityMap);

  const physique = profile.physique;
  if (typeof physique === 'string') {
    // Free-text appearance
    next.appearance = physique;
  } else if (physique && typeof physique === 'object') {
    // Structured physique + body map visual → appearance entries
    next.appearances = physiqueToEntries(physique as Physique, profile.body);
  } else {
    // No physique, but may have body map visual data
    next.appearances = physiqueToEntries(undefined, profile.body);
  }

  // Map body map to sensory entries (scent, texture, flavor per region)
  next.bodySensory = bodyMapToEntries(profile.body);

  if (Array.isArray(profile.details) && profile.details.length) {
    next.details = profile.details.map(
      (detail) =>
        ({
          label: detail.label,
          value: detail.value,
          area: detail.area ?? 'custom',
          importance: detail.importance !== undefined ? String(detail.importance) : '0.5',
          tags: (detail.tags ?? []).join(', '),
          notes: detail.notes ?? '',
        }) satisfies DetailFormEntry
    );
  }

  return next;
}

/**
 * Merge generated form state into existing form, only filling empty fields.
 * This preserves user-entered values while populating missing data.
 */
export function mergeGeneratedIntoForm(current: FormState, generated: FormState): FormState {
  const merged = { ...current };

  // Simple string fields - only fill if empty
  if (!merged.id.trim()) merged.id = generated.id;
  if (!merged.name.trim()) merged.name = generated.name;
  if (!merged.age || merged.age === '') merged.age = generated.age;
  if (!merged.gender.trim()) merged.gender = generated.gender;
  if (!merged.summary.trim()) merged.summary = generated.summary;
  if (!merged.backstory.trim()) merged.backstory = generated.backstory;
  if (!merged.tags.trim()) merged.tags = generated.tags;
  if (!merged.personality.trim()) merged.personality = generated.personality;

  // Personality map - merge sub-fields
  if (!merged.personalityMap.traits.trim()) {
    merged.personalityMap = {
      ...merged.personalityMap,
      traits: generated.personalityMap.traits,
    };
  }

  // Check if dimensions are all default (0.5)
  const allDimensionsDefault = merged.personalityMap.dimensions.every((d) => d.score === 0.5);
  if (allDimensionsDefault) {
    merged.personalityMap = {
      ...merged.personalityMap,
      dimensions: generated.personalityMap.dimensions,
    };
  }

  // Values - only fill if empty
  if (merged.personalityMap.values.length === 0) {
    merged.personalityMap = {
      ...merged.personalityMap,
      values: generated.personalityMap.values,
    };
  }

  // Fears - only fill if empty
  if (merged.personalityMap.fears.length === 0) {
    merged.personalityMap = {
      ...merged.personalityMap,
      fears: generated.personalityMap.fears,
    };
  }

  // Appearance entries - only fill if single empty entry
  const firstAppearance = merged.appearances[0];
  const hasEmptyAppearances =
    merged.appearances.length === 1 && firstAppearance && !firstAppearance.value.trim();
  if (hasEmptyAppearances) {
    merged.appearances = generated.appearances;
  }

  // Body sensory entries - only fill if single empty entry
  const firstBodySensory = merged.bodySensory[0];
  const hasEmptyBodySensory =
    merged.bodySensory.length === 1 && firstBodySensory && !firstBodySensory.raw.trim();
  if (hasEmptyBodySensory) {
    merged.bodySensory = generated.bodySensory;
  }

  // Details - only fill if single empty entry
  const firstDetail = merged.details[0];
  const hasEmptyDetails =
    merged.details.length === 1 &&
    firstDetail &&
    !firstDetail.label.trim() &&
    !firstDetail.value.trim();
  if (hasEmptyDetails) {
    merged.details = generated.details;
  }

  return merged;
}

/** Export mapProfileToForm for use by the generate feature */
export { mapProfileToForm };

export interface UseCharacterBuilderFormResult {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  fieldErrors: FormFieldErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<FormFieldErrors>>;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateDetailEntry: <K extends keyof DetailFormEntry>(
    idx: number,
    key: K,
    value: DetailFormEntry[K]
  ) => void;
  addDetailEntry: () => void;
  removeDetailEntry: (idx: number) => void;
  updateBodyEntry: <K extends keyof BodySensoryEntry>(
    idx: number,
    key: K,
    value: BodySensoryEntry[K]
  ) => void;
  addBodyEntry: (entry?: BodySensoryEntry) => void;
  removeBodyEntry: (idx: number) => void;
  updateAppearanceEntry: <K extends keyof AppearanceEntry>(
    idx: number,
    key: K,
    value: AppearanceEntry[K]
  ) => void;
  addAppearanceEntry: (entry?: AppearanceEntry) => void;
  removeAppearanceEntry: (idx: number) => void;
  loading: boolean;
  loadError: string | null;
}

export function useCharacterBuilderForm(id?: string | null): UseCharacterBuilderFormResult {
  const [form, setForm] = useState<FormState>(() => createInitialState());
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setFieldErrors({});
    abortRef.current?.abort();

    if (!id) {
      setForm(createInitialState());
      setLoadError(null);
      setLoading(false);
      return () => {
        abortRef.current?.abort();
      };
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setLoadError(null);

    loadCharacter(id, ctrl.signal)
      .then((profile) => {
        setForm(mapProfileToForm(profile));
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error(err);
        setLoadError('Failed to load character');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      ctrl.abort();
    };
  }, [id]);

  const updateField: UseCharacterBuilderFormResult['updateField'] = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateDetailEntry: UseCharacterBuilderFormResult['updateDetailEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const details = prev.details.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, details };
      });
    },
    []
  );

  const addDetailEntry = useCallback(() => {
    setForm((prev) => ({ ...prev, details: [...prev.details, createDetailEntry()] }));
  }, []);

  const removeDetailEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.details.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, details: next.length ? next : [createDetailEntry()] };
    });
  }, []);

  const updateBodyEntry: UseCharacterBuilderFormResult['updateBodyEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const bodySensory = prev.bodySensory.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, bodySensory };
      });
    },
    []
  );

  const addBodyEntry = useCallback((entry?: BodySensoryEntry) => {
    setForm((prev) => ({
      ...prev,
      bodySensory: [...prev.bodySensory, entry ?? createBodySensoryEntry()],
    }));
  }, []);

  const removeBodyEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.bodySensory.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, bodySensory: next.length ? next : [createBodySensoryEntry()] };
    });
  }, []);

  const updateAppearanceEntry: UseCharacterBuilderFormResult['updateAppearanceEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const appearances = prev.appearances.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, appearances };
      });
    },
    []
  );

  const addAppearanceEntry = useCallback((entry?: AppearanceEntry) => {
    setForm((prev) => ({
      ...prev,
      appearances: [...prev.appearances, entry ?? createAppearanceEntry()],
    }));
  }, []);

  const removeAppearanceEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.appearances.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, appearances: next.length ? next : [createAppearanceEntry()] };
    });
  }, []);

  return {
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
  };
}
