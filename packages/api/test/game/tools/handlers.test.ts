import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolCall } from '../../../src/game/tools/types.js';
import { SessionToolHandler, createSessionToolHandler } from '../../../src/game/tools/handlers.js';

const handlerMocks = vi.hoisted(() => ({
  getSessionTagsWithDefinitionsMock: vi.fn(),
  drizzleSelectMock: vi.fn(),
  handleExamineObjectMock: vi.fn(),
  handleNavigatePlayerMock: vi.fn(),
  handleUseItemMock: vi.fn(),
  actorStatesTable: { table: 'actorStates' },
  eventsTable: { table: 'events' },
  eqMock: vi.fn(),
  andMock: vi.fn(),
  descMock: vi.fn(),
  actorStateRows: [] as Array<Record<string, unknown>>,
  eventRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getSessionTagsWithDefinitions: handlerMocks.getSessionTagsWithDefinitionsMock,
  drizzle: { select: handlerMocks.drizzleSelectMock },
  actorStates: handlerMocks.actorStatesTable,
  events: handlerMocks.eventsTable,
  eq: handlerMocks.eqMock,
  and: handlerMocks.andMock,
  desc: handlerMocks.descMock,
}));

vi.mock('../../../src/game/tools/gameplay-handlers.js', () => ({
  handleExamineObject: handlerMocks.handleExamineObjectMock,
  handleNavigatePlayer: handlerMocks.handleNavigatePlayerMock,
  handleUseItem: handlerMocks.handleUseItemMock,
}));

function createQuery(rows: Array<Record<string, unknown>>) {
  const query = {
    where: () => query,
    orderBy: () => query,
    limit: () => Promise.resolve(rows),
    then: (
      onFulfilled: (value: Array<Record<string, unknown>>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(rows).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => Promise.resolve(rows).catch(onRejected),
  };

  return query;
}

const ownerEmail = 'owner@example.com';
const sessionId = '11111111-1111-4111-8111-111111111111';

describe('game/tools/handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    handlerMocks.actorStateRows = [];
    handlerMocks.eventRows = [];

    handlerMocks.drizzleSelectMock.mockImplementation(() => ({
      from: (table: unknown) => {
        const rows =
          table === handlerMocks.actorStatesTable
            ? handlerMocks.actorStateRows
            : table === handlerMocks.eventsTable
              ? handlerMocks.eventRows
              : [];
        return createQuery(rows);
      },
    }));
  });

  it('returns an error when arguments cannot be parsed', async () => {
    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'get_session_tags', arguments: '{bad json' },
    } as ToolCall;

    await expect(handler.execute(toolCall)).resolves.toEqual({
      success: false,
      error: 'Failed to parse tool arguments: {bad json',
    });
  });

  it('executes get_session_tags and filters by category', async () => {
    handlerMocks.getSessionTagsWithDefinitionsMock.mockResolvedValue([
      {
        tagId: 'tag-1',
        tag: { name: 'Noir', promptText: 'Shadowed', category: 'tone' },
      },
      {
        tagId: 'tag-2',
        tag: { name: 'Space', promptText: 'Stars', category: 'genre' },
      },
    ]);

    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'get_session_tags', arguments: JSON.stringify({ category: 'Tone' }) },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({
      success: true,
      tags: [
        {
          id: 'tag-1',
          name: 'Noir',
          promptText: 'Shadowed',
          category: 'tone',
        },
      ],
      count: 1,
    });
  });

  it('returns persona data when a player actor state exists', async () => {
    handlerMocks.actorStateRows = [
      {
        actorId: 'player-1',
        actorType: 'player',
        state: { profile: { name: 'Aria', description: 'A traveler.' } },
      },
    ];

    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'get_session_persona', arguments: '{}' },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({
      success: true,
      persona: {
        id: 'player-1',
        name: 'Aria',
        description: 'A traveler.',
        attributes: { name: 'Aria', description: 'A traveler.' },
      },
      has_persona: true,
    });
  });

  it('returns an empty persona when no player actor state exists', async () => {
    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'get_session_persona', arguments: '{}' },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({
      success: true,
      persona: null,
      has_persona: false,
    });
  });

  it('lists NPCs in the session', async () => {
    handlerMocks.actorStateRows = [
      {
        actorId: 'npc-1',
        actorType: 'npc',
        entityProfileId: 'profile-1',
        state: { name: 'Vex', status: 'active' },
      },
      {
        actorId: 'npc-2',
        actorType: 'npc',
        entityProfileId: null,
        state: { name: 'Luna', status: 'inactive' },
      },
    ];

    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'query_npc_list', arguments: '{}' },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({
      success: true,
      npcs: [
        {
          id: 'npc-1',
          name: 'Vex',
          template_id: 'profile-1',
          is_active: true,
        },
        {
          id: 'npc-2',
          name: 'Luna',
          template_id: 'npc-2',
          is_active: false,
        },
      ],
      count: 2,
    });
  });

  it('returns NPC transcript and resolved name', async () => {
    handlerMocks.eventRows = [
      {
        actorId: 'player',
        payload: { content: 'Hello' },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        actorId: 'npc-9',
        payload: { content: 'Greetings' },
        timestamp: new Date('2024-01-01T00:01:00.000Z'),
      },
    ];
    handlerMocks.actorStateRows = [
      {
        actorId: 'npc-9',
        actorType: 'npc',
        state: { name: 'Ira' },
      },
    ];

    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'get_npc_transcript', arguments: JSON.stringify({ npc_id: 'npc-9' }) },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({
      success: true,
      npc_id: 'npc-9',
      npc_name: 'Ira',
      messages: [
        {
          role: 'assistant',
          content: 'Greetings',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ],
      count: 2,
    });
  });

  it('delegates gameplay tool calls', async () => {
    handlerMocks.handleExamineObjectMock.mockResolvedValue({ success: true });

    const handler = new SessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'examine_object', arguments: JSON.stringify({ target: 'desk' }) },
    } as ToolCall;

    const result = await handler.execute(toolCall);

    expect(result).toEqual({ success: true });
    expect(handlerMocks.handleExamineObjectMock).toHaveBeenCalledWith(
      { target: 'desk' },
      { ownerEmail, sessionId }
    );
  });

  it('returns null for unknown tools', async () => {
    const handler = createSessionToolHandler({ ownerEmail, sessionId });
    const toolCall = {
      function: { name: 'unknown_tool', arguments: '{}' },
    } as ToolCall;

    await expect(handler.execute(toolCall)).resolves.toBeNull();
    expect(SessionToolHandler.isSessionTool('unknown_tool')).toBe(false);
    expect(SessionToolHandler.isSessionTool('get_session_persona')).toBe(true);
  });
});
