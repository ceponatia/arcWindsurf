/**
 * Race and Subrace type definitions.
 *
 * Races represent the primary species/ancestry of a character.
 * Subraces represent more specific lineages or variants within a race.
 */

export const RACES = [
  'Human',
  'Elf',
  'Dwarf',
  'Hobbit',
  'Orc',
  'Faerie',
  'Gnome',
  'Daemon',
  'Merfolk',
  'Demigod',
  'Ethereal',
] as const;
export type Race = (typeof RACES)[number];

export const SUBRACES = [
  'Half-Elf',
  'Half-Orc',
  'Half-Troll',
  'Tiefling',
  'Succubus',
  'Abomination',
  'Vampire',
  'Sprite',
  'Pixie',
  'Dryad',
  'Siren',
  'High Elf',
  'Wood Elf',
  'Dark Elf',
  'Mountain Dwarf',
  'Hill Dwarf',
  'Sea Merfolk',
  'River Merfolk',
  'Desire Demon',
  'Fire Demon',
  'Frost Demon',
  'Shadow Demon',
] as const;
export type Subrace = (typeof SUBRACES)[number];

/**
 * Maps each race to its valid subraces.
 * Used for dynamic subrace dropdown filtering in the UI.
 */
export const RACE_SUBRACES: Record<Race, readonly Subrace[]> = {
  Human: ['Half-Elf', 'Half-Orc', 'Half-Troll'],
  Elf: ['Half-Elf', 'High Elf', 'Wood Elf', 'Dark Elf'],
  Dwarf: ['Mountain Dwarf', 'Hill Dwarf'],
  Hobbit: [],
  Orc: ['Half-Orc'],
  Faerie: ['Sprite', 'Pixie', 'Dryad', 'Siren'],
  Gnome: [],
  Daemon: ['Tiefling', 'Succubus', 'Abomination', 'Vampire'],
  Merfolk: ['Sea Merfolk', 'River Merfolk', 'Siren'],
  Demigod: [],
  Ethereal: ['Desire Demon', 'Fire Demon', 'Frost Demon', 'Shadow Demon'],
};
