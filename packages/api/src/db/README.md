# Database Layer

This directory contains the API's interface to the database. It leverages the central database package (`@minimal-rpg/db`) and provides API-specific helpers and types.

## Files

- **sessionsClient.ts** — Re-exports session-related repository functions from `@minimal-rpg/db`
- **types.ts** — Common database-related types used across the API layer

## Usage

Avoid direct database queries in route handlers; use the repository functions exported from this directory or `@minimal-rpg/db/node`.

```typescript
import { getSession } from '../db/sessionsClient.js';
```
