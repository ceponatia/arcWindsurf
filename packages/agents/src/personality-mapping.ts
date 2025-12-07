import type { DimensionScores, PersonalityMap } from '@minimal-rpg/schemas';

/**
 * Map Big Five slider values into short, LLM-friendly temperament lines.
 *
 * - Only uses clear low/high extremes (avoids clutter from mid-range scores).
 * - Intended as a first-pass, data-driven replacement for ad-hoc free-text traits.
 */
export function buildDimensionTraitPhrases(personalityMap: PersonalityMap | undefined): string[] {
  const dimensions: DimensionScores | undefined = personalityMap?.dimensions;
  if (!dimensions) return [];

  const LOW = 0.3;
  const HIGH = 0.7;

  const lines: string[] = [];

  const { openness, conscientiousness, extraversion, agreeableness, neuroticism } = dimensions;

  // Openness
  if (typeof openness === 'number') {
    if (openness <= LOW) {
      lines.push('practical and grounded, preferring familiar routines over wild novelty');
    } else if (openness >= HIGH) {
      lines.push('deeply curious and imaginative, drawn to new experiences and ideas');
    } else {
      lines.push('open to new ideas while still appreciating familiar comforts');
    }
  }

  // Conscientiousness
  if (typeof conscientiousness === 'number') {
    if (conscientiousness <= LOW) {
      lines.push('impulsive and flexible, comfortable with mess and improvisation');
    } else if (conscientiousness >= HIGH) {
      lines.push('highly organized and reliable, planning carefully before acting');
    } else {
      lines.push('balances planning with spontaneity, neither rigid nor careless');
    }
  }

  // Extraversion
  if (typeof extraversion === 'number') {
    if (extraversion <= LOW) {
      lines.push('quiet and reserved, avoiding the spotlight and large crowds');
    } else if (extraversion >= HIGH) {
      lines.push('outgoing and energized by social interaction and lively spaces');
    } else {
      lines.push('comfortable in small groups and quieter settings without being severely shy');
    }
  }

  // Agreeableness
  if (typeof agreeableness === 'number') {
    if (agreeableness <= LOW) {
      lines.push('blunt and skeptical, more competitive than accommodating');
    } else if (agreeableness >= HIGH) {
      lines.push('warm, cooperative, and quick to empathize with others');
    } else {
      lines.push('generally cooperative but willing to stand their ground when needed');
    }
  }

  // Neuroticism
  if (typeof neuroticism === 'number') {
    if (neuroticism <= LOW) {
      lines.push('calm and emotionally steady, hard to rattle even under stress');
    } else if (neuroticism >= HIGH) {
      lines.push('emotionally volatile and anxious, easily unsettled by tension or conflict');
    } else {
      lines.push('experiences normal emotional ups and downs without extreme swings');
    }
  }

  return lines;
}
