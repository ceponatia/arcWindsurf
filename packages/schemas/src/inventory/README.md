# Inventory Schemas

Lightweight inventory state schemas for prompts and agents.

## Schemas

### InventoryItemSchema

Individual item in an inventory:

```ts
{
  id: string,           // Required item identifier
  name: string,         // Display name (max 160 chars)
  description?: string, // Optional flavor text (max 320 chars)
  usable?: boolean,     // Can be used/activated
  quantity?: number,    // Stack count
  tags?: string[],      // Categorization tags (max 32)
}
```

### InventoryStateSchema

Complete inventory state:

```ts
{
  items: InventoryItem[],
  capacity?: number,    // Max item slots
  weightLimit?: number, // Max weight
}
```

## Usage

These schemas are designed for prompt context injection, not full inventory management. For detailed item definitions, see the `items/` schemas.
