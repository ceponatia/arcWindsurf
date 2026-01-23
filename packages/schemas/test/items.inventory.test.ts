import { describe, expect, test } from 'vitest';
import { ItemDefinitionSchema } from '../src/items/definition.js';
import { InventoryItemSchema, InventoryStateSchema } from '../src/inventory/index.js';

describe('items and inventory schemas', () => {
  test('ItemDefinitionSchema parses valid item definitions', () => {
    const clothing = {
      id: 'item-1',
      name: 'Wool Cap',
      type: 'hat',
      description: 'A warm wool cap.',
      category: 'clothing',
      properties: {
        slot: 'head',
        material: 'wool',
        warmth: 4,
      },
    };

    const weapon = {
      id: 'item-2',
      name: 'Training Sword',
      type: 'sword',
      description: 'A dulled blade for practice.',
      category: 'weapon',
      properties: {
        handedness: 'one_handed',
        reach: 'short',
        damageTypes: ['blunt'],
      },
    };

    expect(() => ItemDefinitionSchema.parse(clothing)).not.toThrow();
    expect(() => ItemDefinitionSchema.parse(weapon)).not.toThrow();
  });

  test('ItemDefinitionSchema rejects missing required fields', () => {
    const invalid = {
      id: '',
      name: '',
      type: 'ring',
      description: '',
      category: 'trinket',
      properties: {
        material: 'gold',
      },
    };

    expect(() => ItemDefinitionSchema.parse(invalid)).toThrow();
  });

  test('InventoryStateSchema validates inventory items', () => {
    const inventory = {
      items: [
        {
          id: 'item-1',
          name: 'Potion',
          description: 'Restores stamina.',
          quantity: 2,
        },
      ],
      capacity: 10,
    };

    expect(() => InventoryStateSchema.parse(inventory)).not.toThrow();

    const invalidItem = {
      items: [
        {
          id: 'item-2',
          name: 'Broken',
          description: 'Nope',
          quantity: -1,
        },
      ],
    };

    expect(() => InventoryStateSchema.parse(invalidItem)).toThrow();
    expect(() => InventoryItemSchema.parse({ id: '', name: '' })).toThrow();
  });
});
