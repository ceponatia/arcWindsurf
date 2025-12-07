import React, { useEffect, useState } from 'react';
import {
  ItemDefinitionSchema,
  type ItemDefinition,
  type ItemCategory,
  type ClothingSlot,
} from '@minimal-rpg/schemas';
import { getErrorMessage, mapZodErrorsToFields, getInlineErrorProps } from '@minimal-rpg/utils';
import { splitList } from '../shared/stringLists.js';
import { getItem, saveItem, deleteItem } from '../../shared/api/client.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';

interface FormState {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  tags: string;
  // Clothing
  clothingSlot: string;
  clothingStyle: string;
  clothingMaterial: string;
  clothingColor: string;
  clothingCondition: string;
  clothingWarmth: string;
  // Weapon
  weaponHandedness: string;
  weaponDamageTypes: string;
  weaponReach: string;
  weaponMaterial: string;
  // Generic/simple
  genericMaterial: string;
  genericSize: string;
  genericWeight: string;
}

const initialState: FormState = {
  id: '',
  name: '',
  category: 'generic',
  type: '',
  description: '',
  tags: '',
  clothingSlot: 'torso',
  clothingStyle: '',
  clothingMaterial: '',
  clothingColor: '',
  clothingCondition: '',
  clothingWarmth: '',
  weaponHandedness: '',
  weaponDamageTypes: '',
  weaponReach: '',
  weaponMaterial: '',
  genericMaterial: '',
  genericSize: '',
  genericWeight: '',
};

type FormKey = keyof FormState;

type FormFieldErrors = Partial<Record<FormKey, string>>;

const ITEM_CATEGORIES: ItemCategory[] = [
  'clothing',
  'weapon',
  'trinket',
  'accessory',
  'consumable',
  'generic',
];

export const ItemBuilder: React.FC<{
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}> = ({ id, onSave: onSaveCallback, onCancel }) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const isEditing = Boolean(id);

  // Load existing item if id is provided
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getItem(id)
      .then((item) => {
        // Map item to form state
        const newForm: FormState = {
          ...initialState,
          id: item.id,
          name: item.name,
          category: item.category,
          type: item.type,
          description: item.description,
          tags: item.tags?.join(', ') ?? '',
        };
        // Map category-specific properties
        if (item.category === 'clothing') {
          newForm.clothingSlot = item.properties.slot;
          newForm.clothingStyle = item.properties.style ?? '';
          newForm.clothingMaterial = item.properties.material ?? '';
          newForm.clothingColor = item.properties.color ?? '';
          newForm.clothingCondition = item.properties.condition ?? '';
          newForm.clothingWarmth = item.properties.warmth?.toString() ?? '';
        } else if (item.category === 'weapon') {
          newForm.weaponHandedness = item.properties.handedness ?? '';
          newForm.weaponDamageTypes = item.properties.damageTypes?.join(', ') ?? '';
          newForm.weaponReach = item.properties.reach ?? '';
          newForm.weaponMaterial = item.properties.material ?? '';
        } else {
          // trinket, accessory, consumable, generic
          newForm.genericMaterial = item.properties.material ?? '';
          newForm.genericSize = item.properties.size ?? '';
          newForm.genericWeight = item.properties.weight?.toString() ?? '';
        }
        setForm(newForm);
        setLoading(false);
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load item'));
        setLoading(false);
      });
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildDefinition(): ItemDefinition {
    const base = {
      id: form.id.trim(),
      name: form.name.trim(),
      type: form.type.trim(),
      description: form.description.trim(),
      tags: splitList(form.tags),
    } as const;

    switch (form.category) {
      case 'clothing':
        return {
          ...base,
          category: 'clothing',
          properties: {
            slot: (form.clothingSlot || 'torso') as ClothingSlot,
            style: form.clothingStyle || undefined,
            material: form.clothingMaterial || undefined,
            color: form.clothingColor || undefined,
            condition: (form.clothingCondition || undefined) as
              | 'pristine'
              | 'worn'
              | 'damaged'
              | 'torn'
              | undefined,
            warmth: form.clothingWarmth ? Number(form.clothingWarmth) : undefined,
          },
        };
      case 'weapon':
        return {
          ...base,
          category: 'weapon',
          properties: {
            handedness: (form.weaponHandedness || undefined) as
              | 'one_handed'
              | 'two_handed'
              | 'either'
              | undefined,
            damageTypes: splitList(form.weaponDamageTypes) as (
              | 'blunt'
              | 'piercing'
              | 'slashing'
              | 'magic'
            )[],
            reach: (form.weaponReach || undefined) as 'short' | 'medium' | 'long' | undefined,
            material: form.weaponMaterial || undefined,
          },
        };
      case 'trinket':
      case 'accessory':
      case 'consumable':
      case 'generic':
      default:
        return {
          ...base,
          category: form.category,
          properties: {
            material: form.genericMaterial || undefined,
            size: (form.genericSize || undefined) as
              | 'tiny'
              | 'small'
              | 'medium'
              | 'large'
              | 'bulky'
              | undefined,
            weight: form.genericWeight ? Number(form.genericWeight) : undefined,
          },
        } as ItemDefinition;
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const definition = buildDefinition();

    const validation = ItemDefinitionSchema.safeParse(definition);
    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
        pathToField: (path) => {
          const key = path[0] as string;
          if (key === 'id' || key === 'name' || key === 'type' || key === 'description') {
            return key as FormKey;
          }
          if (key === 'tags') return 'tags';
          if (key === 'properties') {
            const sub = path.slice(1).join('.');
            const map: Record<string, FormKey> = {
              slot: 'clothingSlot',
              style: 'clothingStyle',
              material: 'clothingMaterial',
              color: 'clothingColor',
              condition: 'clothingCondition',
              warmth: 'clothingWarmth',
              handedness: 'weaponHandedness',
              damageTypes: 'weaponDamageTypes',
              reach: 'weaponReach',
            };
            return map[sub] ?? undefined;
          }
          return undefined as unknown as FormKey;
        },
      });
      setFieldErrors(fieldMap);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }

    try {
      await saveItem(validation.data);
      setSuccess('Saved successfully');
      if (onSaveCallback) onSaveCallback();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save item'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteItem(id);
      if (onCancel) onCancel();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete item'));
    }
  }

  const disabled = saving || loading;

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-200">Item Builder</h2>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">
        {isEditing ? `Edit Item: ${form.name}` : 'Create New Item'}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Details</div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">ID</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.id}
                  onChange={(e) => update('id', e.target.value)}
                  {...getInlineErrorProps('id', fieldErrors.id)}
                />
                {fieldErrors.id && (
                  <span id="id-error" className="text-sm text-red-400">
                    {fieldErrors.id}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Name</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  {...getInlineErrorProps('name', fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <span id="name-error" className="text-sm text-red-400">
                    {fieldErrors.name}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Category</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value as ItemCategory)}
                >
                  {ITEM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Type</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.type}
                  onChange={(e) => update('type', e.target.value)}
                  {...getInlineErrorProps('type', fieldErrors.type)}
                />
                {fieldErrors.type && (
                  <span id="type-error" className="text-sm text-red-400">
                    {fieldErrors.type}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Tags (comma separated)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Description</span>
                <textarea
                  className="min-h-[160px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  {...getInlineErrorProps('description', fieldErrors.description)}
                />
                {fieldErrors.description && (
                  <span id="description-error" className="text-sm text-red-400">
                    {fieldErrors.description}
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Category-specific properties */}
          {form.category === 'clothing' && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                Clothing Properties
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Slot</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingSlot}
                    onChange={(e) => update('clothingSlot', e.target.value)}
                    {...getInlineErrorProps('clothingSlot', fieldErrors.clothingSlot)}
                  >
                    <option value="head">Head</option>
                    <option value="torso">Torso</option>
                    <option value="legs">Legs</option>
                    <option value="feet">Feet</option>
                    <option value="hands">Hands</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Style</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingStyle}
                    onChange={(e) => update('clothingStyle', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Material</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingMaterial}
                    onChange={(e) => update('clothingMaterial', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Color</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingColor}
                    onChange={(e) => update('clothingColor', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Condition</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingCondition}
                    onChange={(e) => update('clothingCondition', e.target.value)}
                  >
                    <option value="">(unspecified)</option>
                    <option value="pristine">Pristine</option>
                    <option value="worn">Worn</option>
                    <option value="damaged">Damaged</option>
                    <option value="torn">Torn</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Warmth (−10 to 10)</span>
                  <input
                    type="number"
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.clothingWarmth}
                    onChange={(e) => update('clothingWarmth', e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {form.category === 'weapon' && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                Weapon Properties
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Handedness</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.weaponHandedness}
                    onChange={(e) => update('weaponHandedness', e.target.value)}
                  >
                    <option value="">(unspecified)</option>
                    <option value="one_handed">One-handed</option>
                    <option value="two_handed">Two-handed</option>
                    <option value="either">Either</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Damage Types (comma separated)</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.weaponDamageTypes}
                    onChange={(e) => update('weaponDamageTypes', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Reach</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.weaponReach}
                    onChange={(e) => update('weaponReach', e.target.value)}
                  >
                    <option value="">(unspecified)</option>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Material</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.weaponMaterial}
                    onChange={(e) => update('weaponMaterial', e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {['trinket', 'accessory', 'consumable', 'generic'].includes(form.category) && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
                General Item Properties
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Material</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.genericMaterial}
                    onChange={(e) => update('genericMaterial', e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Size</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.genericSize}
                    onChange={(e) => update('genericSize', e.target.value)}
                  >
                    <option value="">(unspecified)</option>
                    <option value="tiny">Tiny</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="bulky">Bulky</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Weight</span>
                  <input
                    type="number"
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.genericWeight}
                    onChange={(e) => update('genericWeight', e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <PreviewSidebar
          form={form}
          disabled={disabled}
          saving={saving}
          error={error}
          success={success}
          onSave={() => void handleSave()}
          onCancel={onCancel}
          onDelete={isEditing ? () => handleDelete() : undefined}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
