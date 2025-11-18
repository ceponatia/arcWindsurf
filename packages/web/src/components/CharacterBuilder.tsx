import React, { useState } from 'react';
import { API_BASE_URL } from '../config.js';
import { CharacterProfileSchema, type CharacterProfile, type Scent } from '@minimal-rpg/schemas';
import { mapZodErrorsToFields, getInlineErrorProps } from '@minimal-rpg/utils';

interface ApiErrorShape {
  ok: false;
  error: unknown;
}

interface FormState {
  id: string;
  name: string;
  age: number | string;
  summary: string;
  backstory: string;
  tags: string;
  personality: string;
  appearance: string; // free text appearance
  appearanceMode: 'free' | 'structured';
  // Structured appearance fields
  apHairColor: string;
  apHairStyle: string;
  apHairLength: string;
  apEyesColor: string;
  apHeight: '' | 'short' | 'average' | 'tall';
  apTorso: '' | 'slight' | 'average' | 'athletic' | 'heavy';
  apSkinTone: string;
  apFeatures: string; // comma separated
  apArmsBuild: '' | 'average' | 'muscular' | 'slender';
  apArmsLength: '' | 'average' | 'long' | 'short';
  apLegsLength: '' | 'average' | 'long' | 'short';
  apLegsBuild: '' | 'very skinny' | 'slender' | 'average' | 'toned' | 'muscular';
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
  appearanceMode: 'free',
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

export const CharacterBuilder: React.FC = () => {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

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
    interface StyleOverrides {
      sentenceLength?: 'terse' | 'balanced' | 'long';
      humor?: 'none' | 'light' | 'wry' | 'dark';
      darkness?: 'low' | 'medium' | 'high';
      pacing?: 'slow' | 'balanced' | 'fast';
      formality?: 'casual' | 'neutral' | 'formal';
      verbosity?: 'terse' | 'balanced' | 'lavish';
    }
    const style: StyleOverrides = {};
    const sl = form.styleSentenceLength.trim();
    const isSentenceLength = (v: string): v is 'terse' | 'balanced' | 'long' =>
      ['terse', 'balanced', 'long'].includes(v);
    if (isSentenceLength(sl)) style.sentenceLength = sl;
    const hum = form.styleHumor.trim();
    const isHumor = (v: string): v is 'none' | 'light' | 'wry' | 'dark' =>
      ['none', 'light', 'wry', 'dark'].includes(v);
    if (isHumor(hum)) style.humor = hum;
    const dark = form.styleDarkness.trim();
    const isDarkness = (v: string): v is 'low' | 'medium' | 'high' =>
      ['low', 'medium', 'high'].includes(v);
    if (isDarkness(dark)) style.darkness = dark;
    const pace = form.stylePacing.trim();
    const isPacing = (v: string): v is 'slow' | 'balanced' | 'fast' =>
      ['slow', 'balanced', 'fast'].includes(v);
    if (isPacing(pace)) style.pacing = pace;
    const formality = form.styleFormality.trim();
    const isFormality = (v: string): v is 'casual' | 'neutral' | 'formal' =>
      ['casual', 'neutral', 'formal'].includes(v);
    if (isFormality(formality)) style.formality = formality;
    const verb = form.styleVerbosity.trim();
    const isVerbosity = (v: string): v is 'terse' | 'balanced' | 'lavish' =>
      ['terse', 'balanced', 'lavish'].includes(v);
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
    const appearance =
      form.appearanceMode === 'free'
        ? form.appearance.trim()
          ? form.appearance.trim()
          : undefined
        : structuredAppearance
          ? {
              hair: {
                color: form.apHairColor || 'brown',
                style: form.apHairStyle || 'straight',
                length: form.apHairLength || 'medium',
              },
              eyes: { color: form.apEyesColor || 'brown' },
              height: form.apHeight || 'average',
              torso: form.apTorso || 'average',
              skinTone: form.apSkinTone || 'pale',
              features: form.apFeatures
                ? form.apFeatures
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
              arms: {
                build: form.apArmsBuild || 'average',
                length: form.apArmsLength || 'average',
              },
              legs: {
                length: form.apLegsLength || 'average',
                build: form.apLegsBuild || 'toned',
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
            if (form.appearanceMode === 'free') return 'appearance';
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
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving;

  return (
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

        {/* Appearance section temporarily disabled pending syntax fix */}

        {/* Scent (optional) temporarily disabled pending syntax fix */}

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
                <option value="terse">terse</option>
                <option value="balanced">balanced</option>
                <option value="long">long</option>
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
                <option value="none">none</option>
                <option value="light">light</option>
                <option value="wry">wry</option>
                <option value="dark">dark</option>
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
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
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
                <option value="slow">slow</option>
                <option value="balanced">balanced</option>
                <option value="fast">fast</option>
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
                <option value="casual">casual</option>
                <option value="neutral">neutral</option>
                <option value="formal">formal</option>
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
                <option value="terse">terse</option>
                <option value="balanced">balanced</option>
                <option value="lavish">lavish</option>
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
              {form.appearanceMode === 'free' && form.appearance && (
                <div className="text-sm text-slate-300">Appearance: {form.appearance}</div>
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
  );
};
