/**
 * Location View Component
 *
 * Main view for location management that shows prefab list with option
 * to open the canvas-based prefab builder.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Package,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  MapPin,
  Building2,
  Home,
  Mountain,
  Loader2,
} from 'lucide-react';
import type { LocationType, LocationNode } from '@minimal-rpg/schemas';
import { PrefabBuilder } from '../prefab-builder/index.js';

const API_BASE =
  (import.meta.env['VITE_API_BASE'] as string | undefined) ?? 'http://localhost:3001';

interface LocationPrefab {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: LocationNode[];
  connections: { id: string; fromLocationId: string; toLocationId: string }[];
  entryPoints: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface LocationViewProps {
  onBack?: () => void;
}

/** Icon for location type */
function LocationTypeIcon({ type, className }: { type: LocationType; className?: string }) {
  switch (type) {
    case 'region':
      return <Mountain className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'room':
      return <Home className={className} />;
    default:
      return <MapPin className={className} />;
  }
}

/** View mode for the location view */
type LocationViewMode = 'list' | 'builder';

export function LocationView({ onBack }: LocationViewProps) {
  const [viewMode, setViewMode] = useState<LocationViewMode>('list');
  const [selectedPrefabId, setSelectedPrefabId] = useState<string | null>(null);

  /** Open builder for a new prefab */
  const handleCreateNew = () => {
    setSelectedPrefabId(null);
    setViewMode('builder');
  };

  /** Open builder for an existing prefab */
  const handleEdit = (prefabId: string) => {
    setSelectedPrefabId(prefabId);
    setViewMode('builder');
  };

  /** Return to list view */
  const handleBackToList = () => {
    setSelectedPrefabId(null);
    setViewMode('list');
  };

  if (viewMode === 'builder') {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <PrefabBuilder
          prefabId={selectedPrefabId}
          onSave={handleBackToList}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  return (
    <PrefabListView
      onBack={onBack ?? undefined}
      onCreateNew={handleCreateNew}
      onEdit={handleEdit}
    />
  );
}

/** Props for the prefab list view */
interface PrefabListViewProps {
  onBack: (() => void) | undefined;
  onCreateNew: () => void;
  onEdit: (prefabId: string) => void;
}

/** List view showing all prefabs */
function PrefabListView({ onCreateNew, onEdit }: PrefabListViewProps) {
  const [prefabs, setPrefabs] = useState<LocationPrefab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));

  // Fetch all prefabs
  const fetchPrefabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/location-prefabs`);
      const data = (await res.json()) as {
        ok?: boolean;
        prefabs?: LocationPrefab[];
        error?: string;
      };
      if (data.ok && data.prefabs) {
        setPrefabs(data.prefabs);
      } else {
        setError(data.error ?? 'Failed to load prefabs');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('[LocationView] Error fetching prefabs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrefabs();
  }, [fetchPrefabs]);

  // Delete a prefab
  const handleDelete = async (prefabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prefab?')) return;

    try {
      const res = await fetch(`${API_BASE}/location-prefabs/${prefabId}`, { method: 'DELETE' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setPrefabs((prev) => prev.filter((p) => p.id !== prefabId));
      } else {
        alert(data.error ?? 'Failed to delete prefab');
      }
    } catch (err) {
      alert('Failed to delete prefab');
      console.error('[LocationView] Error deleting prefab:', err);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group prefabs by category
  const groupedPrefabs = prefabs.reduce(
    (acc, prefab) => {
      const cat = prefab.category ?? 'Uncategorized';
      acc[cat] ??= [];
      acc[cat].push(prefab);
      return acc;
    },
    {} as Record<string, LocationPrefab[]>
  );

  const categories = Object.keys(groupedPrefabs).sort();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Location Prefabs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create reusable location templates for your session maps
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void fetchPrefabs()}
            className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Prefab
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-slate-200">What are Prefabs?</h3>
            <p className="text-sm text-slate-400 mt-1">
              Prefabs are reusable location templates (like a tavern, shop, or dungeon) that you
              create once and use in multiple sessions. Use the visual canvas editor to drag and
              drop locations, create connections, and define entry/exit points.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          Loading prefabs…
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => void fetchPrefabs()}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && prefabs.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No prefabs yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Create your first prefab using our visual canvas editor.
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Prefab
          </button>
        </div>
      )}

      {/* Prefab List by Category */}
      {!loading && !error && prefabs.length > 0 && (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="rounded-lg border border-slate-700 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <span className="font-medium text-slate-200 capitalize">{category}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {(groupedPrefabs[category] ?? []).length} prefab
                  {(groupedPrefabs[category] ?? []).length === 1 ? '' : 's'}
                </span>
              </button>

              {/* Prefab Items */}
              {expandedCategories.has(category) && (
                <div className="divide-y divide-slate-700/50">
                  {(groupedPrefabs[category] ?? []).map((prefab) => (
                    <div
                      key={prefab.id}
                      onClick={() => onEdit(prefab.id)}
                      className="flex items-start gap-4 p-4 hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-100">{prefab.name}</h3>
                        {prefab.description && (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {prefab.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {prefab.nodes.length} location{prefab.nodes.length === 1 ? '' : 's'}
                          </span>
                          <span>
                            {prefab.entryPoints.length} entry point
                            {prefab.entryPoints.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {/* Show node preview */}
                        {prefab.nodes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {prefab.nodes.slice(0, 5).map((node) => (
                              <span
                                key={node.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-400"
                              >
                                <LocationTypeIcon type={node.type} className="w-3 h-3" />
                                {node.name}
                              </span>
                            ))}
                            {prefab.nodes.length > 5 && (
                              <span className="px-2 py-0.5 text-xs text-slate-500">
                                +{prefab.nodes.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(prefab.id);
                          }}
                          className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Edit prefab"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => void handleDelete(prefab.id, e)}
                          className="p-2 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete prefab"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
