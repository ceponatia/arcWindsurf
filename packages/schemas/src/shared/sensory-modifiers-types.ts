import type {
  BodyPartHygieneConfig,
  BodyPartSensoryModifiers,
  HygieneLevel,
  SensoryModifiersData,
} from '../state/hygiene.js';

export type LoadedSensoryModifiers = {
  data: SensoryModifiersData;
  bodyParts: Record<string, BodyPartSensoryModifiers>;
  decayRates: Record<string, BodyPartHygieneConfig>;
  getModifier: (
    bodyPart: string,
    senseType: 'smell' | 'touch' | 'taste',
    level: HygieneLevel
  ) => string;
};
