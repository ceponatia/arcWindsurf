/**
 * Governor tools module - LLM function calling support.
 *
 * This module provides tool definitions and execution for LLM tool calling,
 * bridging structured tool calls to existing agent implementations.
 */

// Types
export * from './types.js';

// Tool Definitions (one file per domain)
export { TOOLING_FAILURE_REPORT_TOOL } from './debug/tooling-failure-report.js';
export { GET_SENSORY_DETAIL_TOOL } from './core/get-sensory-detail.js';
export { UPDATE_PROXIMITY_TOOL } from './core/update-proximity.js';
export { NAVIGATE_PLAYER_TOOL } from './environment/navigate-player.js';
export { EXAMINE_OBJECT_TOOL } from './environment/examine-object.js';
export { MOVE_TO_LOCATION_TOOL } from './location/move-to-location.js';
export { GET_LOCATION_INFO_TOOL } from './location/get-location-info.js';
export { USE_ITEM_TOOL } from './inventory/use-item.js';
export { ADVANCE_TIME_TOOL } from './time/advance-time.js';
export { GET_NPC_MEMORY_TOOL } from './relationship/get-npc-memory.js';
export { UPDATE_RELATIONSHIP_TOOL } from './relationship/update-relationship.js';
export { UPDATE_NPC_HYGIENE_TOOL } from './hygiene/update-npc-hygiene.js';
export { GET_HYGIENE_SENSORY_TOOL } from './hygiene/get-hygiene-sensory.js';
export { GENERATE_NPC_SCHEDULE_TOOL } from './schedule/generate-npc-schedule.js';
export { ASSIGN_NPC_LOCATION_TOOL } from './schedule/assign-npc-location.js';
export { GET_SCHEDULE_RESOLUTION_TOOL } from './schedule/get-schedule-resolution.js';

// Tool Collections
export {
  CORE_TOOLS,
  DEBUG_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  LOCATION_TOOLS,
  TIME_TOOLS,
  RELATIONSHIP_TOOLS,
  HYGIENE_TOOLS,
  SCHEDULE_TOOLS,
  ALL_GAME_TOOLS,
  getActiveTools,
} from './collections.js';
