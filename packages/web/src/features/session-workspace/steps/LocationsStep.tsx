/**
 * LocationsStep Component
 * Step for selecting/creating location maps in the session workspace.
 */
import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store.js';
import { LocationBuilder } from '../../location-builder/index.js';
import type { LocationMapListResponse } from '../../location-builder/types.js';
import { MapPin, Plus, Check, Loader2, AlertCircle, X, ExternalLink } from 'lucide-react';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

interface MapSummary {
  id: string;
  name: string;
  description: string | undefined;
  nodeCount: number;
  connectionCount: number;
  createdAt: string;
}

/** Fetch available maps for a setting */
async function fetchMaps(settingId: string): Promise<MapSummary[]> {
  try {
    const res = await fetch(
      `${API_BASE}/location-maps?setting_id=${encodeURIComponent(settingId)}`
    );
    const data = (await res.json()) as unknown as LocationMapListResponse;
    if (data.ok && data.maps) {
      return data.maps.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        nodeCount: m.nodeCount,
        connectionCount: m.connectionCount,
        createdAt: m.createdAt,
      }));
    }
  } catch (err) {
    console.error('Failed to fetch location maps:', err);
  }
  return [];
}

export function LocationsStep() {
  const { locations, setting, setLocations, setStep } = useWorkspaceStore();
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);

  // Get setting ID from workspace state
  const settingId = setting?.settingId;

  // Fetch maps when setting changes
  useEffect(() => {
    if (!settingId) return;

    setIsLoading(true);
    setError(null);

    void fetchMaps(settingId).then((result) => {
      setMaps(result);
      setIsLoading(false);
    });
  }, [settingId]);

  // Select a map
  const handleSelectMap = (mapId: string) => {
    const map = maps.find((m) => m.id === mapId);
    if (map) {
      setLocations({
        mapId: map.id,
        mapName: map.name,
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
    // Refresh maps list
    if (settingId) {
      void fetchMaps(settingId).then(setMaps);
    }
    setShowBuilder(false);
  };

  // Show builder full screen
  if (showBuilder && settingId) {
    const builderProps = {
      settingId,
      onSave: handleBuilderSave,
      onClose: () => setShowBuilder(false),
      ...(editingMapId ? { mapId: editingMapId } : {}),
    };
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <LocationBuilder {...builderProps} />
      </div>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-blue-900">{locations.mapName}</div>
                <div className="text-sm text-blue-700">Selected for this session</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditMap(locations.mapId!)}
                className="px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded"
              >
                Edit Map
              </button>
              <button
                onClick={handleClearSelection}
                className="p-1.5 hover:bg-blue-100 rounded"
                title="Clear selection"
              >
                <X className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
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
      {!isLoading && maps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Maps ({maps.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maps.map((map) => {
              const isSelected = locations?.mapId === map.id;
              return (
                <div
                  key={map.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleSelectMap(map.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}
                      >
                        <MapPin
                          className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}
                        />
                      </div>
                      <div>
                        <div className="font-medium">{map.name}</div>
                        {map.description && (
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {map.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-blue-600" />}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>{map.nodeCount} locations</span>
                    <span>{map.connectionCount} connections</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMap(map.id);
                      }}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && maps.length === 0 && (
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
