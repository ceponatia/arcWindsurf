import { CHARACTER_DETAIL_AREAS, type CharacterDetailArea } from '@minimal-rpg/schemas';
import type {
  ArmsBuildOption,
  ArmsLengthOption,
  CharacterStyleOverrides,
  HeightOption,
  LegsBuildOption,
  LegsLengthOption,
  TorsoBuildOption,
} from '../../types.js';

export interface DetailFormEntry {
  label: string;
  value: string;
  area: CharacterDetailArea;
  importance: string;
  tags: string;
  notes: string;
}

export interface FormState {
  id: string;
  name: string;
  age: number | string;
  summary: string;
  backstory: string;
  tags: string;
  personality: string;
  appearance: string;
  apHairColor: string;
  apHairStyle: string;
  apHairLength: string;
  apEyesColor: string;
  apHeight: HeightOption;
  apTorso: TorsoBuildOption;
  apSkinTone: string;
  apFeatures: string;
  apArmsBuild: ArmsBuildOption;
  apArmsLength: ArmsLengthOption;
  apLegsLength: LegsLengthOption;
  apLegsBuild: LegsBuildOption;
  scentHair: string;
  scentBody: string;
  scentPerfume: string;
  speakingStyle: string;
  styleSentenceLength: string;
  styleHumor: string;
  styleDarkness: string;
  stylePacing: string;
  styleFormality: string;
  styleVerbosity: string;
  details: DetailFormEntry[];
}

export type FormKey = keyof FormState;
export type FormFieldErrors = Partial<Record<FormKey, string>>;
export type UpdateFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
export type StyleValue<K extends keyof CharacterStyleOverrides> = NonNullable<
  CharacterStyleOverrides[K]
>;

export const createDetailEntry = (): DetailFormEntry => ({
  label: '',
  value: '',
  area: CHARACTER_DETAIL_AREAS[0],
  importance: '0.5',
  tags: '',
  notes: '',
});

export const createInitialState = (): FormState => ({
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
  speakingStyle: '',
  styleSentenceLength: '',
  styleHumor: '',
  styleDarkness: '',
  stylePacing: '',
  styleFormality: '',
  styleVerbosity: '',
  details: [createDetailEntry()],
});
