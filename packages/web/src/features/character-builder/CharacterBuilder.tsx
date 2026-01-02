import React, { useState, useCallback } from 'react';
import { CharacterProfileSchema, type Gender } from '@minimal-rpg/schemas';
import { generateCharacter, getTheme } from '@minimal-rpg/generator';
import { mapZodErrorsToFields } from '@minimal-rpg/utils';
import { persistCharacter, removeCharacter } from './api.js';
import { AppearanceSection } from './components/AppearanceSection.js';
import { BasicsSection } from './components/BasicsSection.js';
import { BodySection } from './components/BodySection.js';
import { DetailsSection } from './components/DetailsSection.js';
import { PersonalitySection } from './components/PersonalitySection.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';
import {
  useCharacterBuilderForm,
  mapProfileToForm,
  mergeGeneratedIntoForm,
} from './hooks/useCharacterBuilderForm.js';
import {
  MODE_CONFIGS,
  type CharacterBuilderMode,
  type FormFieldErrors,
  type FormKey,
} from './types.js';
import { buildProfile } from './transformers.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';

export const CharacterBuilder: React.FC<{
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
  initialMode?: CharacterBuilderMode;
}> = ({ id, onSave: onSaveCallback, onCancel, initialMode = 'standard' }) => {
  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateDetailEntry,
    addDetailEntry,
    removeDetailEntry,
    updateBodyEntry,
    addBodyEntry,
    removeBodyEntry,
    updateAppearanceEntry,
    addAppearanceEntry,
    removeAppearanceEntry,
    loading,
    loadError,
  } = useCharacterBuilderForm(id);

  const [mode, setMode] = useState<CharacterBuilderMode>(initialMode);
  const [activeTab, setActiveTab] = useState<
    'basics' | 'appearance' | 'personality' | 'body' | 'details'
  >('basics');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const modeConfig = MODE_CONFIGS[mode];
  const isEditing = Boolean(id);

  // Auto-save draft
  useAutoSave(`character-draft-${id ?? 'new'}`, form, 1000, !saving && !loading);

  // Change mode handler - preserves data when switching modes
  const handleModeChange = useCallback((newMode: CharacterBuilderMode) => {
    setMode(newMode);
  }, []);

  const handleDelete = async () => {
    if (!id) return;
    setError(null);
    await removeCharacter(id);
    window.location.hash = '';
  };

  /**
   * Generate missing fields using the generator and merge into form.
   * Uses fill-empty mode to preserve user-entered data.
   */
  const handleGenerate = () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Determine theme based on gender (if set)
      const gender = form.gender.trim().toLowerCase() as Gender | '';
      const themeId =
        gender === 'male' ? 'modern-man' : gender === 'female' ? 'modern-woman' : 'base';
      const theme = getTheme(themeId);

      // Generate a complete character
      const { character } = generateCharacter({
        theme,
        mode: 'overwrite-all',
      });

      // Convert generated CharacterProfile to FormState
      const generatedForm = mapProfileToForm(character);

      // Merge generated data into existing form, preserving user values
      setForm((current) => mergeGeneratedIntoForm(current, generatedForm));

      setSuccess('Generated missing fields');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const profile = buildProfile(form);
    const validation = CharacterProfileSchema.safeParse(profile);
    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
        pathToField: (path: (string | number)[]) => {
          const p = path.map(String);
          // Map validation errors for top-level fields
          const top: Record<string, FormKey> = {
            id: 'id',
            name: 'name',
            age: 'age',
            summary: 'summary',
            backstory: 'backstory',
            personality: 'personality',
          };
          const key = p[0];
          if (!key) return undefined;
          return Object.hasOwn(top, key) ? top[key] : undefined;
        },
      });
      setFieldErrors(fieldMap as FormFieldErrors);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }

    try {
      await persistCharacter(profile);
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
    { id: 'basics', label: 'Basics', visible: modeConfig.sections.basics },
    { id: 'appearance', label: 'Appearance', visible: modeConfig.sections.appearance },
    { id: 'personality', label: 'Personality', visible: modeConfig.sections.personality },
    { id: 'body', label: 'Body', visible: modeConfig.sections.body },
    { id: 'details', label: 'Details', visible: modeConfig.sections.details },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header with Mode Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Character Builder</h2>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
          {(['quick', 'standard', 'advanced'] as const).map((m) => {
            const config = MODE_CONFIGS[m];
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`
                  px-3 py-1.5 text-sm rounded transition-all
                  ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }
                `}
                title={`${config.label}: ${config.description} (${config.fieldCount})`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Description */}
      <p className="text-xs text-slate-500">
        {modeConfig.label} mode: {modeConfig.description} ({modeConfig.fieldCount})
      </p>

      {loading && <p className="text-sm text-slate-400">Loading character…</p>}
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
            {/* Basics Section */}
            {activeTab === 'basics' && modeConfig.sections.basics && (
              <BasicsSection
                form={form}
                fieldErrors={fieldErrors}
                updateField={updateField}
                visibleFields={modeConfig.basicFields}
              />
            )}

            {/* Appearance Section */}
            {activeTab === 'appearance' && modeConfig.sections.appearance && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleGenerate()}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Generate Appearance
                  </button>
                </div>
                <AppearanceSection
                  appearances={form.appearances}
                  gender={form.gender}
                  updateAppearanceEntry={updateAppearanceEntry}
                  addAppearanceEntry={addAppearanceEntry}
                  removeAppearanceEntry={removeAppearanceEntry}
                />
              </div>
            )}

            {/* Personality Section */}
            {activeTab === 'personality' && modeConfig.sections.personality && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleGenerate()}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Generate Personality
                  </button>
                </div>
                <PersonalitySection
                  form={form}
                  fieldErrors={fieldErrors}
                  updateField={updateField}
                  isAdvanced={mode === 'advanced'}
                />
              </div>
            )}

            {/* Body Section */}
            {activeTab === 'body' && modeConfig.sections.body && (
              <BodySection
                bodySensory={form.bodySensory}
                gender={form.gender}
                updateBodyEntry={updateBodyEntry}
                addBodyEntry={addBodyEntry}
                removeBodyEntry={removeBodyEntry}
              />
            )}

            {/* Details Section */}
            {activeTab === 'details' && modeConfig.sections.details && (
              <DetailsSection
                details={form.details}
                updateDetailEntry={updateDetailEntry}
                addDetailEntry={addDetailEntry}
                removeDetailEntry={removeDetailEntry}
              />
            )}
          </div>
        </div>

        <PreviewSidebar
          form={form}
          disabled={disabled}
          saving={saving}
          generating={generating}
          error={error}
          success={success}
          loadError={loadError}
          onSave={() => {
            void handleSave();
          }}
          onGenerate={() => handleGenerate()}
          onCancel={onCancel}
          onDelete={handleDelete}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
