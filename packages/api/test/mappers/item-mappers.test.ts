import { describe, it, expect } from 'vitest';
import type { ItemDefinition } from '@minimal-rpg/schemas';
import { mapItemSummary } from '../../src/mappers/item-mappers.js';

describe('mappers/item-mappers', () => {
  describe('mapItemSummary', () => {
    it('should map item definition to summary', () => {
      const item: ItemDefinition = {
        id: 'item-1',
        name: 'Test Item',
        category: 'weapon',
        type: 'sword',
        description: 'A test sword',
        tags: ['sharp', 'metal'],
        properties: {
          handedness: 'one_handed',
          damageTypes: ['slashing'],
        },
      } as unknown as ItemDefinition;

      const summary = mapItemSummary(item);

      expect(summary).toEqual({
        id: 'item-1',
        name: 'Test Item',
        category: 'weapon',
        type: 'sword',
        description: 'A test sword',
        tags: ['sharp', 'metal'],
      });
    });

    it('should omit tags if empty', () => {
      const item: ItemDefinition = {
        id: 'item-2',
        name: 'Test Item 2',
        category: 'consumable',
        type: 'potion',
        description: 'A test potion',
        tags: [],
        properties: {
          weight: 1,
        },
      } as unknown as ItemDefinition;

      const summary = mapItemSummary(item);

      expect(summary).toEqual({
        id: 'item-2',
        name: 'Test Item 2',
        category: 'consumable',
        type: 'potion',
        description: 'A test potion',
      });
      expect(summary.tags).toBeUndefined();
    });

    it('should omit tags if undefined', () => {
      const item: ItemDefinition = {
        id: 'item-3',
        name: 'Test Item 3',
        category: 'generic',
        type: 'junk',
        description: 'Just junk',
        properties: {
          weight: 0,
        },
      } as unknown as ItemDefinition;

      const summary = mapItemSummary(item);

      expect(summary).toEqual({
        id: 'item-3',
        name: 'Test Item 3',
        category: 'generic',
        type: 'junk',
        description: 'Just junk',
      });
      expect(summary.tags).toBeUndefined();
    });
  });
});
