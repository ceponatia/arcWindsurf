import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config.js';
import {
  CharacterProfileSchema,
  type CharacterProfile,
  type Scent,
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_HEIGHTS,
  APPEARANCE_LEGS_BUILD,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_TORSOS,
  SPEECH_DARKNESS_LEVELS,
  SPEECH_FORMALITY_LEVELS,
  SPEECH_HUMOR_LEVELS,
  SPEECH_PACING_LEVELS,
  SPEECH_SENTENCE_LENGTHS,
  SPEECH_VERBOSITY_LEVELS,
} from '@minimal-rpg/schemas';
import { mapZodErrorsToFields, getInlineErrorProps } from '@minimal-rpg/utils';
import type {
  ApiErrorShape,
  ArmsBuildOption,
  ArmsLengthOption,
  CharacterStyleOverrides,
  HeightOption,
  LegsBuildOption,
  LegsLengthOption,
  SelectOption,
  TorsoBuildOption,
} from '../types.js';

interface FormState {
  id: string;
  name: string;
  age: number | string;
  summary: string;
  backstory: string;
  tags: string;
  personality: string;
  appearance: string; // free text appearance
  // Structured appearance fields
  apHairColor: string;
  apHairStyle: string;
  apHairLength: string;
  apEyesColor: string;
  apHeight: HeightOption;
  apTorso: TorsoBuildOption;
  apSkinTone: string;
  apFeatures: string; // comma separated
  apArmsBuild: ArmsBuildOption;
  apArmsLength: ArmsLengthOption;
  apLegsLength: LegsLengthOption;
  apLegsBuild: LegsBuildOption;
  scentHair: string;
  scentBody: string;
  scentPerfume: string;
  goals: string;
  speakingStyle: string;
  styleSentenceLength: string;
  styleHumor: string;
  styleDarkness: string;
  stylePacing: string;
  styleFormality: string;
  styleVerbosity: string;
}

const initialState: FormState = {
  id: '',
  name: '',
  age: 21,
  summary: '',
  backstory: '',
  tags: '',
  personality: '',
  appearance: '',
  apHairColor: '',
  apHairStyle: '',
  apHairLength: '',
  apEyesColor: '',
  apHeight: '',
  apTorso: '',
  apSkinTone: '',
  apFeatures: '',
  apArmsBuild: '',
  apArmsLength: '',
  apLegsLength: '',
  apLegsBuild: '',
  scentHair: '',
  scentBody: '',
  scentPerfume: '',
  goals: '',
  speakingStyle: '',
  styleSentenceLength: '',
  styleHumor: '',
  styleDarkness: '',
  stylePacing: '',
  styleFormality: '',
  styleVerbosity: '',
};

type FormKey = keyof FormState;

type FormFieldErrors = Partial<Record<FormKey, string>>;

type StyleValue<K extends keyof CharacterStyleOverrides> = NonNullable<CharacterStyleOverrides[K]>;

const pickOption = <T extends string>(value: SelectOption<T>, fallback: T): T =>
  value ? value : fallback;

export const CharacterBuilder: React.FC<{ id?: string | null; onSave?: () => void }> = ({
  id,
  onSave: onSaveCallback,
}) => {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  useEffect(() => {
    if (id) {
      fetch(`${API_BASE_URL}/characters/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load character');
          return res.json();
        })
        .then((data: CharacterProfile) => {
          const f: FormState = { ...initialState };
          f.id = data.id;
          f.name = data.name;
          f.age = data.age;
          f.summary = data.summary;
          f.backstory = data.backstory ?? '';
          f.tags = (data.tags ?? []).join(', ');
          f.personality = Array.isArray(data.personality)
            ? data.personality.join(', ')
            : data.personality;
          f.goals = (data.goals ?? []).join(', ');
          f.speakingStyle = data.speakingStyle ?? '';

          if (data.appearance && typeof data.appearance !== 'string') {
            f.apHairColor = data.appearance.hair?.color ?? '';
            f.apHairStyle = data.appearance.hair?.style ?? '';
            f.apHairLength = data.appearance.hair?.length ?? '';
            f.apEyesColor = data.appearance.eyes?.color ?? '';
            f.apHeight = data.appearance.height;
            f.apTorso = data.appearance.torso;
            f.apSkinTone = data.appearance.skinTone ?? '';
            f.apFeatures = (data.appearance.features ?? []).join(', ');
            f.apArmsBuild = data.appearance.arms?.build ?? '';
            f.apArmsLength = data.appearance.arms?.length ?? '';
            f.apLegsBuild = data.appearance.legs?.build ?? '';
            f.apLegsLength = data.appearance.legs?.length ?? '';
          }

          if (data.scent) {
            f.scentHair = data.scent.hairScent ?? '';
            f.scentBody = data.scent.bodyScent ?? '';
            f.scentPerfume = data.scent.perfume ?? '';
          }

          if (data.style) {
            f.styleSentenceLength = data.style.sentenceLength ?? '';
            f.styleHumor = data.style.humor ?? '';
            f.styleDarkness = data.style.darkness ?? '';
            f.stylePacing = data.style.pacing ?? '';
            f.styleFormality = data.style.formality ?? '';
            f.styleVerbosity = data.style.verbosity ?? '';
          }

          setForm(f);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load character');
        });
    } else {
      setForm(initialState);
    }
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const tags = form.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const goals = form.goals
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const personalityParts = form.personality
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const personalityValue: string | string[] =
      personalityParts.length > 1 ? personalityParts : (personalityParts[0] ?? '');
    const scent: Partial<Scent> = {};
    const hairVal = form.scentHair.trim();
    if (['floral', 'citrus', 'fresh', 'herbal', 'neutral'].includes(hairVal))
      scent.hairScent = hairVal as Scent['hairScent'];
    const bodyVal = form.scentBody.trim();
    if (['clean', 'fresh', 'neutral', 'light musk'].includes(bodyVal))
      scent.bodyScent = bodyVal as Scent['bodyScent'];
    const perfumeVal = form.scentPerfume.trim();
    if (perfumeVal) scent.perfume = perfumeVal.slice(0, 40);
    const style: CharacterStyleOverrides = {};
    const sl = form.styleSentenceLength.trim();
    const isSentenceLength = (v: string): v is StyleValue<'sentenceLength'> =>
      (SPEECH_SENTENCE_LENGTHS as readonly string[]).includes(v);
    if (isSentenceLength(sl)) style.sentenceLength = sl;
    const hum = form.styleHumor.trim();
    const isHumor = (v: string): v is StyleValue<'humor'> =>
      (SPEECH_HUMOR_LEVELS as readonly string[]).includes(v);
    if (isHumor(hum)) style.humor = hum;
    const dark = form.styleDarkness.trim();
    const isDarkness = (v: string): v is StyleValue<'darkness'> =>
      (SPEECH_DARKNESS_LEVELS as readonly string[]).includes(v);
    if (isDarkness(dark)) style.darkness = dark;
    const pace = form.stylePacing.trim();
    const isPacing = (v: string): v is StyleValue<'pacing'> =>
      (SPEECH_PACING_LEVELS as readonly string[]).includes(v);
    if (isPacing(pace)) style.pacing = pace;
    const formality = form.styleFormality.trim();
    const isFormality = (v: string): v is StyleValue<'formality'> =>
      (SPEECH_FORMALITY_LEVELS as readonly string[]).includes(v);
    if (isFormality(formality)) style.formality = formality;
    const verb = form.styleVerbosity.trim();
    const isVerbosity = (v: string): v is StyleValue<'verbosity'> =>
      (SPEECH_VERBOSITY_LEVELS as readonly string[]).includes(v);
    if (isVerbosity(verb)) style.verbosity = verb;
    // Build appearance depending on input mode
    const structuredAppearance =
      form.apHeight ||
      form.apTorso ||
      form.apSkinTone ||
      form.apFeatures ||
      form.apHairColor ||
      form.apHairStyle ||
      form.apHairLength ||
      form.apEyesColor ||
      form.apArmsBuild ||
      form.apArmsLength ||
      form.apLegsBuild ||
      form.apLegsLength;
    const appearance = structuredAppearance
      ? {
          hair: {
            color: form.apHairColor || 'brown',
            style: form.apHairStyle || 'straight',
            length: form.apHairLength || 'medium',
          },
          eyes: { color: form.apEyesColor || 'brown' },
          height: pickOption(form.apHeight, 'average'),
          torso: pickOption(form.apTorso, 'average'),
          skinTone: form.apSkinTone || 'pale',
          features: form.apFeatures
            ? form.apFeatures
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          arms: {
            build: pickOption(form.apArmsBuild, 'average'),
            length: pickOption(form.apArmsLength, 'average'),
          },
          legs: {
            length: pickOption(form.apLegsLength, 'average'),
            build: pickOption(form.apLegsBuild, 'toned'),
          },
        }
      : undefined;

    const profile: CharacterProfile = {
      id: form.id.trim(),
      name: form.name.trim(),
      age: Number.parseInt(String(form.age), 10),
      summary: form.summary.trim(),
      backstory: form.backstory.trim(),
      tags,
      personality: personalityValue,
      goals,
      speakingStyle: form.speakingStyle.trim(),
      ...(appearance ? { appearance } : {}),
      ...(Object.keys(scent).length ? { scent } : {}),
      ...(Object.keys(style).length ? { style } : {}),
    };
    // Client-side validation to catch issues early
    const validation = CharacterProfileSchema.safeParse(profile);
    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
        pathToField: (path: (string | number)[]) => {
          const p = path.map(String);
          if (p[0] === 'appearance') {
            const map: Record<string, FormKey> = {
              'hair.color': 'apHairColor',
              'hair.style': 'apHairStyle',
              'hair.length': 'apHairLength',
              'eyes.color': 'apEyesColor',
              height: 'apHeight',
              torso: 'apTorso',
              skinTone: 'apSkinTone',
              'arms.build': 'apArmsBuild',
              'arms.length': 'apArmsLength',
              'legs.build': 'apLegsBuild',
              'legs.length': 'apLegsLength',
            };
            const key = map[p.slice(1).join('.')];
            return key;
          }
          const top: Record<string, FormKey> = {
            id: 'id',
            name: 'name',
            age: 'age',
            summary: 'summary',
            backstory: 'backstory',
            personality: 'personality',
            goals: 'goals',
            speakingStyle: 'speakingStyle',
          };
          const key = p[0];
          if (!key) return undefined as unknown as FormKey;
          return top[key];
        },
      });
      setFieldErrors(fieldMap);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const json: unknown = await res.json();
      const isErrorShape = (j: unknown): j is ApiErrorShape =>
        typeof j === 'object' && j !== null && 'ok' in j && (j as { ok: unknown }).ok === false;
      if (!res.ok || isErrorShape(json)) {
        const errMsg = isErrorShape(json) ? JSON.stringify(json.error) : 'Failed';
        setError(errMsg || 'Failed');
      } else {
        setSuccess('Character saved.');
        if (onSaveCallback) onSaveCallback();
        window.location.hash = '';
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Character Builder</h2>
        <a
          href="#"
          className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors text-sm font-medium"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '';
          }}
        >
          Back to Chat
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Basics</div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <span className="text-xs text-slate-400">Age</span>
                <input
                  type="number"
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  {...getInlineErrorProps('age', fieldErrors.age)}
                />
                {fieldErrors.age && (
                  <span id="age-error" className="text-sm text-red-400">
                    {fieldErrors.age}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Tags (comma)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-slate-400">Summary</span>
                <textarea
                  className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.summary}
                  onChange={(e) => update('summary', e.target.value)}
                  {...getInlineErrorProps('summary', fieldErrors.summary)}
                />
                {fieldErrors.summary && (
                  <span id="summary-error" className="text-sm text-red-400">
                    {fieldErrors.summary}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-slate-400">Backstory</span>
                <textarea
                  className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.backstory}
                  onChange={(e) => update('backstory', e.target.value)}
                  {...getInlineErrorProps('backstory', fieldErrors.backstory)}
                />
                {fieldErrors.backstory && (
                  <span id="backstory-error" className="text-sm text-red-400">
                    {fieldErrors.backstory}
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Personality</div>
            <div className="p-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Traits (string or comma list)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.personality}
                  onChange={(e) => update('personality', e.target.value)}
                  {...getInlineErrorProps('personality', fieldErrors.personality)}
                />
                {fieldErrors.personality && (
                  <span id="personality-error" className="text-sm text-red-400">
                    {fieldErrors.personality}
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Appearance</div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Hair Color</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apHairColor}
                    onChange={(e) => update('apHairColor', e.target.value)}
                    {...getInlineErrorProps('apHairColor', fieldErrors.apHairColor)}
                  />
                  {fieldErrors.apHairColor && (
                    <span id="apHairColor-error" className="text-sm text-red-400">
                      {fieldErrors.apHairColor}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Hair Style</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apHairStyle}
                    onChange={(e) => update('apHairStyle', e.target.value)}
                    {...getInlineErrorProps('apHairStyle', fieldErrors.apHairStyle)}
                  />
                  {fieldErrors.apHairStyle && (
                    <span id="apHairStyle-error" className="text-sm text-red-400">
                      {fieldErrors.apHairStyle}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Hair Length</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apHairLength}
                    onChange={(e) => update('apHairLength', e.target.value)}
                    {...getInlineErrorProps('apHairLength', fieldErrors.apHairLength)}
                  />
                  {fieldErrors.apHairLength && (
                    <span id="apHairLength-error" className="text-sm text-red-400">
                      {fieldErrors.apHairLength}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Eye Color</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apEyesColor}
                    onChange={(e) => update('apEyesColor', e.target.value)}
                    {...getInlineErrorProps('apEyesColor', fieldErrors.apEyesColor)}
                  />
                  {fieldErrors.apEyesColor && (
                    <span id="apEyesColor-error" className="text-sm text-red-400">
                      {fieldErrors.apEyesColor}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Height</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apHeight}
                    onChange={(e) => update('apHeight', e.target.value as FormState['apHeight'])}
                    {...getInlineErrorProps('apHeight', fieldErrors.apHeight)}
                  >
                    <option value=""></option>
                    {APPEARANCE_HEIGHTS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apHeight && (
                    <span id="apHeight-error" className="text-sm text-red-400">
                      {fieldErrors.apHeight}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Torso Build</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apTorso}
                    onChange={(e) => update('apTorso', e.target.value as FormState['apTorso'])}
                    {...getInlineErrorProps('apTorso', fieldErrors.apTorso)}
                  >
                    <option value=""></option>
                    {APPEARANCE_TORSOS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apTorso && (
                    <span id="apTorso-error" className="text-sm text-red-400">
                      {fieldErrors.apTorso}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs text-slate-400">Skin Tone</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apSkinTone}
                    onChange={(e) => update('apSkinTone', e.target.value)}
                    {...getInlineErrorProps('apSkinTone', fieldErrors.apSkinTone)}
                  />
                  {fieldErrors.apSkinTone && (
                    <span id="apSkinTone-error" className="text-sm text-red-400">
                      {fieldErrors.apSkinTone}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs text-slate-400">Features (comma)</span>
                  <input
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apFeatures}
                    onChange={(e) => update('apFeatures', e.target.value)}
                    {...getInlineErrorProps('apFeatures', fieldErrors.apFeatures)}
                  />
                  {fieldErrors.apFeatures && (
                    <span id="apFeatures-error" className="text-sm text-red-400">
                      {fieldErrors.apFeatures}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Arms Build</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apArmsBuild}
                    onChange={(e) =>
                      update('apArmsBuild', e.target.value as FormState['apArmsBuild'])
                    }
                    {...getInlineErrorProps('apArmsBuild', fieldErrors.apArmsBuild)}
                  >
                    <option value=""></option>
                    {APPEARANCE_ARMS_BUILD.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apArmsBuild && (
                    <span id="apArmsBuild-error" className="text-sm text-red-400">
                      {fieldErrors.apArmsBuild}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Arms Length</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apArmsLength}
                    onChange={(e) =>
                      update('apArmsLength', e.target.value as FormState['apArmsLength'])
                    }
                    {...getInlineErrorProps('apArmsLength', fieldErrors.apArmsLength)}
                  >
                    <option value=""></option>
                    {APPEARANCE_ARMS_LENGTH.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apArmsLength && (
                    <span id="apArmsLength-error" className="text-sm text-red-400">
                      {fieldErrors.apArmsLength}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Legs Build</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apLegsBuild}
                    onChange={(e) =>
                      update('apLegsBuild', e.target.value as FormState['apLegsBuild'])
                    }
                    {...getInlineErrorProps('apLegsBuild', fieldErrors.apLegsBuild)}
                  >
                    <option value=""></option>
                    {APPEARANCE_LEGS_BUILD.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apLegsBuild && (
                    <span id="apLegsBuild-error" className="text-sm text-red-400">
                      {fieldErrors.apLegsBuild}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Legs Length</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={form.apLegsLength}
                    onChange={(e) =>
                      update('apLegsLength', e.target.value as FormState['apLegsLength'])
                    }
                    {...getInlineErrorProps('apLegsLength', fieldErrors.apLegsLength)}
                  >
                    <option value=""></option>
                    {APPEARANCE_LEGS_LENGTH.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.apLegsLength && (
                    <span id="apLegsLength-error" className="text-sm text-red-400">
                      {fieldErrors.apLegsLength}
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
              Scent (optional)
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Hair Scent</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.scentHair}
                  onChange={(e) => update('scentHair', e.target.value)}
                >
                  <option value=""></option>
                  <option value="floral">floral</option>
                  <option value="citrus">citrus</option>
                  <option value="fresh">fresh</option>
                  <option value="herbal">herbal</option>
                  <option value="neutral">neutral</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Body Scent</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.scentBody}
                  onChange={(e) => update('scentBody', e.target.value)}
                >
                  <option value=""></option>
                  <option value="clean">clean</option>
                  <option value="fresh">fresh</option>
                  <option value="neutral">neutral</option>
                  <option value="light musk">light musk</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Perfume (max 40 chars)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.scentPerfume}
                  maxLength={40}
                  onChange={(e) => update('scentPerfume', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Goals & Style</div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Goals (comma)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.goals}
                  onChange={(e) => update('goals', e.target.value)}
                  {...getInlineErrorProps('goals', fieldErrors.goals)}
                />
                {fieldErrors.goals && (
                  <span id="goals-error" className="text-sm text-red-400">
                    {fieldErrors.goals}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Speaking Style</span>
                <textarea
                  className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.speakingStyle}
                  onChange={(e) => update('speakingStyle', e.target.value)}
                  {...getInlineErrorProps('speakingStyle', fieldErrors.speakingStyle)}
                />
                {fieldErrors.speakingStyle && (
                  <span id="speakingStyle-error" className="text-sm text-red-400">
                    {fieldErrors.speakingStyle}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Sentence Length</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.styleSentenceLength}
                  onChange={(e) => update('styleSentenceLength', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_SENTENCE_LENGTHS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Humor</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.styleHumor}
                  onChange={(e) => update('styleHumor', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_HUMOR_LEVELS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Darkness</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.styleDarkness}
                  onChange={(e) => update('styleDarkness', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_DARKNESS_LEVELS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Pacing</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.stylePacing}
                  onChange={(e) => update('stylePacing', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_PACING_LEVELS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Formality</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.styleFormality}
                  onChange={(e) => update('styleFormality', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_FORMALITY_LEVELS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Verbosity</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.styleVerbosity}
                  onChange={(e) => update('styleVerbosity', e.target.value)}
                >
                  <option value=""></option>
                  {SPEECH_VERBOSITY_LEVELS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-0">
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Preview</div>
              <div className="p-4 space-y-2">
                <div className="text-lg font-semibold">{form.name || 'Unnamed Character'}</div>
                <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
                <div className="text-sm text-slate-400">Age: {String(form.age || '')}</div>
                <div className="text-sm text-slate-300">{form.summary || 'No summary yet.'}</div>
                {form.personality && (
                  <div className="text-sm text-slate-300">Personality: {form.personality}</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <button
                className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
                  disabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                disabled={disabled}
                onClick={() => {
                  void onSave();
                }}
              >
                {saving ? 'Saving…' : 'Save Character'}
              </button>
              {error && <p className="mt-2 text-sm text-red-400">Error: {error}</p>}
              {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
