# shared

Shared utilities for feature components.

## Exports

- `splitList(value: string): string[]` — Parses comma or newline-separated strings into trimmed arrays

## Usage

```typescript
import { splitList } from '../shared/stringLists.js';

const themes = splitList('fantasy, adventure, mystery');
// → ['fantasy', 'adventure', 'mystery']
```

## Consumers

Used by builder components to convert text inputs into arrays:

- `item-builder/ItemBuilder.tsx` — Parses tags and damage types
- `setting-builder/SettingBuilder.tsx` — Parses themes

## Cross-Package Imports

None — this is a pure utility module.
