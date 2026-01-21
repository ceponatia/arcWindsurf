export const COMMON_OCCUPATIONS = [
  'blacksmith',
  'sailor',
  'scholar',
  'herbalist',
  'merchant',
  'soldier',
  'noble',
  'farmer',
  'thief',
  'priest',
  'healer',
  'ranger',
  'bard',
  'alchemist',
  'hunter',
  'cook',
  'innkeeper',
  'guard',
  'miner',
  'woodcutter',
] as const;

export type CommonOccupation = (typeof COMMON_OCCUPATIONS)[number];
