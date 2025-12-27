# Agents - Utils Package

## Scope

You must keep this package limited to:

- Cross-package utility functions (errors, fetch helpers, form utilities)
- Parsing and formatting logic (body parser, attribute parser, input/json helpers)
- Lightweight domain-agnostic helpers and small shared abstractions
- Types supporting the exported utilities in this package

Any other code **MUST** be placed in the appropriate package and not in the Utils package.
