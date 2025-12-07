import type { TagDefinition, TagTrigger } from './definitions.js';

/**
 * Check if a tag is conditional (requires per-turn evaluation).
 */
export function isConditionalTag(tag: TagDefinition): boolean {
  return tag.activationMode === 'conditional' && tag.triggers.length > 0;
}

/**
 * Increment version based on changelog presence.
 * Only increments if changelog is provided.
 * Version format: X.Y.Z (single digit per segment, rolls over at 9)
 */
export function incrementVersion(currentVersion: string, hasChangelog: boolean): string {
  if (!hasChangelog) return currentVersion;

  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.1'; // Reset to valid version if malformed
  }

  let major = parts[0] ?? 1;
  let minor = parts[1] ?? 0;
  let patch = parts[2] ?? 0;

  patch += 1;

  if (patch > 9) {
    patch = 0;
    minor += 1;
  }
  if (minor > 9) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Validate that triggers are properly configured for their condition type.
 */
export function validateTrigger(trigger: TagTrigger): { valid: boolean; error?: string } {
  const { condition, params } = trigger;

  if (!params) {
    return { valid: false, error: `Trigger condition '${condition}' requires params` };
  }

  switch (condition) {
    case 'intent':
      if (!params.intents?.length) {
        return { valid: false, error: "Intent trigger requires 'intents' array" };
      }
      break;
    case 'keyword':
      if (!params.keywords?.length) {
        return { valid: false, error: "Keyword trigger requires 'keywords' array" };
      }
      break;
    case 'emotion':
      if (!params.emotions?.length) {
        return { valid: false, error: "Emotion trigger requires 'emotions' array" };
      }
      break;
    case 'relationship':
      if (!params.relationshipLevels?.length) {
        return { valid: false, error: "Relationship trigger requires 'relationshipLevels' array" };
      }
      break;
    case 'time':
      if (!params.timeRange) {
        return { valid: false, error: "Time trigger requires 'timeRange'" };
      }
      break;
    case 'location':
      if (!params.locationIds?.length && !params.locationTags?.length) {
        return {
          valid: false,
          error: "Location trigger requires 'locationIds' or 'locationTags' array",
        };
      }
      break;
    case 'state':
      if (!params.stateFlags?.length) {
        return { valid: false, error: "State trigger requires 'stateFlags' array" };
      }
      break;
  }

  return { valid: true };
}
