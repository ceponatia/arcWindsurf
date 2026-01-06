import React, { useState, useCallback, useEffect } from 'react';
import { CharacterProfileSchema, type Gender } from '@minimal-rpg/schemas';
import { generateCharacter, getTheme } from '@minimal-rpg/generator';
import { mapZodErrorsToFields } from '@minimal-rpg/utils';
import { persistCharacter, removeCharacter } from './api.js';
import { BasicsSection } from './components/BasicsSection.js';
import { BodyAppearanceSection } from './components/BodyAppearanceSection.js';
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
    updateBody,
    loading,
    loadError,
  } = useCharacterBuilderForm(id);

  const [mode, setMode] = useState<CharacterBuilderMode>(initialMode);
  const [activeTab, setActiveTab] = useState<'basics' | 'body' | 'personality' | 'details'>(
    'basics'
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const modeConfig = MODE_CONFIGS[mode];
  const isEditing = Boolean(id);

  // Auto-save draft
  useAutoSave(`character-draft-${id ?? 'new'}`, form, 1000, !saving && !loading);

  // Change mode handler - preserves data when switching modes
  const handleModeChange = useCallback(
    (newMode: CharacterBuilderMode) => {
      const complexity = { quick: 0, standard: 1, advanced: 2 };
      if (complexity[newMode] < complexity[mode]) {
        setSuccess(`Switched to ${newMode} mode. Hidden data is preserved.`);
        setTimeout(() => { setSuccess(null); }, 3000);
      }
      setMode(newMode);
    },
    [mode]
  );

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!form.name && !form.id) return; // Skip empty form

      const profile = buildProfile(form);
      const validation = CharacterProfileSchema.safeParse(profile);
      if (!validation.success) {
        const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
          pathToField: (path: (string | number)[]) => {
            const p = path.map(String);
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
      } else {
        setFieldErrors({});
      }
    }, 1000);
    return () => { clearTimeout(timer); };
  }, [form, setFieldErrors]);

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
  const handleGenerate = (section?: 'basics' | 'body' | 'personality' | 'details') => {
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

      if (section) {
        // Section-specific overwrite
        setForm((current) => {
          const next = { ...current };
          switch (section) {
            case 'body':
              next.body = generatedForm.body;
              break;
            case 'personality':
              next.personality = generatedForm.personality;
              next.personalityMap = generatedForm.personalityMap;
              break;
            case 'details':
              next.details = generatedForm.details;
              break;
            case 'basics':
              next.name = generatedForm.name;
              next.age = generatedForm.age;
              next.summary = generatedForm.summary;
              next.backstory = generatedForm.backstory;
              next.tags = generatedForm.tags;
              break;
          }
          return next;
        });
        setSuccess(`Generated ${section}`);
      } else {
        // Default: Merge missing fields (fill-empty)
        setForm((current) => mergeGeneratedIntoForm(current, generatedForm));
        setSuccess('Generated missing fields');
      }
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
    {
      id: 'body',
      label: 'Attributes',
      visible: modeConfig.sections.appearance || modeConfig.sections.body,
    },
    { id: 'personality', label: 'Personality', visible: modeConfig.sections.personality },
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
                onClick={() => { handleModeChange(m); }}
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
                    onClick={() => { setActiveTab(tab.id); }}
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
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => { handleGenerate('basics'); }}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Generate Basics
                  </button>
                </div>
                <BasicsSection
                  form={form}
                  fieldErrors={fieldErrors}
                  updateField={updateField}
                  visibleFields={modeConfig.basicFields}
                />
              </div>
            )}

            {/* Body & Appearance Section */}
            {activeTab === 'body' &&
              (modeConfig.sections.appearance || modeConfig.sections.body) && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => { handleGenerate('body'); }}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Generate Body
                    </button>
                  </div>
                  <BodyAppearanceSection
                    body={form.body}
                    gender={form.gender}
                    race={form.race}
                    updateBody={updateBody}
                  />
                </div>
              )}

            {/* Personality Section */}
            {activeTab === 'personality' && modeConfig.sections.personality && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => { handleGenerate('personality'); }}
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

            {/* Details Section */}
            {activeTab === 'details' && modeConfig.sections.details && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => { handleGenerate('details'); }}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Generate Details
                  </button>
                </div>
                <DetailsSection
                  details={form.details}
                  updateDetailEntry={updateDetailEntry}
                  addDetailEntry={addDetailEntry}
                  removeDetailEntry={removeDetailEntry}
                />
              </div>
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
          onGenerate={() => { handleGenerate(); }}
          onCancel={onCancel}
          onDelete={handleDelete}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
};
