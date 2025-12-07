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

import { type BodyRegion, resolveBodyRegion } from '@minimal-rpg/schemas';
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
export const BODY_REGION_TO_EQUIPMENT_SLOTS: Record<BodyRegion, EquipmentSlot[]> = {
  head: ['head'],
  face: ['head'], // masks, helmets with visors
  hair: ['head'], // hats, headwear
  neck: ['torso', 'accessory'], // collars, necklaces, scarves
  shoulders: ['torso'], // covered by shirts, jackets
  torso: ['torso'],
  chest: ['torso'],
  back: ['torso'],
  arms: ['torso'], // sleeves of shirts/jackets
  hands: ['hands'],
  waist: ['torso', 'accessory'], // belts, waistbands
  hips: ['legs'], // pants, skirts start at hips
  legs: ['legs'],
  feet: ['feet'],
};

/**
 * Maps equipment slots back to the primary body regions they cover.
 * Useful for describing what a piece of equipment covers.
 */
export const EQUIPMENT_SLOT_TO_BODY_REGIONS: Record<EquipmentSlot, BodyRegion[]> = {
  head: ['head', 'face', 'hair'],
  torso: ['neck', 'shoulders', 'torso', 'chest', 'back', 'arms', 'waist'],
  legs: ['hips', 'legs'],
  feet: ['feet'],
  hands: ['hands'],
  accessory: ['neck', 'waist'], // necklaces, belts, rings, etc.
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
export function getEquipmentSlotsForRegion(region: BodyRegion): EquipmentSlot[] {
  return BODY_REGION_TO_EQUIPMENT_SLOTS[region];
}

/**
 * Get all body regions covered by an equipment slot.
 *
 * @param slot - The equipment slot
 * @returns Array of body regions covered by items in this slot
 *
 * @example
 * getBodyRegionsForSlot('feet') // => ['feet']
 * getBodyRegionsForSlot('torso') // => ['neck', 'shoulders', 'torso', 'chest', 'back', 'arms', 'waist']
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
