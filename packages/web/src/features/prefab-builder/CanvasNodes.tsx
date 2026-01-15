/**
 * Canvas Nodes for Prefab Builder
 * Custom node components for React Flow.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { MapPin, Building2, DoorOpen, LogIn, Mountain } from 'lucide-react';
import type { LocationType, LocationPort, LocationNodeData, EntryNodeData } from './types.js';

// ============================================================================
// Helper Functions
// ============================================================================

/** Get icon for location type */
function getTypeIcon(type: LocationType): React.ReactNode {
  switch (type) {
    case 'region':
      return <Mountain className="h-4 w-4" />;
    case 'building':
      return <Building2 className="h-4 w-4" />;
    case 'room':
      return <DoorOpen className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
}

/** Get color classes for location type */
function getTypeColors(type: LocationType): {
  bg: string;
  border: string;
  text: string;
  ring: string;
} {
  switch (type) {
    case 'region':
      return {
        bg: 'bg-blue-900/50',
        border: 'border-blue-500',
        text: 'text-blue-300',
        ring: 'ring-blue-500',
      };
    case 'building':
      return {
        bg: 'bg-amber-900/50',
        border: 'border-amber-500',
        text: 'text-amber-300',
        ring: 'ring-amber-500',
      };
    case 'room':
      return {
        bg: 'bg-emerald-900/50',
        border: 'border-emerald-500',
        text: 'text-emerald-300',
        ring: 'ring-emerald-500',
      };
    default:
      return {
        bg: 'bg-slate-800',
        border: 'border-slate-600',
        text: 'text-slate-300',
        ring: 'ring-slate-500',
      };
  }
}

// ============================================================================
// Location Node Component
// ============================================================================

/** Small indicator showing exits in each direction */
function ExitIndicators({ ports }: { ports: LocationPort[] }) {
  // Group exits by direction
  const exitsByDir = ports.reduce((acc, port) => {
    if (port.direction) {
      const dir = port.direction;
      const existing = acc.get(dir) ?? [];
      acc.set(dir, [...existing, port]);
    }
    return acc;
  }, new Map<string, LocationPort[]>());

  const dirPositions = new Map<string, string>([
    ['north', 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'],
    ['south', 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'],
    ['east', 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2'],
    ['west', 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'],
    ['up', 'top-0 right-2 -translate-y-1/2'],
    ['down', 'bottom-0 right-2 translate-y-1/2'],
  ]);

  return (
    <>
      {Array.from(exitsByDir.entries()).map(([dir, exits]) => {
        const pos = dirPositions.get(dir);
        if (!pos) return null;
        const hasLocked = exits.some((e) => e.locked);
        return (
          <div
            key={dir}
            className={`absolute ${pos} w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
              hasLocked ? 'bg-red-500/80 text-red-100' : 'bg-violet-500/80 text-violet-100'
            }`}
            title={`${dir}: ${exits.length} exit${exits.length > 1 ? 's' : ''}${hasLocked ? ' (locked)' : ''}`}
          >
            {dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir.charAt(0).toUpperCase()}
          </div>
        );
      })}
    </>
  );
}

export const LocationNodeComponent = memo(function LocationNodeComponent({
  data,
  selected,
}: NodeProps<Node<LocationNodeData>>) {
  const { location, instance } = data;
  const colors = getTypeColors(location.type);
  const ports = instance.ports ?? [];
  const connectedPorts = ports.filter((p) => p.targetInstanceId);

  return (
    <div
      className={`
        relative min-w-[160px] max-w-[220px] rounded-lg border-2 shadow-lg
        ${colors.bg} ${colors.border}
        ${selected ? `ring-2 ${colors.ring} ring-offset-2 ring-offset-slate-900` : ''}
        transition-all duration-150
      `}
    >
      {/* Exit direction indicators */}
      <ExitIndicators ports={connectedPorts} />

      {/* Default connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />

      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${colors.border}`}>
        <span className={colors.text}>{getTypeIcon(location.type)}</span>
        <span className={`font-medium text-sm truncate ${colors.text}`}>{location.name}</span>
      </div>

      {/* Summary */}
      {location.summary && (
        <div className="px-3 py-2 text-xs text-slate-400 line-clamp-2">{location.summary}</div>
      )}

      {/* Type badge and exit count */}
      <div className="px-3 py-1.5 border-t border-slate-700/50 flex items-center justify-between">
        <span className={`text-xs ${colors.text} capitalize`}>{location.type}</span>
        {connectedPorts.length > 0 && (
          <span className="text-xs text-slate-500">
            {connectedPorts.length} exit{connectedPorts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Entry Point Node Component
// ============================================================================

export const EntryNodeComponent = memo(function EntryNodeComponent({
  data,
  selected,
}: NodeProps<Node<EntryNodeData>>) {
  const { entryPoint } = data;
  const isConnected = !!entryPoint.targetInstanceId;

  return (
    <div
      className={`
        relative min-w-[120px] rounded-lg border-2 shadow-lg
        ${isConnected ? 'bg-violet-900/50 border-violet-500' : 'bg-slate-800 border-dashed border-slate-600'}
        ${selected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900' : ''}
        transition-all duration-150
      `}
    >
      {/* Connection handles on all 4 sides */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-violet-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-violet-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-violet-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-violet-400 !w-3 !h-3 !border-2 !border-slate-900"
      />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2">
        <LogIn className={`h-4 w-4 ${isConnected ? 'text-violet-400' : 'text-slate-500'}`} />
        <span
          className={`text-sm font-medium ${isConnected ? 'text-violet-300' : 'text-slate-400'}`}
        >
          {entryPoint.name}
        </span>
      </div>

      {!isConnected && (
        <div className="px-3 pb-2">
          <span className="text-xs text-slate-500 italic">Connect to a location</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Node Type Registry
// ============================================================================

export const nodeTypes = {
  location: LocationNodeComponent,
  entry: EntryNodeComponent,
} as const;
