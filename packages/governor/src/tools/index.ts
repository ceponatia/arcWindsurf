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

  // Debug Tools
  TOOLING_FAILURE_REPORT_TOOL,

  // Priority 2: Environment Tools (placeholder)
  NAVIGATE_PLAYER_TOOL,
  EXAMINE_OBJECT_TOOL,

  // Priority 3: Inventory Tools (placeholder)
  USE_ITEM_TOOL,

  // Priority 4: Time Tools
  ADVANCE_TIME_TOOL,

  // Priority 4.5: Location Tools
  MOVE_TO_LOCATION_TOOL,
  GET_LOCATION_INFO_TOOL,

  // Priority 4: Relationship Tools (design only)
  GET_NPC_MEMORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,

  // Priority 6: Hygiene Tools
  UPDATE_NPC_HYGIENE_TOOL,
  GET_HYGIENE_SENSORY_TOOL,

  // Priority 7: Schedule Tools
  GENERATE_NPC_SCHEDULE_TOOL,
  ASSIGN_NPC_LOCATION_TOOL,
  GET_SCHEDULE_RESOLUTION_TOOL,

  // Tool Collections
  CORE_TOOLS,
  DEBUG_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  TIME_TOOLS,
  LOCATION_TOOLS,
  RELATIONSHIP_TOOLS,
  HYGIENE_TOOLS,
  SCHEDULE_TOOLS,
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
