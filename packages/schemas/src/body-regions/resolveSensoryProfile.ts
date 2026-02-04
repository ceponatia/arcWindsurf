import { getRecordOptional, setPartialRecord } from '../shared/record-helpers.js';
import type { CharacterProfile } from '../character/characterProfile.js';
import type {
  BodyRegionData,
  RegionFlavor,
  RegionScent,
  RegionTexture,
  RegionVisual,
} from './sensory-types.js';
import type { BodyMap } from '../character/body-map.js';
import type { BodyRegion } from '../character/regions.js';
import type {
  SensoryProfileConfig,
  TemplateBlendConfig,
} from '../character/sensoryProfileConfig.js';
import { buildAutoDefaults } from './autoDefaults.js';
import { getSensoryTemplateById } from './sensoryTemplates.js';

export interface ResolvedBodyMap extends BodyMap {
  _meta?: {
    resolvedAt: string;
    sources: string[];
  };
}

export type ResolvedSenseData<T extends object> = T & {
  _attribution?: string[];
};

export interface ResolvedRegionData {
  visual?: ResolvedSenseData<RegionVisual>;
  scent?: ResolvedSenseData<RegionScent>;
  texture?: ResolvedSenseData<RegionTexture>;
  flavor?: ResolvedSenseData<RegionFlavor>;
  appearance?: Record<string, string>;
}

export function resolveSensoryProfile(
  profile: Partial<CharacterProfile>,
  config?: SensoryProfileConfig
): ResolvedBodyMap {
  const result: ResolvedBodyMap = {};
  const sources: string[] = [];
  const effectiveConfig: SensoryProfileConfig = config ?? { autoDefaults: { enabled: true } };

  // Layer 1: Auto-defaults based on race/gender/age
  if (effectiveConfig.autoDefaults?.enabled) {
    const defaults = buildAutoDefaults(profile, effectiveConfig.autoDefaults.excludeRegions);
    const attribution = getAutoDefaultsAttribution(profile);
    applyBodyMap(result, defaults, attribution);
    pushSource(sources, attribution);
  }

  // Layer 2: Template fragments (weighted blend)
  if (effectiveConfig.templateBlend?.templates?.length) {
    applyTemplateBlend(result, effectiveConfig.templateBlend, sources);
  }

  // Layer 3: Conditional augmentations (occupation, etc.)
  if (effectiveConfig.conditionalAugmentations) {
    applyConditionalAugmentations(result, profile, effectiveConfig, sources);
  }

  // Layer 4: Manual overrides (always win)
  if (profile.body) {
    applyBodyMap(result, profile.body, 'override');
    pushSource(sources, 'override');
  }

  result._meta = {
    resolvedAt: new Date().toISOString(),
    sources,
  };

  return result;
}

function applyBodyMap(target: ResolvedBodyMap, source: BodyMap, attribution: string): void {
  for (const [regionKey, data] of Object.entries(source)) {
    if (!data) continue;
    applyRegionData(target, regionKey as BodyRegion, data, attribution);
  }
}

function applyRegionData(
  target: ResolvedBodyMap,
  region: BodyRegion,
  data: Partial<BodyRegionData>,
  attribution: string
): void {
  const current = (getRecordOptional(target, region) ?? {}) as ResolvedRegionData;
  const updated: ResolvedRegionData = { ...current };

  applyVisual(updated, data.visual, attribution);
  applyScent(updated, data.scent, attribution);
  applyTexture(updated, data.texture, attribution);
  applyFlavor(updated, data.flavor, attribution);

  if (data.appearance) {
    updated.appearance = { ...(current.appearance ?? {}), ...data.appearance };
  }

  setPartialRecord(target, region, updated as BodyRegionData);
}

function applyVisual(
  target: ResolvedRegionData,
  data: RegionVisual | undefined,
  attribution: string
): void {
  if (!data) return;
  const current = target.visual;
  target.visual = { ...data, _attribution: [...(current?._attribution ?? []), attribution] };
}

function applyScent(
  target: ResolvedRegionData,
  data: RegionScent | undefined,
  attribution: string
): void {
  if (!data) return;
  const current = target.scent;
  target.scent = { ...data, _attribution: [...(current?._attribution ?? []), attribution] };
}

function applyTexture(
  target: ResolvedRegionData,
  data: RegionTexture | undefined,
  attribution: string
): void {
  if (!data) return;
  const current = target.texture;
  target.texture = { ...data, _attribution: [...(current?._attribution ?? []), attribution] };
}

function applyFlavor(
  target: ResolvedRegionData,
  data: RegionFlavor | undefined,
  attribution: string
): void {
  if (!data) return;
  const current = target.flavor;
  target.flavor = { ...data, _attribution: [...(current?._attribution ?? []), attribution] };
}

function applyTemplateBlend(
  target: ResolvedBodyMap,
  blend: TemplateBlendConfig,
  sources: string[]
): void {
  const templates = blend.templates
    .filter((selection) => selection.weight > 0)
    .slice()
    .sort((a, b) => a.weight - b.weight);

  for (const selection of templates) {
    const template = getSensoryTemplateById(selection.templateId);
    if (!template) {
      console.warn(`[sensory] template not found: ${selection.templateId}`);
      continue;
    }

    const attribution = `template:${template.id}`;
    applyBodyMap(target, template.fragments as BodyMap, attribution);
    pushSource(sources, attribution);
  }
}

function applyConditionalAugmentations(
  target: ResolvedBodyMap,
  profile: Partial<CharacterProfile>,
  config: SensoryProfileConfig,
  sources: string[]
): void {
  const augmentations = config.conditionalAugmentations ?? {};

  if (augmentations['occupation'] && profile.occupation) {
    const augmentation = getOccupationAugmentation(profile.occupation);
    if (augmentation) {
      const attribution = `occupation:${profile.occupation}`;
      applyBodyMap(target, augmentation, attribution);
      pushSource(sources, attribution);
    }
  }
}

function getOccupationAugmentation(occupation: string): BodyMap | undefined {
  const key = occupation.toLowerCase();
  const map: Record<string, BodyMap> = {
    blacksmith: {
      hands: {
        scent: { primary: 'metal filings', notes: ['oil'], intensity: 0.6 },
        texture: { primary: 'calloused', temperature: 'warm', moisture: 'dry' },
      },
    },
    sailor: {
      hands: {
        scent: { primary: 'salt air', notes: ['tar'], intensity: 0.4 },
        texture: { primary: 'rough', temperature: 'cool', moisture: 'damp' },
      },
    },
    scholar: {
      hands: {
        scent: { primary: 'ink', notes: ['paper'], intensity: 0.3 },
        texture: { primary: 'smooth', temperature: 'neutral', moisture: 'normal' },
      },
    },
    herbalist: {
      hands: {
        scent: { primary: 'herb oils', notes: ['sage'], intensity: 0.4 },
        texture: { primary: 'supple', temperature: 'neutral', moisture: 'normal' },
      },
    },
    ranger: {
      hands: {
        scent: { primary: 'pine resin', notes: ['earth'], intensity: 0.4 },
        texture: { primary: 'weathered', temperature: 'neutral', moisture: 'normal' },
      },
    },
  };

  return getRecordOptional(map, key);
}

function getAutoDefaultsAttribution(profile: Partial<CharacterProfile>): string {
  if (profile.race) return `race:${profile.race}`;
  if (profile.gender) return `gender:${profile.gender}`;
  if (typeof profile.age === 'number') return `age:${profile.age}`;
  return 'default';
}

function pushSource(sources: string[], source: string): void {
  if (!sources.includes(source)) {
    sources.push(source);
  }
}
