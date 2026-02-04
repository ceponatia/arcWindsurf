/**
 * Encounter narration types.
 */
import type { NpcTier } from '../npc-tier/types.js';
import type { NpcActivity } from '../state/npc-location.js';
import type { CrowdLevel } from '../state/occupancy.js';

/**
 * NPC info for encounter narration.
 */
export interface EncounterNpcInfo {
  npcId: string;
  name: string;
  appearance?: string;
  activity: NpcActivity;
  tier: NpcTier;
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
 * Encounter time of day.
 */
export type EncounterTimeOfDay =
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'night';

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
  timeOfDay?: EncounterTimeOfDay;
  /** Whether this is the player entering (vs NPCs entering) */
  playerEntering: boolean;
}
