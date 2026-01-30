# Tool Handlers Plan

**Created**: January 30, 2026
**Status**: Not Started
**Priority**: P2
**Effort**: 6-10 hours

---

## Overview

Extend SessionToolHandler with new tool implementations for examine_object, navigate_player, and use_item.

## Problem Statement

The tool definition constants (`EXAMINE_OBJECT_TOOL`, `NAVIGATE_PLAYER_TOOL`, `USE_ITEM_TOOL`) exist but aren't implemented in SessionToolHandler. When the LLM calls these tools, they silently fail or return empty results.

## Existing Infrastructure

### Tool Definitions ([packages/llm/src/tools/tool-definitions.ts](../../packages/llm/src/tools/tool-definitions.ts))

```typescript
export const EXAMINE_OBJECT_TOOL = {
  type: 'function',
  function: {
    name: 'examine_object',
    description: 'Look closely at an object in the environment',
    parameters: {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'ID of object to examine' },
        detail_level: { type: 'string', enum: ['quick', 'thorough', 'forensic'] },
      },
      required: ['object_id'],
    },
  },
};

export const NAVIGATE_PLAYER_TOOL = { ... };
export const USE_ITEM_TOOL = { ... };
```

### SessionToolHandler ([packages/api/src/game/tools/handlers.ts](../../packages/api/src/game/tools/handlers.ts))

```typescript
export async function handleToolCall(
  toolName: string,
  toolArgs: Record<string, unknown>,
  sessionContext: SessionContext
): Promise<ToolResult> {
  switch (toolName) {
    case 'get_session_tags':
      return handleGetSessionTags(sessionContext);
    case 'get_npc_info':
      return handleGetNpcInfo(toolArgs, sessionContext);
    // TODO: Add more handlers
    // case 'examine_object':
    // case 'navigate_player':
    // case 'use_item':
    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}
```

## Implementation Approach

### Phase 1: Core Handlers (4-6 hours)

1. Implement `examine_object` handler
2. Implement `navigate_player` handler
3. Implement `use_item` handler
4. Add to switch statement

### Phase 2: Advanced Features (2-4 hours)

1. Add examine results to narrative context
2. Handle navigation failures gracefully
3. Add item effect application
4. Emit WorldBus events for each action

## Success Criteria

- [ ] `examine_object` returns object descriptions
- [ ] `navigate_player` moves player between locations
- [ ] `use_item` applies item effects
- [ ] All handlers emit appropriate WorldBus events
- [ ] Error handling for invalid tool arguments
- [ ] Unit tests for each handler

## Dependencies

- `@minimal-rpg/llm` - Tool definitions
- `@minimal-rpg/db` - Object/item/location queries
- `@minimal-rpg/bus` - Event emission

## Related Files

- [packages/llm/src/tools/tool-definitions.ts](../../packages/llm/src/tools/tool-definitions.ts) - Definitions
- [packages/api/src/game/tools/handlers.ts](../../packages/api/src/game/tools/handlers.ts) - Handlers
