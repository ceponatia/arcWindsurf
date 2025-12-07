import { z } from 'zod';
import { ClothingSlotSchema } from './core.js';
import { ItemDefinitionSchema } from './definition.js';

// Prompt-facing view of a character's outfit
export const EquippedOutfitEntrySchema = z.object({
  slot: ClothingSlotSchema,
  item: ItemDefinitionSchema,
});

export type EquippedOutfitEntry = z.infer<typeof EquippedOutfitEntrySchema>;

export const EffectiveOutfitSchema = z.object({
  equipped: z.array(EquippedOutfitEntrySchema),
  carried: z.array(ItemDefinitionSchema).optional(),
});

export type EffectiveOutfit = z.infer<typeof EffectiveOutfitSchema>;
