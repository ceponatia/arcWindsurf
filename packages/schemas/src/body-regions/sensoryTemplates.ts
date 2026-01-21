import type { SensoryTemplate } from './sensoryTemplate.js';

export const WOODLAND_SPIRIT_TEMPLATE: SensoryTemplate = {
  id: 'woodland-spirit',
  name: 'Woodland Spirit',
  description: 'Forest-dweller with earthy, natural notes.',
  tags: ['nature', 'forest', 'earthy'],
  suggestedFor: {
    races: ['Elf', 'Half-Elf', 'Firbolg'],
    occupations: ['ranger', 'druid', 'herbalist'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'mouth'],
  fragments: {
    hair: {
      scent: { primary: 'wildflowers', notes: ['moss', 'rain'], intensity: 0.5 },
      texture: { primary: 'silken', moisture: 'normal', temperature: 'neutral' },
      visual: { description: 'Loose strands threaded with tiny leaf specks.' },
    },
    face: {
      scent: { primary: 'forest loam', notes: ['cedar'], intensity: 0.3 },
      visual: { description: 'Dew-kissed features with a fresh, outdoors glow.' },
    },
    hands: {
      texture: { primary: 'supple', moisture: 'normal', temperature: 'neutral' },
      scent: { primary: 'crushed herbs', notes: ['sage'], intensity: 0.4 },
    },
    torso: {
      scent: { primary: 'pine resin', notes: ['earth'], intensity: 0.35 },
      visual: { description: 'Woven fabrics scented with the forest floor.' },
    },
    mouth: {
      scent: { primary: 'minted herbs', notes: ['sweet bark'], intensity: 0.2 },
    },
  },
};

export const FORGE_WORKER_TEMPLATE: SensoryTemplate = {
  id: 'forge-worker',
  name: 'Forge Worker',
  description: 'Heat, metal, and honest labor etched into every motion.',
  tags: ['forge', 'smoke', 'labor'],
  suggestedFor: {
    occupations: ['blacksmith', 'miner', 'guard'],
  },
  affectedRegions: ['hands', 'arms', 'torso'],
  fragments: {
    hands: {
      scent: { primary: 'coal smoke', notes: ['oil'], intensity: 0.7 },
      texture: { primary: 'calloused', moisture: 'dry', temperature: 'warm' },
      visual: { description: 'Soot-stained knuckles and heat-worn palms.' },
    },
    arms: {
      texture: { primary: 'corded', moisture: 'normal', temperature: 'warm' },
      visual: { description: 'Sleeves marked by ash and metal dust.' },
    },
    torso: {
      scent: { primary: 'iron filings', notes: ['smoke'], intensity: 0.5 },
      visual: { description: 'Apron straps and smudged fabric from long shifts.' },
    },
  },
};

export const NOBLE_REFINED_TEMPLATE: SensoryTemplate = {
  id: 'noble-refined',
  name: 'Noble Refined',
  description: 'Polished grooming with soft perfumes and tailored fabrics.',
  tags: ['refined', 'clean', 'luxury'],
  suggestedFor: {
    occupations: ['noble', 'scholar', 'merchant'],
    alignments: ['Lawful Good', 'Lawful Neutral'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso'],
  fragments: {
    hair: {
      scent: { primary: 'floral perfume', notes: ['citrus'], intensity: 0.4 },
      texture: { primary: 'smooth', moisture: 'normal', temperature: 'neutral' },
      visual: { description: 'Carefully styled hair with a subtle sheen.' },
    },
    face: {
      scent: { primary: 'powdered soap', notes: ['rose'], intensity: 0.25 },
      visual: { description: 'Immaculate features framed by light cosmetics.' },
    },
    hands: {
      scent: { primary: 'lavender soap', notes: ['almond'], intensity: 0.3 },
      texture: { primary: 'soft', moisture: 'normal', temperature: 'neutral' },
      visual: { description: 'Well-kept hands with immaculate grooming.' },
    },
    torso: {
      scent: { primary: 'linen', notes: ['spice'], intensity: 0.2 },
      visual: { description: 'Pressed fabrics layered in luxurious textures.' },
    },
  },
};

export function getSensoryTemplates(): SensoryTemplate[] {
  return [WOODLAND_SPIRIT_TEMPLATE, FORGE_WORKER_TEMPLATE, NOBLE_REFINED_TEMPLATE];
}

export function getSensoryTemplateById(id: string): SensoryTemplate | undefined {
  return getSensoryTemplates().find((template) => template.id === id);
}
