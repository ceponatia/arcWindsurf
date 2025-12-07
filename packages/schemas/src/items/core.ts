import { z } from 'zod';

// Core enums and primitives for items
export const ItemCategorySchema = z.enum([
  'clothing',
  'weapon',
  'trinket',
  'accessory',
  'consumable',
  'generic',
]);

export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ClothingSlotSchema = z.enum(['head', 'torso', 'legs', 'feet', 'hands', 'accessory']);

export type ClothingSlot = z.infer<typeof ClothingSlotSchema>;

// Who can own items in the runtime model
export const ItemOwnerTypeSchema = z.enum(['character_instance', 'character_template', 'player']);

export type ItemOwnerType = z.infer<typeof ItemOwnerTypeSchema>;
