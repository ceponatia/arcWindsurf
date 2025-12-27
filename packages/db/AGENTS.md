# Agents - DB Package

## Scope

You must keep this package limited to:

- PostgreSQL connectivity, pooling, and typed database client utilities
- SQL migrations, schema files, and seed scripts
- Data access methods for sessions, messages, profiles, instances, tags, and related entities
- Database introspection, administration helpers, and pgvector type registration

Any other code **MUST** be placed in the appropriate package and not in the DB package.
