# Wave 3.4: Fix locations.ts (80 Errors)

This wave fixes all lint errors in `packages/api/src/routes/resources/locations.ts`.

---

## Prerequisites

- **Wave 3.2 MUST be completed first** (creates foundation utilities)

## Target File

`packages/api/src/routes/resources/locations.ts` - 80 lint errors

## Error Categories in This File

| Error Type | Count | Fix |
|------------|-------|-----|
| `row: any` parameter types | ~40 | Use `LocationMapRow` / `LocationPrefabRow` types |
| `as any[]` casts for JSON columns | ~20 | Properly type the row interfaces |
| `as any` for ID parameters | ~15 | Use `toId()` helper |
| Orphan comment at end of file | 1 | Delete it |

---

## Task 1: Add New Imports

**Location**: Top of file, after existing imports (around line 26)

**Find this line**:

```typescript
import type { ApiError } from '../../types.js';
```

**Add these imports AFTER it**:

```typescript
import type { LocationMapRow, LocationPrefabRow } from '../../types/index.js';
import { toId } from '../../utils/uuid.js';
```

---

## Task 2: Delete Local LocationMapSummary Interface

**Location**: Around lines 32-43

The `LocationMapSummary` interface is fine to keep as it's a response DTO. **No changes needed here.**

---

## Task 3: Fix mapRowToSummary Function

**Location**: Around line 83-99

**Find this**:

```typescript
function mapRowToSummary(row: any): LocationMapSummary {
  const nodes = Array.isArray(row.nodesJson) ? row.nodesJson : [];
  const connections = Array.isArray(row.connectionsJson) ? row.connectionsJson : [];
```

**Replace with**:

```typescript
function mapRowToSummary(row: LocationMapRow): LocationMapSummary {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
```

---

## Task 4: Fix mapRowToLocationMap Function

**Location**: Around line 101-120

**Find this**:

```typescript
function mapRowToLocationMap(row: any): LocationMap {
  const nodes = Array.isArray(row.nodesJson) ? (row.nodesJson as LocationNode[]) : [];
  const connections = Array.isArray(row.connectionsJson)
    ? (row.connectionsJson as LocationConnection[])
    : [];
```

**Replace with**:

```typescript
function mapRowToLocationMap(row: LocationMapRow): LocationMap {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
```

---

## Task 5: Fix mapRowToPrefab Function

**Location**: Around line 122-138

**Find this**:

```typescript
function mapRowToPrefab(row: any): LocationPrefab {
  const nodes = Array.isArray(row.nodesJson) ? (row.nodesJson as LocationNode[]) : [];
  const connections = Array.isArray(row.connectionsJson)
    ? (row.connectionsJson as LocationConnection[])
    : [];
```

**Replace with**:

```typescript
function mapRowToPrefab(row: LocationPrefabRow): LocationPrefab {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
```

---

## Task 6: Fix GET /location-maps/:id Route

**Location**: Around line 163-175

**Find this line** (around line 166):

```typescript
const map = await getLocationMap(id);
```

**Replace with**:

```typescript
const map = await getLocationMap(toId(id));
```

---

## Task 7: Fix POST /location-maps/:id/duplicate Route

**Location**: Around lines 265-291

### 7.1 Fix getLocationMap call (around line 270)

**Find**:

```typescript
const source = await getLocationMap(id);
```

**Replace with**:

```typescript
const source = await getLocationMap(toId(id));
```

### 7.2 Fix nodesJson/connectionsJson casts (around lines 280-281)

**Find**:

```typescript
nodesJson: (source.nodesJson as any[]) ?? [],
connectionsJson: (source.connectionsJson as any[]) ?? [],
```

**Replace with**:

```typescript
nodesJson: source.nodesJson ?? [],
connectionsJson: source.connectionsJson ?? [],
```

---

## Task 8: Fix GET /location-prefabs/:id Route

**Location**: Around line 310-322

**Find this line** (around line 313):

```typescript
const prefab = await getLocationPrefab(id as any);
```

**Replace with**:

```typescript
const prefab = await getLocationPrefab(toId(id));
```

---

## Task 9: Delete Orphan Comment at End of File

**Location**: Line 358-359 (end of file)

**Find and DELETE**:

```typescript
// Prefabs CRUD
```

This is an orphan comment with no associated code.

---

## Complete File Reference

After all changes, the mapper functions section should look like this:

```typescript
// ============================================================================
// Helpers
// ============================================================================

function mapRowToSummary(row: LocationMapRow): LocationMapSummary {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationMapSummary = {
    id: row.id,
    name: row.name,
    settingId: row.settingId,
    isTemplate: true,
    nodeCount: nodes.length,
    connectionCount: connections.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description;
  if (row.tags) result.tags = row.tags;
  return result;
}

function mapRowToLocationMap(row: LocationMapRow): LocationMap {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationMap = {
    id: row.id,
    name: row.name,
    settingId: row.settingId,
    isTemplate: true,
    nodes,
    connections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description;
  if (row.defaultStartLocationId) result.defaultStartLocationId = row.defaultStartLocationId;
  if (row.tags) result.tags = row.tags;
  return result;
}

function mapRowToPrefab(row: LocationPrefabRow): LocationPrefab {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationPrefab = {
    id: row.id,
    name: row.name,
    nodes,
    connections,
    entryPoints: row.entryPoints,
  };
  if (row.description) result.description = row.description;
  if (row.category) result.category = row.category;
  if (row.tags) result.tags = row.tags;
  return result;
}
```

---

## Validation

After completing all tasks, run:

```bash
# Check this specific file for lint errors
npx eslint packages/api/src/routes/resources/locations.ts --cache --cache-location .eslintcache

# Should output: no errors or warnings
```

**Expected result**: 0 errors, 0 warnings

---

## Summary of Changes

| Change | Count |
|--------|-------|
| Added type imports | 3 imports |
| Fixed mapper function parameters | 3 functions |
| Removed `as any[]` casts | 4 occurrences |
| Added `toId()` wrapper | 3 occurrences |
| Removed `Array.isArray` checks | 6 occurrences |
| Deleted orphan comment | 1 line |

---

## Next Wave

After completing this wave and validating 0 errors, proceed to **Wave 3.5: Fix schedules.ts**.
