# Agents - API Package

## Scope

You must keep this package limited to:

- HTTP routes (REST, RPC, GraphQL)
- Request validation
- Auth / permissions
- Controllers / handlers
- Middleware
- Webhooks
- Transport-level concerns
- Very light orchestration

Any other code **MUST** be placed in the appropriate package and not in the API package.
