import {
  type BodyMap,
  type BodyRegion,
  type CharacterDetail,
  type Physique,
  type CharacterProfile,
  type AppearanceRegion,
  type PersonalityMap,
  type Gender,
  BODY_REGIONS,
  PERSONALITY_DIMENSIONS,
  APPEARANCE_REGION_ATTRIBUTES,
} from '@minimal-rpg/schemas';
import { parseBodyEntries, formatScent, formatTexture, formatFlavor } from '@minimal-rpg/utils';
import { splitList } from '../shared/stringLists.js';
import {
  type AppearanceEntry,
  type BodySensoryEntry,
  type DetailFormEntry,
  type FormState,
  type PersonalityFormState,
  createBodySensoryEntry,
  createAppearanceEntry,
  createPersonalityFormState,
  createInitialState,
} from './types.js';
import { clamp } from './utils.js';

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
export function groupAppearanceEntries(
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
 * Regions that are stored in Physique schema (limited set).
 * All other regions go into the body map's visual property.
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
 * Gender-specific regions that should be excluded based on character gender.
 */
const FEMALE_ONLY_REGIONS = new Set<AppearanceRegion>(['breasts', 'nipples', 'vagina']);
const MALE_ONLY_REGIONS = new Set<AppearanceRegion>(['penis']);

/**
 * Filter appearance entries to exclude gender-inappropriate regions.
 * This ensures that if a user changes gender, stale data isn't saved.
 */
export function filterAppearanceEntriesByGender(
  entries: AppearanceEntry[],
  gender: string
): AppearanceEntry[] {
  const normalizedGender = gender.trim().toLowerCase();

  return entries.filter((entry) => {
    // Female-only regions: exclude if male
    if (FEMALE_ONLY_REGIONS.has(entry.region)) {
      return normalizedGender === 'female' || normalizedGender === 'other' || !normalizedGender;
    }
    // Male-only regions: exclude if female
    if (MALE_ONLY_REGIONS.has(entry.region)) {
      return normalizedGender === 'male' || normalizedGender === 'other' || !normalizedGender;
    }
    return true;
  });
}

/**
 * Filter body sensory entries to exclude gender-inappropriate regions.
 */
export function filterSensoryEntriesByGender(
  entries: BodySensoryEntry[],
  gender: string
): BodySensoryEntry[] {
  const normalizedGender = gender.trim().toLowerCase();

  return entries.filter((entry) => {
    // Female-only regions: exclude if male
    if (FEMALE_ONLY_REGIONS.has(entry.region as AppearanceRegion)) {
      return normalizedGender === 'female' || normalizedGender === 'other' || !normalizedGender;
    }
    // Male-only regions: exclude if female
    if (MALE_ONLY_REGIONS.has(entry.region as AppearanceRegion)) {
      return normalizedGender === 'male' || normalizedGender === 'other' || !normalizedGender;
    }
    return true;
  });
}

/**
 * Build Physique from appearance entries.
 * Only includes regions that fit in the Physique schema.
 */
export const buildPhysique = (form: FormState): CharacterProfile['physique'] | undefined => {
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

  // Check if we have any physique-compatible entries
  const hasPhysiqueEntries = Array.from(grouped.keys()).some((region) =>
    PHYSIQUE_REGIONS.has(region)
  );
  if (!hasPhysiqueEntries) {
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
 * Build visual data for body map from appearance entries that don't fit in Physique.
 * Returns entries grouped by region with visual descriptions.
 */
export function buildAppearanceVisuals(
  entries: AppearanceEntry[]
): Map<BodyRegion, { description: string; features?: string[] }> {
  const visuals = new Map<BodyRegion, { description: string; features?: string[] }>();

  // Group by region
  const grouped = groupAppearanceEntries(entries);

  for (const [region, attrs] of grouped) {
    // Skip regions that are handled by Physique schema
    if (PHYSIQUE_REGIONS.has(region)) continue;

    // Skip if not a valid body region
    if (!BODY_REGIONS.includes(region as BodyRegion)) continue;

    // Build description from all attributes
    const descriptions: string[] = [];
    const features: string[] = [];

    for (const [attr, value] of attrs) {
      if (attr === 'features' || attr === 'description') {
        // Treat as features list
        features.push(...splitList(value));
      } else {
        // Format as "attr: value"
        descriptions.push(`${attr}: ${value}`);
      }
    }

    if (descriptions.length > 0 || features.length > 0) {
      const visual: { description: string; features?: string[] } = {
        description: descriptions.length > 0 ? descriptions.join(', ') : (features[0] ?? ''),
      };
      if (features.length > 0) {
        visual.features = features;
      }
      visuals.set(region as BodyRegion, visual);
    }
  }

  return visuals;
}

/**
 * Build the body map from body sensory entries and appearance entries.
 * Sensory entries (scent, texture, flavor) are parsed from raw text.
 * Appearance entries for non-Physique regions are added as visual data.
 */
export const buildBody = (
  sensoryEntries: BodySensoryEntry[],
  appearanceEntries: AppearanceEntry[]
): BodyMap | undefined => {
  // Build visual data from appearance entries (for non-Physique regions)
  const appearanceVisuals = buildAppearanceVisuals(appearanceEntries);

  // Build sensory data from body sensory entries
  // Format: "region: type: raw text" for each entry
  const lines = sensoryEntries
    .filter((e) => e.raw.trim())
    .map((e) => `${e.region}: ${e.type}: ${e.raw.trim()}`);

  let bodyMap: BodyMap = {};

  if (lines.length > 0) {
    // Join lines with semicolons for the parser
    const input = lines.join('; ');
    const result = parseBodyEntries(input);
    bodyMap = result.bodyMap;
  }

  // Merge appearance visuals into body map
  for (const [region, visual] of appearanceVisuals) {
    bodyMap[region] ??= {};
    bodyMap[region].visual = visual;
  }

  // Check if the map has any content
  const hasContent = Object.values(bodyMap).some((region) => {
    if (!region) return false;
    const scentKeys = region.scent ? Object.keys(region.scent).length : 0;
    const textureKeys = region.texture ? Object.keys(region.texture).length : 0;
    const visualKeys = region.visual ? Object.keys(region.visual).length : 0;
    const flavorKeys = region.flavor ? Object.keys(region.flavor).length : 0;
    return scentKeys > 0 || textureKeys > 0 || visualKeys > 0 || flavorKeys > 0;
  });

  return hasContent ? bodyMap : undefined;
};

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

  // Filter entries by gender to exclude inappropriate regions
  const filteredAppearances = filterAppearanceEntriesByGender(form.appearances, form.gender);
  const filteredSensory = filterSensoryEntriesByGender(form.bodySensory, form.gender);

  // Build with filtered entries
  const formWithFilteredEntries = {
    ...form,
    appearances: filteredAppearances,
  };

  const physique = buildPhysique(formWithFilteredEntries);
  const details = mapDetailEntries(form.details);
  const body = buildBody(filteredSensory, filteredAppearances);
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

/**
 * Convert a BodyMap to an array of BodySensoryEntry for the form.
 */
export function bodyMapToEntries(bodyMap: BodyMap | undefined): BodySensoryEntry[] {
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
 * Convert a Physique object and BodyMap to an array of AppearanceEntry for the form.
 * Physique provides limited regions, body map's visual property provides the rest.
 */
export function physiqueToEntries(
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

  const physique = profile.physique;
  if (typeof physique === 'string') {
    // Free-text appearance
    next.appearance = physique;
  } else if (physique && typeof physique === 'object') {
    // Structured physique + body map visual → appearance entries
    next.appearances = physiqueToEntries(physique, profile.body);
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
