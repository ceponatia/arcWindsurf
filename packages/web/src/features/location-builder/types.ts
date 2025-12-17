/**
 * Location Builder Feature Types
 */
import type {
  LocationMap,
  LocationNode,
  LocationConnection,
  LocationPrefab,
  LocationType,
  SemanticZoomLevel,
} from '@minimal-rpg/schemas';

/** Active editing mode in the builder */
export type EditMode = 'select' | 'add-node' | 'add-edge' | 'pan';

/** Node being added */
export interface PendingNode {
  type: LocationType;
  parentId: string | null;
  name: string;
}

/** Edge being drawn */
export interface PendingEdge {
  fromLocationId: string;
  fromPortId: string;
}

/** Editor viewport state */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** Selected element in the builder */
export interface Selection {
  type: 'node' | 'edge';
  id: string;
}

/** Location builder state */
export interface LocationBuilderState {
  /** The current map being edited */
  map: LocationMap | null;

  /** Current editing mode */
  mode: EditMode;

  /** Selected element */
  selection: Selection | null;

  /** Node currently being added */
  pendingNode: PendingNode | null;

  /** Edge currently being drawn */
  pendingEdge: PendingEdge | null;

  /** Current semantic zoom level */
  zoomLevel: SemanticZoomLevel;

  /** Viewport state for graph view */
  viewport: Viewport;

  /** Dirty flag for unsaved changes */
  isDirty: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Loaded prefabs for the library */
  prefabs: LocationPrefab[];

  /** Whether the prefab library is loading */
  prefabsLoading: boolean;
}

/** Actions for the location builder store */
export interface LocationBuilderActions {
  // Map operations
  loadMap: (mapId: string) => Promise<void>;
  createMap: (settingId: string, name: string) => Promise<void>;
  saveMap: () => Promise<void>;
  clearMap: () => void;

  // Node operations
  addNode: (node: Omit<LocationNode, 'id'>) => void;
  updateNode: (nodeId: string, updates: Partial<LocationNode>) => void;
  deleteNode: (nodeId: string) => void;

  // Connection operations
  addConnection: (conn: Omit<LocationConnection, 'id'>) => void;
  updateConnection: (connId: string, updates: Partial<LocationConnection>) => void;
  deleteConnection: (connId: string) => void;

  // Editor state
  setMode: (mode: EditMode) => void;
  setSelection: (selection: Selection | null) => void;
  setZoomLevel: (level: SemanticZoomLevel) => void;
  setViewport: (viewport: Viewport) => void;

  // Pending operations
  startAddNode: (type: LocationType, parentId: string | null) => void;
  cancelAddNode: () => void;
  startAddEdge: (fromLocationId: string, fromPortId: string) => void;
  cancelAddEdge: () => void;

  // Prefab operations
  loadPrefabs: () => Promise<void>;
  saveAsPrefab: (
    nodeId: string,
    name: string,
    description?: string,
    category?: string
  ) => Promise<LocationPrefab | null>;
  deletePrefab: (prefabId: string) => Promise<boolean>;
  insertPrefab: (prefab: LocationPrefab, parentId: string | null, entryPointId: string) => void;
}

/** Combined store type */
export type LocationBuilderStore = LocationBuilderState & LocationBuilderActions;

/** Props for LocationBuilder component */
export interface LocationBuilderProps {
  /** Setting ID this map belongs to */
  settingId: string;
  /** Optional existing map ID to load */
  mapId?: string;
  /** Called when map is saved */
  onSave?: (map: LocationMap) => void;
  /** Called when builder is closed */
  onClose?: () => void;
}

/** Props for the hierarchy tree view */
export interface HierarchyTreeProps {
  nodes: LocationNode[];
  connections: LocationConnection[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onAddChild: (parentId: string | null, type: LocationType) => void;
  onDeleteNode: (nodeId: string) => void;
}

/** Props for the graph view */
export interface GraphViewProps {
  nodes: LocationNode[];
  connections: LocationConnection[];
  zoomLevel: SemanticZoomLevel;
  viewport: Viewport;
  selection: Selection | null;
  mode: EditMode;
  pendingEdge: PendingEdge | null;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onViewportChange: (viewport: Viewport) => void;
  onPortClick: (nodeId: string, portId: string) => void;
}

/** API response types */
export interface LocationMapListResponse {
  ok: boolean;
  maps?: {
    id: string;
    name: string;
    description?: string;
    settingId: string;
    isTemplate: boolean;
    nodeCount: number;
    connectionCount: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  }[];
  error?: string;
}

export interface LocationMapResponse {
  ok: boolean;
  map?: LocationMap;
  error?: string;
}

export interface LocationPrefabListResponse {
  ok: boolean;
  prefabs?: LocationPrefab[];
  error?: string;
}

export interface LocationPrefabResponse {
  ok: boolean;
  prefab?: LocationPrefab;
  error?: string;
}
