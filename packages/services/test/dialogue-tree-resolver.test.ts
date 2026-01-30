/**
 * Dialogue tree resolver tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogueTreeResolver } from '../src/social/dialogue-tree-resolver.js';
import { DialogueTreeSchema } from '@minimal-rpg/schemas';
import type { DialogueConditionContext } from '../src/social/dialogue-tree-types.js';

interface DialogueTreeRecord {
  id: string;
  npcId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  startNodeId: string;
  nodes: Record<string, unknown>;
  priority: number | null;
}

const {
  getDialogueTreesMock,
  updateDialogueStateMock,
  clearDialogueStateMock,
} = vi.hoisted(() => ({
  getDialogueTreesMock: vi.fn(async () => [] as DialogueTreeRecord[]),
  updateDialogueStateMock: vi.fn(async () => ({
    id: 'state-1',
    sessionId: 'session-1',
    npcId: 'npc-1',
    treeId: 'tree-1',
    currentNodeId: 'next',
    visitedNodes: ['next'],
  })),
  clearDialogueStateMock: vi.fn(async () => true),
}));

vi.mock('@minimal-rpg/db', () => ({
  getDialogueTrees: getDialogueTreesMock,
  updateDialogueState: updateDialogueStateMock,
  clearDialogueState: clearDialogueStateMock,
}));

describe('DialogueTreeResolver', () => {
  beforeEach(() => {
    getDialogueTreesMock.mockClear();
    updateDialogueStateMock.mockClear();
    clearDialogueStateMock.mockClear();
  });

  it('selects highest priority matching tree', async () => {
    getDialogueTreesMock.mockResolvedValue([
      {
        id: 'tree-low',
        npcId: 'npc-1',
        triggerType: 'keyword',
        triggerData: { keywords: ['hello'] },
        startNodeId: 'start',
        nodes: {
          start: {
            id: 'start',
            npcLine: 'Hello there.',
            options: [],
          },
        },
        priority: 0,
      },
      {
        id: 'tree-high',
        npcId: 'npc-1',
        triggerType: 'keyword',
        triggerData: { keywords: ['hello'] },
        startNodeId: 'start',
        nodes: {
          start: {
            id: 'start',
            npcLine: 'Greetings.',
            options: [],
          },
        },
        priority: 5,
      },
    ] as DialogueTreeRecord[]);

    const tree = await DialogueTreeResolver.findTree('npc-1', 'hello friend', {
      sessionId: 'session-1',
    });

    expect(tree?.id).toBe('tree-high');
  });

  it('filters options by conditions', async () => {
    const tree = DialogueTreeSchema.parse({
      id: 'tree-1',
      npcId: 'npc-1',
      trigger: { type: 'greeting' },
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          npcLine: 'Hello.',
          options: [
            {
              id: 'opt-allowed',
              playerText: 'Ask about the town.',
              nextNodeId: null,
              conditions: [{ type: 'flag', flagId: 'can_ask', value: true }],
            },
            {
              id: 'opt-blocked',
              playerText: 'Ask about the vault.',
              nextNodeId: null,
              conditions: [{ type: 'flag', flagId: 'can_ask', value: false }],
            },
          ],
        },
      },
    });

    const state = {
      id: 'state-1',
      sessionId: 'session-1',
      npcId: 'npc-1',
      treeId: 'tree-1',
      currentNodeId: null,
      visitedNodes: [],
    };

    const context: DialogueConditionContext = {
      sessionId: 'session-1',
      actorId: 'player-1',
      npcId: 'npc-1',
      flags: { can_ask: true },
    };

    const resolved = await DialogueTreeResolver.resolve(tree, state, context);

    expect(resolved.options).toHaveLength(1);
    expect(resolved.options[0]?.id).toBe('opt-allowed');
  });

  it('executes effects and advances state on selection', async () => {
    const tree = DialogueTreeSchema.parse({
      id: 'tree-1',
      npcId: 'npc-1',
      trigger: { type: 'greeting' },
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          npcLine: 'Hello.',
          options: [
            {
              id: 'opt-next',
              playerText: 'Continue.',
              nextNodeId: 'next',
              effects: [{ type: 'custom', handler: 'mark-step' }],
            },
          ],
        },
        next: {
          id: 'next',
          npcLine: 'Onward.',
          options: [],
        },
      },
    });

    const state = {
      id: 'state-1',
      sessionId: 'session-1',
      npcId: 'npc-1',
      treeId: 'tree-1',
      currentNodeId: null,
      visitedNodes: [],
    };

    const customHandler = vi.fn(async () => undefined);
    const context: DialogueConditionContext = {
      sessionId: 'session-1',
      actorId: 'player-1',
      npcId: 'npc-1',
      effectHandlers: {
        custom: customHandler,
      },
    };

    await DialogueTreeResolver.selectOption(tree, state, 'opt-next', context);

    expect(customHandler).toHaveBeenCalledWith({
      sessionId: 'session-1',
      actorId: 'player-1',
      handler: 'mark-step',
    });
    expect(updateDialogueStateMock).toHaveBeenCalled();
  });
});
