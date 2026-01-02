/**
 * LocationsStep Component
 * Step for selecting/creating location maps in the session workspace.
 */
import { useState } from 'react';
import { useWorkspaceStore } from '../store.js';
import { SelectableCard } from '../components/SelectableCard.js';
import { LocationBuilder } from '../../location-builder/index.js';
import {
  MapPin,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { API_BASE_URL } from '../../../config.js';

const API_BASE = API_BASE_URL;

interface MapSummary {
  id: string;
  name: string;
  description: string | undefined;
  nodeCount: number;
  connectionCount: number;
  createdAt: string;
}

async function deleteMap(mapId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/location-maps/${mapId}`, {
      method: 'DELETE',
    });
    return res.ok || res.status === 204;
  } catch (err) {
    console.error('Failed to delete map:', err);
    return false;
  }
}

interface LocationsStepProps {
  maps: MapSummary[];
  loading: boolean;
  onRefresh: () => void;
}

export function LocationsStep({ maps, loading, onRefresh }: LocationsStepProps) {
  const { locations, setting, setLocations, setStep } = useWorkspaceStore();
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [isPoppedOut, setIsPoppedOut] = useState(false);

  // Get setting ID from workspace state
  const settingId = setting?.settingId;

  // Select a map
  const handleSelectMap = (mapId: string) => {
    const map = maps.find((m) => m.id === mapId);
    if (map) {
      setLocations({
        mapId: map.id,
        mapName: map.name ?? 'Untitled Map',
        startLocationId: null, // Can be set later
      });
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setLocations(null);
  };

  // Open builder for new map
  const handleCreateNew = () => {
    setEditingMapId(null);
    setShowBuilder(true);
  };

  // Open builder for editing
  const handleEditMap = (mapId: string) => {
    setEditingMapId(mapId);
    setShowBuilder(true);
  };

  // Handle save from builder
  const handleBuilderSave = () => {
    onRefresh();
    setShowBuilder(false);
  };

  // Handle delete map
  const handleDeleteMap = async (mapId: string, mapName: string) => {
    if (!confirm(`Are you sure you want to delete "${mapName}"? This cannot be undone.`)) {
      return;
    }

    const success = await deleteMap(mapId);
    if (success) {
      // If deleted map was selected, clear selection
      if (locations?.mapId === mapId) {
        setLocations(null);
      }
      onRefresh();
    } else {
      setError('Failed to delete map');
    }
  };

  // Show builder
  if (showBuilder && settingId) {
    const builderProps = {
      settingId,
      onSave: handleBuilderSave,
      onClose: () => setShowBuilder(false),
      ...(editingMapId ? { mapId: editingMapId } : {}),
    };

    if (isPoppedOut) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
            <div className="font-medium text-slate-700">Location Builder (Full Screen)</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPoppedOut(false)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
              >
                <Minimize2 className="h-4 w-4" />
                Dock
              </button>
              <button
                onClick={() => setShowBuilder(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <LocationBuilder {...builderProps} />
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setShowBuilder(false)}
        />

        {/* Slide-over Panel */}
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-5xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Location Builder</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPoppedOut(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
                title="Open in full screen"
              >
                <Maximize2 className="h-4 w-4" />
                Pop Out
              </button>
              <button
                onClick={() => setShowBuilder(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <LocationBuilder {...builderProps} />
          </div>
        </div>
      </>
    );
  }

  // No setting selected yet
  if (!settingId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <MapPin className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg mb-2">No setting selected</p>
        <p className="text-sm">Please select a setting first to configure locations.</p>
        <button
          onClick={() => setStep('setting')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Setting Step
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Location Map</h2>
          <p className="text-sm text-gray-500">Select or create a location map for your session</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create New Map
        </button>
      </div>

      {/* Current selection */}
      {locations?.mapId && (
        <SelectableCard
          title={locations.mapName ?? 'Unknown Map'}
          subtitle="Selected for this session"
          selected={true}
          icon={<Check className="h-5 w-5 text-violet-400" />}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditMap(locations.mapId!)}
                className="px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-900/50 rounded"
              >
                Edit Map
              </button>
              <button
                onClick={handleClearSelection}
                className="p-1.5 hover:bg-violet-900/50 rounded text-violet-300"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          }
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Available maps */}
      {!loading && maps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Maps ({maps.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maps.map((map) => {
              const isSelected = locations?.mapId === map.id;
              return (
                <SelectableCard
                  key={map.id}
                  title={map.name}
                  description={map.description}
                  selected={isSelected}
                  onClick={() => handleSelectMap(map.id)}
                  icon={<MapPin className="h-5 w-5" />}
                  badges={isSelected ? <Check className="h-4 w-4 text-violet-400" /> : null}
                >
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span>{map.nodeCount} locations</span>
                    <span>{map.connectionCount} connections</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteMap(map.id, map.name);
                      }}
                      className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 px-2 py-1 rounded"
                      title="Delete Map"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMap(map.id);
                      }}
                      className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 px-2 py-1 rounded"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </SelectableCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && maps.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 mb-2">No location maps yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Create a location map to define the places in your setting
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Your First Map
          </button>
        </div>
      )}
    </div>
  );
}
