/**
 * Encounter Service
 *
 * Generates narrative descriptions for NPC encounters.
 * Migrated from packages/api/src/services/encounter-service.ts
 */
import type { CrowdLevel, NpcActivity } from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * NPC info for encounter narration.
 */
export interface EncounterNpcInfo {
  npcId: string;
  name: string;
  appearance?: string;
  activity: NpcActivity;
  tier: 'major' | 'minor' | 'background' | 'transient';
}

/**
 * Encounter narration result.
 */
export interface EncounterNarration {
  /** Main scene description */
  sceneDescription: string;
  /** Individual NPC introductions (for major/minor NPCs) */
  npcIntroductions: { npcId: string; introduction: string }[];
  /** Crowd description (for background NPCs) */
  crowdDescription: string | null;
  /** Full combined narration */
  fullNarration: string;
}

/**
 * Options for generating encounter narration.
 */
export interface EncounterNarrationOptions {
  /** Location name */
  locationName: string;
  /** Location description */
  locationDescription?: string;
  /** NPCs present at the location */
  npcsPresent: EncounterNpcInfo[];
  /** Crowd level */
  crowdLevel: CrowdLevel;
  /** Time of day for atmosphere */
  timeOfDay?: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  /** Whether this is the player entering (vs NPCs entering) */
  playerEntering: boolean;
}

// =============================================================================
// Narration Generation
// =============================================================================

/**
 * Generate encounter narration for a location.
 */
export function generateEncounterNarration(options: EncounterNarrationOptions): EncounterNarration {
  const { locationName, locationDescription, npcsPresent, crowdLevel, timeOfDay, playerEntering } =
    options;

  // Separate NPCs by tier
  const majorMinor = npcsPresent.filter((n) => n.tier === 'major' || n.tier === 'minor');
  const background = npcsPresent.filter((n) => n.tier === 'background' || n.tier === 'transient');

  // Generate scene description
  const sceneDescription = generateSceneDescription(
    locationName,
    locationDescription,
    crowdLevel,
    timeOfDay,
    playerEntering
  );

  // Generate individual introductions for notable NPCs
  const npcIntroductions = majorMinor.map((npc) => ({
    npcId: npc.npcId,
    introduction: generateNpcIntroduction(npc, playerEntering),
  }));

  // Generate crowd description for background NPCs
  const crowdDescription =
    background.length > 0 ? generateCrowdDescription(background, crowdLevel) : null;

  // Combine into full narration
  const parts: string[] = [sceneDescription];

  if (crowdDescription) {
    parts.push(crowdDescription);
  }

  for (const intro of npcIntroductions) {
    parts.push(intro.introduction);
  }

  return {
    sceneDescription,
    npcIntroductions,
    crowdDescription,
    fullNarration: parts.join(' '),
  };
}

/**
 * Generate narration for NPC entering player's location.
 */
export function generateNpcEntranceNarration(
  npc: EncounterNpcInfo,
  entranceDirection?: string
): string {
  const name = npc.name;
  const directionPhrase = entranceDirection ? ` from the ${entranceDirection}` : '';

  const entrancePhrases = [
    `${name} enters${directionPhrase}.`,
    `${name} walks in${directionPhrase}.`,
    `${name} arrives${directionPhrase}.`,
    `You notice ${name} entering${directionPhrase}.`,
  ];

  // Pick based on name hash for consistency
  const phrase = entrancePhrases[hashString(name) % entrancePhrases.length]!;

  // Add activity context if not idle
  if (npc.activity.type !== 'idle') {
    return `${phrase} ${describeActivity(npc.activity)}`;
  }

  return phrase;
}

/**
 * Generate narration for NPC leaving player's location.
 */
export function generateNpcExitNarration(npc: EncounterNpcInfo, exitDirection?: string): string {
  const name = npc.name;
  const directionPhrase = exitDirection ? ` toward the ${exitDirection}` : '';

  const exitPhrases = [
    `${name} leaves${directionPhrase}.`,
    `${name} walks away${directionPhrase}.`,
    `${name} departs${directionPhrase}.`,
    `You watch ${name} leave${directionPhrase}.`,
  ];

  return exitPhrases[hashString(name) % exitPhrases.length]!;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate scene description based on location and crowd.
 */
function generateSceneDescription(
  locationName: string,
  locationDescription: string | undefined,
  crowdLevel: CrowdLevel,
  timeOfDay: string | undefined,
  playerEntering: boolean
): string {
  const verb = playerEntering ? 'enter' : 'are in';
  const atmosphere = getAtmospherePhrase(crowdLevel, timeOfDay);

  if (locationDescription) {
    return `You ${verb} ${locationName}. ${locationDescription} ${atmosphere}`;
  }

  return `You ${verb} ${locationName}. ${atmosphere}`;
}

/**
 * Get atmosphere phrase based on crowd and time.
 */
function getAtmospherePhrase(crowdLevel: CrowdLevel, timeOfDay?: string): string {
  const timePhrases: Record<string, string> = {
    dawn: 'The early morning light filters in.',
    morning: 'Morning activity fills the air.',
    midday: 'The midday bustle is in full swing.',
    afternoon: 'The afternoon wears on.',
    evening: 'Evening shadows lengthen.',
    night: 'Darkness has settled in.',
  };

  const crowdPhrases: Record<CrowdLevel, string> = {
    empty: 'The place is deserted.',
    sparse: 'A few people are scattered about.',
    moderate: 'There is a moderate crowd.',
    crowded: 'The area bustles with activity.',
    packed: 'People fill every available space.',
  };

  const timePhrase = timeOfDay ? (timePhrases[timeOfDay] ?? '') : '';
  const crowdPhrase = crowdPhrases[crowdLevel];

  return [timePhrase, crowdPhrase].filter(Boolean).join(' ');
}

/**
 * Generate introduction for a notable NPC.
 */
function generateNpcIntroduction(npc: EncounterNpcInfo, playerEntering: boolean): string {
  const name = npc.name;
  const activityDesc = describeActivity(npc.activity);

  if (playerEntering) {
    // Player entering - describe NPC as already present
    const presencePhrases = [
      `${name} is here, ${activityDesc.toLowerCase()}`,
      `You notice ${name} ${activityDesc.toLowerCase()}`,
      `${name} can be seen ${activityDesc.toLowerCase()}`,
    ];
    return presencePhrases[hashString(name) % presencePhrases.length]!;
  } else {
    // NPC entering - use entrance narration
    return generateNpcEntranceNarration(npc);
  }
}

/**
 * Describe an NPC's activity in narrative form.
 */
function describeActivity(activity: NpcActivity): string {
  const engagement = activity.engagement;

  // Modify description based on engagement level
  switch (engagement) {
    case 'absorbed':
      return `deeply focused on ${activity.description.toLowerCase()}`;
    case 'focused':
      return activity.description;
    case 'casual':
      return `casually ${activity.description.toLowerCase()}`;
    case 'idle':
      return `absently ${activity.description.toLowerCase()}`;
    default:
      return activity.description;
  }
}

/**
 * Generate crowd description for background NPCs.
 */
function generateCrowdDescription(
  backgroundNpcs: EncounterNpcInfo[],
  crowdLevel: CrowdLevel
): string {
  const count = backgroundNpcs.length;

  if (count === 0) return '';

  if (count === 1) {
    const npc = backgroundNpcs[0]!;
    return `A ${npc.appearance ?? 'person'} is nearby.`;
  }

  if (count <= 3) {
    return `A few ${describeMixedGroup(backgroundNpcs)} are around.`;
  }

  // Larger crowds - summarize
  const crowdDescriptors: Record<CrowdLevel, string> = {
    empty: 'a handful of',
    sparse: 'several',
    moderate: 'a group of',
    crowded: 'many',
    packed: 'a crowd of',
  };

  return `${crowdDescriptors[crowdLevel] ?? 'Some'} people go about their business.`;
}

/**
 * Describe a mixed group of NPCs.
 */
function describeMixedGroup(npcs: EncounterNpcInfo[]): string {
  const appearances = npcs
    .map((n) => n.appearance)
    .filter(Boolean)
    .slice(0, 2);

  if (appearances.length === 0) {
    return 'people';
  }

  return appearances.join(' and ');
}

/**
 * Simple string hash for deterministic selection.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
