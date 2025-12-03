import React, { useEffect, useState } from 'react';
import { getTags, createTag, updateTag, deleteTag } from '../../shared/api/client.js';
import type { CreateTagRequest } from '@minimal-rpg/schemas';
type TagSummarySafe = Readonly<{
  id: string;
  name: string;
  shortDescription: string | null;
  promptText: string;
}>;

export const TagBuilder: React.FC = () => {
  const [tags, setTags] = useState<TagSummarySafe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<TagSummarySafe | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      const mapped: TagSummarySafe[] = data.map((tag: unknown) => {
        if (!tag || typeof tag !== 'object') {
          return {
            id: '',
            name: '',
            shortDescription: null,
            promptText: '',
          };
        }

        const obj = tag as Record<string, unknown>;

        const rawId = obj['id'];
        const id = typeof rawId === 'string' ? rawId : '';
        const rawName = obj['name'];
        const name = typeof rawName === 'string' ? rawName : '';
        const rawShort = obj['shortDescription'];
        const shortDescription =
          typeof rawShort === 'string' && rawShort.length > 0 ? rawShort : null;
        const rawPrompt = obj['promptText'];
        const promptText = typeof rawPrompt === 'string' ? rawPrompt : '';

        return { id, name, shortDescription, promptText };
      });
      setTags(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const handleSave = async (data: CreateTagRequest) => {
    try {
      if (editingTag) {
        await updateTag(editingTag.id, data);
      } else {
        await createTag(data);
      }
      setEditingTag(null);
      setIsFormVisible(false);
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await deleteTag(id);
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-200">Prompt Tags</h1>
        <a href="#" className="text-slate-400 hover:text-slate-200">
          Back to Chat
        </a>
      </div>

      {error && <div className="p-3 bg-red-900/50 text-red-200 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-300">Existing Tags</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <ul className="space-y-2">
              {tags.map((tag) => (
                <li
                  key={tag.id}
                  className="p-3 bg-slate-800 rounded flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-slate-200">{tag.name}</div>
                    <div className="text-sm text-slate-400">{tag.shortDescription}</div>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(tag.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => {
              setEditingTag(null);
              setIsFormVisible(true);
            }}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
          >
            Create New Tag
          </button>
        </div>
        {isFormVisible && (
          <div className="bg-slate-800 p-4 rounded h-fit">
            <h2 className="text-xl font-semibold text-slate-300 mb-4">
              {editingTag ? 'Edit Tag' : 'New Tag'}
            </h2>
            <TagForm
              initialData={editingTag}
              onSave={(data) => void handleSave(data)}
              onCancel={() => {
                setEditingTag(null);
                setIsFormVisible(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const TagForm: React.FC<{
  initialData: TagSummarySafe | null;
  onSave: (data: CreateTagRequest) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState<string>(initialData?.name ?? '');
  const [shortDescription, setShortDescription] = useState<string>(
    initialData?.shortDescription ?? ''
  );
  const [promptText, setPromptText] = useState<string>(initialData?.promptText ?? '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setShortDescription(initialData.shortDescription ?? '');
      setPromptText(initialData.promptText);
    } else {
      setName('');
      setShortDescription('');
      setPromptText('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, shortDescription, promptText });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-400">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-400">Short Description</label>
        <input
          type="text"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded text-slate-200"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-400">Prompt Text</label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          className="w-full mt-1 p-2 bg-slate-900 border border-slate-700 rounded text-slate-200 h-40"
          required
        />
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
        >
          Save
        </button>
      </div>
    </form>
  );
};
