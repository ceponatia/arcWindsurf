/**
 * Prefab Builder Component
 * Main component for creating and editing location prefabs with drag & drop.
 */
import { useEffect, useCallback, useState } from 'react';
import { Save, ArrowLeft, Loader2, AlertCircle, Package } from 'lucide-react';
import type { XYPosition } from '@xyflow/react';
import { ReactFlowProvider } from '@xyflow/react';
import { usePrefabBuilderStore } from './store.js';
import { PrefabCanvas } from './PrefabCanvas.js';
import { LocationBucket } from './LocationBucket.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import type { Location, LocationPort, PrefabBuilderProps } from './types.js';
import { calculateDirection } from './types.js';

/** Main PrefabBuilder component */
export function PrefabBuilder({ prefabId, onSave, onBack }: PrefabBuilderProps) {
  // Store state and actions
  const {
    prefabName,
    prefabCategory,
    instances,
    connections,
    entryPoints,
    locations,
    availableLocations,
    templateLocations,
    selectedNodeId,
    selectedEdgeId,
    pendingConnection,
    isDirty,
    isLoading,
    isSaving,
    error,
    viewport,
    createNewPrefab,
    loadPrefab,
    loadLocations,
    setPrefabName,
    setPrefabCategory,
    addLocationInstance,
    removeInstance,
    updateInstancePosition,
    updateInstancePorts,
    updateLocation,
    addEntryPoint,
    removeEntryPoint,
    addConnection,
    removeConnection,
    updateConnection,
    setSelectedNode,
    setSelectedEdge,
    setViewport,
    savePrefab,
    reset,
  } = usePrefabBuilderStore();

  // Initialize on mount
  useEffect(() => {
    if (prefabId) {
      void loadPrefab(prefabId);
    } else {
      createNewPrefab();
    }
    void loadLocations();

    return () => reset();
  }, [prefabId, loadPrefab, createNewPrefab, loadLocations, reset]);

  // Handle save
  const handleSave = useCallback(async () => {
    const success = await savePrefab();
    if (success && onSave) {
      onSave();
    }
  }, [savePrefab, onSave]);

  // Track if we should auto-focus the name input after dropping
  const [shouldFocusName, setShouldFocusName] = useState(false);

  // Handle drop location on canvas
  const handleDrop = useCallback(
    (location: Location, position: XYPosition) => {
      const instanceId = addLocationInstance(location, position);
      setSelectedNode(instanceId);
      setShouldFocusName(true);
    },
    [addLocationInstance, setSelectedNode]
  );

  // Handle add entry point
  const handleAddEntryPoint = useCallback(
    (position: XYPosition) => {
      const count = entryPoints.length + 1;
      addEntryPoint(`Entry ${count}`, position);
    },
    [entryPoints.length, addEntryPoint]
  );

  // Handle connect
  const handleConnect = useCallback(
    (fromId: string, fromPort: string, toId: string, toPort: string) => {
      // Find positions to calculate direction
      const fromInst = instances.find((i) => i.id === fromId);
      const toInst = instances.find((i) => i.id === toId);

      if (fromInst && toInst) {
        const fromPos = { x: fromInst.position.x * 1000, y: fromInst.position.y * 1000 };
        const toPos = { x: toInst.position.x * 1000, y: toInst.position.y * 1000 };
        const direction = calculateDirection(fromPos, toPos);
        addConnection(fromId, fromPort, toId, toPort, direction);
      }
    },
    [instances, addConnection]
  );

  // Handle node drag stop
  const handleNodeDragStop = useCallback(
    (nodeId: string, position: XYPosition) => {
      // Check if it's an entry point or instance
      if (entryPoints.some((e) => e.id === nodeId)) {
        // Entry point - would need updateEntryPointPosition
        // For now, skip since we'd need to add that action
      } else {
        updateInstancePosition(nodeId, position);
      }
    },
    [entryPoints, updateInstancePosition]
  );

  // Create a blank location for dragging/clicking
  const createBlankLocation = useCallback((): Location => {
    const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      id,
      name: 'New Location',
      type: 'room',
      isTemplate: false,
    };
  }, []);

  // Handle clicking the blank node to add it
  const handleAddBlankNode = useCallback(() => {
    const blankLocation = createBlankLocation();
    // Find an empty position - offset from center based on instance count
    const offset = instances.length * 50;
    addLocationInstance(blankLocation, { x: 300 + offset, y: 200 + offset });
  }, [createBlankLocation, addLocationInstance, instances.length]);

  // Handle delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (entryPoints.some((e) => e.id === nodeId)) {
        removeEntryPoint(nodeId);
      } else {
        removeInstance(nodeId);
      }
    },
    [entryPoints, removeInstance, removeEntryPoint]
  );

  // Handle update instance ports
  const handleUpdateInstance = useCallback(
    (instanceId: string, ports: LocationPort[]) => {
      updateInstancePorts(instanceId, ports);
    },
    [updateInstancePorts]
  );

  // Loading state
  if (isLoading && instances.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Error state
  if (error && instances.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => createNewPrefab()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500"
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-violet-400" />
            <input
              type="text"
              value={prefabName}
              onChange={(e) => setPrefabName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-2 py-1"
              placeholder="Prefab Name..."
            />
          </div>
          {isDirty && (
            <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={prefabCategory}
            onChange={(e) => setPrefabCategory(e.target.value)}
            className="text-sm bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-300 placeholder-slate-500 w-32"
            placeholder="Category"
          />
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || !prefabName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Location bucket */}
        <aside className="w-72 border-r border-slate-700 flex-shrink-0">
          <LocationBucket
            locations={availableLocations}
            templateLocations={templateLocations}
            isLoading={isLoading}
            onRefresh={() => void loadLocations()}
            onAddBlankNode={handleAddBlankNode}
            onDragBlankNode={createBlankLocation}
          />
        </aside>

        {/* Center - Canvas */}
        <main className="flex-1 min-w-0">
          <ReactFlowProvider>
            <PrefabCanvas
              instances={instances}
              connections={connections}
              entryPoints={entryPoints}
              locations={locations}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              pendingConnection={pendingConnection}
              viewport={viewport}
              onNodeClick={setSelectedNode}
              onEdgeClick={setSelectedEdge}
              onNodeDragStop={handleNodeDragStop}
              onConnect={handleConnect}
              onViewportChange={setViewport}
              onDrop={handleDrop}
              onAddEntryPoint={handleAddEntryPoint}
              onDeleteNode={handleDeleteNode}
              onDeleteEdge={removeConnection}
            />
          </ReactFlowProvider>
        </main>

        {/* Right panel - Properties */}
        <aside className="w-72 border-l border-slate-700 flex-shrink-0">
          <PropertiesPanel
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            instances={instances}
            connections={connections}
            entryPoints={entryPoints}
            locations={locations}
            autoFocusName={shouldFocusName}
            onUpdateInstance={handleUpdateInstance}
            onUpdateLocation={updateLocation}
            onUpdateConnection={updateConnection}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={removeConnection}
            onAutoFocusHandled={() => setShouldFocusName(false)}
          />
        </aside>
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
