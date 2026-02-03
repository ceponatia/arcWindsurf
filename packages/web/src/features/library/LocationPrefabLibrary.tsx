/**
 * LocationPrefabLibrary Component
 *
 * Standalone library for managing location prefabs (reusable location templates).
 * Accessed via the Locations button in the sidebar navigation.
 *
 * Prefabs are building blocks that users create here and later use when
 * building session-specific location maps in the Session Builder.
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
  X,
  Save,
  DoorOpen,
  Users,
  Tag,
  FileText,
} from 'lucide-react';
import type { LocationType, LocationNode, LocationPort } from '@minimal-rpg/schemas';
import { generateLocalId } from '@minimal-rpg/utils';
import { API_BASE_URL } from '../../config.js';

const API_BASE = API_BASE_URL;

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

interface LocationPrefabLibraryProps {
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

export function LocationPrefabLibrary(_props: LocationPrefabLibraryProps) {
  const { onBack } = _props;
  const [prefabs, setPrefabs] = useState<LocationPrefab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrefab, setEditingPrefab] = useState<LocationPrefab | null>(null);

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
      console.error('[LocationPrefabLibrary] Error fetching prefabs:', err);
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
      console.error('[LocationPrefabLibrary] Error deleting prefab:', err);
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
  const groupedPrefabs = prefabs.reduce((acc, prefab) => {
    const cat = prefab.category ?? 'Uncategorized';
    const existing = acc.get(cat) ?? [];
    acc.set(cat, [...existing, prefab]);
    return acc;
  }, new Map<string, LocationPrefab[]>());

  const categories = Array.from(groupedPrefabs.keys()).sort();

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
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => void fetchPrefabs()}
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
              create once and use in multiple sessions. When creating a new session, you can insert
              prefabs into your location map to quickly build out your world.
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
            Create your first prefab to use as a building block in session maps.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
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
                  {(groupedPrefabs.get(category) ?? []).length} prefab
                  {(groupedPrefabs.get(category) ?? []).length === 1 ? '' : 's'}
                </span>
              </button>

              {/* Prefab Items */}
              {expandedCategories.has(category) && (
                <div className="divide-y divide-slate-700/50">
                  {(groupedPrefabs.get(category) ?? []).map((prefab) => (
                    <div
                      key={prefab.id}
                      className="flex items-start gap-4 p-4 hover:bg-slate-800/30 transition-colors group"
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
                          onClick={() => setEditingPrefab(prefab)}
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

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPrefab) && (
        <PrefabEditorModal
          prefab={editingPrefab}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPrefab(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPrefab(null);
            void fetchPrefabs();
          }}
        />
      )}
    </div>
  );
}

/** Modal for creating/editing a prefab */
interface PrefabEditorModalProps {
  prefab: LocationPrefab | null;
  onClose: () => void;
  onSave: () => void;
}

/** Generate a unique ID for new nodes/ports */
function generateId(prefix: string): string {
  return generateLocalId(prefix);
}

/** Expandable card for editing a location node */
interface LocationNodeEditorProps {
  node: LocationNode;
  onUpdate: (updated: LocationNode) => void;
  onDelete: () => void;
  onAddChild: (type: LocationType) => void;
  children?: React.ReactNode;
}

function LocationNodeEditor({
  node,
  onUpdate,
  onDelete,
  onAddChild,
  children,
}: LocationNodeEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const updateField = <K extends keyof LocationNode>(field: K, value: LocationNode[K]) => {
    onUpdate({ ...node, [field]: value });
  };

  const addPort = () => {
    const newPort: LocationPort = {
      id: generateId('port'),
      name: 'New Exit',
      direction: undefined,
      description: '',
    };
    onUpdate({ ...node, ports: [...(node.ports ?? []), newPort] });
  };

  const updatePort = (portId: string, updates: Partial<LocationPort>) => {
    onUpdate({
      ...node,
      ports: (node.ports ?? []).map((p) => (p.id === portId ? { ...p, ...updates } : p)),
    });
  };

  const removePort = (portId: string) => {
    onUpdate({
      ...node,
      ports: (node.ports ?? []).filter((p) => p.id !== portId),
    });
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = node.tags ?? [];
    if (!currentTags.includes(tag.trim())) {
      onUpdate({ ...node, tags: [...currentTags, tag.trim()] });
    }
  };

  const removeTag = (tag: string) => {
    onUpdate({ ...node, tags: (node.tags ?? []).filter((t) => t !== tag) });
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 overflow-hidden">
      {/* Header - always visible */}
      <div className="flex items-center gap-2 p-3 hover:bg-slate-800/50 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-slate-700 text-slate-400"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <LocationTypeIcon type={node.type} className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={node.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Location name"
          className="flex-1 px-2 py-1 text-sm bg-transparent border-none text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded"
        />
        <span className="text-xs text-slate-500 capitalize px-2 py-0.5 bg-slate-700/50 rounded">
          {node.type}
        </span>
        {(node.ports ?? []).length > 0 && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <DoorOpen className="w-3 h-3" />
            {(node.ports ?? []).length}
          </span>
        )}
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
          title="Delete location"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          {/* Summary & Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                Summary
              </label>
              <input
                type="text"
                value={node.summary ?? ''}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Brief one-line summary"
                maxLength={320}
                className="w-full px-3 py-2 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                <Users className="w-3 h-3 inline mr-1" />
                Capacity
              </label>
              <input
                type="number"
                value={
                  node.properties && typeof node.properties === 'object'
                    ? ((node.properties['capacity'] as number) ?? '')
                    : ''
                }
                onChange={(e) =>
                  updateField('properties', {
                    ...(node.properties ?? {}),
                    capacity: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                placeholder="Max occupants"
                min={0}
                className="w-full px-3 py-2 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              value={node.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Full description of this location..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              <Tag className="w-3 h-3 inline mr-1" />
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(node.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-violet-500/20 text-violet-300"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag and press Enter"
              className="w-full px-3 py-2 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          {/* Ports (Entrances/Exits) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-400">
                <DoorOpen className="w-3 h-3 inline mr-1" />
                Entrances & Exits
              </label>
              <button
                onClick={addPort}
                className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Exit
              </button>
            </div>
            {(node.ports ?? []).length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No exits defined. Add exits to connect this location to others.
              </p>
            ) : (
              <div className="space-y-2">
                {(node.ports ?? []).map((port) => (
                  <div
                    key={port.id}
                    className="flex items-start gap-2 p-2 rounded bg-slate-800/50 border border-slate-700"
                  >
                    <DoorOpen className="w-4 h-4 text-slate-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 grid gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={port.name}
                        onChange={(e) => updatePort(port.id, { name: e.target.value })}
                        placeholder="Exit name"
                        className="px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500"
                      />
                      <input
                        type="text"
                        value={port.direction ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().trim();
                          const validDirs = [
                            'north',
                            'south',
                            'east',
                            'west',
                            'up',
                            'down',
                            'in',
                            'out',
                          ];
                          const dir = validDirs.includes(val)
                            ? (val as
                                | 'north'
                                | 'south'
                                | 'east'
                                | 'west'
                                | 'up'
                                | 'down'
                                | 'in'
                                | 'out')
                            : undefined;
                          updatePort(port.id, { direction: dir });
                        }}
                        placeholder="Direction (north, up...)"
                        className="px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500"
                      />
                      <input
                        type="text"
                        value={port.description ?? ''}
                        onChange={(e) => updatePort(port.id, { description: e.target.value })}
                        placeholder="Description"
                        className="px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500"
                      />
                    </div>
                    <button
                      onClick={() => removePort(port.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add child location buttons */}
          {node.type !== 'room' && (
            <div className="pt-2 border-t border-slate-700">
              <span className="text-xs text-slate-500 mr-2">Add child:</span>
              {node.type === 'region' && (
                <button
                  onClick={() => onAddChild('building')}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 mr-2"
                >
                  + Building
                </button>
              )}
              <button
                onClick={() => onAddChild('room')}
                className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                + Room
              </button>
            </div>
          )}
        </div>
      )}

      {/* Children (nested locations) */}
      {children && <div className="ml-4 border-l border-slate-700 pl-4 pb-2">{children}</div>}
    </div>
  );
}

function PrefabEditorModal({ prefab, onClose, onSave }: PrefabEditorModalProps) {
  const [name, setName] = useState(prefab?.name ?? '');
  const [description, setDescription] = useState(prefab?.description ?? '');
  const [category, setCategory] = useState(prefab?.category ?? '');
  const [nodes, setNodes] = useState<LocationNode[]>(prefab?.nodes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a node to the prefab
  const addNode = (type: LocationType, parentId: string | null) => {
    const newNode: LocationNode = {
      id: generateId('node'),
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      parentId,
      depth: parentId ? (nodes.find((n) => n.id === parentId)?.depth ?? 0) + 1 : 0,
      ports: [],
      tags: [],
    };
    setNodes([...nodes, newNode]);
  };

  // Remove a node (and its children)
  const removeNode = (nodeId: string) => {
    const toRemove = new Set<string>();
    const collectChildren = (id: string) => {
      toRemove.add(id);
      nodes.filter((n) => n.parentId === id).forEach((n) => collectChildren(n.id));
    };
    collectChildren(nodeId);
    setNodes(nodes.filter((n) => !toRemove.has(n.id)));
  };

  // Update a node
  const updateNode = (nodeId: string, updated: LocationNode) => {
    setNodes(nodes.map((n) => (n.id === nodeId ? updated : n)));
  };

  // Save the prefab
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Compute entry points: nodes at depth 0, or nodes with ports that could be entry points
      const entryPoints = nodes.filter((n) => n.depth === 0).map((n) => n.id);

      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        nodes,
        connections: [],
        entryPoints,
      };

      const url = prefab
        ? `${API_BASE}/location-prefabs/${prefab.id}`
        : `${API_BASE}/location-prefabs`;

      const res = await fetch(url, {
        method: prefab ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        onSave();
      } else {
        setError(data.error ?? 'Failed to save prefab');
      }
    } catch (err) {
      setError('Failed to save prefab');
      console.error('[PrefabEditorModal] Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  // Render node tree recursively
  const renderNodeTree = (parentId: string | null): React.ReactNode => {
    const childNodes = nodes.filter((n) => n.parentId === parentId);
    if (childNodes.length === 0) return null;

    return (
      <div className="space-y-2">
        {childNodes.map((node) => (
          <LocationNodeEditor
            key={node.id}
            node={node}
            onUpdate={(updated) => updateNode(node.id, updated)}
            onDelete={() => removeNode(node.id)}
            onAddChild={(type) => addNode(type, node.id)}
          >
            {renderNodeTree(node.id)}
          </LocationNodeEditor>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            {prefab ? 'Edit Prefab' : 'Create New Prefab'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tavern, Dungeon Level"
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., tavern, shop, dungeon"
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Prefab Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="A brief description of what this prefab provides..."
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-300">Locations</label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click a location to expand and edit its properties
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addNode('region', null)}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1"
                >
                  <Mountain className="w-3 h-3" />
                  Region
                </button>
                <button
                  onClick={() => addNode('building', null)}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3" />
                  Building
                </button>
                <button
                  onClick={() => addNode('room', null)}
                  className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1"
                >
                  <Home className="w-3 h-3" />
                  Room
                </button>
              </div>
            </div>

            {nodes.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
                <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Add locations to build your prefab structure
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Start with a region, building, or room, then add children
                </p>
              </div>
            ) : (
              <div className="space-y-2">{renderNodeTree(null)}</div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {prefab ? 'Save Changes' : 'Create Prefab'}
          </button>
        </div>
      </div>
    </div>
  );
}
