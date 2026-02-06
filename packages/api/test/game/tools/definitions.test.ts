import { describe, expect, it } from 'vitest';
import {
  GET_NPC_TRANSCRIPT_TOOL,
  GET_SESSION_PERSONA_TOOL,
  GET_SESSION_TAGS_TOOL,
  QUERY_NPC_LIST_TOOL,
  SESSION_TOOLS,
  getSessionTools,
} from '../../../src/game/tools/definitions.js';

describe('game/tools/definitions', () => {
  it('exposes session tool definitions', () => {
    const tools = getSessionTools();
    const names = tools.map((tool) => tool.function.name);

    expect(tools).toEqual(SESSION_TOOLS);
    expect(names).toEqual([
      'get_session_tags',
      'get_session_persona',
      'query_npc_list',
      'get_npc_transcript',
    ]);
  });

  it('defines required tool schemas', () => {
    expect(GET_SESSION_TAGS_TOOL.type).toBe('function');
    expect(GET_SESSION_PERSONA_TOOL.function.parameters.type).toBe('object');
    expect(QUERY_NPC_LIST_TOOL.function.parameters.properties).toHaveProperty('active_only');
    expect(GET_NPC_TRANSCRIPT_TOOL.function.parameters.required).toEqual(['npc_id']);
  });
});
