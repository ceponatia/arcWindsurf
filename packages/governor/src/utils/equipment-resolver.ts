/**
 * Equipment Slot Resolver
 *
 * Maps body regions to equipment slots for intent routing.
 * This enables queries like "look at Taylor's feet" to check for equipped
 * footwear and provide item information alongside body region data.
 *
 * Kept separate from @minimal-rpg/schemas to avoid coupling character
 * schemas with item schemas. This module bridges the two at runtime.
 */

import {
  BODY_REGIONS,
  type BodyRegion,
  getGroupForRegion,
  resolveBodyRegion,
} from '@minimal-rpg/schemas';
import { type ClothingSlot } from '@minimal-rpg/schemas';

// Re-export ClothingSlot as EquipmentSlot for clarity in this context
export type EquipmentSlot = ClothingSlot;

/**
 * Maps body regions to the equipment slots that cover them.
 * A body region may be covered by multiple equipment slots.
 *
 * Example: 'chest' is covered by 'torso' slot items (shirts, jackets, etc.)
 * Example: 'face' may be covered by 'head' slot items (helmets, masks)
 */
function uniq<T>(items: readonly T[]): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function isHandRegion(region: BodyRegion): boolean {
  return (
    region === 'hands' ||
    region.includes('Hand') ||
    region.includes('Palm') ||
    region.includes('Fingers')
  );
}

function isFootRegion(region: BodyRegion): boolean {
  return (
    region === 'feet' ||
    region === 'toes' ||
    region.includes('Foot') ||
    region.endsWith('Toe') ||
    region.endsWith('Ankle') ||
    region.endsWith('Heel') ||
    region.endsWith('Sole') ||
    region.endsWith('Arch')
  );
}

function isEarRegion(region: BodyRegion): boolean {
  return region === 'ears' || region.endsWith('Ear');
}

function isHipOrPelvis(region: BodyRegion): boolean {
  return region.endsWith('Hip') || region === 'pelvis';
}

/**
 * Get the equipment slots that cover a specific body region.
 */
export function getEquipmentSlotsForRegion(region: BodyRegion): EquipmentSlot[] {
  const slots: EquipmentSlot[] = [];

  // Hands and feet have dedicated slots.
  if (isHandRegion(region)) {
    slots.push('hands');
  }

  if (isFootRegion(region)) {
    slots.push('feet');

    // Ankles are often covered by both pants/socks and shoes.
    if (region.endsWith('Ankle')) {
      slots.push('legs');
    }
  }

  const group = getGroupForRegion(region);

  if (group === 'head') {
    slots.push('head');
    if (isEarRegion(region)) {
      slots.push('accessory');
    }
  }

  if (group === 'neck' || group === 'upperBody' || group === 'torso' || group === 'arms') {
    // Hands remain a dedicated slot; sleeves cover wrists/arms.
    if (!isHandRegion(region)) {
      slots.push('torso');
    }

    // Common accessory coverage.
    if (region === 'neck' || region === 'throat' || region === 'waist') {
      slots.push('accessory');
    }
  }

  if (group === 'groin' || group === 'legs' || isHipOrPelvis(region)) {
    slots.push('legs');
  }

  // Any region could be covered by an accessory (rings, earrings, belts, collars).
  if (isEarRegion(region) || region === 'neck' || region === 'throat' || region === 'waist') {
    slots.push('accessory');
  }

  // Fallback: if nothing matched, treat as torso coverage.
  if (slots.length === 0) {
    slots.push('torso');
  }

  return uniq(slots);
}

/**
 * Maps body regions to the equipment slots that cover them.
 *
 * Derived from BODY_REGIONS and getEquipmentSlotsForRegion() to stay in sync
 * with the canonical region taxonomy.
 */
export const BODY_REGION_TO_EQUIPMENT_SLOTS: Record<BodyRegion, EquipmentSlot[]> =
  Object.fromEntries(BODY_REGIONS.map((r) => [r, getEquipmentSlotsForRegion(r)])) as Record<
    BodyRegion,
    EquipmentSlot[]
  >;

/**
 * Maps equipment slots back to the primary body regions they cover.
 * Useful for describing what a piece of equipment covers.
 */
/**
 * Maps equipment slots back to the body regions they cover.
 * Derived from BODY_REGIONS and getEquipmentSlotsForRegion() to stay in sync.
 */
export const EQUIPMENT_SLOT_TO_BODY_REGIONS: Record<EquipmentSlot, BodyRegion[]> = {
  head: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('head')),
  torso: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('torso')),
  legs: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('legs')),
  feet: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('feet')),
  hands: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('hands')),
  accessory: BODY_REGIONS.filter((r) => getEquipmentSlotsForRegion(r).includes('accessory')),
};

/**
 * Get the equipment slots that cover a specific body region.
 *
 * @param region - The body region to check
 * @returns Array of equipment slots that cover this region
 *
 * @example
 * getEquipmentSlotsForRegion('feet') // => ['feet']
 * getEquipmentSlotsForRegion('chest') // => ['torso']
 * getEquipmentSlotsForRegion('neck') // => ['torso', 'accessory']
 */
export function getBodyRegionsForSlot(slot: EquipmentSlot): BodyRegion[] {
  return EQUIPMENT_SLOT_TO_BODY_REGIONS[slot];
}

/**
 * Check if an equipment slot covers a specific body region.
 *
 * @param slot - The equipment slot to check
 * @param region - The body region to check
 * @returns True if the slot covers the region
 *
 * @example
 * doesSlotCoverRegion('torso', 'chest') // => true
 * doesSlotCoverRegion('feet', 'hands') // => false
 */
export function doesSlotCoverRegion(slot: EquipmentSlot, region: BodyRegion): boolean {
  return EQUIPMENT_SLOT_TO_BODY_REGIONS[slot].includes(region);
}

/**
 * Result of resolving a body reference with equipment context.
 */
export interface BodyEquipmentResolution {
  /** The canonical body region */
  region: BodyRegion;
  /** Equipment slots that cover this region */
  equipmentSlots: EquipmentSlot[];
}

/**
 * Resolve a body reference to both the canonical region AND relevant equipment slots.
 * Useful for intent routing where you need to query both body data and equipped items.
 *
 * @param reference - The body part reference from player input (e.g., "feet", "shoes", "hands")
 * @param defaultRegion - Fallback region if reference is empty/invalid (defaults to 'torso')
 * @returns Object with resolved region and applicable equipment slots
 *
 * @example
 * resolveBodyWithEquipment('shoes')
 * // => { region: 'feet', equipmentSlots: ['feet'] }
 *
 * resolveBodyWithEquipment('chest')
 * // => { region: 'chest', equipmentSlots: ['torso'] }
 *
 * resolveBodyWithEquipment('neck')
 * // => { region: 'neck', equipmentSlots: ['torso', 'accessory'] }
 */
export function resolveBodyWithEquipment(
  reference: string | undefined | null,
  defaultRegion: BodyRegion = 'torso'
): BodyEquipmentResolution {
  const region = resolveBodyRegion(reference, defaultRegion);
  const equipmentSlots = getEquipmentSlotsForRegion(region);
  return { region, equipmentSlots };
}
