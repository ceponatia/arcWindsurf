import { z } from 'zod';

// Inventory state covering light-weight item metadata for prompts & agents
export const InventoryItemSchema = z.object({
  id: z.string().min(1, { message: 'Item id is required' }),
  name: z.string().min(1, { message: 'Item name is required' }).max(160),
  description: z.string().min(1).max(320).optional(),
  usable: z.boolean().optional(),
  quantity: z.number().int().min(0).optional(),
  tags: z.array(z.string().min(1)).max(32).optional(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const InventoryStateSchema = z.object({
  items: z.array(InventoryItemSchema),
  capacity: z.number().int().min(0).optional(),
  weightLimit: z.number().min(0).optional(),
});

export type InventoryState = z.infer<typeof InventoryStateSchema>;
