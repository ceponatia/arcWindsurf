# Agents - Governor Package

## Scope

You must keep this package limited to:

- Turn orchestration and tool-based turn handling
- Aggregating agent/tool outputs into player-facing responses and events
- Coordinating state patch application with the state manager
- Turn lifecycle logging, configuration, and error handling for orchestration

Any other code **MUST** be placed in the appropriate package and not in the Governor package.
