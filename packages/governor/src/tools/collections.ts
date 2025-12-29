/** Tool collection exports grouped by domain. */
import type { ToolDefinition } from './types.js';
import { TOOLING_FAILURE_REPORT_TOOL } from './debug/tooling-failure-report.js';
import { GET_SENSORY_DETAIL_TOOL } from './core/get-sensory-detail.js';
import { UPDATE_PROXIMITY_TOOL } from './core/update-proximity.js';
import { NAVIGATE_PLAYER_TOOL } from './environment/navigate-player.js';
import { EXAMINE_OBJECT_TOOL } from './environment/examine-object.js';
import { MOVE_TO_LOCATION_TOOL } from './location/move-to-location.js';
import { GET_LOCATION_INFO_TOOL } from './location/get-location-info.js';
import { USE_ITEM_TOOL } from './inventory/use-item.js';
import { ADVANCE_TIME_TOOL } from './time/advance-time.js';
import { GET_NPC_MEMORY_TOOL } from './relationship/get-npc-memory.js';
import { UPDATE_RELATIONSHIP_TOOL } from './relationship/update-relationship.js';
import { UPDATE_NPC_HYGIENE_TOOL } from './hygiene/update-npc-hygiene.js';
import { GET_HYGIENE_SENSORY_TOOL } from './hygiene/get-hygiene-sensory.js';
import { GENERATE_NPC_SCHEDULE_TOOL } from './schedule/generate-npc-schedule.js';
import { ASSIGN_NPC_LOCATION_TOOL } from './schedule/assign-npc-location.js';
import { GET_SCHEDULE_RESOLUTION_TOOL } from './schedule/get-schedule-resolution.js';

/** Priority 1 tools - implement first */
export const CORE_TOOLS: ToolDefinition[] = [GET_SENSORY_DETAIL_TOOL, UPDATE_PROXIMITY_TOOL];

/** Debug-only tools - safe to expose in all phases */
export const DEBUG_TOOLS: ToolDefinition[] = [TOOLING_FAILURE_REPORT_TOOL];

/** Priority 2 tools - implement after core */
export const ENVIRONMENT_TOOLS: ToolDefinition[] = [NAVIGATE_PLAYER_TOOL, EXAMINE_OBJECT_TOOL];

/** Priority 2.5 tools - location movement and info */
export const LOCATION_TOOLS: ToolDefinition[] = [MOVE_TO_LOCATION_TOOL, GET_LOCATION_INFO_TOOL];

/** Priority 3 tools - implement after environment */
export const INVENTORY_TOOLS: ToolDefinition[] = [USE_ITEM_TOOL];

/** Priority 4 tools - time system */
export const TIME_TOOLS: ToolDefinition[] = [ADVANCE_TIME_TOOL];

/** Priority 5 tools - future implementation */
export const RELATIONSHIP_TOOLS: ToolDefinition[] = [GET_NPC_MEMORY_TOOL, UPDATE_RELATIONSHIP_TOOL];

/** Priority 6 tools - hygiene and sensory system */
export const HYGIENE_TOOLS: ToolDefinition[] = [UPDATE_NPC_HYGIENE_TOOL, GET_HYGIENE_SENSORY_TOOL];

/** Priority 7 tools - schedule and location assignment */
export const SCHEDULE_TOOLS: ToolDefinition[] = [
  GENERATE_NPC_SCHEDULE_TOOL,
  ASSIGN_NPC_LOCATION_TOOL,
  GET_SCHEDULE_RESOLUTION_TOOL,
];

/** All game tools - use for full tool-calling mode */
export const ALL_GAME_TOOLS: ToolDefinition[] = [
  ...CORE_TOOLS,
  ...ENVIRONMENT_TOOLS,
  ...LOCATION_TOOLS,
  ...INVENTORY_TOOLS,
  ...TIME_TOOLS,
  ...RELATIONSHIP_TOOLS,
  ...HYGIENE_TOOLS,
  ...SCHEDULE_TOOLS,
  ...DEBUG_TOOLS,
];

/**
 * Get tools appropriate for current implementation phase.
 * Start with CORE_TOOLS, expand as handlers are implemented.
 */
export function getActiveTools(): ToolDefinition[] {
  // Phase 8 implementation: core + time + relationship + location + hygiene tools are active
  return [
    ...CORE_TOOLS,
    ...TIME_TOOLS,
    ...RELATIONSHIP_TOOLS,
    ...LOCATION_TOOLS,
    ...HYGIENE_TOOLS,
    ...DEBUG_TOOLS,
  ];

  // Future: return ALL_GAME_TOOLS when all handlers ready
}
