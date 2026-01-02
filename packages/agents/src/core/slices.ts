import type {
  BodyMap,
  Physique,
  PersonalityMap,
  CharacterDetail,
  PersonaProfile,
  SensoryContextForNpc,
  ParsedAction,
  ActionInterrupt,
  AccumulatedSensoryContext,
  NpcHygieneState,
} from '@minimal-rpg/schemas';
import type { AgentIntent } from './intents.js';

// ============================================================================
// Agent Input Types
// ============================================================================

/**
 * A single turn in the conversation history.
 */
export interface ConversationTurn {
  /** The speaker (player or character) */
  speaker: 'player' | 'character' | 'narrator';

  /** The message content */
  content: string;

  /** Timestamp of the turn */
  timestamp: Date;
}

/**
 * A single knowledge context item retrieved for the agent.
 */
export interface KnowledgeContextItem {
  /** The path/key of the knowledge node (e.g., 'appearance.hair') */
  path: string;

  /** Human-readable content */
  content: string;

  /** Combined score from similarity + salience */
  score: number;

  /** Source entity type */
  source?: 'character' | 'setting' | 'location';
}

/**
 * State slices passed to agents.
 * Each agent receives only the slices relevant to its domain.
 */
export interface AgentStateSlices {
  /** Current character profile (effective state) */
  character?: CharacterSlice;

  /** Active NPC profile for this turn (if any) */
  npc?: CharacterSlice;

  /** Current setting profile (effective state) */
  setting?: SettingSlice;

  /** Current location data */
  location?: LocationSlice;

  /** Inventory/items data */
  inventory?: InventorySlice;

  /** Proximity/sensory engagement state (session-only) */
  proximity?: ProximitySlice;

  /** Recent conversation history (deprecated, use AgentInput.conversationHistory) */
  recentHistory?: unknown[];
}

/**
 * Common input provided to all agents on each turn.
 * The Governor assembles this from session context and effective state.
 */
export interface AgentInput {
  /** Stable session identifier */
  sessionId: string;

  /** Canonical NPC identifier for this turn, if applicable */
  npcId?: string;

  /** Raw player text from the client */
  playerInput: string;

  /** Normalized intent (once intent detection is implemented) */
  intent?: AgentIntent;

  /** Effective state slices relevant to the agent's domain */
  stateSlices: AgentStateSlices;

  /** Retrieved knowledge nodes (from retrieval layer) */
  knowledgeContext?: KnowledgeContextItem[];

  /** Recent conversation history for context */
  conversationHistory?: ConversationTurn[];

  /** NPC-specific transcript history when addressing a specific NPC */
  npcConversationHistory?: ConversationTurn[];

  /** Player character persona (when attached to session) - NOT passed to intent detector */
  persona?: PersonaProfile;

  /** Structured sensory context for NPC agents to weave into narrative */
  sensoryContext?: SensoryContextForNpc;

  /** Action sequence information for multi-action turns */
  actionSequence?: {
    completedActions: ParsedAction[];
    interruptedAt?: ActionInterrupt;
    pendingActions: ParsedAction[];
  };

  /** Accumulated sensory context across all completed actions */
  accumulatedContext?: AccumulatedSensoryContext;
}

/**
 * Full character data for agent consumption.
 * Contains all CharacterProfile fields for agents to use as needed.
 */
export interface CharacterSlice {
  /** Character instance ID */
  instanceId: string;

  /** Character name */
  name: string;

  /** Character age */
  age?: number | undefined;

  /** Full backstory for NPC dialogue generation */
  backstory?: string | undefined;

  /** Current goals (runtime state, not in profile) */
  goals?: string[] | undefined;

  /** Personality - simple string or array of traits */
  personality?: string | string[] | undefined;

  /** Physique - appearance description or structured object */
  physique?: string | Physique | undefined;

  /** Body map with per-region sensory data (scent, texture, visual, flavor) */
  body?: BodyMap | undefined;

  /** Hygiene state tracking cleanliness levels per body part */
  hygiene?: NpcHygieneState | undefined;

  /** Structured personality map for detailed NPC behavior */
  personalityMap?: PersonalityMap | undefined;

  /** Additional character details/facts */
  details?: CharacterDetail[] | undefined;
}

/**
 * Minimal setting slice for agent consumption.
 */
export interface SettingSlice {
  /** Setting instance ID */
  instanceId: string;

  /** Setting name */
  name: string;

  /** Short summary/lore */
  summary: string;

  /** Active themes */
  themes?: string[];
}

/**
 * Location slice for navigation agents.
 */
export interface LocationSlice {
  /** Current location ID */
  id: string;

  /** Location name */
  name: string;

  /** Description of the location */
  description: string;

  /** Connected locations (exits) */
  exits?: LocationExit[];
}

/**
 * An exit from a location.
 */
export interface LocationExit {
  /** Direction (e.g., 'north', 'up', 'through the door') */
  direction: string;

  /** Target location ID */
  targetId: string;

  /** Description of the exit */
  description?: string;

  /** Whether the exit is currently accessible */
  accessible?: boolean;
}

/**
 * Inventory slice for item-related agents.
 */
export interface InventorySlice {
  /** Items currently held */
  items: InventoryItem[];

  /** Maximum capacity (optional) */
  capacity?: number;
}

/**
 * An item in inventory.
 */
export interface InventoryItem {
  /** Item ID */
  id: string;

  /** Item name */
  name: string;

  /** Item description */
  description?: string;

  /** Whether the item is usable */
  usable?: boolean;
}

/**
 * Proximity slice for sensory engagement tracking.
 * Tracks active sensory engagements between player and NPCs.
 */
export interface ProximitySlice {
  /** Active sensory engagements keyed by `${npcId}:${bodyPart}:${senseType}` */
  engagements: Record<string, SensoryEngagementData>;

  /** General proximity level to each NPC, keyed by npcId */
  npcProximity: Record<string, ProximityLevel>;
}

/**
 * A single sensory engagement between player and an NPC body part.
 */
export interface SensoryEngagementData {
  /** NPC identifier */
  npcId: string;

  /** Body part being engaged (e.g., 'hair', 'feet', 'hands') */
  bodyPart: string;

  /** Type of sense engaged */
  senseType: SenseType;

  /** Current intensity level */
  intensity: EngagementIntensity;

  /** Turn number or timestamp when engagement started */
  startedAt: number;

  /** Turn number or timestamp of last activity */
  lastActiveAt: number;
}

/**
 * The type of sense being engaged.
 */
export type SenseType = 'look' | 'touch' | 'smell' | 'taste' | 'hear';

/**
 * Intensity level of a sensory engagement.
 */
export type EngagementIntensity = 'casual' | 'focused' | 'intimate';

/**
 * General proximity level to an NPC.
 */
export type ProximityLevel = 'distant' | 'near' | 'close' | 'intimate';

/**
 * Re-export AccumulatedSensoryContext from schemas for convenience.
 */
export type { AccumulatedSensoryContext } from '@minimal-rpg/schemas';
