/**
 * Location Builder Store
 * Zustand store for managing location map editing state.
 */
import { create } from 'zustand';
import type {
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
  LocationPrefabListResponse,
  LocationPrefabResponse,
} from './types.js';
import { API_BASE_URL } from '../../config.js';
import { generateLocalId } from '@minimal-rpg/utils';

const API_BASE = API_BASE_URL;

interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<FetchResult<T>> {
  const res = await fetch(path, init);
  const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (!data.ok) {
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'Request failed' };
  }
  return { ok: true, data: data as unknown as T };
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
  prefabs: [],
  prefabsLoading: false,

  // Map operations
  loadMap: async (mapId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { ok, data, error } = await fetchJson<LocationMapResponse>(
        `${API_BASE}/location-maps/${mapId}`
      );
      if (ok && data?.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: error ?? data?.error ?? 'Failed to load map', isLoading: false });
      }
    } catch (err) {
      void err;
      set({ error: 'Network error loading map', isLoading: false });
    }
  },

  createMap: async (settingId: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { ok, data, error } = await fetchJson<LocationMapResponse>(
        `${API_BASE}/location-maps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settingId, name, nodes: [], connections: [] }),
        }
      );
      if (ok && data?.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: error ?? data?.error ?? 'Failed to create map', isLoading: false });
      }
    } catch (err) {
      void err;
      set({ error: 'Network error creating map', isLoading: false });
    }
  },

  saveMap: async () => {
    const { map } = get();
    if (!map) return;

    set({ isLoading: true, error: null });
    try {
      const { ok, data, error } = await fetchJson<LocationMapResponse>(
        `${API_BASE}/location-maps/${map.id}`,
        {
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
        }
      );
      if (ok && data?.map) {
        set({ map: data.map, isDirty: false, isLoading: false });
      } else {
        set({ error: error ?? data?.error ?? 'Failed to save map', isLoading: false });
      }
    } catch (err) {
      void err;
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
      prefabs: [],
      prefabsLoading: false,
    });
  },

  // Node operations
  addNode: (node) => {
    const { map } = get();
    if (!map) return;

    const newNode: LocationNode = {
      ...node,
      id: generateLocalId('loc'),
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
      id: generateLocalId('conn'),
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

  // Prefab operations
  loadPrefabs: async () => {
    set({ prefabsLoading: true });
    try {
      const { ok, data, error } = await fetchJson<LocationPrefabListResponse>(
        `${API_BASE}/location-prefabs`
      );
      if (ok && data?.prefabs) {
        set({ prefabs: data.prefabs, prefabsLoading: false });
      } else {
        console.error('[LocationBuilder] Failed to load prefabs:', error ?? data?.error);
        set({ prefabsLoading: false });
      }
    } catch (err) {
      console.error('[LocationBuilder] Network error loading prefabs:', err);
      set({ prefabsLoading: false });
    }
  },

  saveAsPrefab: async (nodeId, name, description, category) => {
    const { map } = get();
    if (!map) return null;

    // Find the root node and collect all descendants
    const rootNode = map.nodes.find((n) => n.id === nodeId);
    if (!rootNode) return null;

    // Collect all nodes in this subtree
    const collectDescendants = (parentId: string): LocationNode[] => {
      const children = map.nodes.filter((n) => n.parentId === parentId);
      return children.flatMap((child) => [child, ...collectDescendants(child.id)]);
    };
    const subtreeNodes = [rootNode, ...collectDescendants(nodeId)];
    const subtreeNodeIds = new Set(subtreeNodes.map((n) => n.id));

    // Collect connections internal to this subtree
    const subtreeConnections = map.connections.filter(
      (c) => subtreeNodeIds.has(c.fromLocationId) && subtreeNodeIds.has(c.toLocationId)
    );

    // Find entry points - ports that connect to nodes outside this subtree
    const entryPointSet = new Set<string>();
    for (const conn of map.connections) {
      if (subtreeNodeIds.has(conn.fromLocationId) && !subtreeNodeIds.has(conn.toLocationId)) {
        entryPointSet.add(conn.fromPortId);
      }
      if (subtreeNodeIds.has(conn.toLocationId) && !subtreeNodeIds.has(conn.fromLocationId)) {
        entryPointSet.add(conn.toPortId);
      }
    }

    // If no entry points from connections, use the root node's ports
    const entryPoints =
      entryPointSet.size > 0 ? Array.from(entryPointSet) : rootNode.ports.map((p) => p.id);

    // Create ID mapping for new prefab
    const idMap = new Map<string, string>();
    subtreeNodes.forEach((n) => {
      idMap.set(n.id, generateLocalId('loc'));
    });

    // Clone nodes with new IDs and relative structure
    const prefabNodes: LocationNode[] = subtreeNodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      parentId: n.parentId ? (idMap.get(n.parentId) ?? null) : null,
      ports: n.ports.map((p) => ({ ...p, id: `${idMap.get(n.id)}-${p.id.split('-').pop()}` })),
    }));

    // Clone connections with new IDs
    const prefabConnections: LocationConnection[] = subtreeConnections.map((c) => ({
      ...c,
      id: generateLocalId('conn'),
      fromLocationId: idMap.get(c.fromLocationId)!,
      toLocationId: idMap.get(c.toLocationId)!,
    }));

    // Map entry points to new port IDs
    const subtreeNodeIdList = Array.from(subtreeNodeIds).sort((a, b) => b.length - a.length);
    const mappedEntryPoints = entryPoints.map((ep) => {
      const oldNodeId = subtreeNodeIdList.find((id) => ep === id || ep.startsWith(`${id}-`));
      if (!oldNodeId) return ep;

      const newNodeId = idMap.get(oldNodeId);
      if (!newNodeId) return ep;

      if (ep === oldNodeId) return newNodeId;

      const suffix = ep.slice(oldNodeId.length + 1);
      return `${newNodeId}-${suffix}`;
    });

    try {
      const { ok, data, error } = await fetchJson<LocationPrefabResponse>(
        `${API_BASE}/location-prefabs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            category,
            nodes: prefabNodes,
            connections: prefabConnections,
            entryPoints: mappedEntryPoints.length > 0 ? mappedEntryPoints : ['default'],
          }),
        }
      );
      if (ok && data?.prefab) {
        set({ prefabs: [...get().prefabs, data.prefab] });
        return data.prefab;
      }
      console.error('[LocationBuilder] Failed to save prefab:', error ?? data?.error);
      return null;
    } catch (err) {
      console.error('[LocationBuilder] Network error saving prefab:', err);
      return null;
    }
  },

  deletePrefab: async (prefabId) => {
    try {
      const res = await fetch(`${API_BASE}/location-prefabs/${prefabId}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        set({ prefabs: get().prefabs.filter((p) => p.id !== prefabId) });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LocationBuilder] Network error deleting prefab:', err);
      return false;
    }
  },

  insertPrefab: (prefab, parentId) => {
    const { map } = get();
    if (!map) return;

    // Create ID mapping for new instances
    const idMap = new Map<string, string>();
    prefab.nodes.forEach((n) => {
      idMap.set(n.id, generateLocalId('loc'));
    });

    // Find the root node of the prefab (node with no parentId or parentId not in prefab)
    const prefabNodeIds = new Set(prefab.nodes.map((n) => n.id));
    const rootPrefabNode = prefab.nodes.find((n) => !n.parentId || !prefabNodeIds.has(n.parentId));

    // Clone nodes with new IDs, setting root node's parent to the target parent
    const newNodes: LocationNode[] = prefab.nodes.map((n) => {
      const isRoot = n.id === rootPrefabNode?.id;
      const newParentId = isRoot ? parentId : (idMap.get(n.parentId ?? '') ?? null);
      const newDepth = isRoot
        ? (map.nodes.find((mn) => mn.id === parentId)?.depth ?? -1) + 1
        : n.depth;

      return {
        ...n,
        id: idMap.get(n.id)!,
        parentId: newParentId,
        depth: newDepth,
        ports: n.ports.map((p) => ({ ...p, id: `${idMap.get(n.id)}-${p.id.split('-').pop()}` })),
      };
    });

    // Clone connections with new IDs
    const newConnections: LocationConnection[] = prefab.connections.map((c) => ({
      ...c,
      id: generateLocalId('conn'),
      fromLocationId: idMap.get(c.fromLocationId)!,
      toLocationId: idMap.get(c.toLocationId)!,
    }));

    set({
      map: {
        ...map,
        nodes: [...map.nodes, ...newNodes],
        connections: [...map.connections, ...newConnections],
      },
      isDirty: true,
    });
  },
}));
