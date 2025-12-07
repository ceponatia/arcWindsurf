# Item Schemas

Zod schemas for item definitions, ownership, and outfits.

## Files

| File            | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `core.ts`       | Core enums: `ItemCategory`, `ClothingSlot`, `ItemOwnerType` |
| `definition.ts` | Item definition schemas by category (discriminated union)   |
| `owner.ts`      | Item ownership and instance schemas                         |
| `outfit.ts`     | Outfit composition from clothing items                      |

## Item Categories

Items are defined by category with category-specific properties:

| Category     | Properties                                      |
| ------------ | ----------------------------------------------- |
| `clothing`   | slot, style, material, color, condition, warmth |
| `weapon`     | handedness, damageTypes, reach, material        |
| `trinket`    | material, size, weight                          |
| `accessory`  | material, size, weight                          |
| `consumable` | material, size, weight                          |
| `generic`    | material, size, weight                          |

## ItemDefinitionSchema

Discriminated union based on `category`:

```ts
ItemDefinitionSchema =
  ClothingItemDefinitionSchema |
  WeaponItemDefinitionSchema |
  TrinketItemDefinitionSchema |
  AccessoryItemDefinitionSchema |
  ConsumableItemDefinitionSchema |
  GenericItemDefinitionSchema;
```

## Clothing Slots

```ts
'head' | 'torso' | 'legs' | 'feet' | 'hands' | 'accessory';
```

## Owner Types

```ts
'character_instance' | 'character_template' | 'player';
```
