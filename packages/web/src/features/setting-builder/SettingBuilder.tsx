import React, { useState } from 'react';
import { SettingBackgroundSchema } from '@minimal-rpg/schemas';
import { mapZodErrorsToFields } from '@minimal-rpg/utils';
import { saveSetting, deleteSetting } from '../../shared/api/client.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';
import { SettingGeneralForm } from './components/SettingGeneralForm.js';
import { SettingRulesForm } from './components/SettingRulesForm.js';
import { SettingTimeConfig } from './components/SettingTimeConfig.js';
import { SettingFactionsForm } from './components/SettingFactionsForm.js';
import { useSettingBuilderForm } from './hooks/useSettingBuilderForm.js';
import { buildProfile } from './transformers.js';
import { MODE_CONFIGS, type SettingFormFieldErrors, type SettingFormKey } from './types.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';

export const SettingBuilder: React.FC<{
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}> = ({ id, onSave: onSaveCallback, onCancel }) => {
  const { form, fieldErrors, setFieldErrors, updateField, loading, loadError } =
    useSettingBuilderForm(id);

  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'time' | 'factions'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-save draft
  useAutoSave(`setting-draft-${id ?? 'new'}`, form, 1000, !saving && !loading);

  const isEditing = Boolean(id);
  const modeConfig = MODE_CONFIGS.standard; // Only standard mode for now

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    await deleteSetting(id);
    window.location.hash = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const profile = buildProfile(form);

    const validation = SettingBackgroundSchema.safeParse(profile);

    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<SettingFormKey>(validation.error, {
        pathToField: (path) => {
          const key = path[0] as string;
          // Map known top-level keys
          if (['id', 'name', 'lore', 'themes', 'tags', 'tone', 'startingScenario'].includes(key)) {
            return key as SettingFormKey;
          }
          return undefined as unknown as SettingFormKey;
        },
      });
      setFieldErrors(fieldMap as SettingFormFieldErrors);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }

    try {
      const result = await saveSetting(profile);
      const savedId = result.setting?.id;
      if (savedId && savedId !== form.id) {
        updateField('id', savedId);
        if (!id) {
          window.location.hash = `#/setting-builder?id=${encodeURIComponent(savedId)}`;
        }
      }
      setSuccess('Saved successfully');
      if (onSaveCallback) onSaveCallback();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || loading;

  const tabs = [
    { id: 'general', label: 'General', visible: modeConfig.sections.general },
    { id: 'rules', label: 'Rules & Safety', visible: modeConfig.sections.rules },
    { id: 'time', label: 'Time & Sim', visible: modeConfig.sections.time },
    { id: 'factions', label: 'Factions', visible: modeConfig.sections.factions },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Setting Builder</h2>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading setting...</p>}
      {loadError && !loading && <p className="text-sm text-amber-300">{loadError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 mb-4 overflow-x-auto">
            {tabs.map(
              (tab) =>
                tab.visible && (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                    px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-violet-500 text-violet-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }
                  `}
                  >
                    {tab.label}
                  </button>
                )
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {activeTab === 'general' && (
              <SettingGeneralForm form={form} fieldErrors={fieldErrors} updateField={updateField} />
            )}
            {activeTab === 'rules' && (
              <SettingRulesForm form={form} fieldErrors={fieldErrors} updateField={updateField} />
            )}
            {activeTab === 'time' && <SettingTimeConfig />}
            {activeTab === 'factions' && <SettingFactionsForm />}
          </div>
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
          onDelete={handleDelete}
          isEditing={isEditing}
          // Edit mode is always active in this new design
          isInEditMode={true}
          onEdit={() => undefined}
          closeLabel="Close"
        />
      </div>
    </div>
  );
};
