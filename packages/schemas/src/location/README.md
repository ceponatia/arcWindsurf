# Location Schemas

Zod schemas for locations at different scales: regions, buildings, and rooms.

## Files

| File               | Description                                    |
| ------------------ | ---------------------------------------------- |
| `region.ts`        | Large-scale areas (kingdoms, forests, cities)  |
| `building.ts`      | Structures within regions                      |
| `room.ts`          | Individual spaces within buildings             |
| `builtLocation.ts` | Composite location with hierarchical structure |

## Hierarchy

```text
Region → Building → Room
```

## RoomSchema

Individual spaces with atmosphere:

```ts
{
  id: string,
  name: string,
  description: string,
  purpose: 'living' | 'sleeping' | 'storage' | 'work' | 'ritual' | 'throne' | 'prison' | 'utility' | 'other',
  size: 'tiny' | 'small' | 'medium' | 'large' | 'vast',
  lighting: 'bright' | 'dim' | 'dark' | 'flickering',
  tags?: string[],  // Flavor tags like "dusty", "bloodstained"
}
```

## BuildingSchema

Structures with type and condition:

```ts
{
  id: string,
  name: string,
  description: string,
  type: 'residential' | 'commercial' | 'industrial' | 'civic' | 'religious' | 'military' | 'educational' | 'other',
  condition: 'pristine' | 'well_kept' | 'worn' | 'ruined',
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge',
  tags?: string[],  // Flavor tags like "haunted", "guarded"
}
```
