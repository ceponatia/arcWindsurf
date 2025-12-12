import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';

/**
 * Truncate text to a maximum length, adding an ellipsis if truncated.
 */
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Serialize a character's physique to a compact string format.
 */
function serializePhysique(physique: unknown): string {
  if (!physique) return '';
  if (typeof physique === 'string') return truncate(physique, 240);

  const p = physique as {
    build?: {
      height?: string;
      torso?: string;
      skinTone?: string;
      arms?: { build?: string; length?: string };
      legs?: { build?: string; length?: string };
    };
    appearance?: {
      hair?: { color?: string; style?: string; length?: string };
      eyes?: { color?: string };
      features?: string[];
    };
  };

  const parts: string[] = [];

  const hair = p.appearance?.hair;
  if (hair) {
    const hairBits = [hair.color, hair.length, hair.style].filter(Boolean).join(' ');
    if (hairBits) parts.push(`Hair: ${hairBits}`);
  }

  const eyes = p.appearance?.eyes;
  if (eyes?.color) parts.push(`Eyes: ${eyes.color}`);

  const build = p.build;
  if (build) {
    if (build.height) parts.push(`Height: ${build.height}`);
    if (build.skinTone) parts.push(`Skin: ${build.skinTone}`);
    if (build.torso) parts.push(`Torso: ${build.torso}`);

    const arms = build.arms;
    if (arms) {
      const armBits = [arms.build, arms.length ? `length=${arms.length}` : '']
        .filter(Boolean)
        .join(', ');
      if (armBits) parts.push(`Arms: ${armBits}`);
    }

    const legs = build.legs;
    if (legs) {
      const legBits = [legs.build, legs.length ? `length=${legs.length}` : '']
        .filter(Boolean)
        .join(', ');
      if (legBits) parts.push(`Legs: ${legBits}`);
    }
  }

  const features = p.appearance?.features;
  if (Array.isArray(features) && features.length) {
    parts.push(`Features: ${features.join(', ')}`);
  }

  return parts.join('; ');
}

/**
 * Serialize character details to a formatted string.
 */
function serializeDetails(details: CharacterProfile['details'] | undefined): string {
  if (!details?.length) return '';
  const sorted = [...details].sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5));
  const lines = sorted.map((detail) => {
    const areaPrefix = detail.area && detail.area !== 'custom' ? `${detail.area}: ` : '';
    return `${areaPrefix}${detail.label}: ${truncate(detail.value, 200)}`;
  });
  return lines.length ? `Profile Details:\n- ${lines.join('\n- ')}` : '';
}

/**
 * Serialize character scent profile to a compact string.
 */
function serializeScent(s: unknown): string {
  if (!s || typeof s !== 'object') return '';
  const obj = s as { hairScent?: string; bodyScent?: string; perfume?: string };
  const bits: string[] = [];
  if (typeof obj.hairScent === 'string') bits.push(`hair=${obj.hairScent}`);
  if (typeof obj.bodyScent === 'string') bits.push(`body=${obj.bodyScent}`);
  if (typeof obj.perfume === 'string') bits.push(`perfume=${truncate(obj.perfume, 40)}`);
  return bits.length ? `Scent Hints: ${bits.join(', ')}` : '';
}

/**
 * Serialize a CharacterProfile to a formatted string for LLM consumption.
 */
export function serializeCharacter(c: CharacterProfile): string {
  const rawPersonality = c.personality;
  const personalityLine = Array.isArray(rawPersonality)
    ? `Personality Traits: ${rawPersonality.map((p) => truncate(p, 120)).join('; ')}`
    : `Personality: ${truncate(rawPersonality, 400)}`;

  return [
    `Character: ${c.name}`,
    'age' in c && typeof (c as { age?: unknown }).age === 'number'
      ? `Age: ${(c as { age?: number }).age}`
      : undefined,
    'gender' in c && typeof (c as { gender?: unknown }).gender === 'string'
      ? `Gender: ${(c as { gender?: string }).gender}`
      : undefined,
    `Backstory: ${c.backstory}`,
    personalityLine,
    'physique' in c && (c as { physique?: unknown }).physique
      ? `Appearance: ${serializePhysique((c as { physique?: unknown }).physique)}`
      : undefined,
    // scent is optional; guard via in-operator for forward/backward compat
    'scent' in c && (c as { scent?: unknown }).scent
      ? serializeScent((c as { scent?: unknown }).scent)
      : undefined,
    serializeDetails(c.details),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Serialize a SettingProfile to a formatted string for LLM consumption.
 */
export function serializeSetting(s: SettingProfile): string {
  return [
    `Setting: ${s.name}`,
    `Lore: ${truncate(s.lore, 1200)}`,
    s.themes?.length ? `Themes: ${s.themes.join('; ')}` : undefined,
    s.tags?.length ? `Tags: ${s.tags.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}
