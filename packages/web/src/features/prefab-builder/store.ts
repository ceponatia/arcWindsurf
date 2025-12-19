/**
 * Location Prefab Builder - Store
 * Zustand store for the canvas-based prefab editor.
 */
import { create } from 'zustand';
import type {
  LocationV2 as Location,
  LocationPortV2 as LocationPort,
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
  ConnectionDirection,
} from '@minimal-rpg/schemas';
import type { XYPosition } from '@xyflow/react';
import type { PrefabBuilderStore } from './types.js';
import { calculateDirection, toExitDirection, getOppositeExitDirection } from './types.js';
import { API_BASE_URL } from '../../config.js';

const API_BASE = API_BASE_URL;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Generate a unique ID */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Capitalize first letter */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Initial state */
const initialState: Omit<PrefabBuilderStore, keyof import('./types.js').PrefabBuilderActions> = {
  prefabId: null,
  prefabName: '',
  prefabDescription: '',
  prefabCategory: '',
  instances: [],
  connections: [],
  entryPoints: [],
  locations: new Map(),
  availableLocations: [],
  templateLocations: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  pendingConnection: null,
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const usePrefabBuilderStore = create<PrefabBuilderStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Initialization
  // ============================================================================

  createNewPrefab: () => {
    set({
      ...initialState,
      prefabId: null,
      prefabName: 'New Prefab',
      isDirty: false,
    });
  },

  loadPrefab: async (prefabId: string) => {
    set({ isLoading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/location-prefabs/${prefabId}`);
      const data = (await res.json()) as unknown;

      if (!isRecord(data)) {
        set({ error: 'Invalid response loading prefab', isLoading: false });
        return;
      }

      const ok = data['ok'] === true;
      const prefabRaw = data['prefab'];
      if (!ok || !isRecord(prefabRaw)) {
        set({ error: getString(data['error']) ?? 'Failed to load prefab', isLoading: false });
        return;
      }

      const prefabName = getString(prefabRaw['name']) ?? '';
      const prefabDescription = getString(prefabRaw['description']);
      const prefabCategory = getString(prefabRaw['category']);

      const legacyNodes = Array.isArray(prefabRaw['nodes'])
        ? (prefabRaw['nodes'] as Location[])
        : [];

      // For now, handle legacy format - nodes stored inline
      // TODO: Migrate to new relational structure
      const instances: PrefabLocationInstance[] = legacyNodes.map(
        (
          node: Location & {
            position?: { x: number; y: number };
            parentId?: string | null;
            depth?: number;
            ports?: LocationPort[];
          },
          index: number
        ) => ({
          id: generateId('inst'),
          prefabId,
          locationId: node.id,
          position: node.position ?? {
            x: (index % 4) * 0.2 + 0.1,
            y: Math.floor(index / 4) * 0.2 + 0.1,
          },
          parentInstanceId: null,
          depth: node.depth ?? 0,
          ports: node.ports ?? [],
          overrides: {},
        })
      );

      // Store locations in the map
      const locationsMap = new Map<string, Location>();
      legacyNodes.forEach((node: Location) => {
        locationsMap.set(node.id, node);
      });

      const legacyConnectionsRaw = Array.isArray(prefabRaw['connections'])
        ? (prefabRaw['connections'] as unknown[])
        : [];

      // Convert legacy connections
      const connections: PrefabConnection[] = legacyConnectionsRaw.filter(isRecord).map((conn) => {
        const connId = getString(conn['id']) ?? generateId('conn');
        const fromLocationId = getString(conn['fromLocationId']) ?? '';
        const toLocationId = getString(conn['toLocationId']) ?? '';

        const fromInst = instances.find((i) => i.locationId === fromLocationId);
        const toInst = instances.find((i) => i.locationId === toLocationId);
        return {
          id: connId,
          prefabId,
          fromInstanceId: fromInst?.id ?? '',
          fromPortId: 'default',
          toInstanceId: toInst?.id ?? '',
          toPortId: 'default',
          direction: 'horizontal' as ConnectionDirection,
          bidirectional: true,
          locked: false,
        };
      });

      const entryPointsRaw = Array.isArray(prefabRaw['entryPoints'])
        ? (prefabRaw['entryPoints'] as unknown[])
        : [];
      const legacyEntryPoints = entryPointsRaw.filter((ep): ep is string => typeof ep === 'string');

      // Convert entry points
      const entryPoints: PrefabEntryPoint[] = legacyEntryPoints.map((ep, index: number) => {
        const targetInst = instances.find((i) => i.locationId === ep) ?? instances[0];
        return {
          id: generateId('entry'),
          prefabId,
          targetInstanceId: targetInst?.id ?? '',
          targetPortId: 'default',
          name: `Entry ${index + 1}`,
          position: { x: 0.05, y: 0.1 + index * 0.1 },
        };
      });

      set({
        prefabId,
        prefabName,
        prefabDescription: prefabDescription ?? '',
        prefabCategory: prefabCategory ?? '',
        instances,
        connections,
        entryPoints,
        locations: locationsMap,
        isDirty: false,
        isLoading: false,
      });
    } catch (err) {
      console.error('[PrefabBuilder] Error loading prefab:', err);
      set({ error: 'Network error loading prefab', isLoading: false });
    }
  },

  loadLocations: async () => {
    set({ isLoading: true });

    try {
      const res = await fetch(`${API_BASE}/locations`);
      const data = (await res.json()) as unknown;

      if (!isRecord(data)) {
        set({ isLoading: false });
        return;
      }

      if (data['ok'] === true && Array.isArray(data['locations'])) {
        const all = data['locations'] as Location[];
        const templates = all.filter((l) => l.isTemplate);
        const available = all.filter((l) => !l.isTemplate);

        // Add to locations map
        const locationsMap = new Map(get().locations);
        all.forEach((loc) => locationsMap.set(loc.id, loc));

        set({
          availableLocations: available,
          templateLocations: templates,
          locations: locationsMap,
          isLoading: false,
        });
      } else {
        // If locations endpoint doesn't exist yet, use empty arrays
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[PrefabBuilder] Error loading locations:', err);
      set({ isLoading: false });
    }
  },

  // ============================================================================
  // Prefab Metadata
  // ============================================================================

  setPrefabName: (name: string) => {
    set({ prefabName: name, isDirty: true });
  },

  setPrefabDescription: (description: string) => {
    set({ prefabDescription: description, isDirty: true });
  },

  setPrefabCategory: (category: string) => {
    set({ prefabCategory: category, isDirty: true });
  },

  // ============================================================================
  // Location Management
  // ============================================================================

  addLocationInstance: (location: Location, position: XYPosition) => {
    const { prefabId, locations, instances } = get();
    const instanceId = generateId('inst');

    // Add location to map if not present
    const newLocations = new Map(locations);
    if (!newLocations.has(location.id)) {
      newLocations.set(location.id, location);
    }

    // Normalize position to 0-1
    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    const instance: PrefabLocationInstance = {
      id: instanceId,
      prefabId: prefabId ?? '',
      locationId: location.id,
      position: normalizedPosition,
      parentInstanceId: null,
      depth: 0,
      ports: [
        { id: `${instanceId}-default`, name: 'Main', direction: undefined, description: undefined },
      ],
      overrides: {},
    };

    set({
      instances: [...instances, instance],
      locations: newLocations,
      isDirty: true,
    });

    return instanceId;
  },

  addLocationInstanceWithAutoLink: (location: Location, position: XYPosition) => {
    const instanceId = get().addLocationInstance(location, position);
    // Auto-link to nearby nodes
    get().autoLinkByPosition(instanceId, position);
    return instanceId;
  },

  removeInstance: (instanceId: string) => {
    const { instances, connections, entryPoints } = get();

    // Remove connections involving this instance
    const newConnections = connections.filter(
      (c) => c.fromInstanceId !== instanceId && c.toInstanceId !== instanceId
    );

    // Remove entry points targeting this instance
    const newEntryPoints = entryPoints.filter((e) => e.targetInstanceId !== instanceId);

    set({
      instances: instances.filter((i) => i.id !== instanceId),
      connections: newConnections,
      entryPoints: newEntryPoints,
      selectedNodeId: get().selectedNodeId === instanceId ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  updateInstancePosition: (instanceId: string, position: XYPosition) => {
    const { instances } = get();

    // Normalize to 0-1
    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    set({
      instances: instances.map((i) =>
        i.id === instanceId ? { ...i, position: normalizedPosition } : i
      ),
      isDirty: true,
    });
  },

  updateInstancePorts: (instanceId: string, ports: LocationPort[]) => {
    const { instances } = get();
    set({
      instances: instances.map((i) => (i.id === instanceId ? { ...i, ports } : i)),
      isDirty: true,
    });
  },

  updateLocation: (locationId: string, updates: Partial<Location>) => {
    const { locations } = get();
    const existing = locations.get(locationId);
    if (!existing) return;

    const newLocations = new Map(locations);
    newLocations.set(locationId, { ...existing, ...updates });

    set({
      locations: newLocations,
      isDirty: true,
    });
  },

  // ============================================================================
  // Entry Points
  // ============================================================================

  addEntryPoint: (name: string, position: XYPosition) => {
    const { prefabId, entryPoints } = get();
    const entryPointId = generateId('entry');

    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    const entryPoint: PrefabEntryPoint = {
      id: entryPointId,
      prefabId: prefabId ?? '',
      targetInstanceId: '',
      targetPortId: 'default',
      name,
      position: normalizedPosition,
    };

    set({
      entryPoints: [...entryPoints, entryPoint],
      isDirty: true,
    });

    return entryPointId;
  },

  removeEntryPoint: (entryPointId: string) => {
    const { entryPoints } = get();
    set({
      entryPoints: entryPoints.filter((e) => e.id !== entryPointId),
      selectedNodeId: get().selectedNodeId === entryPointId ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  updateEntryPointPosition: (entryPointId: string, position: XYPosition) => {
    const { entryPoints } = get();

    const normalizedPosition = {
      x: Math.max(0, Math.min(1, position.x / 1000)),
      y: Math.max(0, Math.min(1, position.y / 1000)),
    };

    set({
      entryPoints: entryPoints.map((e) =>
        e.id === entryPointId ? { ...e, position: normalizedPosition } : e
      ),
      isDirty: true,
    });
  },

  connectEntryPoint: (entryPointId: string, targetInstanceId: string, targetPortId: string) => {
    const { entryPoints } = get();
    set({
      entryPoints: entryPoints.map((e) =>
        e.id === entryPointId ? { ...e, targetInstanceId, targetPortId } : e
      ),
      isDirty: true,
    });
  },

  // ============================================================================
  // Connections
  // ============================================================================

  addConnection: (
    fromInstanceId: string,
    fromPortId: string,
    toInstanceId: string,
    toPortId: string,
    direction: ConnectionDirection
  ) => {
    const { prefabId, connections, instances, locations } = get();

    // Check if connection already exists
    const exists = connections.some(
      (c) =>
        (c.fromInstanceId === fromInstanceId && c.toInstanceId === toInstanceId) ||
        (c.fromInstanceId === toInstanceId && c.toInstanceId === fromInstanceId)
    );

    if (exists) return;

    // Get the exit direction (cardinal) from the connection direction
    const exitDir = toExitDirection(direction);
    const oppositeExitDir = exitDir ? getOppositeExitDirection(exitDir) : undefined;

    // Find instances and locations to get names for the exit labels
    const fromInstance = instances.find((i) => i.id === fromInstanceId);
    const toInstance = instances.find((i) => i.id === toInstanceId);
    const fromLocation = fromInstance ? locations.get(fromInstance.locationId) : undefined;
    const toLocation = toInstance ? locations.get(toInstance.locationId) : undefined;

    // Auto-create exits on both instances
    if (fromInstance && toInstance) {
      const fromExitId = generateId('exit');
      const toExitId = generateId('exit');

      // Create exit on "from" instance pointing to "to" instance
      const fromExit: LocationPort = {
        id: fromExitId,
        name: exitDir ? capitalize(exitDir) : `To ${toLocation?.name ?? 'Unknown'}`,
        direction: exitDir,
        targetInstanceId: toInstanceId,
        targetPortId: toExitId,
        locked: false,
      };

      // Create exit on "to" instance pointing back to "from" instance
      const toExit: LocationPort = {
        id: toExitId,
        name: oppositeExitDir
          ? capitalize(oppositeExitDir)
          : `To ${fromLocation?.name ?? 'Unknown'}`,
        direction: oppositeExitDir,
        targetInstanceId: fromInstanceId,
        targetPortId: fromExitId,
        locked: false,
      };

      // Update instances with new exits
      const updatedInstances = instances.map((inst) => {
        if (inst.id === fromInstanceId) {
          return { ...inst, ports: [...(inst.ports ?? []), fromExit] };
        }
        if (inst.id === toInstanceId) {
          return { ...inst, ports: [...(inst.ports ?? []), toExit] };
        }
        return inst;
      });

      const connection: PrefabConnection = {
        id: generateId('conn'),
        prefabId: prefabId ?? '',
        fromInstanceId,
        fromPortId: fromExitId, // Use the newly created exit
        toInstanceId,
        toPortId: toExitId, // Use the newly created exit
        direction,
        bidirectional: true,
        locked: false,
      };

      set({
        instances: updatedInstances,
        connections: [...connections, connection],
        isDirty: true,
      });
    } else {
      // Fallback: just create the connection without auto-exits
      const connection: PrefabConnection = {
        id: generateId('conn'),
        prefabId: prefabId ?? '',
        fromInstanceId,
        fromPortId,
        toInstanceId,
        toPortId,
        direction,
        bidirectional: true,
        locked: false,
      };

      set({
        connections: [...connections, connection],
        isDirty: true,
      });
    }
  },

  removeConnection: (connectionId: string) => {
    const { connections, instances } = get();
    const connection = connections.find((c) => c.id === connectionId);

    // Also remove the associated exits from both instances
    let updatedInstances = instances;
    if (connection) {
      updatedInstances = instances.map((inst) => {
        if (inst.id === connection.fromInstanceId || inst.id === connection.toInstanceId) {
          // Remove exits that target the other side of this connection
          const otherInstanceId =
            inst.id === connection.fromInstanceId
              ? connection.toInstanceId
              : connection.fromInstanceId;
          return {
            ...inst,
            ports: (inst.ports ?? []).filter((p) => p.targetInstanceId !== otherInstanceId),
          };
        }
        return inst;
      });
    }

    set({
      instances: updatedInstances,
      connections: connections.filter((c) => c.id !== connectionId),
      selectedEdgeId: get().selectedEdgeId === connectionId ? null : get().selectedEdgeId,
      isDirty: true,
    });
  },

  updateConnection: (connectionId: string, updates: Partial<PrefabConnection>) => {
    const { connections } = get();
    set({
      connections: connections.map((c) => (c.id === connectionId ? { ...c, ...updates } : c)),
      isDirty: true,
    });
  },

  // ============================================================================
  // Auto-linking
  // ============================================================================

  autoLinkByPosition: (instanceId: string, position: XYPosition) => {
    const { instances, connections } = get();
    const newInstance = instances.find((i) => i.id === instanceId);
    if (!newInstance) return;

    // Find nearby instances (within threshold)
    const threshold = 200; // pixels

    for (const other of instances) {
      if (other.id === instanceId) continue;

      const otherPos = {
        x: other.position.x * 1000,
        y: other.position.y * 1000,
      };

      const dx = Math.abs(position.x - otherPos.x);
      const dy = Math.abs(position.y - otherPos.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < threshold) {
        // Check if connection already exists
        const exists = connections.some(
          (c) =>
            (c.fromInstanceId === instanceId && c.toInstanceId === other.id) ||
            (c.fromInstanceId === other.id && c.toInstanceId === instanceId)
        );

        if (!exists) {
          const direction = calculateDirection(position, otherPos);
          get().addConnection(instanceId, 'default', other.id, 'default', direction);
        }
      }
    }
  },

  // ============================================================================
  // Selection
  // ============================================================================

  setSelectedNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  setSelectedEdge: (edgeId: string | null) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedEdgeId: null });
  },

  // ============================================================================
  // Pending Connection
  // ============================================================================

  startConnection: (fromInstanceId: string, fromPortId: string, fromPosition: XYPosition) => {
    set({
      pendingConnection: { fromInstanceId, fromPortId, fromPosition },
    });
  },

  cancelConnection: () => {
    set({ pendingConnection: null });
  },

  completeConnection: (toInstanceId: string, toPortId: string) => {
    const { pendingConnection, instances } = get();
    if (!pendingConnection) return;

    const fromInst = instances.find((i) => i.id === pendingConnection.fromInstanceId);
    const toInst = instances.find((i) => i.id === toInstanceId);

    if (fromInst && toInst) {
      const fromPos = {
        x: fromInst.position.x * 1000,
        y: fromInst.position.y * 1000,
      };
      const toPos = {
        x: toInst.position.x * 1000,
        y: toInst.position.y * 1000,
      };

      const direction = calculateDirection(fromPos, toPos);
      get().addConnection(
        pendingConnection.fromInstanceId,
        pendingConnection.fromPortId,
        toInstanceId,
        toPortId,
        direction
      );
    }

    set({ pendingConnection: null });
  },

  // ============================================================================
  // Viewport
  // ============================================================================

  setViewport: (viewport: { x: number; y: number; zoom: number }) => {
    set({ viewport });
  },

  // ============================================================================
  // Persistence
  // ============================================================================

  savePrefab: async () => {
    const {
      prefabId,
      prefabName,
      prefabDescription,
      prefabCategory,
      instances,
      connections,
      entryPoints,
      locations,
    } = get();

    if (!prefabName.trim()) {
      set({ error: 'Prefab name is required' });
      return false;
    }

    set({ isSaving: true, error: null });

    try {
      // Convert to legacy format for now
      // TODO: Update API to use new relational structure
      const nodes = instances.map((inst) => {
        const loc = locations.get(inst.locationId);
        return {
          id: inst.locationId,
          name: loc?.name ?? 'Unknown',
          type: loc?.type ?? 'room',
          parentId: null,
          depth: inst.depth,
          position: inst.position,
          ports: inst.ports,
          summary: loc?.summary,
          description: loc?.description,
          tags: loc?.tags,
          properties: loc?.properties,
        };
      });

      const legacyConnections = connections.map((conn) => ({
        id: conn.id,
        fromLocationId: instances.find((i) => i.id === conn.fromInstanceId)?.locationId ?? '',
        toLocationId: instances.find((i) => i.id === conn.toInstanceId)?.locationId ?? '',
      }));

      const legacyEntryPoints = entryPoints
        .map((ep) => instances.find((i) => i.id === ep.targetInstanceId)?.locationId)
        .filter((id): id is string => !!id);

      const body = {
        name: prefabName.trim(),
        description: prefabDescription.trim() || undefined,
        category: prefabCategory.trim() || undefined,
        nodes,
        connections: legacyConnections,
        entryPoints: legacyEntryPoints.length > 0 ? legacyEntryPoints : ['default'],
      };

      const url = prefabId
        ? `${API_BASE}/location-prefabs/${prefabId}`
        : `${API_BASE}/location-prefabs`;

      const res = await fetch(url, {
        method: prefabId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as unknown;

      if (isRecord(data) && data['ok'] === true) {
        set({
          prefabId:
            (isRecord(data['prefab']) ? getString(data['prefab']['id']) : undefined) ?? prefabId,
          isDirty: false,
          isSaving: false,
        });
        return true;
      } else {
        const error = isRecord(data) ? getString(data['error']) : undefined;
        set({ error: error ?? 'Failed to save prefab', isSaving: false });
        return false;
      }
    } catch (err) {
      console.error('[PrefabBuilder] Error saving prefab:', err);
      set({ error: 'Network error saving prefab', isSaving: false });
      return false;
    }
  },

  reset: () => {
    set(initialState);
  },
}));
