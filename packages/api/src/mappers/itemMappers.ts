import type { ItemDefinition } from '@minimal-rpg/schemas';
import type { ItemSummary, MapItemSummary } from '../types.js';

export const mapItemSummary: MapItemSummary = (item: ItemDefinition): ItemSummary => {
  const dto: ItemSummary = {
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type,
    description: item.description,
  };
  if (item.tags && item.tags.length > 0) dto.tags = item.tags;
  return dto;
};
