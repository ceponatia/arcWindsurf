/**
 * Governor tools module - LLM function calling support.
 *
 * This module provides tool definitions and execution for LLM tool calling,
 * bridging structured tool calls to existing agent implementations.
 */

// Types
export * from './types.js';

// Tool Definitions
export {
  // Priority 1: Core Tools
  GET_SENSORY_DETAIL_TOOL,
  NPC_DIALOGUE_TOOL,
  UPDATE_PROXIMITY_TOOL,

  // Priority 2: Environment Tools (placeholder)
  NAVIGATE_PLAYER_TOOL,
  EXAMINE_OBJECT_TOOL,

  // Priority 3: Inventory Tools (placeholder)
  USE_ITEM_TOOL,

  // Priority 4: Relationship Tools (design only)
  GET_NPC_MEMORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,

  // Tool Collections
  CORE_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  RELATIONSHIP_TOOLS,
  ALL_GAME_TOOLS,

  // Utilities
  getActiveTools,
} from './definitions.js';

// Tool Executor
export {
  ToolExecutor,
  createToolExecutor,
  type ToolExecutorConfig,
  type FallbackToolHandler,
} from './executor.js';
