/**
 * Properties Panel
 * Panel for editing selected nodes and edges in the prefab builder.
 */
import { useState, useRef, useEffect } from 'react';
import { X, Trash2, MapPin, ArrowRight, Lock, Unlock, LogIn, DoorOpen, Plus } from 'lucide-react';
import type {
  PrefabLocationInstance,
  PrefabConnection,
  PrefabEntryPoint,
} from '@minimal-rpg/schemas';
import type { Location, LocationPort, PropertiesPanelProps } from './types.js';

export function PropertiesPanel({
  selectedNodeId,
  selectedEdgeId,
  instances,
  connections,
  entryPoints,
  locations,
  autoFocusName,
  onUpdateInstance,
  onUpdateLocation,
  onUpdateConnection,
  onDeleteNode,
  onDeleteEdge,
  onAutoFocusHandled,
}: PropertiesPanelProps) {
  // Find selected items
  const selectedInstance = instances.find((i) => i.id === selectedNodeId);
  const selectedEntryPoint = entryPoints.find((e) => e.id === selectedNodeId);
  const selectedConnection = connections.find((c) => c.id === selectedEdgeId);
  const selectedLocation = selectedInstance
    ? locations.get(selectedInstance.locationId)
    : undefined;

  // Nothing selected
  if (!selectedNodeId && !selectedEdgeId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-slate-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a node or connection to edit its properties</p>
        </div>
      </div>
    );
  }

  // Location instance selected
  if (selectedInstance && selectedLocation) {
    return (
      <LocationInstancePanel
        instance={selectedInstance}
        location={selectedLocation}
        instances={instances}
        locations={locations}
        autoFocusName={autoFocusName}
        onAutoFocusHandled={onAutoFocusHandled}
        onUpdatePorts={(ports) => { onUpdateInstance(selectedInstance.id, ports); }}
        onUpdateLocation={(updates) => { onUpdateLocation(selectedLocation.id, updates); }}
        onDelete={() => { onDeleteNode(selectedInstance.id); }}
      />
    );
  }

  // Entry point selected
  if (selectedEntryPoint) {
    return (
      <EntryPointPanel
        entryPoint={selectedEntryPoint}
        instances={instances}
        locations={locations}
        onDelete={() => { onDeleteNode(selectedEntryPoint.id); }}
      />
    );
  }

  // Connection selected
  if (selectedConnection) {
    return (
      <ConnectionPanel
        connection={selectedConnection}
        instances={instances}
        locations={locations}
        onUpdate={(updates) => { onUpdateConnection(selectedConnection.id, updates); }}
        onDelete={() => { onDeleteEdge(selectedConnection.id); }}
      />
    );
  }

  return null;
}

// ============================================================================
// Sub-panels
// ============================================================================

interface LocationInstancePanelProps {
  instance: PrefabLocationInstance;
  location: Location;
  instances: PrefabLocationInstance[];
  locations: Map<string, Location>;
  autoFocusName?: boolean | undefined;
  onAutoFocusHandled?: (() => void) | undefined;
  onUpdatePorts: (ports: LocationPort[]) => void;
  onUpdateLocation: (updates: Partial<Location>) => void;
  onDelete: () => void;
}

/** Direction selector for exits */
type ExitDir = 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'in' | 'out';

function ExitDirectionSelect({
  value,
  onChange,
}: {
  value: ExitDir | undefined;
  onChange: (dir: ExitDir | undefined) => void;
}) {
  const directions: ExitDir[] = ['north', 'south', 'east', 'west', 'up', 'down'];

  return (
    <div className="grid grid-cols-3 gap-1">
      {directions.map((dir) => (
        <button
          key={dir}
          onClick={() => { onChange(value === dir ? undefined : dir); }}
          className={`
            px-2 py-1 text-xs rounded capitalize
            ${value === dir ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
          `}
        >
          {dir}
        </button>
      ))}
    </div>
  );
}

function LocationInstancePanel({
  instance,
  location,
  instances,
  locations,
  autoFocusName,
  onAutoFocusHandled,
  onUpdatePorts,
  onUpdateLocation,
  onDelete,
}: LocationInstancePanelProps) {
  const [newPortName, setNewPortName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when requested (e.g., after dropping a new node)
  useEffect(() => {
    if (autoFocusName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onAutoFocusHandled?.();
    }
  }, [autoFocusName, onAutoFocusHandled]);

  const addPort = () => {
    if (!newPortName.trim()) return;
    const newPort: LocationPort = {
      id: `${instance.id}-port-${Date.now()}`,
      name: newPortName.trim(),
    };
    onUpdatePorts([...(instance.ports ?? []), newPort]);
    setNewPortName('');
  };

  const removePort = (portId: string) => {
    onUpdatePorts((instance.ports ?? []).filter((p) => p.id !== portId));
  };

  const updatePort = (portId: string, updates: Partial<LocationPort>) => {
    onUpdatePorts((instance.ports ?? []).map((p) => (p.id === portId ? { ...p, ...updates } : p)));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-medium text-slate-200">Location</h3>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
          title="Remove from prefab"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={location.name}
            onChange={(e) => { onUpdateLocation({ name: e.target.value }); }}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 focus:ring-1 focus:ring-violet-500"
            placeholder="Location name..."
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
          <select
            value={location.type}
            onChange={(e) => { onUpdateLocation({ type: e.target.value as Location['type'] }); }}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 focus:ring-1 focus:ring-violet-500"
          >
            <option value="room">Room</option>
            <option value="building">Building</option>
            <option value="region">Region</option>
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Summary</label>
          <input
            type="text"
            value={location.summary ?? ''}
            onChange={(e) => { onUpdateLocation({ summary: e.target.value || undefined }); }}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-violet-500"
            placeholder="Brief one-line summary..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Description (for LLM)
          </label>
          <textarea
            value={location.description ?? ''}
            onChange={(e) => { onUpdateLocation({ description: e.target.value || undefined }); }}
            rows={3}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-violet-500 resize-none"
            placeholder="Describe this location for the AI narrator..."
          />
        </div>

        {/* Exits */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <DoorOpen className="w-3 h-3 inline mr-1" />
            Exits
          </label>

          {(instance.ports ?? []).length === 0 && (
            <p className="text-xs text-slate-500 italic mb-2">
              No exits yet. Connect this location to another on the canvas to create exits
              automatically.
            </p>
          )}

          <div className="space-y-2">
            {(instance.ports ?? []).map((port) => {
              // Find target location name
              const targetInstance = port.targetInstanceId
                ? instances.find((i) => i.id === port.targetInstanceId)
                : null;
              const targetLocation = targetInstance
                ? locations.get(targetInstance.locationId)
                : null;
              const isConnected = !!port.targetInstanceId;

              return (
                <div
                  key={port.id}
                  className={`p-2 rounded border space-y-2 ${
                    isConnected
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-800/50 border-dashed border-slate-600'
                  }`}
                >
                  {/* Header with delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {port.direction && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-violet-600/20 text-violet-300 capitalize">
                          {port.direction}
                        </span>
                      )}
                      {isConnected && (
                        <span className="text-xs text-slate-400">
                          → {targetLocation?.name ?? 'Unknown'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { removePort(port.id); }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                      title="Remove exit"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-xs text-slate-500">Name</label>
                    <input
                      type="text"
                      value={port.name}
                      onChange={(e) => { updatePort(port.id, { name: e.target.value }); }}
                      className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-100"
                    />
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="text-xs text-slate-500">Direction</label>
                    <ExitDirectionSelect
                      value={port.direction}
                      onChange={(dir) => { updatePort(port.id, { direction: dir }); }}
                    />
                  </div>

                  {/* Lock toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-slate-500">Locked</label>
                    <button
                      onClick={() => { updatePort(port.id, { locked: !port.locked }); }}
                      className={`
                        flex items-center gap-1.5 px-2 py-0.5 text-xs rounded
                        ${port.locked ? 'bg-red-600/20 text-red-400' : 'bg-slate-700 text-slate-400'}
                      `}
                    >
                      {port.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {port.locked ? 'Locked' : 'Unlocked'}
                    </button>
                  </div>

                  {/* Lock reason (if locked) */}
                  {port.locked && (
                    <div>
                      <label className="text-xs text-slate-500">Lock Reason</label>
                      <input
                        type="text"
                        value={port.lockReason ?? ''}
                        onChange={(e) =>
                          { updatePort(port.id, { lockReason: e.target.value || undefined }); }
                        }
                        placeholder="e.g., Requires key"
                        className="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add manual exit */}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newPortName}
              onChange={(e) => { setNewPortName(e.target.value); }}
              placeholder="Add unconnected exit..."
              className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && addPort()}
            />
            <button
              onClick={addPort}
              disabled={!newPortName.trim()}
              className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
              title="Add exit without connection"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EntryPointPanelProps {
  entryPoint: PrefabEntryPoint;
  instances: PrefabLocationInstance[];
  locations: Map<string, Location>;
  onDelete: () => void;
}

function EntryPointPanel({ entryPoint, instances, locations, onDelete }: EntryPointPanelProps) {
  const targetLocation = entryPoint.targetInstanceId
    ? locations.get(instances.find((i) => i.id === entryPoint.targetInstanceId)?.locationId ?? '')
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-medium text-slate-200 flex items-center gap-2">
          <LogIn className="w-4 h-4 text-violet-400" />
          Entry Point
        </h3>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
          title="Remove entry point"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
          <p className="text-sm text-slate-200">{entryPoint.name}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Connected To</label>
          {targetLocation ? (
            <p className="text-sm text-slate-200">{targetLocation.name}</p>
          ) : (
            <p className="text-sm text-slate-500 italic">Not connected</p>
          )}
        </div>

        <div className="p-3 rounded bg-slate-800/50 border border-slate-700">
          <p className="text-xs text-slate-400">
            Entry points define where external connections can attach to this prefab when it's
            placed on a map.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ConnectionPanelProps {
  connection: PrefabConnection;
  instances: PrefabLocationInstance[];
  locations: Map<string, Location>;
  onUpdate: (updates: Partial<PrefabConnection>) => void;
  onDelete: () => void;
}

function ConnectionPanel({
  connection,
  instances,
  locations,
  onUpdate,
  onDelete,
}: ConnectionPanelProps) {
  const fromInstance = instances.find((i) => i.id === connection.fromInstanceId);
  const toInstance = instances.find((i) => i.id === connection.toInstanceId);
  const fromLocation = fromInstance ? locations.get(fromInstance.locationId) : null;
  const toLocation = toInstance ? locations.get(toInstance.locationId) : null;

  // Find the associated exits
  const fromExit = (fromInstance?.ports ?? []).find(
    (p) => p.targetInstanceId === connection.toInstanceId
  );
  const toExit = (toInstance?.ports ?? []).find(
    (p) => p.targetInstanceId === connection.fromInstanceId
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-medium text-slate-200 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-slate-400" />
          Connection
        </h3>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
          title="Delete connection (removes exits from both locations)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Connection overview */}
        <div className="p-3 rounded bg-slate-800/50 border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">
            This connection links two locations via their exits. Edit individual exits by selecting
            the location nodes.
          </p>
        </div>

        {/* From location exit */}
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-slate-200">
              {fromLocation?.name ?? 'Unknown'}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
          </div>
          {fromExit ? (
            <div className="text-xs text-slate-400">
              <span className="text-violet-300">{fromExit.name}</span>
              {fromExit.direction && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-300 capitalize">
                  {fromExit.direction}
                </span>
              )}
              {fromExit.locked && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-red-600/20 text-red-300">
                  <Lock className="w-3 h-3 inline" /> Locked
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No exit found</span>
          )}
        </div>

        {/* To location exit */}
        <div className="p-3 rounded bg-slate-800 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-sm font-medium text-slate-200">
              {toLocation?.name ?? 'Unknown'}
            </span>
          </div>
          {toExit ? (
            <div className="text-xs text-slate-400">
              <span className="text-violet-300">{toExit.name}</span>
              {toExit.direction && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-300 capitalize">
                  {toExit.direction}
                </span>
              )}
              {toExit.locked && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-red-600/20 text-red-300">
                  <Lock className="w-3 h-3 inline" /> Locked
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No exit found</span>
          )}
        </div>

        {/* Bidirectional info */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Two-way passage</label>
          <span className={`text-xs ${fromExit && toExit ? 'text-emerald-400' : 'text-slate-500'}`}>
            {fromExit && toExit ? 'Yes (both directions)' : 'One-way only'}
          </span>
        </div>

        {/* Travel time (optional, kept on connection for shared metadata) */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Travel Time (minutes)
          </label>
          <input
            type="number"
            value={connection.travelMinutes ?? ''}
            onChange={(e) =>
              onUpdate({
                travelMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            placeholder="Optional"
            min={0}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
