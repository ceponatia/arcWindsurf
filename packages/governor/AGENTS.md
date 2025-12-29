# @minimal-rpg/governor

## Purpose

Turn orchestration layer. Routes player input to LLM tool calls, aggregates outputs, and applies state patches. The central coordinator between agents and state.

## Scope

- Turn orchestration and tool-based turn handling
- Aggregating tool outputs into player-facing responses
- Coordinating state patch application
- Turn lifecycle logging and error handling

## Package Connections

- **agents**: Invokes agent logic through tool execution
- **state-manager**: Applies collected JSON Patches to game state
- **schemas**: Uses turn input/output types and state slice schemas
- **retrieval**: Retrieves knowledge context before tool execution
- **characters**: Accesses character data for turn context
- **utils**: Shared helpers and error handling
