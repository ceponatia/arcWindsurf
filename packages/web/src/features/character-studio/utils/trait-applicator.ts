import { characterProfile, updatePersonalityMap, updateProfile } from '../signals.js';
import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';
import { COPING_MECHANISMS, CORE_VALUES, FEAR_CATEGORIES } from '@minimal-rpg/schemas';
import {
  createFearEntry,
  createValueEntry,
  type FearEntry,
  type ValueEntry,
} from '../types.js';

/**
 * Applies an inferred trait to the character profile based on its dot-notation path.
 *
 * @param trait - The inferred trait object containing path and value
 */
export function applyTrait(trait: { path: string; value: unknown }): void {
  const pathParts = trait.path.split('.');

  if (pathParts[0] === 'personalityMap') {
    applyPersonalityTrait(pathParts.slice(1), trait.value);
  } else {
    // Top-level profile field (name, backstory, etc.)
    updateProfile(pathParts[0] as keyof CharacterProfile, trait.value as never);
  }
}

/**
 * Handles applying updates to the personalityMap section of the profile.
 *
 * @param path - The segments of the path under personalityMap
 * @param value - The value to apply
 */
function applyPersonalityTrait(path: string[], value: unknown): void {
  const current = characterProfile.value.personalityMap ?? {};
  const head = path[0];
  if (!head) return;

  // Handle array fields first (values, fears) which should append
  if (head === 'values' || head === 'fears') {
    const existing = (current as Record<string, unknown[]>)[head] ?? [];
    updatePersonalityMap({
      [head]: [...existing, head === 'fears' ? normalizeFearEntry(value) : normalizeValueEntry(value)],
    } as Partial<PersonalityMap>);
    return;
  }

  if (path.length === 1) {
    // Direct field: personalityMap.attachment
    updatePersonalityMap({ [head]: value } as Partial<PersonalityMap>);
  } else if (path.length === 2) {
    // Nested field: personalityMap.dimensions.openness, personalityMap.social.strangerDefault, etc.
    const section = path[0] as string;
    const field = path[1] as string;
    const sectionData = (current as Record<string, unknown>)[section] ?? {};

    // Stress list fields should append normalized string values.
    if (section === 'stress' && (field === 'soothingActivities' || field === 'stressIndicators')) {
      const existing = normalizeStringList((sectionData as Record<string, unknown>)[field]);
      const incoming = normalizeStringList(value);
      updatePersonalityMap({
        stress: {
          ...(sectionData as any),
          [field]: [...existing, ...incoming],
        },
      } as any);
      return;
    }

    updatePersonalityMap({
      [section]: { ...(sectionData as object), [field]: value },
    } as Partial<PersonalityMap>);
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
    typeof record['category'] === 'string' &&
      FEAR_CATEGORIES.includes(record['category'] as (typeof FEAR_CATEGORIES)[number])
      ? (record['category'] as FearEntry['category'])
      : base.category;

  const copingMechanism =
    typeof record['copingMechanism'] === 'string' &&
      COPING_MECHANISMS.includes(record['copingMechanism'] as (typeof COPING_MECHANISMS)[number])
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
    typeof record['value'] === 'string' &&
      CORE_VALUES.includes(record['value'] as (typeof CORE_VALUES)[number])
      ? (record['value'] as ValueEntry['value'])
      : base.value;

  const priorityRaw = record['priority'];
  const priority =
    typeof priorityRaw === 'number' && Number.isFinite(priorityRaw)
      ? Math.min(5, Math.max(1, Math.round(priorityRaw)))
      : base.priority;

  return { ...base, value: v, priority };
}
