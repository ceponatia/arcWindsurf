import React, { useMemo, useState } from 'react';
import { API_BASE_URL } from '../config.js';
import { CharacterProfileSchema, type CharacterProfile, type Scent } from '@minimal-rpg/schemas';

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

export const CharacterBuilder: React.FC = () => {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
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
              height: (form.apHeight || 'average') as 'short' | 'average' | 'tall',
              torso: (form.apTorso || 'average') as 'slight' | 'average' | 'athletic' | 'heavy',
              skinTone: form.apSkinTone || 'pale',
              features: form.apFeatures
                ? form.apFeatures
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
              arms: {
                build: (form.apArmsBuild || 'average') as 'average' | 'muscular' | 'slender',
                length: (form.apArmsLength || 'average') as 'average' | 'long' | 'short',
              },
              legs: {
                length: (form.apLegsLength || 'average') as 'average' | 'long' | 'short',
                build: (form.apLegsBuild || 'toned') as
                  | 'very skinny'
                  | 'slender'
                  | 'average'
                  | 'toned'
                  | 'muscular',
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
      const msg = validation.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ');
      setError(msg || 'Validation failed');
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
    <div className="builder">
      <div className="section-card">
        <div className="section-header">Basics</div>
        <div className="section-body">
          <label className="field">
            <span className="field-label">ID</span>
            <input value={form.id} onChange={(e) => update('id', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Name</span>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Age</span>
            <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Tags (comma)</span>
            <input value={form.tags} onChange={(e) => update('tags', e.target.value)} />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Summary</span>
            <textarea value={form.summary} onChange={(e) => update('summary', e.target.value)} />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="field-label">Backstory</span>
            <textarea
              value={form.backstory}
              onChange={(e) => update('backstory', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">Personality</div>
        <div className="section-body full">
          <label className="field">
            <span className="field-label">Traits (string or comma list)</span>
            <input
              value={form.personality}
              onChange={(e) => update('personality', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">Appearance</div>
        <div className="section-body full">
          <div className="inline" style={{ marginBottom: 8 }}>
            <span className="field-label">Input Mode:</span>
            <div className="radio">
              <label className="inline">
                <input
                  type="radio"
                  name="appearanceMode"
                  checked={form.appearanceMode === 'free'}
                  onChange={() => update('appearanceMode', 'free')}
                />
                Free text
              </label>
              <label className="inline">
                <input
                  type="radio"
                  name="appearanceMode"
                  checked={form.appearanceMode === 'structured'}
                  onChange={() => update('appearanceMode', 'structured')}
                />
                Structured
              </label>
            </div>
          </div>
          {form.appearanceMode === 'free' ? (
            <label className="field">
              <span className="field-label">Appearance (free text)</span>
              <textarea
                value={form.appearance}
                onChange={(e) => update('appearance', e.target.value)}
              />
            </label>
          ) : (
            <div className="section-body">
              <label className="field">
                <span className="field-label">Hair Color</span>
                <input
                  value={form.apHairColor}
                  onChange={(e) => update('apHairColor', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Hair Style</span>
                <input
                  value={form.apHairStyle}
                  onChange={(e) => update('apHairStyle', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Hair Length</span>
                <input
                  value={form.apHairLength}
                  onChange={(e) => update('apHairLength', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Eyes Color</span>
                <input
                  value={form.apEyesColor}
                  onChange={(e) => update('apEyesColor', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Height</span>
                <select
                  className="select"
                  value={form.apHeight}
                  onChange={(e) => update('apHeight', e.target.value as FormState['apHeight'])}
                >
                  <option value=""></option>
                  <option value="short">short</option>
                  <option value="average">average</option>
                  <option value="tall">tall</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Torso</span>
                <select
                  className="select"
                  value={form.apTorso}
                  onChange={(e) => update('apTorso', e.target.value as FormState['apTorso'])}
                >
                  <option value=""></option>
                  <option value="slight">slight</option>
                  <option value="average">average</option>
                  <option value="athletic">athletic</option>
                  <option value="heavy">heavy</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Skin Tone</span>
                <input
                  value={form.apSkinTone}
                  onChange={(e) => update('apSkinTone', e.target.value)}
                />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span className="field-label">Features (comma)</span>
                <input
                  value={form.apFeatures}
                  onChange={(e) => update('apFeatures', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Arms Build</span>
                <select
                  className="select"
                  value={form.apArmsBuild}
                  onChange={(e) =>
                    update('apArmsBuild', e.target.value as FormState['apArmsBuild'])
                  }
                >
                  <option value=""></option>
                  <option value="average">average</option>
                  <option value="muscular">muscular</option>
                  <option value="slender">slender</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Arms Length</span>
                <select
                  className="select"
                  value={form.apArmsLength}
                  onChange={(e) =>
                    update('apArmsLength', e.target.value as FormState['apArmsLength'])
                  }
                >
                  <option value=""></option>
                  <option value="average">average</option>
                  <option value="long">long</option>
                  <option value="short">short</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Legs Build</span>
                <select
                  className="select"
                  value={form.apLegsBuild}
                  onChange={(e) =>
                    update('apLegsBuild', e.target.value as FormState['apLegsBuild'])
                  }
                >
                  <option value=""></option>
                  <option value="very skinny">very skinny</option>
                  <option value="slender">slender</option>
                  <option value="average">average</option>
                  <option value="toned">toned</option>
                  <option value="muscular">muscular</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Legs Length</span>
                <select
                  className="select"
                  value={form.apLegsLength}
                  onChange={(e) =>
                    update('apLegsLength', e.target.value as FormState['apLegsLength'])
                  }
                >
                  <option value=""></option>
                  <option value="average">average</option>
                  <option value="long">long</option>
                  <option value="short">short</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">Scent (optional)</div>
        <div className="section-body">
          <label className="field">
            <span className="field-label">Hair Scent</span>
            <select
              className="select"
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
          <label className="field">
            <span className="field-label">Body Scent</span>
            <select
              className="select"
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
          <label className="field">
            <span className="field-label">Perfume</span>
            <input
              value={form.scentPerfume}
              maxLength={40}
              onChange={(e) => update('scentPerfume', e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">Goals & Style</div>
        <div className="section-body">
          <label className="field">
            <span className="field-label">Goals (comma)</span>
            <input value={form.goals} onChange={(e) => update('goals', e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Speaking Style</span>
            <textarea
              value={form.speakingStyle}
              onChange={(e) => update('speakingStyle', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Sentence Length</span>
            <select
              className="select"
              value={form.styleSentenceLength}
              onChange={(e) => update('styleSentenceLength', e.target.value)}
            >
              <option value=""></option>
              <option value="terse">terse</option>
              <option value="balanced">balanced</option>
              <option value="long">long</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Humor</span>
            <select
              className="select"
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
          <label className="field">
            <span className="field-label">Darkness</span>
            <select
              className="select"
              value={form.styleDarkness}
              onChange={(e) => update('styleDarkness', e.target.value)}
            >
              <option value=""></option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Pacing</span>
            <select
              className="select"
              value={form.stylePacing}
              onChange={(e) => update('stylePacing', e.target.value)}
            >
              <option value=""></option>
              <option value="slow">slow</option>
              <option value="balanced">balanced</option>
              <option value="fast">fast</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Formality</span>
            <select
              className="select"
              value={form.styleFormality}
              onChange={(e) => update('styleFormality', e.target.value)}
            >
              <option value=""></option>
              <option value="casual">casual</option>
              <option value="neutral">neutral</option>
              <option value="formal">formal</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Verbosity</span>
            <select
              className="select"
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

      <div className="section-card">
        <div className="section-body full">
          <button
            className={`btn primary${disabled ? ' disabled' : ''}`}
            disabled={disabled}
            onClick={() => {
              void onSave();
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {error && (
            <p className="error" style={{ marginTop: 8 }}>
              Error: {error}
            </p>
          )}
          {success && (
            <p className="success" style={{ marginTop: 8 }}>
              {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
