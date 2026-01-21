/**
 * GraphView Component
 * React Flow based visual graph editor for location maps.
 */
import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { LocationNode, LocationConnection, SemanticZoomLevel } from '@minimal-rpg/schemas';
import type { EditMode, Selection, PendingEdge, Viewport } from './types.js';
import { nodeTypes, type LocationNodeFlowData } from './LocationNodeComponent.js';

interface GraphViewProps {
  nodes: LocationNode[];
  connections: LocationConnection[];
  zoomLevel: SemanticZoomLevel;
  viewport: Viewport;
  selection: Selection | null;
  mode: EditMode;
  pendingEdge: PendingEdge | null;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  onNodePositionChange: (nodeId: string, position: XYPosition) => void;
  onViewportChange: (viewport: Viewport) => void;
  onPortClick: (nodeId: string, portId: string) => void;
  onConnect: (fromId: string, fromPort: string, toId: string, toPort: string) => void;
}

/** Filter nodes by semantic zoom level */
function filterByZoomLevel(nodes: LocationNode[], level: SemanticZoomLevel): LocationNode[] {
  if (level === 'all') return nodes;

  const maxDepth = (() => {
    switch (level) {
      case 'region':
        return 0;
      case 'building':
        return 1;
      case 'room':
        return 2;
      default:
        return -1;
    }
  })();
  return nodes.filter((n) => n.depth <= maxDepth);
}

/** Convert LocationNode to React Flow Node */
function toFlowNode(
  node: LocationNode,
  selectedId: string | null,
  index: number
): Node<LocationNodeFlowData> {
  // Use stored position or generate grid layout
  const position = node.position
    ? { x: node.position.x * 1000, y: node.position.y * 1000 }
    : { x: (index % 4) * 250, y: Math.floor(index / 4) * 180 };

  return {
    id: node.id,
    type: 'locationNode',
    position,
    data: {
      location: node,
      isSelected: node.id === selectedId,
    },
  };
}

/** Convert LocationConnection to React Flow Edge */
function toFlowEdge(conn: LocationConnection, selectedId: string | null): Edge {
  const edge: Edge = {
    id: conn.id,
    source: conn.fromLocationId,
    sourceHandle: conn.fromPortId,
    target: conn.toLocationId,
    targetHandle: `${conn.toPortId}-in`,
    animated: conn.locked,
    style: {
      stroke: conn.id === selectedId ? '#3b82f6' : '#94a3b8',
      strokeWidth: conn.id === selectedId ? 2 : 1,
    },
    labelStyle: { fontSize: 10, fill: '#64748b' },
    labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
  };
  if (!conn.bidirectional) {
    edge.markerEnd = { type: MarkerType.ArrowClosed, color: '#94a3b8' };
  }
  if (conn.label) {
    edge.label = conn.label;
  } else if (conn.travelMinutes) {
    edge.label = `${conn.travelMinutes} min`;
  }
  return edge;
}

/** Main graph view component */
export function GraphView({
  nodes: locationNodes,
  connections,
  zoomLevel,
  viewport,
  selection,
  mode,
  pendingEdge,
  onNodeClick,
  onEdgeClick,
  onNodePositionChange,
  onViewportChange,
  onPortClick,
  onConnect,
}: GraphViewProps) {
  // Filter nodes by zoom level
  const filteredNodes = useMemo(
    () => filterByZoomLevel(locationNodes, zoomLevel),
    [locationNodes, zoomLevel]
  );

  // Filter connections to only include those between visible nodes
  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
  const filteredConnections = useMemo(
    () =>
      connections.filter(
        (c) => visibleNodeIds.has(c.fromLocationId) && visibleNodeIds.has(c.toLocationId)
      ),
    [connections, visibleNodeIds]
  );

  // Convert to React Flow format
  const initialNodes = useMemo(
    () =>
      filteredNodes.map((node, index) =>
        toFlowNode(node, selection?.type === 'node' ? selection.id : null, index)
      ),
    [filteredNodes, selection]
  );

  const initialEdges = useMemo(
    () =>
      filteredConnections.map((conn) =>
        toFlowEdge(conn, selection?.type === 'edge' ? selection.id : null)
      ),
    [filteredConnections, selection]
  );

  // React Flow state
  const [flowNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync with external state when props change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle node changes (position updates)
  const handleNodesChange: OnNodesChange<Node<LocationNodeFlowData>> = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Track position changes
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          onNodePositionChange(change.id, change.position);
        }
      }
    },
    [onNodesChange, onNodePositionChange]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        const fromPort = connection.sourceHandle ?? 'default';
        const toPort = connection.targetHandle?.replace('-in', '') ?? 'default';
        onConnect(connection.source, fromPort, connection.target, toPort);
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
      onEdgeClick(edge.id);
    },
    [onEdgeClick]
  );

  // Handle viewport change
  const handleViewportChange = useCallback(
    (v: { x: number; y: number; zoom: number }) => {
      onViewportChange(v);
    },
    [onViewportChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onMoveEnd={(_, v) => handleViewportChange(v)}
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as LocationNodeFlowData;
            switch (data.location.type) {
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
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>

      {/* Mode indicator overlay */}
      {mode !== 'select' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          {mode === 'add-node' && 'Click to place location'}
          {mode === 'add-edge' && 'Click target port to connect'}
          {mode === 'pan' && 'Drag to pan view'}
        </div>
      )}

      {/* Pending edge indicator */}
      {pendingEdge && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded text-sm shadow">
          Drawing connection from port...
          <button
            className="ml-2 text-amber-600 hover:text-amber-800 underline"
            onClick={() => onPortClick('', '')} // Cancel
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
