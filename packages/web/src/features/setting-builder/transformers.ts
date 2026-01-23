import type { SettingBackground } from '@minimal-rpg/schemas';
import { splitList } from '../shared/stringLists.js';
import type { SettingFormState } from './types.js';

type SafetyRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

// Temporary type definitions until schema changes propagate
interface SettingSafety {
  rating?: SafetyRating;
  excludedTopics?: string[];
  contentWarnings?: string[];
}

type ExtendedSettingBackground = SettingBackground & {
  tone?: string;
  startingScenario?: string;
  safety?: SettingSafety;
  worldRules?: string[];
};

export const initialFormState: SettingFormState = {
  id: '',
  name: '',
  lore: '',
  themes: '',
  tags: '',
  tone: '',
  startingScenario: '',
  safetyRating: '',
  excludedTopics: '',
  contentWarnings: '',
  worldRules: '',
  factions: [],
};

export function createInitialFormState(): SettingFormState {
  return {
    ...initialFormState,
    id: crypto.randomUUID(),
  };
}

export const mapProfileToForm = (profile: SettingBackground): SettingFormState => {
  const p = profile as ExtendedSettingBackground;
  return {
    id: p.id,
    name: p.name,
    lore: p.lore,
    themes: (p.themes ?? []).join(', '),
    tags: (p.tags ?? []).join(', '),
    tone: p.tone ?? '',
    startingScenario: p.startingScenario ?? '',
    safetyRating: p.safety?.rating ?? '',
    excludedTopics: (p.safety?.excludedTopics ?? []).join(', '),
    contentWarnings: (p.safety?.contentWarnings ?? []).join(', '),
    worldRules: (p.worldRules ?? []).join('\n'),
    factions: [], // Factions are not in schema yet
  };
};

export const buildProfile = (form: SettingFormState): SettingBackground => {
  const themes = splitList(form.themes);
  const tags = splitList(form.tags);
  const worldRules = form.worldRules
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  const excludedTopics = splitList(form.excludedTopics);
  const contentWarnings = splitList(form.contentWarnings);

  const safety: SettingSafety | undefined =
    form.safetyRating || excludedTopics.length > 0 || contentWarnings.length > 0
      ? {
        ...(form.safetyRating ? { rating: form.safetyRating as SafetyRating } : {}),
        ...(excludedTopics.length > 0 ? { excludedTopics } : {}),
        ...(contentWarnings.length > 0 ? { contentWarnings } : {}),
      }
      : undefined;

  return {
    id: form.id.trim(),
    name: form.name.trim(),
    lore: form.lore.trim(),
    ...(themes.length > 0 ? { themes } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(form.tone.trim() ? { tone: form.tone.trim() } : {}),
    ...(form.startingScenario.trim() ? { startingScenario: form.startingScenario.trim() } : {}),
    ...(worldRules.length > 0 ? { worldRules } : {}),
    ...(safety ? { safety } : {}),
  } as SettingBackground;
};
