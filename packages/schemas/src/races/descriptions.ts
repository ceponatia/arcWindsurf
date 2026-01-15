/**
 * Race and Subrace descriptions for use in LLM prompts.
 *
 * These brief descriptions help characterize NPCs and can be included
 * in system prompts to make character responses more authentic.
 */

import type { Race, Subrace } from './types.js';

/**
 * Brief descriptions of each race for prompt injection.
 */
export const RACE_DESCRIPTIONS: Record<Race, string> = {
  Human:
    'Versatile and adaptable, humans are ambitious and diverse in their pursuits. They form the backbone of most civilizations and excel through determination rather than innate gifts.',
  Elf:
    'Long-lived and graceful, elves possess keen senses and a deep connection to nature and magic. They tend toward patience and view the world through centuries of experience.',
  Dwarf:
    'Stout and resilient, dwarves are master craftsmen with an affinity for stone and metal. They value tradition, honor their ancestors, and hold grudges for generations.',
  Hobbit:
    'Small and unassuming, hobbits prefer comfort and simple pleasures. Despite their peaceful nature, they possess surprising courage and resilience when tested.',
  Orc:
    'Powerful and fierce, orcs are warriors born with a deep respect for strength and combat prowess. They live by codes of honor that outsiders often misunderstand.',
  Faerie:
    'Ethereal beings of the wild places, faeries are capricious and magical by nature. They see the world through a lens of wonder and mischief. They are the most widely varied in their alignments; some can be kind and helpful, others mischievous or even malevolent.',
  Gnome:
    'Clever and inventive, gnomes combine curiosity with technical brilliance. They delight in puzzles, mechanisms, and uncovering hidden knowledge. Smaller than dwarves and more proportionate, like a young teen rather than a short, rotund adult.',
  Daemon:
    'Born of infernal heritage, daemons carry the mark of otherworldly planes. They navigate mortal society while contending with their darker nature. Despite suspicion surrounding them, not all daemons are evil, though few are truly good.',
  Merfolk:
    'Graceful denizens of the deep, merfolk command the mysteries of the ocean. They possess an alien perspective shaped by life beneath the waves.',
  Demigod:
    'Touched by divine blood, demigods walk between mortal and immortal realms. They carry the weight of destiny and powers beyond ordinary ken.',
  Ethereal:
    'Although demigod may be an incorrect classification for them, Ethereals possess the same godlike power as demigods. Hailing from immaterial planes and dimensions, they are often misunderstood and feared. Partly incorporeal, they can phase through physical matter and are largely unaffected by conventional weapons, but can still interact with physical objects and people when they wish.',
};

/**
 * Brief descriptions of each subrace for prompt injection.
 */
export const SUBRACE_DESCRIPTIONS: Record<Subrace, string> = {
  'Half-Elf':
    'Caught between two worlds, half-elves blend human adaptability with elven grace. They are looked down upon and distrusted by both of their mother races.',
  'Half-Orc':
    'Bearing the strength of orcs and the versatility of humans, half-orcs face prejudice from both sides while forging their own path.',
  'Half-Troll':
    'Rare and often feared, half-trolls inherit regenerative abilities and imposing stature. They struggle against assumptions of savagery. Smaller than a full blooded troll and much more dimwitted than a human.',
  Tiefling:
    'The offspring of one of the humanoid races and daemons, sporting a more humanoid appearance, tieflings often hide their heritage. Horns, tails, or unusual eyes betray their infernal blood. The most common Tieflings sport furry legs with cloven feet, leathery tails, and long single-pronged horns.',
  Succubus:
    'Seductive and manipulative, succubi are masters of charm and illusion. They feed on desire and often struggle with genuine connection. Unlike vampires, succubi can only be female and are not undead or cursed, they were born this way. Some succubi have integrated into society and are less malevolent than their wilder brethren, but should still be approached with caution.',
  Abomination:
    'Twisted by chaotic infernal energies, abominations bear visible marks of their otherworldly nature. They inspire fear even among their kin. Their transformations can range from simple mutations to being completely unrecognizable from their former race.',
  Vampire:
    'Vampires are undead beings afflicted with a disease-borne curse that feed on the life force of others. The layperson considers them to be male succubi, but they are not related at all and can be both male and female. Contrary to popular belief, vampires cannot charm a person\'s mind the way succubi do.',
  Sprite:
    'Tiny and swift, sprites are guardians of wild places. They possess potent magic despite their diminutive size.',
  Pixie:
    'Playful tricksters of the fae realm, pixies delight in pranks and illusions. Their mischief rarely causes lasting harm.',
  Dryad:
    'Bound to trees and forests, dryads embody the spirit of growing things. They are fierce protectors of their woodland homes. Some humans brush them off as silly treefolk, but an angered Dryad community is extremely dangerous.',
  Siren:
    'Part daemon, part faerie, possessing haunting voices that can enchant or destroy. Sirens dwell where water meets shore. Their songs carry both beauty and danger. These are some of the most malevolent faeries.',
  'High Elf':
    'Noble and magically gifted, high elves consider themselves guardians of ancient wisdom. They can seem aloof to shorter-lived races.',
  'Wood Elf':
    'At home in deep forests, wood elves are skilled hunters and trackers. They live in harmony with nature and distrust civilization. Wood elves are often allied with and found living near Dryads and Sprites.',
  'Dark Elf':
    'Dwelling in shadow, dark elves have adapted to lightless realms. They are cunning survivors with a complex society built on intrigue.',
  'Mountain Dwarf':
    'Hardy even by dwarven standards, mountain dwarves are legendary warriors and smiths. They carve their homes from living rock.',
  'Hill Dwarf':
    'More connected to surface communities, hill dwarves are skilled traders and brewers. They balance tradition with pragmatic adaptation.',
  'Sea Merfolk':
    'Rulers of the open ocean, sea merfolk navigate vast distances and command the creatures of the deep. They view coastal merfolk as provincial.',
  'River Merfolk':
    'Adapted to freshwater, river merfolk are more familiar with surface dwellers. They guard waterways and spend more time on land than their oceanic brethren, trading with shore communities.',
  'Desire Demon':
    'Consumed by insatiable lust, desire demons seek to corrupt and possess others. They are masters of seduction and manipulation, using their allure to bend others to their will. Unlike succubi, they are not driven by hunger for blood but instead for energy.',
  'Fire Demon':
    'Born of flame and chaos, fire demons embody destruction and passion. They revel in conflict and leave scorched earth in their wake.',
  'Frost Demon':
    'Cold and calculating, frost demons freeze both body and spirit. They spread despair through their chilling presence and methodical cruelty.',
  'Shadow Demon':
    'Wraiths of darkness, shadow demons feed on fear and hopelessness. They slip through the cracks of reality, preying on the vulnerable.',
};

/**
 * Get a race description for prompt injection.
 */
export function getRaceDescription(race: Race): string {
  return RACE_DESCRIPTIONS[race];
}

/**
 * Get a subrace description for prompt injection.
 */
export function getSubraceDescription(subrace: Subrace): string {
  return SUBRACE_DESCRIPTIONS[subrace];
}

/**
 * Get a combined race and subrace description for prompt injection.
 * If subrace is provided, both descriptions are included.
 */
export function getFullRaceDescription(race: Race, subrace?: Subrace): string {
  const raceDesc = RACE_DESCRIPTIONS[race];
  if (!subrace) {
    return raceDesc;
  }
  const subraceDesc = SUBRACE_DESCRIPTIONS[subrace];
  return `${raceDesc} ${subraceDesc}`;
}
