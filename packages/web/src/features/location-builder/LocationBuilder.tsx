/**
 * LocationBuilder Component
 * Main component for creating and editing location maps.
 */
import { useState, useEffect, useCallback } from 'react';
import type { LocationType, LocationNode, SemanticZoomLevel } from '@minimal-rpg/schemas';
import { useLocationBuilderStore } from './store.js';
import { HierarchyTree } from './HierarchyTree.js';
import { GraphView } from './GraphView.js';
import type { LocationBuilderProps } from './types.js';
import { Save, X, Loader2, AlertCircle, TreePine, Network, Filter, Undo2 } from 'lucide-react';

type ViewTab = 'tree' | 'graph';

/** Add Location Modal */
interface AddLocationModalProps {
  parentId: string | null;
  parentName: string | null;
  type: LocationType;
  onConfirm: (name: string, summary?: string) => void;
  onCancel: () => void;
}

function AddLocationModal({
  parentId,
  parentName,
  type,
  onConfirm,
  onCancel,
}: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim(), summary.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              Add {type.charAt(0).toUpperCase() + type.slice(1)}
            </h2>
            {parentName && <p className="text-sm text-gray-500 mt-1">Inside: {parentName}</p>}
          </div>

          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${type} name...`}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Summary (optional)
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Brief description..."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Main LocationBuilder component */
export function LocationBuilder({ settingId, mapId, onSave, onClose }: LocationBuilderProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('tree');
  const [addModal, setAddModal] = useState<{
    parentId: string | null;
    type: LocationType;
  } | null>(null);

  // Store state
  const {
    map,
    mode,
    selection,
    zoomLevel,
    viewport,
    pendingEdge,
    isDirty,
    isLoading,
    error,
    loadMap,
    createMap,
    saveMap,
    clearMap,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    setSelection,
    setZoomLevel,
    setViewport,
    cancelAddEdge,
  } = useLocationBuilderStore();

  // Load or create map on mount
  useEffect(() => {
    if (mapId) {
      loadMap(mapId);
    } else {
      createMap(settingId, 'New Location Map');
    }
    return () => clearMap();
  }, [mapId, settingId, loadMap, createMap, clearMap]);

  // Handle save
  const handleSave = useCallback(async () => {
    await saveMap();
    if (map && onSave) {
      onSave(map);
    }
  }, [saveMap, map, onSave]);

  // Handle adding a child location
  const handleAddChild = useCallback((parentId: string | null, type: LocationType) => {
    setAddModal({ parentId, type });
  }, []);

  // Confirm adding location
  const handleConfirmAdd = useCallback(
    (name: string, summary?: string) => {
      if (!addModal) return;

      const parent = addModal.parentId ? map?.nodes.find((n) => n.id === addModal.parentId) : null;

      const newNode: Omit<LocationNode, 'id'> = {
        name,
        type: addModal.type,
        parentId: addModal.parentId,
        depth: parent ? parent.depth + 1 : 0,
        ports: [],
      };

      if (summary) {
        newNode.summary = summary;
      }

      addNode(newNode);
      setAddModal(null);
    },
    [addModal, map, addNode]
  );

  // Handle node selection
  const handleSelectNode = useCallback(
    (nodeId: string | null) => {
      setSelection(nodeId ? { type: 'node', id: nodeId } : null);
    },
    [setSelection]
  );

  // Handle edge selection
  const handleSelectEdge = useCallback(
    (edgeId: string) => {
      setSelection({ type: 'edge', id: edgeId });
    },
    [setSelection]
  );

  // Handle node position change
  const handleNodePositionChange = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      // Normalize to 0-1 range
      updateNode(nodeId, {
        position: { x: position.x / 1000, y: position.y / 1000 },
      });
    },
    [updateNode]
  );

  // Handle new connection
  const handleConnect = useCallback(
    (fromId: string, fromPort: string, toId: string, toPort: string) => {
      addConnection({
        fromLocationId: fromId,
        fromPortId: fromPort,
        toLocationId: toId,
        toPortId: toPort,
        bidirectional: true,
        locked: false,
      });
    },
    [addConnection]
  );

  // Get parent name for add modal
  const getParentName = () => {
    if (!addModal?.parentId || !map) return null;
    return map.nodes.find((n) => n.id === addModal.parentId)?.name ?? null;
  };

  // Render loading state
  if (isLoading && !map) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Render error state
  if (error && !map) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => createMap(settingId, 'New Location Map')}
          >
            Create New Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{map?.name ?? 'Location Map'}</h1>
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom level filter */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as SemanticZoomLevel)}
            className="px-3 py-1.5 border rounded text-sm bg-white"
          >
            <option value="all">All Levels</option>
            <option value="region">Regions Only</option>
            <option value="building">Regions + Buildings</option>
            <option value="room">All (inc. Rooms)</option>
          </select>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>

          {/* Close button */}
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded" title="Close">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar with tabs */}
        <div className="w-80 border-r flex flex-col">
          {/* Tab buttons */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${
                activeTab === 'tree'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <TreePine className="h-4 w-4" />
              Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${
                activeTab === 'graph'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Network className="h-4 w-4" />
              Graph
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'tree' && map && (
              <HierarchyTree
                nodes={map.nodes}
                selectedNodeId={selection?.type === 'node' ? selection.id : null}
                onSelectNode={handleSelectNode}
                onAddChild={handleAddChild}
                onDeleteNode={deleteNode}
              />
            )}
            {activeTab === 'graph' && map && (
              <GraphView
                nodes={map.nodes}
                connections={map.connections}
                zoomLevel={zoomLevel}
                viewport={viewport}
                selection={selection}
                mode={mode}
                pendingEdge={pendingEdge}
                onNodeClick={handleSelectNode}
                onEdgeClick={handleSelectEdge}
                onNodePositionChange={handleNodePositionChange}
                onViewportChange={setViewport}
                onPortClick={() => cancelAddEdge()}
                onConnect={handleConnect}
              />
            )}
          </div>
        </div>

        {/* Graph view (always visible as main content) */}
        <div className="flex-1 relative">
          {map && (
            <GraphView
              nodes={map.nodes}
              connections={map.connections}
              zoomLevel={zoomLevel}
              viewport={viewport}
              selection={selection}
              mode={mode}
              pendingEdge={pendingEdge}
              onNodeClick={handleSelectNode}
              onEdgeClick={handleSelectEdge}
              onNodePositionChange={handleNodePositionChange}
              onViewportChange={setViewport}
              onPortClick={() => cancelAddEdge()}
              onConnect={handleConnect}
            />
          )}
        </div>
      </div>

      {/* Add location modal */}
      {addModal && (
        <AddLocationModal
          parentId={addModal.parentId}
          parentName={getParentName()}
          type={addModal.type}
          onConfirm={handleConfirmAdd}
          onCancel={() => setAddModal(null)}
        />
      )}
    </div>
  );
}
