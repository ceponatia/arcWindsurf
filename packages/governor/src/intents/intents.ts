/**
 * Intent type definitions and aliases for the intent detection system.
 *
 * This file centralizes all known intent types, making it easy to:
 * - Add new intents as the game expands
 * - Define aliases that map to canonical types
 * - Map governor intents to agent intents
 * - Keep the LLM prompt in sync with valid types
 *
 * TO ADD A NEW INTENT:
 * 1. Add an entry to INTENT_CONFIG below
 * 2. Add any aliases to INTENT_ALIASES
 * 3. (Optional) Add the type to @minimal-rpg/agents if agents need to handle it directly
 */

import { type IntentType as AgentIntentType } from '@minimal-rpg/agents';

/**
 * Configuration for each intent type.
 *
 * - `agentType`: The agent intent type this maps to (usually the same, or 'custom')
 * - `description`: Human-readable description (used for documentation)
 */
interface IntentConfig {
  agentType: AgentIntentType;
  description: string;
}

/**
 * Single source of truth for all intent types.
 *
 * Each key is a canonical intent type recognized by the governor.
 * The value specifies how it maps to agents and provides documentation.
 */
export const INTENT_CONFIG = {
  move: { agentType: 'move', description: 'Player wants to move/travel' },
  look: {
    agentType: 'look',
    description: 'Player wants to observe the environment, character, or object',
  },
  talk: { agentType: 'talk', description: 'Player wants to converse with NPC' },
  use: { agentType: 'use', description: 'Player wants to use an item' },
  take: { agentType: 'take', description: 'Player wants to pick up an item' },
  give: { agentType: 'give', description: 'Player wants to give an item to someone' },
  attack: { agentType: 'attack', description: 'Player wants to engage in combat' },
  examine: { agentType: 'examine', description: 'Player wants to closely inspect something' },
  wait: { agentType: 'wait', description: 'Player wants to wait/pass time' },
  narrate: {
    agentType: 'talk',
    description:
      'Player describes actions, poses, thoughts, or narrative (NPC reacts appropriately)',
  },
  system: { agentType: 'system', description: 'Meta/system commands (save, quit, help)' },

  // ============================================================================
  // Sensory Intents
  // ============================================================================
  // Handled by SensoryAgent in @minimal-rpg/agents.
  // Currently only 'smell' is fully implemented for characters (via ScentSchema).
  // Other sensory intents (taste, touch, listen) are TBD - no data source yet.
  // See: packages/agents/src/sensory/sensory-agent.ts
  // ============================================================================
  smell: { agentType: 'smell', description: 'Player wants to smell/sniff something' },
  taste: { agentType: 'taste', description: 'Player wants to taste something' },
  touch: { agentType: 'touch', description: 'Player wants to touch/feel something' },
  listen: { agentType: 'listen', description: 'Player wants to listen to sounds' },

  unknown: { agentType: 'custom', description: 'Intent could not be determined' },
} as const satisfies Record<string, IntentConfig>;

/**
 * The canonical IntentType union, derived from INTENT_CONFIG keys.
 */
export type IntentType = keyof typeof INTENT_CONFIG;

/**
 * Array of all intent type strings (derived from INTENT_CONFIG).
 * Useful for iteration and validation.
 */
export const INTENT_TYPES = Object.keys(INTENT_CONFIG) as IntentType[];

/**
 * Map a governor intent type to an agent intent type.
 */
export function mapToAgentIntent(type: IntentType): AgentIntentType {
  return INTENT_CONFIG[type].agentType;
}

// Legacy export for backwards compatibility
export const INTENT_TO_AGENT_MAP = Object.fromEntries(
  INTENT_TYPES.map((t) => [t, INTENT_CONFIG[t].agentType])
) as Record<IntentType, AgentIntentType>;

/**
 * Aliases that map alternative words to canonical intent types.
 *
 * These serve as a fallback when the LLM returns a non-canonical type.
 * The LLM should naturally map "sniff" → "smell", but if it returns
 * "sniff" literally, these aliases ensure correct routing.
 *
 * Add new aliases here as you discover common LLM outputs that should
 * map to existing canonical types.
 */
export const INTENT_ALIASES: Record<string, IntentType> = {
  // Look/observe aliases
  inspect: 'examine',
  observe: 'look',
  see: 'look',
  view: 'look',
  gaze: 'look',
  peer: 'look',
  survey: 'look',
  scan: 'look',

  // Talk/speak aliases
  speak: 'talk',
  say: 'talk',
  ask: 'talk',
  tell: 'talk',
  chat: 'talk',
  converse: 'talk',
  greet: 'talk',
  reply: 'talk',
  respond: 'talk',

  // Attack/combat aliases
  fight: 'attack',
  combat: 'attack',
  hit: 'attack',
  strike: 'attack',
  punch: 'attack',
  kick: 'attack',
  slash: 'attack',
  stab: 'attack',
  shoot: 'attack',

  // Move/travel aliases
  go: 'move',
  walk: 'move',
  run: 'move',
  travel: 'move',
  head: 'move',
  enter: 'move',
  exit: 'move',
  leave: 'move',
  climb: 'move',

  // Take/pickup aliases
  grab: 'take',
  pick: 'take',
  pickup: 'take',
  collect: 'take',
  get: 'take',
  acquire: 'take',
  loot: 'take',

  // Give/transfer aliases
  hand: 'give',
  offer: 'give',
  pass: 'give',
  transfer: 'give',
  donate: 'give',

  // Use/interact aliases
  interact: 'use',
  activate: 'use',
  open: 'use',
  close: 'use',
  pull: 'use',
  push: 'use',
  press: 'use',
  toggle: 'use',
  equip: 'use',
  wear: 'use',
  drink: 'use',
  eat: 'use',
  consume: 'use',
  read: 'use',

  // Wait/rest aliases
  rest: 'wait',
  pause: 'wait',
  sleep: 'wait',
  idle: 'wait',

  // System aliases
  help: 'system',
  save: 'system',
  load: 'system',
  quit: 'system',
  menu: 'system',
  inventory: 'system',
  status: 'system',
  stats: 'system',

  // Smell/scent aliases
  sniff: 'smell',
  inhale: 'smell',
  scent: 'smell',
  whiff: 'smell',
  snuff: 'smell',

  // Taste aliases
  lick: 'taste',
  sample: 'taste',
  savor: 'taste',
  sip: 'taste',
  bite: 'taste',
  chew: 'taste',

  // Touch/feel aliases
  feel: 'touch',
  poke: 'touch',
  prod: 'touch',
  stroke: 'touch',
  rub: 'touch',
  pat: 'touch',
  caress: 'touch',
  tap: 'touch',

  // Listen/hear aliases
  hear: 'listen',
  eavesdrop: 'listen',
  hearken: 'listen',

  // Narrate/emote aliases (roleplay actions)
  emote: 'narrate',
  action: 'narrate',
  pose: 'narrate',
  roleplay: 'narrate',
  rp: 'narrate',
  describe: 'narrate',
};

/**
 * Build the intent type list for the LLM prompt.
 * Excludes 'unknown' since that's for the LLM to use when it can't classify.
 */
export function getIntentTypeList(): string {
  return INTENT_TYPES.filter((t) => t !== 'unknown').join('|') + '|unknown';
}

/**
 * Check if a string is a valid canonical intent type.
 */
export function isValidIntentType(value: string): value is IntentType {
  return value in INTENT_CONFIG;
}

/**
 * Resolve an intent type, checking aliases if not a canonical type.
 * Returns 'unknown' if no match found.
 */
export function resolveIntentType(value: string): IntentType {
  const normalized = value.toLowerCase().trim();

  if (isValidIntentType(normalized)) {
    return normalized;
  }

  return INTENT_ALIASES[normalized] ?? 'unknown';
}
