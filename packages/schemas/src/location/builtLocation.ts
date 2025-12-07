import { z } from 'zod';
import { BuildingSchema, type Building } from './building.js';
import { RegionSchema, type Region } from './region.js';
import { RoomSchema, type Room } from './room.js';

// Composite built-location schema covering hierarchy + navigation metadata
export const LocationExitSchema = z.object({
  direction: z.string().min(1, { message: 'Direction is required' }),
  targetId: z.string().min(1, { message: 'Target location id is required' }),
  description: z.string().min(1).optional(),
  accessible: z.boolean().optional(),
});

export type LocationExit = z.infer<typeof LocationExitSchema>;

export const BuiltLocationSchema = z.object({
  id: z.string().min(1, { message: 'Location id is required' }),
  instanceId: z.string().min(1).optional(),
  name: z.string().min(1, { message: 'Location name is required' }).max(160),
  summary: z.string().min(1).max(320).optional(),
  description: z.string().min(1),
  region: RegionSchema.optional(),
  building: BuildingSchema.optional(),
  room: RoomSchema.optional(),
  exits: z.array(LocationExitSchema).max(32).optional(),
  tags: z.array(z.string().min(1)).max(32).optional(),
});

export type BuiltLocation = z.infer<typeof BuiltLocationSchema>;

export type { Region, Building, Room };
