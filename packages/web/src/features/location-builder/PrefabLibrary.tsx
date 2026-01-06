/**
 * PrefabLibrary Component
 * Panel for browsing and inserting prefabs into the location map.
 */
import { useState, useEffect } from 'react';
import type { LocationPrefab, LocationNode } from '@minimal-rpg/schemas';
import { Loader2, Package, Trash2, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

export interface PrefabLibraryProps {
  /** Available prefabs */
  prefabs: LocationPrefab[];
  /** Whether prefabs are loading */
  isLoading: boolean;
  /** Current map nodes (for parent selection) */
  nodes: LocationNode[];
  /** Called when a prefab is selected for insertion */
  onInsertPrefab: (prefab: LocationPrefab, parentId: string | null, entryPointId: string) => void;
  /** Called when a prefab should be deleted */
  onDeletePrefab: (prefabId: string) => void;
  /** Called on mount to load prefabs */
  onLoadPrefabs: () => void;
}

/** Entry point selection modal */
interface InsertPrefabModalProps {
  prefab: LocationPrefab;
  nodes: LocationNode[];
  onConfirm: (parentId: string | null, entryPointId: string) => void;
  onCancel: () => void;
}

function InsertPrefabModal({ prefab, nodes, onConfirm, onCancel }: InsertPrefabModalProps) {
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string>(prefab.entryPoints[0] ?? '');

  // Get parent options (regions and buildings can be parents)
  const parentOptions = nodes.filter((n) => n.type === 'region' || n.type === 'building');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Insert Prefab: {prefab.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose where to insert this prefab and which entry point to use.
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Parent location selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Location (optional)
            </label>
            <select
              value={selectedParent ?? ''}
              onChange={(e) => { setSelectedParent(e.target.value || null); }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">None (top level)</option>
              {parentOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          {/* Entry point selection */}
          {prefab.entryPoints.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Point</label>
              <select
                value={selectedEntry}
                onChange={(e) => { setSelectedEntry(e.target.value); }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {prefab.entryPoints.map((ep) => (
                  <option key={ep} value={ep}>
                    {ep}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            type="button"
            onClick={() => { onConfirm(selectedParent, selectedEntry); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <MapPin className="h-4 w-4" />
            Insert Prefab
          </button>
        </div>
      </div>
    </div>
  );
}

/** Group prefabs by category */
function groupByCategory(prefabs: LocationPrefab[]): Map<string, LocationPrefab[]> {
  const groups = new Map<string, LocationPrefab[]>();
  for (const prefab of prefabs) {
    const cat = prefab.category ?? 'Uncategorized';
    const existing = groups.get(cat) ?? [];
    groups.set(cat, [...existing, prefab]);
  }
  return groups;
}

export function PrefabLibrary({
  prefabs,
  isLoading,
  nodes,
  onInsertPrefab,
  onDeletePrefab,
  onLoadPrefabs,
}: PrefabLibraryProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [insertModal, setInsertModal] = useState<LocationPrefab | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load prefabs on mount
  useEffect(() => {
    onLoadPrefabs();
  }, [onLoadPrefabs]);

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const handleInsertConfirm = (parentId: string | null, entryPointId: string) => {
    if (insertModal) {
      onInsertPrefab(insertModal, parentId, entryPointId);
      setInsertModal(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDeletePrefab(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const grouped = groupByCategory(prefabs);
  const categories = Array.from(grouped.keys()).sort();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Prefab Library</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Drag or click to insert reusable location structures
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : prefabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Package className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No prefabs yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Right-click a location and "Save as Prefab" to create one
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {categories.map((category) => (
              <div key={category}>
                {/* Category header */}
                <button
                  onClick={() => { toggleCategory(category); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="capitalize">{category}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {grouped.get(category)?.length ?? 0}
                  </span>
                </button>

                {/* Prefab items */}
                {expandedCategories.has(category) && (
                  <div className="bg-gray-50">
                    {grouped.get(category)?.map((prefab) => (
                      <div
                        key={prefab.id}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 border-t border-gray-100"
                      >
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {prefab.name}
                          </p>
                          {prefab.description && (
                            <p className="text-xs text-gray-500 truncate">{prefab.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {prefab.nodes.length} locations, {prefab.entryPoints.length} entry
                            {prefab.entryPoints.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setInsertModal(prefab); }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Insert prefab"
                          >
                            Insert
                          </button>
                          <button
                            onClick={() => { setDeleteConfirm(prefab.id); }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Delete prefab"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Insert modal */}
      {insertModal && (
        <InsertPrefabModal
          prefab={insertModal}
          nodes={nodes}
          onConfirm={handleInsertConfirm}
          onCancel={() => { setInsertModal(null); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Prefab?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete this prefab. Existing locations created from it will not
              be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
