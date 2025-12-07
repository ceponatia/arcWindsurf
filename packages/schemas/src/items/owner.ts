import { z } from 'zod';
import { ClothingSlotSchema, ItemOwnerTypeSchema } from './core.js';

// Attachment of an item to an owner (character instance, template, or player)
export const ItemOwnerSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  ownerType: ItemOwnerTypeSchema,
  ownerId: z.string().min(1),
  equipped: z.boolean().default(false),
  equippedSlot: ClothingSlotSchema.optional(),
});

export type ItemOwner = z.infer<typeof ItemOwnerSchema>;
