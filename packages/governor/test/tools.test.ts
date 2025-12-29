import { describe, expect, test } from 'vitest';
import type { ToolDefinition } from '../src/index.js';
import {
  ALL_GAME_TOOLS,
  CORE_TOOLS,
  DEBUG_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  LOCATION_TOOLS,
  RELATIONSHIP_TOOLS,
  HYGIENE_TOOLS,
  TIME_TOOLS,
  getActiveTools,
} from '../src/index.js';

function toolNames(tools: ToolDefinition[]): string[] {
  return tools.map((t) => t.function.name);
}

describe('tools exports', () => {
  test('future tool groups are present for activation', () => {
    expect(Array.isArray(ENVIRONMENT_TOOLS)).toBe(true);
    expect(ENVIRONMENT_TOOLS.length).toBeGreaterThan(0);

    expect(Array.isArray(INVENTORY_TOOLS)).toBe(true);
    expect(INVENTORY_TOOLS.length).toBeGreaterThan(0);
  });

  test('getActiveTools returns configured phase set', () => {
    const active = getActiveTools();
    expect(Array.isArray(active)).toBe(true);
    expect(active.length).toBeGreaterThan(0);

    const names = toolNames(active);
    const expected = [
      ...toolNames(CORE_TOOLS),
      ...toolNames(TIME_TOOLS),
      ...toolNames(RELATIONSHIP_TOOLS),
      ...toolNames(LOCATION_TOOLS),
      ...toolNames(HYGIENE_TOOLS),
      ...toolNames(DEBUG_TOOLS),
    ];
    expect(names).toEqual(expected);
  });

  test('ALL_GAME_TOOLS aggregates all tool groups', () => {
    expect(Array.isArray(ALL_GAME_TOOLS)).toBe(true);
    expect(ALL_GAME_TOOLS.length).toBeGreaterThan(0);

    const names = toolNames(ALL_GAME_TOOLS);
    const requiredNames = [
      'get_sensory_detail',
      'update_proximity',
      'navigate_player',
      'examine_object',
      'use_item',
      'advance_time',
      'update_relationship',
      'get_npc_memory',
      'update_npc_hygiene',
      'get_hygiene_sensory',
      'generate_npc_schedule',
      'assign_npc_location',
      'get_schedule_resolution',
      'tooling_failure_report',
    ];

    requiredNames.forEach((toolName) => {
      expect(names).toContain(toolName);
    });
  });
});
