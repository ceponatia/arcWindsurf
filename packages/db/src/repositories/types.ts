import type {
  MessageSpeaker,
  OwnerEmail,
  SessionMessage,
  SessionRecord,
  SessionSummaryRecord,
  UUID,
} from '../types.js';
import type { SessionHistoryEntry, StateChangeLogEntry, UserPreferences, UserRole } from '@minimal-rpg/schemas';

export type { MessageSpeaker };
export type { SessionHistoryEntry, StateChangeLogEntry, UserPreferences, UserRole };
export type {
  SessionMessage as Message,
  SessionRecord as Session,
  SessionSummaryRecord as SessionSummary,
};

export interface NpcMessage {
  idx: number;
  speaker: 'player' | 'npc' | 'narrator';
  content: string;
  createdAt: string;
  witnessedBy?: string[];
}

export type SessionSliceState = Record<string, unknown>;

export interface SceneAction {
  id: UUID;
  sessionId: UUID;
  actorId: string;
  actorType: 'player' | 'npc';
  actionType: 'speech' | 'action' | 'thought' | 'observation' | 'other';
  content: string;
  observableBy: string[];
  locationId: string | null;
  createdAt: string;
  turnNumber: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateSceneActionInput {
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  actorId: string;
  actorType: 'player' | 'npc';
  actionType: 'speech' | 'action' | 'thought' | 'observation' | 'other';
  content: string;
  observableBy: string[];
  locationId?: string | null;
  turnNumber?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AffinityStateRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  stateJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NpcLocationStateRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  locationId: string;
  subLocationId: string | null;
  activityJson: Record<string, unknown>;
  arrivedAtJson: Record<string, unknown>;
  interruptible: boolean;
  scheduleSlotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationOccupancyCacheRecord {
  id: UUID;
  sessionId: UUID;
  locationId: string;
  occupancyJson: Record<string, unknown>;
  computedAtJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NpcSimulationCacheRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  lastComputedAtJson: Record<string, unknown>;
  currentStateJson: Record<string, unknown>;
  dayDecisionsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerInterestRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  score: number;
  totalInteractions: number;
  turnsSinceInteraction: number;
  peakScore: number;
  currentTier: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDraftRecord {
  id: UUID;
  userId: string;
  name: string | null;
  workspaceState: Record<string, unknown>;
  currentStep: string;
  validationState: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Dialogue Tree Records
// =============================================================================

export interface DialogueTreeRecord {
  id: UUID;
  npcId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  startNodeId: string;
  nodes: Record<string, unknown>;
  priority: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface DialogueStateRecord {
  id: UUID;
  sessionId: UUID | null;
  npcId: string;
  treeId: UUID | null;
  currentNodeId: string | null;
  visitedNodes: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionLocationMapRecord {
  id: UUID;
  sessionId: UUID;
  locationMapId: UUID;
  overridesJson: Record<string, unknown>;
  createdAt: string;
  /** The full location map data (from joined location_maps table) */
  locationMap?: {
    id: UUID;
    settingId: UUID;
    name: string;
    description: string | null;
    isTemplate: boolean;
    nodesJson: unknown[];
    connectionsJson: unknown[];
    defaultStartLocationId: string | null;
    tags: string[];
  };
}

/**
 * Actor IDs present at a location within a session.
 */
export interface ActorsAtLocationResult {
  actorId: string;
}

/**
 * Summary of a location connection for navigation.
 */
export interface LocationConnectionSummary {
  connectionId: string;
  targetLocationId: string;
  targetName?: string;
  locked?: boolean;
  lockReason?: string;
}

// From tags.ts
export interface ListTagsOptions {
  owner?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  category?: string;
  activationMode?: 'always' | 'conditional';
  isBuiltIn?: boolean;
}

export interface CreateTagInput {
  owner?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  name: string;
  shortDescription?: string;
  category?: string;
  promptText: string;
  activationMode?: 'always' | 'conditional';
  targetType?: string;
  triggers?: unknown[];
  priority?: string;
  compositionMode?: string;
  conflictsWith?: string[];
  requires?: string[];
  isBuiltIn?: boolean;
}

export interface UpdateTagInput {
  name?: string;
  shortDescription?: string;
  category?: string;
  promptText?: string;
  activationMode?: 'always' | 'conditional';
  targetType?: string;
  triggers?: unknown[];
  priority?: string;
  compositionMode?: string;
  conflictsWith?: string[];
  requires?: string[];
  visibility?: 'private' | 'public' | 'unlisted';
  changelog?: string;
}

export interface CreateBindingInput {
  sessionId: string;
  tagId: string;
  targetType?: string;
  targetEntityId?: string | null;
  enabled?: boolean;
}

export type AuthProvider = 'local' | 'supabase';

export interface UserAccount {
  id: UUID;
  identifier: string;
  displayName: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  supabaseUserId: UUID | null;
  preferences: UserPreferences;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
