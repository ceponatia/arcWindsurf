/**
 * LocationMapLibrary Component
 *
 * Lists all location maps and allows creating/editing them.
 * Accessed via the Locations button in the sidebar navigation.
 */
import { useState, useEffect, useCallback } from 'react';
import type { LocationMapListResponse } from '../location-builder/types.js';
import { Plus, RefreshCw, MapPin, Trash2, Edit, Globe } from 'lucide-react';

const API_BASE =
  (import.meta.env['VITE_API_BASE'] as string | undefined) ?? 'http://localhost:3001';

interface LocationMapSummary {
  id: string;
  name: string;
  description?: string;
  settingId: string;
  isTemplate: boolean;
  nodeCount: number;
  connectionCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface SettingSummary {
  id: string;
  name: string;
}

interface LocationMapLibraryProps {
  onEditMap: (mapId: string) => void;
  onCreateMap: (settingId: string) => void;
}

export function LocationMapLibrary({ onEditMap, onCreateMap }: LocationMapLibraryProps) {
  const [maps, setMaps] = useState<LocationMapSummary[]>([]);
  const [settings, setSettings] = useState<SettingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all location maps
  const fetchMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/location-maps`);
      const data = (await res.json()) as LocationMapListResponse;
      if (data.ok && data.maps) {
        setMaps(data.maps);
      } else {
        setError(data.error ?? 'Failed to load location maps');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('[LocationMapLibrary] Error fetching maps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch settings for the create modal
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = (await res.json()) as { ok?: boolean; settings?: SettingSummary[] };
      if (data.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('[LocationMapLibrary] Error fetching settings:', err);
    }
  }, []);

  useEffect(() => {
    void fetchMaps();
    void fetchSettings();
  }, [fetchMaps, fetchSettings]);

  // Delete a map
  const handleDelete = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this location map?')) return;

    try {
      const res = await fetch(`${API_BASE}/location-maps/${mapId}`, { method: 'DELETE' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
      } else {
        alert(data.error ?? 'Failed to delete map');
      }
    } catch (err) {
      alert('Failed to delete map');
      console.error('[LocationMapLibrary] Error deleting map:', err);
    }
  };

  // Find setting name for a map
  const getSettingName = (settingId: string) => {
    const setting = settings.find((s) => s.id === settingId);
    return setting?.name ?? settingId;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Location Maps</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage location maps for your world settings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void fetchMaps()}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Map
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && <div className="text-center py-12 text-slate-400">Loading location maps…</div>}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => void fetchMaps()}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && maps.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No location maps yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Location maps define the places and regions in your world settings.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Map
          </button>
        </div>
      )}

      {/* Map List */}
      {!loading && !error && maps.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <div
              key={map.id}
              onClick={() => onEditMap(map.id)}
              className="text-left p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/70 hover:border-violet-600/50 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-violet-400" />
                  <h3 className="font-medium text-slate-100 group-hover:text-violet-300 transition-colors">
                    {map.name}
                  </h3>
                </div>
                <button
                  onClick={(e) => void handleDelete(map.id, e)}
                  className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete map"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {map.description && (
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{map.description}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {getSettingName(map.settingId)}
                </span>
                <span>{map.nodeCount} locations</span>
              </div>

              {map.tags && map.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {map.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-xs rounded bg-slate-800 text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                  {map.tags.length > 3 && (
                    <span className="px-1.5 py-0.5 text-xs text-slate-500">
                      +{map.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Map Modal */}
      {showCreateModal && (
        <CreateMapModal
          settings={settings}
          onClose={() => setShowCreateModal(false)}
          onCreate={(settingId) => {
            setShowCreateModal(false);
            onCreateMap(settingId);
          }}
        />
      )}
    </div>
  );
}

/** Modal for creating a new map */
interface CreateMapModalProps {
  settings: SettingSummary[];
  onClose: () => void;
  onCreate: (settingId: string) => void;
}

function CreateMapModal({ settings, onClose, onCreate }: CreateMapModalProps) {
  const [selectedSettingId, setSelectedSettingId] = useState<string>(settings[0]?.id ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSettingId) {
      onCreate(selectedSettingId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-slate-700">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-100">Create New Location Map</h2>
            <p className="text-sm text-slate-400 mt-1">
              Select a setting to create a location map for.
            </p>
          </div>

          <div className="p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Setting</label>
            {settings.length === 0 ? (
              <p className="text-sm text-slate-400">
                No settings available. Please create a setting first.
              </p>
            ) : (
              <select
                value={selectedSettingId}
                onChange={(e) => setSelectedSettingId(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {settings.map((setting) => (
                  <option key={setting.id} value={setting.id}>
                    {setting.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSettingId}
              className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Create Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
