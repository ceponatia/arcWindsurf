/**
 * Database Row Type Definitions
 *
 * These types define the shape of rows returned from Drizzle queries.
 * Use these to properly type mapper functions and avoid `as any` casts.
 */
import type { LocationNode, LocationConnection, ScheduleTemplateRow } from '@minimal-rpg/schemas';

/**
 * Row shape from location_maps table.
 */
export interface LocationMapRow {
  id: string;
  ownerEmail: string;
  name: string;
  description: string | null;
  settingId: string;
  nodesJson: LocationNode[] | null;
  connectionsJson: LocationConnection[] | null;
  defaultStartLocationId: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from location_prefabs table.
 */
export interface LocationPrefabRow {
  id: string;
  ownerEmail: string;
  name: string;
  description: string | null;
  category: string | null;
  nodesJson: LocationNode[] | null;
  connectionsJson: LocationConnection[] | null;
  entryPoints: string[];
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export type { ScheduleTemplateRow };

/**
 * Row shape from entity_profiles table.
 */
export interface EntityProfileRow {
  id: string;
  entityType: 'character' | 'setting' | 'persona' | 'item';
  ownerEmail: string;
  name: string;
  profileJson: unknown;
  tags: string[] | null;
  visibility: 'private' | 'public';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Row shape from actor_states table.
 */
export interface ActorStateRow {
  id: string;
  sessionId: string;
  actorType: 'npc' | 'player';
  actorId: string;
  entityProfileId: string | null;
  state: unknown;
  lastEventSeq: bigint;
  createdAt: Date;
  updatedAt: Date;
}
