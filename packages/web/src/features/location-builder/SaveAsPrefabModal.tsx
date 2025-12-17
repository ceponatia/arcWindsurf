/**
 * SaveAsPrefabModal Component
 * Modal for saving a location subtree as a reusable prefab.
 */
import { useState } from 'react';
import type { LocationNode } from '@minimal-rpg/schemas';
import { Save, X, Loader2 } from 'lucide-react';

export interface SaveAsPrefabModalProps {
  /** The node being saved as a prefab */
  node: LocationNode;
  /** Called when save is confirmed */
  onSave: (name: string, description?: string, category?: string) => Promise<void>;
  /** Called when modal is cancelled */
  onCancel: () => void;
}

/** Category options for prefabs */
const CATEGORY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'building', label: 'Building' },
  { value: 'shop', label: 'Shop' },
  { value: 'tavern', label: 'Tavern' },
  { value: 'house', label: 'House' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'outdoor', label: 'Outdoor Area' },
  { value: 'other', label: 'Other' },
];

export function SaveAsPrefabModal({ node, onSave, onCancel }: SaveAsPrefabModalProps) {
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(name.trim(), description.trim() || undefined, category || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prefab');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Save as Prefab</h2>
            <button
              type="button"
              onClick={onCancel}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={isSaving}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Save <strong>"{node.name}"</strong> and all its children as a reusable prefab that can
              be dropped into any location map.
            </p>

            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefab Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter prefab name..."
                disabled={isSaving}
                autoFocus
              />
            </div>

            {/* Category field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={isSaving}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Describe this prefab..."
                disabled={isSaving}
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Prefab
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
