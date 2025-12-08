/**
 * Character generator - creates complete character profiles from themes.
 */

import type {
  CharacterProfile,
  Gender,
  Physique,
  BodyMap,
  BodyRegionData,
  PersonalityMap,
  CharacterDetail,
  CharacterDetailArea,
  CoreValue,
  FearCategory,
  CopingMechanism,
  AttachmentStyle,
  CoreEmotion,
  EmotionIntensity,
  BodyRegion,
} from '@minimal-rpg/schemas';
import type { GenerationMeta } from '../types.js';
import type {
  CharacterGeneratorOptions,
  CharacterGeneratorResult,
  CharacterTheme,
  BodySensoryPools,
} from './types.js';
import {
  pickFromPool,
  pickRandom,
  pickMultiple,
  pickRandomCount,
  pickWeighted,
  randomInt,
  randomFloatRounded,
  randomBool,
  randomId,
} from '../shared/random.js';
import { getBodyRegionsForGender } from './filters.js';
import {
  FEAR_DESCRIPTIONS,
  HOMETOWNS,
  INTERESTS,
  LIFE_EVENTS,
  RELATIONSHIPS,
  VISUAL_DESCRIPTIONS,
  VISUAL_SKIN_CONDITIONS_WEIGHTED,
  VISUAL_FEATURES_WEIGHTED,
  SKIN_FLAVORS_WEIGHTED,
} from './pools/index.js';

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a complete character profile from a theme.
 *
 * @param options - Generation options including theme and existing data
 * @returns Generated character and metadata
 */
export function generateCharacter(options: CharacterGeneratorOptions): CharacterGeneratorResult {
  const { theme, existing = {}, mode = 'fill-empty' } = options;

  const generatedFields: string[] = [];
  const skippedFields: string[] = [];

  /**
   * Helper to get a value: uses existing if in fill-empty mode, otherwise generates.
   */
  const getValue = <T>(field: string, existingValue: T | undefined, generator: () => T): T => {
    if (mode === 'fill-empty' && existingValue !== undefined && existingValue !== '') {
      return existingValue;
    }
    generatedFields.push(field);
    return generator();
  };

  // Determine gender first (affects many other fields)
  const gender = getValue<Gender | undefined>(
    'gender',
    existing.gender,
    () => theme.defaultGender ?? (randomBool() ? 'female' : 'male')
  );

  // Generate basics
  const id = getValue('id', existing.id, () => randomId('char'));
  const name = getValue('name', existing.name, () => generateName(theme, gender));
  const age = getValue('age', existing.age, () =>
    randomInt(theme.basics.ageRange[0], theme.basics.ageRange[1])
  );
  const summary = getValue('summary', existing.summary, () => generateSummary(theme, name, age));
  const backstory = getValue('backstory', existing.backstory, () => generateBackstory(theme, name));
  const personalityText = getValue('personality', existing.personality, () =>
    generatePersonalityText(theme)
  );
  const tags = getValue('tags', existing.tags, () => [...(theme.defaultTags ?? ['generated'])]);

  // Generate physique
  const physique = getValue<Physique | string | undefined>('physique', existing.physique, () =>
    generatePhysique(theme, gender)
  );

  // Generate body map
  const body = getValue<BodyMap | undefined>('body', existing.body, () =>
    generateBodyMap(theme, gender, skippedFields)
  );

  // Generate personality map
  const personalityMap = getValue<PersonalityMap | undefined>(
    'personalityMap',
    existing.personalityMap,
    () => generatePersonalityMap(theme)
  );

  // Generate details
  const details = getValue<CharacterDetail[] | undefined>('details', existing.details, () =>
    generateDetails(theme)
  );

  const character: CharacterProfile = {
    id,
    name,
    age,
    gender,
    summary,
    backstory,
    personality: personalityText,
    tags,
    physique,
    body,
    personalityMap,
    details,
  };

  const meta: GenerationMeta = {
    themeId: theme.id,
    generatedFields,
    skippedFields,
    generatedAt: new Date().toISOString(),
  };

  return { character, meta };
}

// ============================================================================
// Section Generators
// ============================================================================

/**
 * Generate a character name.
 */
function generateName(theme: CharacterTheme, gender: Gender | undefined): string {
  const firstName = pickFromPool(theme.basics.firstNames);
  if (theme.basics.lastNames) {
    const lastName = pickFromPool(theme.basics.lastNames);
    return `${firstName} ${lastName}`;
  }
  return firstName;
}

/**
 * Generate a summary using templates.
 */
function generateSummary(theme: CharacterTheme, name: string, age: number): string {
  const template = pickFromPool(theme.basics.summaryTemplates);
  const traits = pickMultiple([...theme.basics.personalityTraits] as string[], 3);

  return template
    .replace('{name}', name)
    .replace('{age}', String(age))
    .replace('{trait1}', traits[0] ?? 'thoughtful')
    .replace('{trait2}', traits[1] ?? 'kind')
    .replace('{trait3}', traits[2] ?? 'curious');
}

/**
 * Generate a backstory using templates.
 */
function generateBackstory(theme: CharacterTheme, name: string): string {
  const template = pickFromPool(theme.basics.backstoryTemplates);
  const hometown = pickRandom(HOMETOWNS);
  const interest = pickRandom(INTERESTS);
  const event = pickRandom(LIFE_EVENTS);
  const relationship = pickRandom(RELATIONSHIPS);

  return template
    .replace(/{name}/g, name)
    .replace('{hometown}', hometown)
    .replace('{interest}', interest)
    .replace('{event}', event)
    .replace('{relationship}', relationship);
}

/**
 * Generate personality text (simple string or array).
 */
function generatePersonalityText(theme: CharacterTheme): string | string[] {
  const traits = pickMultiple([...theme.basics.personalityTraits] as string[], randomInt(3, 5));
  // 50% chance to return as array, 50% as comma-separated string
  if (randomBool()) {
    return traits;
  }
  return traits.join(', ');
}

/**
 * Generate physique object.
 */
function generatePhysique(theme: CharacterTheme, gender: Gender | undefined): Physique {
  const app = theme.appearance;

  return {
    build: {
      height: pickFromPool(app.heights) as Physique['build']['height'],
      torso: pickFromPool(app.builds) as Physique['build']['torso'],
      skinTone: pickFromPool(app.skinTones),
      arms: {
        build: pickFromPool(app.armBuilds ?? ['average']) as Physique['build']['arms']['build'],
        length: 'average' as Physique['build']['arms']['length'],
      },
      legs: {
        build: pickFromPool(app.legBuilds ?? ['average']) as Physique['build']['legs']['build'],
        length: 'average' as Physique['build']['legs']['length'],
      },
      feet: {
        size: pickFromPool(app.footSizes ?? ['average']) as Physique['build']['feet']['size'],
        shape: 'average',
      },
    },
    appearance: {
      hair: {
        color: pickFromPool(app.hairColors),
        style: pickFromPool(app.hairStyles),
        length: pickFromPool(app.hairLengths),
      },
      eyes: {
        color: pickFromPool(app.eyeColors),
      },
      features: app.faceFeatures
        ? pickRandomCount([...app.faceFeatures] as string[], 1, 3)
        : undefined,
    },
  };
}

/**
 * Generate body map with sensory data.
 */
function generateBodyMap(
  theme: CharacterTheme,
  gender: Gender | undefined,
  skippedFields: string[]
): BodyMap {
  const bodyMap: BodyMap = {};
  const availableRegions = getBodyRegionsForGender(gender);
  const populationRate = theme.body.regionPopulationRate ?? 0.3;

  // Determine which regions to populate
  const regionsToPopulate = theme.body.regionsToPopulate ?? availableRegions;

  for (const region of regionsToPopulate) {
    // Skip regions not appropriate for this gender
    if (!availableRegions.includes(region)) {
      skippedFields.push(`body.${region}`);
      continue;
    }

    // Random chance to populate this region
    if (!randomBool(populationRate)) {
      continue;
    }

    // Get region-specific pools or fall back to general
    const regionPools = theme.body.regions?.[region];
    const generalPools = theme.body.general;

    const scentPrimaries = regionPools?.scentPrimaries ?? generalPools.scentPrimaries;
    const texturePrimaries = regionPools?.texturePrimaries ?? generalPools.texturePrimaries;
    const visualDescriptions =
      regionPools?.visualDescriptions ?? generalPools.visualDescriptions ?? VISUAL_DESCRIPTIONS;
    const visualSkinConditions =
      regionPools?.visualSkinConditions ??
      generalPools.visualSkinConditions ??
      VISUAL_SKIN_CONDITIONS_WEIGHTED;
    const visualFeatures =
      regionPools?.visualFeatures ?? generalPools.visualFeatures ?? VISUAL_FEATURES_WEIGHTED;
    const flavorPrimaries = regionPools?.flavorPrimaries ?? generalPools.flavorPrimaries;

    // Build the region data
    const regionData: BodyRegionData = {};

    // Scent (most regions)
    if (scentPrimaries) {
      regionData.scent = {
        primary: pickFromPool(scentPrimaries),
        intensity: randomFloatRounded(0.2, 0.7),
      };
    }

    // Texture (most regions)
    if (texturePrimaries) {
      regionData.texture = {
        primary: pickFromPool(texturePrimaries),
        temperature: randomBool(0.7) ? 'warm' : 'neutral',
        moisture: 'normal',
      };
    }

    // Visual (50% chance to include for detail variety)
    if (randomBool(0.5)) {
      const skinCondition = pickFromPool(visualSkinConditions);
      const features: string[] = [];

      // 30% chance to add a distinguishing feature
      if (randomBool(0.3)) {
        const feature = pickFromPool(visualFeatures);
        if (feature !== 'no distinguishing marks') {
          features.push(feature);
        }
      }

      regionData.visual = {
        description: pickFromPool(visualDescriptions),
        skinCondition: skinCondition as
          | 'flawless'
          | 'normal'
          | 'freckled'
          | 'scarred'
          | 'tattooed'
          | 'marked',
        features: features.length > 0 ? features : undefined,
      };
    }

    // Flavor (only for specific intimate/mouth regions, with lower probability)
    const flavorRegions = ['mouth', 'neck', 'breasts', 'groin', 'vagina', 'penis'];
    if (flavorRegions.includes(region) && randomBool(0.3)) {
      const flavorPool = flavorPrimaries ?? SKIN_FLAVORS_WEIGHTED;
      regionData.flavor = {
        primary: pickFromPool(flavorPool),
        intensity: randomFloatRounded(0.2, 0.5),
      };
    }

    // Only add region if it has at least one sensory type
    if (regionData.scent || regionData.texture || regionData.visual || regionData.flavor) {
      bodyMap[region] = regionData;
    }
  }

  return bodyMap;
}

/**
 * Generate personality map with all subsections.
 */
function generatePersonalityMap(theme: CharacterTheme): PersonalityMap {
  const pers = theme.personality;

  // Generate dimensions with biases if specified
  const dimensions: PersonalityMap['dimensions'] = {};
  if (pers.dimensionBiases) {
    for (const [dim, range] of Object.entries(pers.dimensionBiases)) {
      if (range) {
        const [min, max] = range;
        dimensions[dim as keyof typeof dimensions] = randomFloatRounded(min, max);
      }
    }
  } else {
    // Random dimensions
    dimensions.openness = randomFloatRounded(0.2, 0.8);
    dimensions.conscientiousness = randomFloatRounded(0.2, 0.8);
    dimensions.extraversion = randomFloatRounded(0.2, 0.8);
    dimensions.agreeableness = randomFloatRounded(0.2, 0.8);
    dimensions.neuroticism = randomFloatRounded(0.2, 0.8);
  }

  // Generate traits
  const traits = pickMultiple([...pers.traits] as string[], randomInt(4, 8));

  // Generate values (1-3)
  const valueCount = randomInt(1, 3);
  const selectedValues = pickMultiple(
    [...pers.values] as { value: CoreValue; weight: number }[],
    valueCount
  );
  const values = selectedValues.map((v, i) => ({
    value: (typeof v === 'object' && 'value' in v ? v.value : v) as CoreValue,
    priority: i + 1,
  }));

  // Generate fears (1-2)
  const fearCount = randomInt(1, 2);
  const fears = [];
  for (let i = 0; i < fearCount; i++) {
    const category = pickFromPool(pers.fearCategories) as FearCategory;
    const descriptions = FEAR_DESCRIPTIONS[category] ?? ['the unknown'];
    fears.push({
      category,
      specific: pickRandom(descriptions),
      intensity: randomFloatRounded(0.3, 0.7),
      triggers: pers.fearTriggers ? pickRandomCount([...pers.fearTriggers] as string[], 1, 2) : [],
      copingMechanism: pickFromPool(pers.copingMechanisms) as CopingMechanism,
    });
  }

  // Generate attachment style
  const attachment = pickFromPool(pers.attachmentStyles) as AttachmentStyle;

  // Generate emotional baseline
  const emotionalBaseline = {
    current: pickFromPool(pers.currentEmotions) as CoreEmotion,
    intensity: pickFromPool(pers.emotionIntensities) as EmotionIntensity,
    moodBaseline: pickFromPool(pers.moodBaselines) as CoreEmotion,
    moodStability: randomFloatRounded(0.3, 0.7),
  };

  // Generate social patterns (randomized from schema defaults)
  const social = {
    strangerDefault: pickRandom(['welcoming', 'neutral', 'guarded'] as const),
    warmthRate: pickRandom(['fast', 'moderate', 'slow'] as const),
    preferredRole: pickRandom([
      'leader',
      'supporter',
      'advisor',
      'entertainer',
      'caretaker',
    ] as const),
    conflictStyle: pickRandom([
      'confrontational',
      'diplomatic',
      'avoidant',
      'collaborative',
    ] as const),
    criticismResponse: pickRandom(['defensive', 'reflective', 'dismissive', 'grateful'] as const),
    boundaries: pickRandom(['rigid', 'healthy', 'porous'] as const),
  };

  // Generate speech style
  const speech = {
    vocabulary: pickRandom(['simple', 'average', 'educated'] as const),
    sentenceStructure: pickRandom(['simple', 'moderate', 'complex'] as const),
    formality: pickRandom(['casual', 'neutral', 'formal'] as const),
    humor: pickRandom(['rare', 'occasional', 'frequent'] as const),
    expressiveness: pickRandom(['reserved', 'moderate', 'expressive'] as const),
    directness: pickRandom(['blunt', 'direct', 'tactful', 'indirect'] as const),
    pace: pickRandom(['slow', 'measured', 'moderate', 'quick'] as const),
  };

  // Generate stress behavior
  type StressResponse = 'fight' | 'flight' | 'freeze' | 'fawn';
  const stressPool: readonly { value: StressResponse; weight: number }[] = [
    { value: 'freeze', weight: 30 },
    { value: 'flight', weight: 30 },
    { value: 'fawn', weight: 25 },
    { value: 'fight', weight: 15 },
  ];
  const stress = {
    primary: pickWeighted(stressPool),
    threshold: randomFloatRounded(0.3, 0.7),
    recoveryRate: pickRandom(['slow', 'moderate', 'fast'] as const),
    soothingActivities: pers.soothingActivities
      ? pickRandomCount([...pers.soothingActivities] as string[], 2, 4)
      : [],
    stressIndicators: pers.stressIndicators
      ? pickRandomCount([...pers.stressIndicators] as string[], 2, 3)
      : [],
  };

  return {
    dimensions,
    traits,
    values,
    fears,
    attachment,
    emotionalBaseline,
    social,
    speech,
    stress,
  };
}

/**
 * Generate character details/facts.
 */
function generateDetails(theme: CharacterTheme): CharacterDetail[] {
  const details: CharacterDetail[] = [];
  const [minCount, maxCount] = theme.details.countRange;
  const count = randomInt(minCount, maxCount);

  const areas = theme.details.focusAreas ?? (['preference', 'ability'] as CharacterDetailArea[]);

  for (let i = 0; i < count; i++) {
    const area = pickRandom(areas);
    const labelPool = theme.details.labels[area];
    const valuePool = theme.details.values[area];

    if (!labelPool || !valuePool) continue;

    const label = pickFromPool(labelPool);
    const value = pickFromPool(valuePool);

    details.push({
      label,
      value,
      area,
      importance: randomFloatRounded(0.3, 0.8),
      tags: [],
    });
  }

  return details;
}
