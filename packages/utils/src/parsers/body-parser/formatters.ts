/**
 * Body sensory data formatting functions.
 * Convert BodyMap structures back to human-readable text.
 */

import type {
  BodyMap,
  RegionScent,
  RegionTexture,
  RegionVisual,
  RegionFlavor,
} from '@minimal-rpg/schemas';
import { BODY_REGIONS, getRecordOptional } from '@minimal-rpg/schemas';

/**
 * Format a RegionScent back to human-readable text.
 */
export function formatScent(scent: RegionScent): string {
  const parts: string[] = [];

  // Add intensity prefix if not default
  if (scent.intensity >= 0.7) {
    parts.push('strong');
  } else if (scent.intensity <= 0.3) {
    parts.push('light');
  }

  parts.push(scent.primary);

  if (scent.notes?.length) {
    parts.push(...scent.notes);
  }

  return parts.join(', ');
}

/**
 * Format a RegionTexture back to human-readable text.
 */
export function formatTexture(texture: RegionTexture): string {
  const parts: string[] = [texture.primary];

  if (texture.temperature !== 'neutral') {
    parts.push(texture.temperature);
  }

  if (texture.moisture !== 'normal') {
    parts.push(texture.moisture);
  }

  if (texture.notes?.length) {
    parts.push(...texture.notes);
  }

  return parts.join(', ');
}

/**
 * Format a RegionVisual back to human-readable text.
 */
export function formatVisual(visual: RegionVisual): string {
  const parts: string[] = [visual.description];

  if (visual.features?.length) {
    parts.push(...visual.features);
  }

  return parts.join(', ');
}

/**
 * Format a RegionFlavor back to human-readable text.
 */
export function formatFlavor(flavor: RegionFlavor): string {
  const parts: string[] = [];

  // Add intensity prefix if not default
  if (flavor.intensity >= 0.7) {
    parts.push('strong');
  } else if (flavor.intensity <= 0.3) {
    parts.push('subtle');
  }

  parts.push(flavor.primary);

  if (flavor.notes?.length) {
    parts.push(...flavor.notes);
  }

  return parts.join(', ');
}

/**
 * Format a full BodyMap to human-readable text (one line per region/sensory type).
 */
export function formatBodyMap(bodyMap: BodyMap): string {
  const lines: string[] = [];

  for (const region of BODY_REGIONS) {
    const data = getRecordOptional(bodyMap, region);
    if (!data) continue;

    if (data.scent) {
      lines.push(`${region}: scent: ${formatScent(data.scent)}`);
    }
    if (data.texture) {
      lines.push(`${region}: texture: ${formatTexture(data.texture)}`);
    }
    if (data.visual) {
      lines.push(`${region}: visual: ${formatVisual(data.visual)}`);
    }
    if (data.flavor) {
      lines.push(`${region}: flavor: ${formatFlavor(data.flavor)}`);
    }
  }

  return lines.join('\n');
}
