import { z } from 'zod';
import { ClothingSlotSchema } from './core.js';

// Base fields shared by all item definitions
export const BaseItemDefinitionSchema = z.object({
  id: z.string().min(1, { message: 'Item id is required' }),
  name: z.string().min(1, { message: 'Item name is required' }).max(160),
  type: z.string().min(1, { message: 'Item type is required' }).max(80),
  description: z.string().min(1).max(1000),
  tags: z.array(z.string().min(1)).max(32).optional(),
});

// Clothing-specific properties
export const ClothingItemPropertiesSchema = z.object({
  slot: ClothingSlotSchema,
  style: z.string().min(1).max(80).optional(),
  material: z.string().min(1).max(80).optional(),
  color: z.string().min(1).max(80).optional(),
  condition: z.enum(['pristine', 'worn', 'damaged', 'torn']).optional(),
  warmth: z.number().int().min(-10).max(10).optional(),
});

// Weapon / wielded item properties (simple, descriptive; not a full combat system)
export const WeaponItemPropertiesSchema = z.object({
  handedness: z.enum(['one_handed', 'two_handed', 'either']).optional(),
  damageTypes: z
    .array(z.enum(['blunt', 'piercing', 'slashing', 'magic']))
    .max(4)
    .optional(),
  reach: z.enum(['short', 'medium', 'long']).optional(),
  material: z.string().min(1).max(80).optional(),
});

// Generic properties for simple objects
export const SimpleItemPropertiesSchema = z.object({
  material: z.string().min(1).max(80).optional(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'bulky']).optional(),
  weight: z.number().min(0).max(1000).optional(),
});

// Discriminated definitions by category
export const ClothingItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('clothing'),
  properties: ClothingItemPropertiesSchema,
});

export const WeaponItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('weapon'),
  properties: WeaponItemPropertiesSchema,
});

export const TrinketItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('trinket'),
  properties: SimpleItemPropertiesSchema,
});

export const AccessoryItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('accessory'),
  properties: SimpleItemPropertiesSchema,
});

export const ConsumableItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('consumable'),
  properties: SimpleItemPropertiesSchema,
});

export const GenericItemDefinitionSchema = BaseItemDefinitionSchema.extend({
  category: z.literal('generic'),
  properties: SimpleItemPropertiesSchema,
});

export const ItemDefinitionSchema = z.discriminatedUnion('category', [
  ClothingItemDefinitionSchema,
  WeaponItemDefinitionSchema,
  TrinketItemDefinitionSchema,
  AccessoryItemDefinitionSchema,
  ConsumableItemDefinitionSchema,
  GenericItemDefinitionSchema,
]);

export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;

// Narrowed convenience types for specific categories
export type ClothingItemDefinition = z.infer<typeof ClothingItemDefinitionSchema>;
export type WeaponItemDefinition = z.infer<typeof WeaponItemDefinitionSchema>;
