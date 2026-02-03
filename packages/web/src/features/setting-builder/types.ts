export interface SettingFormState {
  id: string;
  name: string;
  lore: string;
  themes: string; // Comma-separated
  tags: string; // Comma-separated
  tone: string;
  startingScenario: string;

  // Safety
  safetyRating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | '';
  excludedTopics: string; // Comma-separated
  contentWarnings: string; // Comma-separated

  // Rules
  worldRules: string; // Newline-separated or specialized list handling

  // Factions (Draft state only, not in schema yet)
  factions: FactionEntry[];
}

export interface FactionEntry {
  id: string;
  name: string;
  goal: string;
  relationship: string;
}

export type SettingFormKey = keyof SettingFormState;
export type SettingFormFieldErrors = Partial<Record<SettingFormKey, string>>;

export interface SettingBuilderModeConfig {
  label: string;
  description: string;
  sections: {
    general: boolean;
    rules: boolean;
    time: boolean;
    factions: boolean;
  };
}

export const MODE_CONFIGS = {
  standard: {
    label: 'Standard',
    description: 'Create a complete setting with lore and rules.',
    sections: {
      general: true,
      rules: true,
      time: true,
      factions: true,
    },
  },
} satisfies Record<string, SettingBuilderModeConfig>;
