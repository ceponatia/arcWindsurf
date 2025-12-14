import { z } from 'zod';

/**
 * Location Map Schema
 *
 * Defines the structure for visual location maps that can be edited
 * in the Location Builder using React Flow.
 *
 * A LocationMap contains:
 * - Nodes: Individual locations with their properties
 * - Edges: Connections between locations via named exits
 * - Layout: Visual positioning data for the graph editor
 */

// ============================================================================
// Location Node Types
// ============================================================================

/** Type of location in the hierarchy */
export const LocationTypeSchema = z.enum(['region', 'building', 'room']);
export type LocationType = z.infer<typeof LocationTypeSchema>;

/**
 * Named exit/entrance point on a location.
 * Enables multi-exit locations with specific connection points.
 */
export const LocationPortSchema = z.object({
  /** Unique ID within the location */
  id: z.string().min(1),
  /** Display name: "Front Door", "Back Alley Exit", "North Gate" */
  name: z.string().min(1).max(80),
  /** Optional cardinal/relative direction */
  direction: z.string().max(20).optional(),
  /** Optional description shown on hover */
  description: z.string().max(200).optional(),
});
export type LocationPort = z.infer<typeof LocationPortSchema>;

/**
 * A location node in the map graph.
 * Contains the location's properties and visual layout position.
 */
export const LocationNodeSchema = z.object({
  /** Unique ID for this location */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1).max(160),
  /** Location type for hierarchy/zoom filtering */
  type: LocationTypeSchema,
  /** Parent location ID (null for root regions) */
  parentId: z.string().nullable(),
  /** Hierarchy depth for semantic zoom (0 = region, 1 = building, 2 = room) */
  depth: z.number().int().min(0).max(10),
  /** Brief summary (shown in node preview) */
  summary: z.string().max(320).optional(),
  /** Full description */
  description: z.string().optional(),
  /** Named exit/entrance ports */
  ports: z.array(LocationPortSchema).max(16).default([]),
  /** Tags for filtering and theming */
  tags: z.array(z.string().min(1)).max(32).optional(),
  /** Visual position in the editor (0-1 normalized coordinates) */
  position: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
    .optional(),
  /** Extended properties (region/building/room metadata) */
  properties: z.record(z.string(), z.unknown()).optional(),
});
export type LocationNode = z.infer<typeof LocationNodeSchema>;

// ============================================================================
// Connection Types
// ============================================================================

/**
 * A connection between two locations via specific ports.
 * Enables precise multi-exit navigation.
 */
export const LocationConnectionSchema = z.object({
  /** Unique connection ID */
  id: z.string().min(1),
  /** Source location ID */
  fromLocationId: z.string().min(1),
  /** Source port ID (exit point) */
  fromPortId: z.string().min(1),
  /** Target location ID */
  toLocationId: z.string().min(1),
  /** Target port ID (entrance point) */
  toPortId: z.string().min(1),
  /** Is this a two-way connection? Default true. */
  bidirectional: z.boolean().default(true),
  /** Travel time in minutes (for time advancement) */
  travelMinutes: z.number().int().min(0).optional(),
  /** Is the connection locked? */
  locked: z.boolean().default(false),
  /** Reason for lock (shown to player) */
  lockReason: z.string().max(200).optional(),
  /** Connection label (shown on edge) */
  label: z.string().max(80).optional(),
});
export type LocationConnection = z.infer<typeof LocationConnectionSchema>;

// ============================================================================
// Map Container
// ============================================================================

/**
 * Complete location map containing nodes and connections.
 * Can be a template (reusable) or an instance (session-specific).
 */
export const LocationMapSchema = z.object({
  /** Unique map ID */
  id: z.string().min(1),
  /** Map display name */
  name: z.string().min(1).max(160),
  /** Optional description */
  description: z.string().max(500).optional(),
  /** Setting this map belongs to */
  settingId: z.string().min(1),
  /** Is this a reusable template? */
  isTemplate: z.boolean().default(true),
  /** If instance, ID of source template */
  sourceTemplateId: z.string().optional(),
  /** All location nodes */
  nodes: z.array(LocationNodeSchema).default([]),
  /** All connections between locations */
  connections: z.array(LocationConnectionSchema).default([]),
  /** Default starting location ID */
  defaultStartLocationId: z.string().optional(),
  /** Map-level tags */
  tags: z.array(z.string().min(1)).max(32).optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime().optional(),
  /** Last update timestamp */
  updatedAt: z.string().datetime().optional(),
});
export type LocationMap = z.infer<typeof LocationMapSchema>;

// ============================================================================
// Prefabs
// ============================================================================

/**
 * A reusable location prefab - a saved subgraph that can be dropped into maps.
 * Examples: "Tavern" (common room + kitchen + guest rooms), "Shop" (storefront + back room)
 */
export const LocationPrefabSchema = z.object({
  /** Unique prefab ID */
  id: z.string().min(1),
  /** Prefab name */
  name: z.string().min(1).max(160),
  /** Description of what this prefab provides */
  description: z.string().max(500).optional(),
  /** Category for organization */
  category: z.string().max(50).optional(),
  /** Nodes in this prefab (relative positions) */
  nodes: z.array(LocationNodeSchema),
  /** Internal connections */
  connections: z.array(LocationConnectionSchema),
  /** Port IDs that can connect to parent location */
  entryPoints: z.array(z.string().min(1)),
  /** Tags for filtering */
  tags: z.array(z.string().min(1)).max(32).optional(),
});
export type LocationPrefab = z.infer<typeof LocationPrefabSchema>;

// ============================================================================
// Editor State Types
// ============================================================================

/**
 * Zoom level for semantic filtering in the graph view.
 */
export const SemanticZoomLevelSchema = z.enum(['all', 'region', 'building', 'room']);
export type SemanticZoomLevel = z.infer<typeof SemanticZoomLevelSchema>;

/**
 * Editor viewport state (for persistence).
 */
export const ViewportStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
});
export type ViewportState = z.infer<typeof ViewportStateSchema>;
