# Agents - State Manager Package

## Scope

You must keep this package limited to:

- State merge/diff/apply logic using JSON Patch and related operations
- State slice registration, configuration, and default state management
- Validation hooks and schema integration for state operations
- Types and utilities for state computation, patching, and diffing

Any other code **MUST** be placed in the appropriate package and not in the State Manager package.
