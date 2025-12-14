/**
 * LocationNode Component for React Flow
 * Custom node component displaying location information with ports.
 */
import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type {
  LocationNode as LocationNodeData,
  LocationType,
  LocationPort,
} from '@minimal-rpg/schemas';
import { MapPin, Building2, DoorOpen } from 'lucide-react';

/** Node data structure passed to React Flow */
export interface LocationNodeFlowData extends Record<string, unknown> {
  location: LocationNodeData;
  isSelected: boolean;
}

/** Get icon for location type */
function getTypeIcon(type: LocationType): React.ReactNode {
  switch (type) {
    case 'region':
      return <MapPin className="h-4 w-4" />;
    case 'building':
      return <Building2 className="h-4 w-4" />;
    case 'room':
      return <DoorOpen className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
}

/** Get color classes for location type */
function getTypeColors(type: LocationType): { bg: string; border: string; text: string } {
  switch (type) {
    case 'region':
      return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' };
    case 'building':
      return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' };
    case 'room':
      return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' };
  }
}

/** Compute port positions around the node */
function getPortPosition(
  index: number,
  total: number,
  side: 'top' | 'right' | 'bottom' | 'left'
): { position: Position; style: { left?: string; top?: string; right?: string; bottom?: string } } {
  const spacing = 100 / (total + 1);
  const offset = `${spacing * (index + 1)}%`;

  switch (side) {
    case 'top':
      return { position: Position.Top, style: { left: offset, top: '-4px' } };
    case 'right':
      return { position: Position.Right, style: { top: offset, right: '-4px' } };
    case 'bottom':
      return { position: Position.Bottom, style: { left: offset, bottom: '-4px' } };
    case 'left':
      return { position: Position.Left, style: { top: offset, left: '-4px' } };
  }
}

/** Distribute ports around the node edges */
function distributePortsAroundNode(ports: LocationPort[]): Array<{
  port: LocationPort;
  position: Position;
  style: React.CSSProperties;
}> {
  const result: Array<{ port: LocationPort; position: Position; style: React.CSSProperties }> = [];
  const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

  // Simple distribution: place ports evenly around the node
  ports.forEach((port, index) => {
    const sideIndex = index % 4;
    const side = sides[sideIndex] ?? 'top';
    const portsOnSide = ports.filter((_, i) => i % 4 === sideIndex);
    const indexOnSide = portsOnSide.indexOf(port);
    const { position, style } = getPortPosition(indexOnSide, portsOnSide.length, side);
    result.push({ port, position, style });
  });

  return result;
}

/** Custom React Flow node for locations */
export const LocationNodeComponent = memo(function LocationNodeComponent({
  data,
  selected,
}: NodeProps<Node<LocationNodeFlowData>>) {
  const { location, isSelected } = data;
  const colors = getTypeColors(location.type);
  const ports = location.ports ?? [];
  const distributedPorts = distributePortsAroundNode(ports);

  return (
    <div
      className={`
        relative min-w-[140px] max-w-[200px] rounded-lg border-2 shadow-sm
        ${colors.bg} ${colors.border}
        ${isSelected || selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        transition-shadow
      `}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${colors.border}`}>
        <span className={colors.text}>{getTypeIcon(location.type)}</span>
        <span className={`font-medium text-sm truncate ${colors.text}`}>{location.name}</span>
      </div>

      {/* Summary */}
      {location.summary && (
        <div className="px-3 py-2 text-xs text-gray-600 line-clamp-2">{location.summary}</div>
      )}

      {/* Port labels (if few enough to display) */}
      {ports.length > 0 && ports.length <= 4 && (
        <div className="px-3 py-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Exits:</div>
          <div className="flex flex-wrap gap-1">
            {ports.map((port) => (
              <span
                key={port.id}
                className="px-1.5 py-0.5 bg-white rounded text-xs text-gray-700 border border-gray-200"
                title={port.description}
              >
                {port.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Default handles for nodes without explicit ports */}
      {ports.length === 0 && (
        <>
          <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
          <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
        </>
      )}

      {/* Port handles */}
      {distributedPorts.map(({ port, position, style }) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={position}
          style={{
            ...style,
            background: '#6b7280',
            width: '8px',
            height: '8px',
            border: '2px solid white',
          }}
          title={`${port.name}${port.description ? `: ${port.description}` : ''}`}
        />
      ))}

      {/* Also add target handles for ports */}
      {distributedPorts.map(({ port, position, style }) => (
        <Handle
          key={`${port.id}-target`}
          id={`${port.id}-in`}
          type="target"
          position={position}
          style={{
            ...style,
            background: '#6b7280',
            width: '8px',
            height: '8px',
            border: '2px solid white',
          }}
        />
      ))}
    </div>
  );
});

/** Node types for React Flow */
export const nodeTypes: Record<string, React.ComponentType<NodeProps>> = {
  locationNode: LocationNodeComponent as unknown as React.ComponentType<NodeProps>,
};
