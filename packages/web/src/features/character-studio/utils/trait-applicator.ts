import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';
import {
  ATTACHMENT_STYLES,
  BOUNDARY_TYPES,
  CONFLICT_STYLES,
  COPING_MECHANISMS,
  CORE_VALUES,
  CRITICISM_RESPONSES,
  DIRECTNESS_LEVELS,
  EXPRESSIVENESS_LEVELS,
  FEAR_CATEGORIES,
  FORMALITY_LEVELS,
  HUMOR_LEVELS,
  HUMOR_TYPES,
  PERSONALITY_DIMENSIONS,
  PACE_LEVELS,
  RECOVERY_RATES,
  SENTENCE_STRUCTURES,
  SOCIAL_ROLES,
  STRESS_RESPONSES,
  STRANGER_DEFAULTS,
  VOCABULARY_LEVELS,
  WARMTH_RATES,
} from '@minimal-rpg/schemas';
import {
  createFearEntry,
  createValueEntry,
  type FearEntry,
  type ValueEntry,
} from '../types.js';

export interface TraitApplicatorContext {
  profile: Partial<CharacterProfile>;
  updateProfile: <K extends keyof CharacterProfile>(
    key: K,
    value: CharacterProfile[K]
  ) => void;
  updatePersonalityMap: (updates: Partial<PersonalityMap>) => void;
}

/**
 * Applies an inferred trait to the character profile based on its dot-notation path.
 *
 * @param trait - The inferred trait object containing path and value
 * @param context - Current profile snapshot and update callbacks
 */
export function applyTrait(
  trait: { path: string; value: unknown },
  context: TraitApplicatorContext
): void {
  const pathParts = trait.path.split('.');
  const root = pathParts[0];
  if (!root) return;

  if (root === 'personalityMap') {
    applyPersonalityTrait(pathParts.slice(1), trait.value, context);
  } else {
    // Top-level profile field (name, backstory, etc.)
    context.updateProfile(
      root as keyof CharacterProfile,
      trait.value as CharacterProfile[keyof CharacterProfile]
    );
  }
}

function isAllowedValue(values: unknown, candidate: string): boolean {
  if (!Array.isArray(values)) return false;
  return values.some((item) => typeof item === 'string' && item === candidate);
}

/**
 * Handles applying updates to the personalityMap section of the profile.
 *
 * @param path - The segments of the path under personalityMap
 * @param value - The value to apply
 */
function applyPersonalityTrait(
  path: string[],
  value: unknown,
  context: TraitApplicatorContext
): void {
  const current: Partial<PersonalityMap> = context.profile.personalityMap ?? {};
  const head = path[0];
  if (!head) return;

  const setStringValue = (
    record: Record<string, unknown>,
    key: string,
    nextValue: unknown
  ): void => {
    Object.defineProperty(record, key, {
      value: nextValue,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  // Handle array fields first (values, fears) which should append
  if (head === 'values' || head === 'fears') {
    const existingValues = current.values ?? [];
    const existingFears = current.fears ?? [];
    if (head === 'values') {
      context.updatePersonalityMap({
        values: [...existingValues, normalizeValueEntry(value)],
      });
    } else {
      context.updatePersonalityMap({
        fears: [...existingFears, normalizeFearEntry(value)],
      });
    }
    return;
  }

  if (path.length === 1) {
    if (head === 'attachment' && typeof value === 'string') {
      if (isAllowedValue(ATTACHMENT_STYLES, value)) {
        context.updatePersonalityMap({ attachment: value as PersonalityMap['attachment'] });
      }
    }
    if (head === 'traits') {
      const nextTraits = normalizeStringList(value);
      if (nextTraits.length > 0) {
        context.updatePersonalityMap({ traits: nextTraits });
      }
    }
    return;
  }

  if (path.length !== 2) return;

  const field = path[1];
  if (!field) return;

  switch (head) {
    case 'dimensions': {
      if (!isAllowedValue(PERSONALITY_DIMENSIONS, field)) return;
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      const nextValue = Math.min(1, Math.max(0, value));
      const dimensions = { ...(current.dimensions ?? {}) } as Record<string, unknown>;
      setStringValue(dimensions, field, nextValue);
      context.updatePersonalityMap({ dimensions: dimensions as PersonalityMap['dimensions'] });
      return;
    }
    case 'social': {
      const social = { ...(current.social ?? {}) } as Record<string, unknown>;
      if (field === 'strangerDefault' && typeof value === 'string') {
        if (!isAllowedValue(STRANGER_DEFAULTS, value)) return;
        setStringValue(social, field, value);
      } else if (field === 'warmthRate' && typeof value === 'string') {
        if (!isAllowedValue(WARMTH_RATES, value)) return;
        setStringValue(social, field, value);
      } else if (field === 'preferredRole' && typeof value === 'string') {
        if (!isAllowedValue(SOCIAL_ROLES, value)) return;
        setStringValue(social, field, value);
      } else if (field === 'conflictStyle' && typeof value === 'string') {
        if (!isAllowedValue(CONFLICT_STYLES, value)) return;
        setStringValue(social, field, value);
      } else if (field === 'criticismResponse' && typeof value === 'string') {
        if (!isAllowedValue(CRITICISM_RESPONSES, value)) return;
        setStringValue(social, field, value);
      } else if (field === 'boundaries' && typeof value === 'string') {
        if (!isAllowedValue(BOUNDARY_TYPES, value)) return;
        setStringValue(social, field, value);
      } else {
        return;
      }
      context.updatePersonalityMap({ social: social as PersonalityMap['social'] });
      return;
    }
    case 'speech': {
      const speech = { ...(current.speech ?? {}) } as Record<string, unknown>;
      if (field === 'vocabulary' && typeof value === 'string') {
        if (!isAllowedValue(VOCABULARY_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'sentenceStructure' && typeof value === 'string') {
        if (!isAllowedValue(SENTENCE_STRUCTURES, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'formality' && typeof value === 'string') {
        if (!isAllowedValue(FORMALITY_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'humor' && typeof value === 'string') {
        if (!isAllowedValue(HUMOR_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'humorType' && typeof value === 'string') {
        if (!isAllowedValue(HUMOR_TYPES, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'expressiveness' && typeof value === 'string') {
        if (!isAllowedValue(EXPRESSIVENESS_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'directness' && typeof value === 'string') {
        if (!isAllowedValue(DIRECTNESS_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else if (field === 'pace' && typeof value === 'string') {
        if (!isAllowedValue(PACE_LEVELS, value)) return;
        setStringValue(speech, field, value);
      } else {
        return;
      }
      context.updatePersonalityMap({ speech: speech as PersonalityMap['speech'] });
      return;
    }
    case 'stress': {
      const stress = { ...(current.stress ?? {}) } as Record<string, unknown>;
      if (field === 'soothingActivities' || field === 'stressIndicators') {
        const existing = normalizeStringList(
          field === 'soothingActivities'
            ? (current.stress?.soothingActivities ?? [])
            : (current.stress?.stressIndicators ?? [])
        );
        const incoming = normalizeStringList(value);
        const merged = [...existing, ...incoming];
        setStringValue(stress, field, merged);
      } else if (field === 'primary' && typeof value === 'string') {
        if (!isAllowedValue(STRESS_RESPONSES, value)) return;
        setStringValue(stress, field, value);
      } else if (field === 'secondary' && typeof value === 'string') {
        if (!isAllowedValue(STRESS_RESPONSES, value)) return;
        setStringValue(stress, field, value);
      } else if (field === 'threshold' && typeof value === 'number' && Number.isFinite(value)) {
        setStringValue(stress, field, Math.min(1, Math.max(0, value)));
      } else if (field === 'recoveryRate' && typeof value === 'string') {
        if (!isAllowedValue(RECOVERY_RATES, value)) return;
        setStringValue(stress, field, value);
      } else {
        return;
      }
      context.updatePersonalityMap({ stress: stress as PersonalityMap['stress'] });
      return;
    }
    default:
      return;
  }
}

/**
 * Normalizes unknown input into a list of strings.
 *
 * Accepts:
 * - string (including comma-separated)
 * - string[]
 * - anything else -> []
 */
function normalizeStringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeFearEntry(value: unknown): FearEntry {
  const base = createFearEntry();
  if (typeof value !== 'object' || value === null) return base;

  const record = value as Record<string, unknown>;

  const category =
    typeof record['category'] === 'string' && isAllowedValue(FEAR_CATEGORIES, record['category'])
      ? (record['category'] as FearEntry['category'])
      : base.category;

  const copingMechanism =
    typeof record['copingMechanism'] === 'string' &&
      isAllowedValue(COPING_MECHANISMS, record['copingMechanism'])
      ? (record['copingMechanism'] as FearEntry['copingMechanism'])
      : base.copingMechanism;

  const specific = typeof record['specific'] === 'string' ? record['specific'] : base.specific;

  const intensityRaw = record['intensity'];
  const intensity =
    typeof intensityRaw === 'number' && Number.isFinite(intensityRaw)
      ? Math.min(1, Math.max(0, intensityRaw))
      : base.intensity;

  const triggersRaw = record['triggers'];
  const triggers = Array.isArray(triggersRaw)
    ? triggersRaw.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
    : base.triggers;

  return {
    ...base,
    category,
    copingMechanism,
    specific,
    intensity,
    triggers,
  };
}

function normalizeValueEntry(value: unknown): ValueEntry {
  const base = createValueEntry();
  if (typeof value !== 'object' || value === null) return base;

  const record = value as Record<string, unknown>;

  const v =
    typeof record['value'] === 'string' && isAllowedValue(CORE_VALUES, record['value'])
      ? (record['value'] as ValueEntry['value'])
      : base.value;

  const priorityRaw = record['priority'];
  const priority =
    typeof priorityRaw === 'number' && Number.isFinite(priorityRaw)
      ? Math.min(5, Math.max(1, Math.round(priorityRaw)))
      : base.priority;

  return { ...base, value: v, priority };
}
