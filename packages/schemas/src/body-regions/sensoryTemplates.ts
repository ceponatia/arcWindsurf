// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.
// Source JSON: packages/schemas/src/body-regions/templates-json

import type { SensoryTemplate } from './sensoryTemplate.js';

export const ARCANE_SCHOLAR_TEMPLATE: SensoryTemplate = {
  id: 'arcane-scholar',
  name: 'Arcane Scholar',
  description: 'Ink, parchment, and quiet candlelight from late study.',
  tags: ['arcane', 'ink', 'study'],
  suggestedFor: {
    occupations: ['mage', 'scholar', 'scribe'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'feet', 'groin', 'mouth'],
  fragments: {
    hair: {
      scent: {
        primary: 'violet ink',
        notes: ['lavender'],
        intensity: 0.25,
      },
      texture: {
        primary: 'smooth',
        moisture: 'normal',
        temperature: 'neutral',
      },
      visual: {
        description: 'Neatly kept with a faint ink sheen.',
      },
    },
    face: {
      scent: {
        primary: 'powdered parchment',
        notes: ['vanilla'],
        intensity: 0.2,
      },
      visual: {
        description: 'Soft glow from late-night study.',
      },
    },
    hands: {
      scent: {
        primary: 'ink-stained vellum',
        notes: ['wax'],
        intensity: 0.35,
      },
      texture: {
        primary: 'delicate',
        moisture: 'dry',
        temperature: 'neutral',
      },
      visual: {
        description: 'Fingertips smudged with ink.',
      },
    },
    torso: {
      scent: {
        primary: 'library dust',
        notes: ['cedar'],
        intensity: 0.25,
      },
      visual: {
        description: 'Robes lined with stitched sigils.',
      },
    },
    feet: {
      scent: {
        primary: 'chalk dust',
        notes: ['linen'],
        intensity: 0.2,
      },
      texture: {
        primary: 'soft',
        moisture: 'dry',
        temperature: 'cool',
      },
      visual: {
        description: 'Soft-soled shoes dusted with chalk.',
      },
    },
    groin: {
      scent: {
        primary: 'pressed linen',
        notes: ['sage'],
        intensity: 0.15,
      },
      visual: {
        description: 'Layered garments kept orderly.',
      },
    },
    mouth: {
      scent: {
        primary: 'herbal tea',
        notes: ['honey'],
        intensity: 0.2,
      },
    },
  },
};

export const CITY_COURIER_TEMPLATE: SensoryTemplate = {
  id: 'city-courier',
  name: 'City Courier',
  description: 'Rain-slick streets, leather satchels, and quick footsteps.',
  tags: ['city', 'rain', 'brisk', 'leather'],
  suggestedFor: {
    occupations: ['courier', 'messenger', 'runner'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'feet', 'groin', 'mouth'],
  fragments: {
    hair: {
      scent: {
        primary: 'rain mist',
        notes: ['stone'],
        intensity: 0.25,
      },
      texture: {
        primary: 'tousled',
        moisture: 'damp',
        temperature: 'cool',
      },
      visual: {
        description: 'Quick-dried and tucked back.',
      },
    },
    face: {
      scent: {
        primary: 'cool air',
        notes: ['metal'],
        intensity: 0.2,
      },
      visual: {
        description: 'Alert eyes with a quick smile.',
      },
    },
    hands: {
      scent: {
        primary: 'leather glove',
        notes: ['ink'],
        intensity: 0.3,
      },
      texture: {
        primary: 'calloused',
        moisture: 'normal',
        temperature: 'cool',
      },
      visual: {
        description: 'Ink-stained fingertips.',
      },
    },
    torso: {
      scent: {
        primary: 'city rain',
        notes: ['linen'],
        intensity: 0.25,
      },
      visual: {
        description: 'Messenger jacket with worn edges.',
      },
    },
    feet: {
      scent: {
        primary: 'street dust',
        notes: ['rain'],
        intensity: 0.3,
      },
      texture: {
        primary: 'rough',
        moisture: 'damp',
        temperature: 'cool',
      },
      visual: {
        description: 'Boots marked by cobblestones.',
      },
    },
    groin: {
      scent: {
        primary: 'fresh cotton',
        notes: ['soap'],
        intensity: 0.15,
      },
      visual: {
        description: 'Practical layers kept clean.',
      },
    },
    mouth: {
      scent: {
        primary: 'peppermint',
        notes: ['citrus'],
        intensity: 0.15,
      },
    },
  },
};

export const COASTAL_VOYAGER_TEMPLATE: SensoryTemplate = {
  id: 'coastal-voyager',
  name: 'Coastal Voyager',
  description: 'Salt air, weathered canvas, and the steady pull of the tide.',
  tags: ['coastal', 'salt', 'travel', 'sea'],
  suggestedFor: {
    occupations: ['sailor', 'fisher', 'navigator'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'feet', 'groin', 'mouth'],
  fragments: {
    hair: {
      scent: {
        primary: 'sea salt',
        notes: ['kelp', 'spray'],
        intensity: 0.4,
      },
      texture: {
        primary: 'windswept',
        moisture: 'damp',
        temperature: 'cool',
      },
      visual: {
        description: 'Sun-lightened strands tied back against the wind.',
      },
    },
    face: {
      scent: {
        primary: 'salt air',
        notes: ['citrus'],
        intensity: 0.2,
      },
      visual: {
        description: 'Wind-brushed cheeks with a bronze glow.',
      },
    },
    hands: {
      scent: {
        primary: 'tarred rope',
        notes: ['brine'],
        intensity: 0.35,
      },
      texture: {
        primary: 'rough',
        moisture: 'dry',
        temperature: 'cool',
      },
      visual: {
        description: 'Calluses marked with faint salt lines.',
      },
    },
    torso: {
      scent: {
        primary: 'brine-soaked canvas',
        notes: ['pine'],
        intensity: 0.3,
      },
      visual: {
        description: 'Weathered layers with stitched repairs.',
      },
    },
    feet: {
      scent: {
        primary: 'wet sand',
        notes: ['driftwood'],
        intensity: 0.3,
      },
      texture: {
        primary: 'rough',
        moisture: 'damp',
        temperature: 'cool',
      },
      visual: {
        description: 'Boots speckled with sand and salt.',
      },
    },
    groin: {
      scent: {
        primary: 'clean linen',
        notes: ['sea breeze'],
        intensity: 0.15,
      },
      visual: {
        description: 'Travel wraps kept fresh where possible.',
      },
    },
    mouth: {
      scent: {
        primary: 'minted tea',
        notes: ['salt'],
        intensity: 0.15,
      },
    },
  },
};

export const DESERT_NOMAD_TEMPLATE: SensoryTemplate = {
  id: 'desert-nomad',
  name: 'Desert Nomad',
  description: 'Sun-baked sands, warm spice, and steady endurance.',
  tags: ['desert', 'spice', 'sun', 'travel'],
  suggestedFor: {
    occupations: ['scout', 'nomad', 'caravanner'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'feet', 'groin', 'mouth'],
  fragments: {
    hair: {
      scent: {
        primary: 'sun-baked sand',
        notes: ['amber'],
        intensity: 0.35,
      },
      texture: {
        primary: 'coarse',
        moisture: 'dry',
        temperature: 'warm',
      },
      visual: {
        description: 'Braided to keep out grit.',
      },
    },
    face: {
      scent: {
        primary: 'warm spice',
        notes: ['cumin'],
        intensity: 0.25,
      },
      visual: {
        description: 'Sun-weathered with a steady gaze.',
      },
    },
    hands: {
      scent: {
        primary: 'leather and dust',
        notes: ['sage'],
        intensity: 0.3,
      },
      texture: {
        primary: 'calloused',
        moisture: 'dry',
        temperature: 'warm',
      },
      visual: {
        description: 'Wrapped in travel cloth.',
      },
    },
    torso: {
      scent: {
        primary: 'spiced linen',
        notes: ['cedar'],
        intensity: 0.3,
      },
      visual: {
        description: 'Layered wraps in desert hues.',
      },
    },
    feet: {
      scent: {
        primary: 'sun-warmed leather',
        notes: ['sand'],
        intensity: 0.35,
      },
      texture: {
        primary: 'rough',
        moisture: 'dry',
        temperature: 'warm',
      },
      visual: {
        description: 'Sand-scuffed sandals.',
      },
    },
    groin: {
      scent: {
        primary: 'cool cloth',
        notes: ['mint'],
        intensity: 0.15,
      },
      visual: {
        description: 'Breathable wraps tied tight for travel.',
      },
    },
    mouth: {
      scent: {
        primary: 'sweet tea',
        notes: ['cardamom'],
        intensity: 0.2,
      },
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
  affectedRegions: ['hands', 'arms', 'torso', 'feet', 'groin'],
  fragments: {
    hands: {
      scent: {
        primary: 'coal smoke',
        notes: ['oil'],
        intensity: 0.7,
      },
      texture: {
        primary: 'calloused',
        moisture: 'dry',
        temperature: 'warm',
      },
      visual: {
        description: 'Soot-stained knuckles and heat-worn palms.',
      },
    },
    arms: {
      texture: {
        primary: 'corded',
        moisture: 'normal',
        temperature: 'warm',
      },
      visual: {
        description: 'Sleeves marked by ash and metal dust.',
      },
    },
    torso: {
      scent: {
        primary: 'iron filings',
        notes: ['smoke'],
        intensity: 0.5,
      },
      visual: {
        description: 'Apron straps and smudged fabric from long shifts.',
      },
    },
    feet: {
      scent: {
        primary: 'coal ash',
        notes: ['iron'],
        intensity: 0.45,
      },
      texture: {
        primary: 'rough',
        moisture: 'dry',
        temperature: 'warm',
      },
      visual: {
        description: 'Boots scuffed by cinders and workshop grit.',
      },
    },
    groin: {
      scent: {
        primary: 'fresh soap',
        notes: ['leather'],
        intensity: 0.2,
      },
      visual: {
        description: 'Practical layers kept tidy for long shifts.',
      },
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
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'feet', 'groin'],
  fragments: {
    hair: {
      scent: {
        primary: 'floral perfume',
        notes: ['citrus'],
        intensity: 0.4,
      },
      texture: {
        primary: 'smooth',
        moisture: 'normal',
        temperature: 'neutral',
      },
      visual: {
        description: 'Carefully styled hair with a subtle sheen.',
      },
    },
    face: {
      scent: {
        primary: 'powdered soap',
        notes: ['rose'],
        intensity: 0.25,
      },
      visual: {
        description: 'Immaculate features framed by light cosmetics.',
      },
    },
    hands: {
      scent: {
        primary: 'lavender soap',
        notes: ['almond'],
        intensity: 0.3,
      },
      texture: {
        primary: 'soft',
        moisture: 'normal',
        temperature: 'neutral',
      },
      visual: {
        description: 'Well-kept hands with immaculate grooming.',
      },
    },
    torso: {
      scent: {
        primary: 'linen',
        notes: ['spice'],
        intensity: 0.2,
      },
      visual: {
        description: 'Pressed fabrics layered in luxurious textures.',
      },
    },
    feet: {
      scent: {
        primary: 'powdered sandalwood',
        notes: ['linen'],
        intensity: 0.2,
      },
      texture: {
        primary: 'soft',
        moisture: 'normal',
        temperature: 'neutral',
      },
      visual: {
        description: 'Polished shoes with a gentle sheen.',
      },
    },
    groin: {
      scent: {
        primary: 'lavender linen',
        notes: ['vanilla'],
        intensity: 0.15,
      },
      visual: {
        description: 'Tailored layers kept neat and composed.',
      },
    },
  },
};

export const WOODLAND_SPIRIT_TEMPLATE: SensoryTemplate = {
  id: 'woodland-spirit',
  name: 'Woodland Spirit',
  description: 'Forest-dweller with earthy, natural notes.',
  tags: ['nature', 'forest', 'earthy'],
  suggestedFor: {
    races: ['Elf', 'Half-Elf', 'Firbolg'],
    occupations: ['ranger', 'druid', 'herbalist'],
  },
  affectedRegions: ['hair', 'face', 'hands', 'torso', 'mouth', 'feet', 'groin'],
  fragments: {
    hair: {
      scent: {
        primary: 'wildflowers',
        notes: ['moss', 'rain'],
        intensity: 0.5,
      },
      texture: {
        primary: 'silken',
        moisture: 'normal',
        temperature: 'neutral',
      },
      visual: {
        description: 'Loose strands threaded with tiny leaf specks.',
      },
    },
    face: {
      scent: {
        primary: 'forest loam',
        notes: ['cedar'],
        intensity: 0.3,
      },
      visual: {
        description: 'Dew-kissed features with a fresh, outdoors glow.',
      },
    },
    hands: {
      texture: {
        primary: 'supple',
        moisture: 'normal',
        temperature: 'neutral',
      },
      scent: {
        primary: 'crushed herbs',
        notes: ['sage'],
        intensity: 0.4,
      },
    },
    torso: {
      scent: {
        primary: 'pine resin',
        notes: ['earth'],
        intensity: 0.35,
      },
      visual: {
        description: 'Woven fabrics scented with the forest floor.',
      },
    },
    mouth: {
      scent: {
        primary: 'minted herbs',
        notes: ['sweet bark'],
        intensity: 0.2,
      },
    },
    feet: {
      scent: {
        primary: 'damp earth',
        notes: ['pine', 'stone'],
        intensity: 0.25,
      },
      texture: {
        primary: 'grounded',
        moisture: 'damp',
        temperature: 'cool',
      },
      visual: {
        description: 'Trail-worn soles dusted with forest loam.',
      },
    },
    groin: {
      scent: {
        primary: 'clean linen',
        notes: ['wild herbs'],
        intensity: 0.15,
      },
      visual: {
        description: 'Soft layers of travel-worn cloth.',
      },
    },
  },
};

export function getSensoryTemplates(): SensoryTemplate[] {
  return [
    ARCANE_SCHOLAR_TEMPLATE,
    CITY_COURIER_TEMPLATE,
    COASTAL_VOYAGER_TEMPLATE,
    DESERT_NOMAD_TEMPLATE,
    FORGE_WORKER_TEMPLATE,
    NOBLE_REFINED_TEMPLATE,
    WOODLAND_SPIRIT_TEMPLATE,
  ];
}

export function getSensoryTemplateById(id: string): SensoryTemplate | undefined {
  return getSensoryTemplates().find((template) => template.id === id);
}
