/**
 * Location Builder Store
 * Zustand store for managing location map editing state.
 */
import { create } from 'zustand';
import type {
  LocationMap,
  LocationNode,
  LocationConnection,
  LocationType,
  SemanticZoomLevel,
} from '@minimal-rpg/schemas';
import type {
  LocationBuilderStore,
  EditMode,
  Selection,
  Viewport,
  LocationMapResponse,
} from './types.js';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

/** Generate a unique ID */
function generateId(): string {
  return `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Initial viewport state */
const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };

/** Create the location builder store */
export const useLocationBuilderStore = create<LocationBuilderStore>((set, get) => ({
  // Initial state
  map: null,
  mode: 'select',
  selection: null,
  pendingNode: null,
  pendingEdge: null,
  zoomLevel: 'all',
  viewport: initialViewport,
  isDirty: false,
  isLoading: false,
  error: null,

  // Map operations
  loadMap: async (mapId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/location-maps/${mapId}`);
      const data: LocationMapResponse = await res.json();
      if (data.ok && data.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: data.error ?? 'Failed to load map', isLoading: false });
      }
    } catch (err) {
      set({ error: 'Network error loading map', isLoading: false });
    }
  },

  createMap: async (settingId: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/location-maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingId, name, nodes: [], connections: [] }),
      });
      const data: LocationMapResponse = await res.json();
      if (data.ok && data.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: data.error ?? 'Failed to create map', isLoading: false });
      }
    } catch (err) {
      set({ error: 'Network error creating map', isLoading: false });
    }
  },

  saveMap: async () => {
    const { map } = get();
    if (!map) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/location-maps/${map.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: map.name,
          description: map.description,
          nodes: map.nodes,
          connections: map.connections,
          defaultStartLocationId: map.defaultStartLocationId,
          tags: map.tags,
        }),
      });
      const data: LocationMapResponse = await res.json();
      if (data.ok && data.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: data.error ?? 'Failed to save map', isLoading: false });
      }
    } catch (err) {
      set({ error: 'Network error saving map', isLoading: false });
    }
  },

  clearMap: () => {
    set({
      map: null,
      mode: 'select',
      selection: null,
      pendingNode: null,
      pendingEdge: null,
      zoomLevel: 'all',
      viewport: initialViewport,
      isDirty: false,
      isLoading: false,
      error: null,
    });
  },

  // Node operations
  addNode: (node) => {
    const { map } = get();
    if (!map) return;

    const newNode: LocationNode = {
      ...node,
      id: generateId(),
    };

    set({
      map: {
        ...map,
        nodes: [...map.nodes, newNode],
      },
      isDirty: true,
      pendingNode: null,
    });
  },

  updateNode: (nodeId, updates) => {
    const { map } = get();
    if (!map) return;

    set({
      map: {
        ...map,
        nodes: map.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      },
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    const { map, selection } = get();
    if (!map) return;

    // Also delete connections involving this node
    const newConnections = map.connections.filter(
      (c) => c.fromLocationId !== nodeId && c.toLocationId !== nodeId
    );

    // Clear selection if deleted node was selected
    const newSelection = selection?.type === 'node' && selection.id === nodeId ? null : selection;

    set({
      map: {
        ...map,
        nodes: map.nodes.filter((n) => n.id !== nodeId),
        connections: newConnections,
      },
      selection: newSelection,
      isDirty: true,
    });
  },

  // Connection operations
  addConnection: (conn) => {
    const { map } = get();
    if (!map) return;

    const newConnection: LocationConnection = {
      ...conn,
      id: generateId(),
    };

    set({
      map: {
        ...map,
        connections: [...map.connections, newConnection],
      },
      isDirty: true,
      pendingEdge: null,
    });
  },

  updateConnection: (connId, updates) => {
    const { map } = get();
    if (!map) return;

    set({
      map: {
        ...map,
        connections: map.connections.map((c) => (c.id === connId ? { ...c, ...updates } : c)),
      },
      isDirty: true,
    });
  },

  deleteConnection: (connId) => {
    const { map, selection } = get();
    if (!map) return;

    // Clear selection if deleted connection was selected
    const newSelection = selection?.type === 'edge' && selection.id === connId ? null : selection;

    set({
      map: {
        ...map,
        connections: map.connections.filter((c) => c.id !== connId),
      },
      selection: newSelection,
      isDirty: true,
    });
  },

  // Editor state
  setMode: (mode: EditMode) => {
    set({ mode, pendingNode: null, pendingEdge: null });
  },

  setSelection: (selection: Selection | null) => {
    set({ selection });
  },

  setZoomLevel: (zoomLevel: SemanticZoomLevel) => {
    set({ zoomLevel });
  },

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },

  // Pending operations
  startAddNode: (type: LocationType, parentId: string | null) => {
    set({
      mode: 'add-node',
      pendingNode: { type, parentId, name: '' },
    });
  },

  cancelAddNode: () => {
    set({ mode: 'select', pendingNode: null });
  },

  startAddEdge: (fromLocationId: string, fromPortId: string) => {
    set({
      mode: 'add-edge',
      pendingEdge: { fromLocationId, fromPortId },
    });
  },

  cancelAddEdge: () => {
    set({ mode: 'select', pendingEdge: null });
  },
}));
