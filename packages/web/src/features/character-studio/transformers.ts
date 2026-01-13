import {
  type BodyMap,
  type BodyRegion,
  type CharacterDetail,
  type CharacterProfile,
  type PersonalityMap,
  type Gender,
  BODY_REGIONS,
  PERSONALITY_DIMENSIONS,
} from '@minimal-rpg/schemas';
import { splitList } from '../shared/stringLists.js';
import {
  type DetailFormEntry,
  type FormState,
  type PersonalityFormState,
  createPersonalityFormState,
  createInitialState,
} from '@minimal-rpg/schemas';
import { clamp } from '@minimal-rpg/utils';

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
export const buildPersonalityMap = (pm: PersonalityFormState): PersonalityMap | undefined => {
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
        triggers: f.triggers,
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
    st.soothingActivities.some((s) => s.trim()) ||
    st.stressIndicators.some((s) => s.trim());
  if (hasStressChanges) {
    result.stress = {
      primary: st.primary,
      threshold: st.threshold,
      recoveryRate: st.recoveryRate,
      soothingActivities: st.soothingActivities.filter((s) => s.trim()),
      stressIndicators: st.stressIndicators.filter((s) => s.trim()),
      ...(st.secondary ? { secondary: st.secondary } : {}),
    };
  }

  // Return undefined if nothing was set
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Gender-specific regions that should be excluded based on character gender.
 */
const FEMALE_ONLY_REGIONS = new Set<BodyRegion>([
  'breasts',
  'leftBreast',
  'rightBreast',
  'nipples',
  'leftNipple',
  'rightNipple',
]);
const MALE_ONLY_REGIONS = new Set<BodyRegion>([]); // Add penis if it exists in regions

/**
 * Filter body map to exclude gender-inappropriate regions.
 */
export function filterBodyMapByGender(body: BodyMap, gender: string): BodyMap {
  const normalizedGender = gender.trim().toLowerCase();
  const filtered: BodyMap = {};

  for (const [region, data] of Object.entries(body)) {
    if (!data) continue;
    const r = region as BodyRegion;

    if (FEMALE_ONLY_REGIONS.has(r)) {
      if (normalizedGender !== 'female' && normalizedGender !== 'other' && normalizedGender)
        continue;
    }
    if (MALE_ONLY_REGIONS.has(r)) {
      if (normalizedGender !== 'male' && normalizedGender !== 'other' && normalizedGender) continue;
    }

    filtered[r] = data;
  }
  return filtered;
}

export const mapDetailEntries = (entries: DetailFormEntry[]): CharacterDetail[] => {
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

export const buildProfile = (form: FormState): CharacterProfile => {
  const tags = splitList(form.tags);

  // Filter body map by gender
  const body = filterBodyMapByGender(form.body, form.gender);

  const details = mapDetailEntries(form.details);
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
    ...(details.length ? { details } : {}),
    ...(Object.keys(body).length ? { body } : {}),
    ...(personalityMap ? { personalityMap } : {}),
    ...(profilePicTrimmed ? { profilePic: profilePicTrimmed } : {}),
  };

  return profile;
};

/**
 * Convert a PersonalityMap to a PersonalityFormState for the form.
 */
export function personalityMapToFormState(pm: PersonalityMap | undefined): PersonalityFormState {
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
      triggers: f.triggers ?? [],
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
      soothingActivities: pm.stress.soothingActivities ?? [],
      stressIndicators: pm.stress.stressIndicators ?? [],
    };
    base.stress = pm.stress.secondary
      ? { ...stressBase, secondary: pm.stress.secondary }
      : stressBase;
  }

  return base;
}

export function mapProfileToForm(profile: CharacterProfile): FormState {
  const next = createInitialState();
  next.id = profile.id;
  next.name = profile.name;
  next.age = profile.age ?? '';
  next.gender = (profile as { gender?: string }).gender ?? '';
  next.race = (profile as { race?: string }).race ?? 'Human';
  next.alignment = (profile as { alignment?: string }).alignment ?? 'True Neutral';
  next.summary = profile.summary;
  next.backstory = profile.backstory ?? '';
  next.tags = (profile.tags ?? []).join(', ');
  next.profilePic = profile.profilePic ?? '';
  next.personality = Array.isArray(profile.personality)
    ? profile.personality.join(', ')
    : (profile.personality ?? '');

  // Map personality map to form state
  next.personalityMap = personalityMapToFormState(profile.personalityMap);

  // Map body
  next.body = { ...profile.body };

  // Map physique to body map if present
  const p = profile.physique;
  if (p && typeof p === 'object') {
    const setApp = (region: BodyRegion, key: string, value: string | undefined) => {
      if (!value) return;
      next.body[region] ??= {};
      next.body[region].appearance ??= {};
      next.body[region].appearance[key] = value;
    };

    // Hair
    setApp('hair', 'color', p.appearance.hair.color);
    setApp('hair', 'style', p.appearance.hair.style);
    setApp('hair', 'length', p.appearance.hair.length);

    // Eyes (map to leftEye/rightEye)
    setApp('leftEye', 'color', p.appearance.eyes.color);
    setApp('rightEye', 'color', p.appearance.eyes.color);

    // Arms
    setApp('leftArm', 'build', p.build.arms.build);
    setApp('rightArm', 'build', p.build.arms.build);
    setApp('leftArm', 'length', p.build.arms.length);
    setApp('rightArm', 'length', p.build.arms.length);

    // Legs
    setApp('leftLeg', 'build', p.build.legs.build);
    setApp('rightLeg', 'build', p.build.legs.build);
    setApp('leftLeg', 'length', p.build.legs.length);
    setApp('rightLeg', 'length', p.build.legs.length);

    // Feet
    setApp('leftFoot', 'size', p.build.feet.size);
    setApp('rightFoot', 'size', p.build.feet.size);
    setApp('leftFoot', 'shape', p.build.feet.shape);
    setApp('rightFoot', 'shape', p.build.feet.shape);
  }

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
  if (!merged.race.trim()) merged.race = generated.race ?? 'Human';
  if (!merged.alignment.trim()) merged.alignment = generated.alignment ?? 'True Neutral';
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

  // Body map - merge regions
  for (const region of BODY_REGIONS) {
    if (!merged.body[region] && generated.body[region]) {
      merged.body[region] = generated.body[region];
    }
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
