# @minimal-rpg/db

## Purpose

PostgreSQL data access layer. Provides typed queries, migrations, and connection pooling for all persistent game data.

## Scope

- PostgreSQL connectivity and pooling
- SQL migrations, schema files, and seed scripts
- Data access methods for sessions, messages, profiles, instances, and tags
- Database introspection and pgvector type registration

## Package Connections

- **api**: API calls db methods to load/persist data
- **retrieval**: Retrieval queries db for knowledge nodes (future: pgvector search)
- **web**: Web client uses db indirectly through API

This package has no internal workspace dependencies. It is a foundational layer.
