# db-view

Database explorer UI for inspecting and managing database tables.

## Exports

- `DbView` — Tabbed table browser with row display and deletion

## Cross-Package Imports

None — this feature uses only the shared API client.

## API Client Imports

From `../../shared/api/client.js`:

- `getDbOverview` — Fetches table metadata and sample rows
- `deleteDbRow` — Deletes a row by table name and ID

## Types

From `../../shared/api/client.js`:

- `DbOverview` — Database overview with table list
- `DbTableOverview` — Individual table metadata (columns, row count, samples)

## Local Components

- `Header` — Navigation bar with back link
- `TabBar` — Cascading tab strip for table selection
- `TablePanel` — Excel-like grid display with delete actions

## Configuration

Uses `DB_TOOLS` from `../../config.js` to conditionally enable delete functionality.

## Tracing Notes

The API endpoints are defined in [packages/api/src/routes/db.ts](../../../../../../api/src/routes/db.ts). This feature is intended for development/debugging and can be disabled via configuration.
