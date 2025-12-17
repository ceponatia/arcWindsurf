/**
 * Prefab Canvas Component
 * React Flow based canvas for building location prefabs.
 */
import { useCallback, useMemo, useState, useRef, useEffect, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnConnect,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type {
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
} from '@minimal-rpg/schemas';
import { nodeTypes } from './CanvasNodes.js';
import type { Location, LocationNodeData, EntryNodeData, PrefabCanvasProps } from './types.js';
import { isVerticalDirection } from './types.js';

// ============================================================================
// Conversion Functions
// ============================================================================

/** Convert instance to React Flow node */
function instanceToNode(
  instance: PrefabLocationInstance,
  location: Location | undefined,
  selected: boolean
): Node<LocationNodeData> {
  return {
    id: instance.id,
    type: 'location',
    position: {
      x: instance.position.x * 1000,
      y: instance.position.y * 1000,
    },
    data: {
      nodeType: 'location',
      location: location ?? {
        id: instance.locationId,
        name: 'Unknown Location',
        type: 'room',
        isTemplate: false,
      },
      instance,
      selected,
    },
  };
}

/** Convert entry point to React Flow node */
function entryPointToNode(entryPoint: PrefabEntryPoint, selected: boolean): Node<EntryNodeData> {
  return {
    id: entryPoint.id,
    type: 'entry',
    position: {
      x: entryPoint.position.x * 1000,
      y: entryPoint.position.y * 1000,
    },
    data: {
      nodeType: 'entry',
      entryPoint,
      selected,
    },
  };
}

/** Convert connection to React Flow edge */
function connectionToEdge(connection: PrefabConnection, selectedId: string | null): Edge {
  const isVertical = isVerticalDirection(connection.direction);
  const isSelected = connection.id === selectedId;

  const edge: Edge = {
    id: connection.id,
    source: connection.fromInstanceId,
    sourceHandle: isVertical ? 'bottom' : 'right',
    target: connection.toInstanceId,
    targetHandle: isVertical ? 'top' : 'left',
    type: 'default',
    animated: connection.locked,
    style: {
      stroke: isSelected ? '#8b5cf6' : isVertical ? '#60a5fa' : '#94a3b8',
      strokeWidth: isSelected ? 3 : 2,
      ...(isVertical ? { strokeDasharray: '5 5' } : {}),
    },
    // No labels on edges - direction info is shown on the room's exits
  };

  // Add arrow marker for one-way connections only
  if (!connection.bidirectional) {
    edge.markerEnd = { type: MarkerType.ArrowClosed, color: '#94a3b8' };
  }

  return edge;
}

/** Convert entry point connection to React Flow edge */
function entryConnectionToEdge(
  entryPoint: PrefabEntryPoint,
  selectedId: string | null
): Edge | null {
  if (!entryPoint.targetInstanceId) return null;

  const isSelected = entryPoint.id === selectedId;

  return {
    id: `entry-${entryPoint.id}`,
    source: entryPoint.id,
    sourceHandle: 'right',
    target: entryPoint.targetInstanceId,
    targetHandle: 'left',
    type: 'default',
    style: {
      stroke: isSelected ? '#a78bfa' : '#8b5cf6',
      strokeWidth: isSelected ? 3 : 2,
      strokeDasharray: '3 3',
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function PrefabCanvas({
  instances,
  connections,
  entryPoints,
  locations,
  selectedNodeId,
  selectedEdgeId,
  pendingConnection,
  viewport,
  onNodeClick,
  onEdgeClick,
  onNodeDragStop,
  onConnect,
  onViewportChange,
  onDrop,
  onAddEntryPoint,
  onDeleteNode,
  onDeleteEdge,
}: PrefabCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only delete if not typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        if (selectedNodeId) {
          event.preventDefault();
          onDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          event.preventDefault();
          onDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, onDeleteNode, onDeleteEdge]);

  // Convert data to React Flow format
  const initialNodes = useMemo(() => {
    const locationNodes = instances.map((inst) =>
      instanceToNode(inst, locations.get(inst.locationId), inst.id === selectedNodeId)
    );
    const entryNodes = entryPoints.map((ep) => entryPointToNode(ep, ep.id === selectedNodeId));
    return [...locationNodes, ...entryNodes];
  }, [instances, entryPoints, locations, selectedNodeId]);

  const initialEdges = useMemo(() => {
    const connectionEdges = connections.map((conn) => connectionToEdge(conn, selectedEdgeId));
    const entryEdges = entryPoints
      .map((ep) => entryConnectionToEdge(ep, selectedEdgeId))
      .filter((e): e is Edge => e !== null);
    return [...connectionEdges, ...entryEdges];
  }, [connections, entryPoints, selectedEdgeId]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when props change
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useMemo(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle node changes
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Cast to the expected type since useNodesState accepts generic Node changes
      onNodesChange(changes as Parameters<typeof onNodesChange>[0]);

      // Track position changes when drag ends
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          onNodeDragStop(change.id, change.position);
        }
      }
    },
    [onNodesChange, onNodeDragStop]
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        onConnect(
          connection.source,
          connection.sourceHandle ?? 'default',
          connection.target,
          connection.targetHandle ?? 'default'
        );
      }
    },
    [onConnect]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      // Extract actual connection ID from entry edges
      const edgeId = edge.id.startsWith('entry-') ? edge.id.slice(6) : edge.id;
      onEdgeClick(edgeId);
    },
    [onEdgeClick]
  );

  // Handle viewport change
  const handleMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      onViewportChange(vp);
    },
    [onViewportChange]
  );

  // Handle drag over for dropping locations
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setIsDraggingOver(false);

      const locationData = event.dataTransfer.getData('application/json');
      if (!locationData) return;

      try {
        const location = JSON.parse(locationData) as Location;

        // Use React Flow's screenToFlowPosition for accurate coordinate conversion
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        onDrop(location, position);
      } catch (err) {
        console.error('[PrefabCanvas] Error parsing dropped location:', err);
      }
    },
    [screenToFlowPosition, onDrop]
  );

  // Context menu for adding entry points
  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      event.preventDefault();

      // Use React Flow's screenToFlowPosition for accurate coordinate conversion
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onAddEntryPoint(position);
    },
    [screenToFlowPosition, onAddEntryPoint]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className={`h-full w-full ${isDraggingOver ? 'ring-2 ring-violet-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onMoveEnd={handleMoveEnd}
        onPaneContextMenu={handlePaneContextMenu}
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-900"
        connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 2 }}
        defaultEdgeOptions={{ type: 'default' }}
      >
        <Background color="#334155" gap={20} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg" />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as LocationNodeData | EntryNodeData;
            if (data.nodeType === 'entry') return '#8b5cf6';
            const location = data.location;
            switch (location.type) {
              case 'region':
                return '#3b82f6';
              case 'building':
                return '#f59e0b';
              case 'room':
                return '#10b981';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0,0,0,0.3)"
          className="!bg-slate-800 !border-slate-700 !rounded-lg"
        />
      </ReactFlow>

      {/* Help text */}
      {instances.length === 0 && !isDraggingOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 text-lg mb-2">
              Drag locations from the panel to get started
            </p>
            <p className="text-slate-600 text-sm">Right-click to add an entry/exit point</p>
          </div>
        </div>
      )}

      {/* Pending connection indicator */}
      {pendingConnection && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          Click a target location to connect...
        </div>
      )}
    </div>
  );
}
