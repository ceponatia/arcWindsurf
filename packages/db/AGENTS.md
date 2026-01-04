# @minimal-rpg/db

## Purpose

PostgreSQL data access layer. Provides typed queries, migrations, and connection pooling for all persistent game data.

## Scope

- PostgreSQL connectivity and pooling
- SQL migrations, schema files, and seed scripts
- Data access methods for sessions, messages, profiles, instances, and tags
- Database introspection and pgvector type registration

## Best Practices

- **Handling Nulls**: When mapping database results to domain objects, use the `nullableOptional` helper from `@minimal-rpg/schemas` (via `Utils.nullableOptional`). This ensures that SQL `NULL` values are correctly transformed to TypeScript `undefined`, maintaining consistency with Zod schemas.

## Package Connections

- **api**: API calls db methods to load/persist data
- **retrieval**: Retrieval queries db for knowledge nodes (future: pgvector search)
- **web**: Web client uses db indirectly through API

This package has no internal workspace dependencies. It is a foundational layer.
