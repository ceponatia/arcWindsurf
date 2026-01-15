/**
 * Location Prefab Builder - Types
 * Types for the canvas-based prefab editor.
 */
import type {
  LocationV2 as Location,
  LocationType,
  LocationPortV2 as LocationPort,
  ExitDirection,
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
  ConnectionDirection,
} from '@minimal-rpg/schemas';
import type { Node, XYPosition } from '@xyflow/react';

// Re-export schema types for other files in this feature
export type {
  Location,
  LocationType,
  LocationPort,
  ExitDirection,
  ConnectionDirection,
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
};

// ============================================================================
// Canvas Node Types
// ============================================================================

/** Base data for all canvas nodes */
export interface BaseNodeData extends Record<string, unknown> {
  selected: boolean;
}

/** Data for a location node on the canvas */
export interface LocationNodeData extends BaseNodeData {
  nodeType: 'location';
  location: Location;
  instance: PrefabLocationInstance;
}

/** Data for an entry/exit point node on the canvas */
export interface EntryNodeData extends BaseNodeData {
  nodeType: 'entry';
  entryPoint: PrefabEntryPoint;
}

/** Union type for all canvas node data */
export type CanvasNodeData = LocationNodeData | EntryNodeData;

/** Canvas node with typed data */
export type CanvasNode = Node<CanvasNodeData>;

// ============================================================================
// Store State
// ============================================================================

/** A draggable item from the location bucket */
export interface DraggableLocation {
  id: string;
  location: Location;
  isTemplate: boolean;
}

/** Connection being drawn */
export interface PendingConnection {
  fromInstanceId: string;
  fromPortId: string;
  fromPosition: XYPosition;
}

/** Store state for the prefab builder */
export interface PrefabBuilderState {
  // Prefab metadata
  prefabId: string | null;
  prefabName: string;
  prefabDescription: string;
  prefabCategory: string;

  // Canvas data
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  entryPoints: PrefabEntryPoint[];

  // Location definitions (loaded from DB)
  locations: Map<string, Location>;

  // Available locations for the bucket
  availableLocations: Location[];
  templateLocations: Location[];

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  pendingConnection: PendingConnection | null;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Viewport
  viewport: { x: number; y: number; zoom: number };
}

/** Store actions */
export interface PrefabBuilderActions {
  // Initialization
  createNewPrefab: () => void;
  loadPrefab: (prefabId: string) => Promise<void>;
  loadLocations: () => Promise<void>;

  // Prefab metadata
  setPrefabName: (name: string) => void;
  setPrefabDescription: (description: string) => void;
  setPrefabCategory: (category: string) => void;

  // Location management
  addLocationInstance: (location: Location, position: XYPosition) => string;
  addLocationInstanceWithAutoLink: (location: Location, position: XYPosition) => string;
  removeInstance: (instanceId: string) => void;
  updateInstancePosition: (instanceId: string, position: XYPosition) => void;
  updateInstancePorts: (instanceId: string, ports: LocationPort[]) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;

  // Entry points
  addEntryPoint: (name: string, position: XYPosition) => string;
  removeEntryPoint: (entryPointId: string) => void;
  updateEntryPointPosition: (entryPointId: string, position: XYPosition) => void;
  connectEntryPoint: (entryPointId: string, targetInstanceId: string, targetPortId: string) => void;

  // Connections
  addConnection: (
    fromInstanceId: string,
    fromPortId: string,
    toInstanceId: string,
    toPortId: string,
    direction: ConnectionDirection
  ) => void;
  removeConnection: (connectionId: string) => void;
  updateConnection: (connectionId: string, updates: Partial<PrefabConnection>) => void;

  // Auto-linking
  autoLinkByPosition: (instanceId: string, position: XYPosition) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // Pending connection
  startConnection: (fromInstanceId: string, fromPortId: string, fromPosition: XYPosition) => void;
  cancelConnection: () => void;
  completeConnection: (toInstanceId: string, toPortId: string) => void;

  // Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  // Persistence
  savePrefab: () => Promise<boolean>;
  reset: () => void;
}

/** Combined store type */
export type PrefabBuilderStore = PrefabBuilderState & PrefabBuilderActions;

// ============================================================================
// Component Props
// ============================================================================

/** Props for the main builder component */
export interface PrefabBuilderProps {
  /** Existing prefab ID to edit (null for new) */
  prefabId?: string | null;
  /** Called when saved successfully */
  onSave?: () => void;
  /** Called when user wants to go back */
  onBack?: () => void;
}

/** Props for the location bucket panel */
export interface LocationBucketProps {
  locations: Location[];
  templateLocations: Location[];
  isLoading: boolean;
  onRefresh: () => void;
  onAddBlankNode: () => void;
  onDragBlankNode: () => Location;
}

/** Props for the canvas component */
export interface PrefabCanvasProps {
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  entryPoints: PrefabEntryPoint[];
  locations: Map<string, Location>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  pendingConnection: PendingConnection | null;
  viewport: { x: number; y: number; zoom: number };
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onNodeDragStop: (nodeId: string, position: XYPosition) => void;
  onConnect: (fromId: string, fromPort: string, toId: string, toPort: string) => void;
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onDrop: (location: Location, position: XYPosition) => void;
  onAddEntryPoint: (position: XYPosition) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

/** Props for the properties panel */
export interface PropertiesPanelProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  instances: PrefabLocationInstance[];
  connections: PrefabConnection[];
  entryPoints: PrefabEntryPoint[];
  locations: Map<string, Location>;
  autoFocusName?: boolean;
  onUpdateInstance: (instanceId: string, ports: LocationPort[]) => void;
  onUpdateLocation: (locationId: string, updates: Partial<Location>) => void;
  onUpdateConnection: (connectionId: string, updates: Partial<PrefabConnection>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onAutoFocusHandled?: () => void;
}

// ============================================================================
// Direction Calculation
// ============================================================================

/** Calculate direction based on relative position */
export function calculateDirection(fromPos: XYPosition, toPos: XYPosition): ConnectionDirection {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;

  // Use absolute values to determine primary direction
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Determine cardinal direction based on dominant axis
  if (absDx > absDy) {
    return dx > 0 ? 'east' : 'west';
  } else {
    return dy > 0 ? 'south' : 'north';
  }
}

/** Get the opposite direction */
export function getOppositeDirection(dir: ConnectionDirection): ConnectionDirection {
  switch (dir) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'horizontal':
      return 'horizontal';
    case 'vertical':
      return 'vertical';
    default:
      return dir;
  }
}

/** Convert connection direction to exit direction (cardinal only) */
export function toExitDirection(dir: ConnectionDirection): ExitDirection | undefined {
  const validExitDirs: ExitDirection[] = ['north', 'south', 'east', 'west', 'up', 'down'];
  return validExitDirs.includes(dir as ExitDirection) ? (dir as ExitDirection) : undefined;
}

/** Get opposite exit direction */
export function getOppositeExitDirection(dir: ExitDirection): ExitDirection {
  switch (dir) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'in':
      return 'out';
    case 'out':
      return 'in';
    default:
      return dir;
  }
}

/** Check if a direction is vertical (uses top/bottom handles) */
export function isVerticalDirection(dir: ConnectionDirection): boolean {
  return dir === 'north' || dir === 'south' || dir === 'vertical' || dir === 'up' || dir === 'down';
}
