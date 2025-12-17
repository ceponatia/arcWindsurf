import { z } from 'zod';

/**
 * Location Schema
 *
 * Defines the structure for individual, reusable location definitions.
 * Locations are stored in the `locations` table and can be referenced
 * by multiple prefabs.
 */

// ============================================================================
// Location Types
// ============================================================================

/** Type of location in the hierarchy */
export const LocationTypeSchema = z.enum(['region', 'building', 'room']);
export type LocationType = z.infer<typeof LocationTypeSchema>;

/**
 * A reusable location definition.
 * These are individual locations that can be placed into prefabs.
 */
export const LocationSchema = z.object({
  /** Unique ID */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1).max(160),
  /** Location type for hierarchy/zoom filtering */
  type: LocationTypeSchema,
  /** Description used by LLM when narrating (not verbatim) */
  description: z.string().max(2000).optional(),
  /** Brief summary shown in UI preview */
  summary: z.string().max(320).optional(),
  /** Is this a template/built-in location? */
  isTemplate: z.boolean().default(false),
  /** Tags for filtering and theming */
  tags: z.array(z.string().min(1)).max(32).optional(),
  /** Extended properties (capacity, atmosphere, etc.) */
  properties: z.record(z.string(), z.unknown()).optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime().optional(),
  /** Last update timestamp */
  updatedAt: z.string().datetime().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

/**
 * Input schema for creating a new location
 */
export const CreateLocationSchema = LocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateLocation = z.infer<typeof CreateLocationSchema>;

/**
 * Input schema for updating a location
 */
export const UpdateLocationSchema = CreateLocationSchema.partial();
export type UpdateLocation = z.infer<typeof UpdateLocationSchema>;

// ============================================================================
// Location Port (Exit/Entrance)
// ============================================================================

/** Cardinal directions for exits */
export const ExitDirectionSchema = z.enum([
  'north',
  'south',
  'east',
  'west',
  'up',
  'down',
  'in',
  'out',
]);
export type ExitDirection = z.infer<typeof ExitDirectionSchema>;

/**
 * An exit/entrance point on a location instance.
 *
 * Exits define navigable paths FROM this location TO another.
 * When a connection is drawn between two locations on the canvas,
 * exits are automatically created on both ends with appropriate
 * directions and target references.
 *
 * Example: Drawing Foyer → Kitchen (north) creates:
 *   - Foyer exit: { direction: 'north', targetInstanceId: 'kitchen-inst-id' }
 *   - Kitchen exit: { direction: 'south', targetInstanceId: 'foyer-inst-id' }
 */
export const LocationPortSchema = z.object({
  /** Unique ID within the instance */
  id: z.string().min(1),
  /** Display name: "Front Door", "Back Alley Exit", "North Gate" */
  name: z.string().min(1).max(80),
  /** Cardinal direction of this exit */
  direction: ExitDirectionSchema.optional(),
  /** Target location instance ID this exit leads to */
  targetInstanceId: z.string().optional(),
  /** Target port ID on the destination (for bidirectional reference) */
  targetPortId: z.string().optional(),
  /** Optional description shown on hover */
  description: z.string().max(200).optional(),
  /** Is this exit locked? Defaults to false if not specified. */
  locked: z.boolean().optional(),
  /** Reason for lock (e.g., "Requires key") */
  lockReason: z.string().max(200).optional(),
  /** Travel time in minutes */
  travelMinutes: z.number().int().min(0).optional(),
});
export type LocationPort = z.infer<typeof LocationPortSchema>;

// ============================================================================
// Prefab Location Instance
// ============================================================================

/**
 * A location placed within a prefab, with position and relationship data.
 */
export const PrefabLocationInstanceSchema = z.object({
  /** Unique instance ID */
  id: z.string().min(1),
  /** Prefab this instance belongs to */
  prefabId: z.string().min(1),
  /** Reference to the location definition */
  locationId: z.string().min(1),
  /** Visual position in editor (0-1 normalized coordinates) */
  position: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  /** Parent instance ID for hierarchy */
  parentInstanceId: z.string().nullable(),
  /** Hierarchy depth */
  depth: z.number().int().min(0).max(10),
  /** Named ports/exits for this instance */
  ports: z.array(LocationPortSchema).max(16).default([]),
  /** Instance-specific overrides */
  overrides: z.record(z.string(), z.unknown()).optional(),
});
export type PrefabLocationInstance = z.infer<typeof PrefabLocationInstanceSchema>;

// ============================================================================
// Prefab Connection
// ============================================================================

/** Direction type for connections */
export const ConnectionDirectionSchema = z.enum([
  'north',
  'south',
  'east',
  'west',
  'up',
  'down',
  'horizontal', // Auto-inferred from position
  'vertical', // For stairs/ladders
]);
export type ConnectionDirection = z.infer<typeof ConnectionDirectionSchema>;

/**
 * A connection between two location instances in a prefab.
 */
export const PrefabConnectionSchema = z.object({
  /** Unique connection ID */
  id: z.string().min(1),
  /** Prefab this connection belongs to */
  prefabId: z.string().min(1),
  /** Source instance ID */
  fromInstanceId: z.string().min(1),
  /** Source port ID (exit point) */
  fromPortId: z.string().default('default'),
  /** Target instance ID */
  toInstanceId: z.string().min(1),
  /** Target port ID (entrance point) */
  toPortId: z.string().default('default'),
  /** Connection direction */
  direction: ConnectionDirectionSchema.default('horizontal'),
  /** Is this a two-way connection? */
  bidirectional: z.boolean().default(true),
  /** Travel time in minutes */
  travelMinutes: z.number().int().min(0).optional(),
  /** Is the connection locked? */
  locked: z.boolean().default(false),
  /** Reason for lock */
  lockReason: z.string().max(200).optional(),
  /** Display label on the connection */
  label: z.string().max(80).optional(),
});
export type PrefabConnection = z.infer<typeof PrefabConnectionSchema>;

// ============================================================================
// Prefab Entry Point
// ============================================================================

/**
 * A special node marking an entry/exit point on a prefab's boundary.
 * This allows the prefab to connect to external locations when placed on a map.
 */
export const PrefabEntryPointSchema = z.object({
  /** Unique entry point ID */
  id: z.string().min(1),
  /** Prefab this entry point belongs to */
  prefabId: z.string().min(1),
  /** The location instance this connects to */
  targetInstanceId: z.string().min(1),
  /** The port on the target instance */
  targetPortId: z.string().default('default'),
  /** Display name: "Main Entrance", "Back Door", etc. */
  name: z.string().min(1).max(80),
  /** Which direction this entry comes from */
  direction: ConnectionDirectionSchema.optional(),
  /** Visual position of the entry node on canvas */
  position: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
});
export type PrefabEntryPoint = z.infer<typeof PrefabEntryPointSchema>;

// ============================================================================
// Location Prefab (Refactored)
// ============================================================================

/**
 * A location prefab - a collection of locations with their relationships.
 * Prefabs can be dropped onto maps and connected via entry points.
 */
export const LocationPrefabV2Schema = z.object({
  /** Unique prefab ID */
  id: z.string().min(1),
  /** Prefab name */
  name: z.string().min(1).max(160),
  /** Description of what this prefab provides */
  description: z.string().max(500).optional(),
  /** Category for organization */
  category: z.string().max(50).optional(),
  /** Location instances in this prefab */
  instances: z.array(PrefabLocationInstanceSchema),
  /** Connections between instances */
  connections: z.array(PrefabConnectionSchema),
  /** Entry/exit points on the prefab boundary */
  entryPoints: z.array(PrefabEntryPointSchema),
  /** Tags for filtering */
  tags: z.array(z.string().min(1)).max(32).optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime().optional(),
  /** Last update timestamp */
  updatedAt: z.string().datetime().optional(),
});
export type LocationPrefabV2 = z.infer<typeof LocationPrefabV2Schema>;

/**
 * Input schema for creating a new prefab
 */
export const CreatePrefabV2Schema = LocationPrefabV2Schema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePrefabV2 = z.infer<typeof CreatePrefabV2Schema>;

// ============================================================================
// Canvas Node Types for React Flow
// ============================================================================

/** Node types that can appear on the canvas */
export const CanvasNodeTypeSchema = z.enum([
  'location', // A placed location instance
  'entry', // An entry/exit point node
]);
export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;

/**
 * A node on the canvas - could be a location or an entry point
 */
export const CanvasNodeSchema = z.discriminatedUnion('nodeType', [
  z.object({
    nodeType: z.literal('location'),
    instanceId: z.string().min(1),
    location: LocationSchema,
    instance: PrefabLocationInstanceSchema,
  }),
  z.object({
    nodeType: z.literal('entry'),
    entryPoint: PrefabEntryPointSchema,
  }),
]);
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
