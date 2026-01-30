import { describe, it, expect, vi } from 'vitest';
import { DialogueService } from '../src/social/dialogue.js';
import { Effect } from 'effect';
import type { LLMProvider, LLMMessage, LLMResponse } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';

const {
  getDialogueTreesMock,
  updateDialogueStateMock,
  clearDialogueStateMock,
} = vi.hoisted(() => ({
  getDialogueTreesMock: vi.fn(async () => []),
  updateDialogueStateMock: vi.fn(async () => undefined),
  clearDialogueStateMock: vi.fn(async () => true),
}));

vi.mock('@minimal-rpg/db', () => ({
  getDialogueTrees: getDialogueTreesMock,
  updateDialogueState: updateDialogueStateMock,
  clearDialogueState: clearDialogueStateMock,
  getCharacterProfile: vi.fn(async () => mockProfile),
  getOrCreateDialogueState: vi.fn(async () => ({
    id: 'state-1',
    sessionId: 'test',
    npcId: 'npc-bartender',
    treeId: 'tree-1',
    currentNodeId: null,
    visitedNodes: [],
  })),
}));

const mockProfile: CharacterProfile = {
  id: 'npc-bartender',
  name: 'Bartender',
  summary: 'A friendly bartender tending the tavern.',
  backstory: 'Once a sailor, now a tavern keeper.',
  personality: 'Warm and talkative',
  race: 'human',
  tags: ['draft'],
  tier: 'minor',
};

function createMockProvider(response: string) {
  let lastPrompt = '';

  const provider: LLMProvider = {
    id: 'mock-llm',
    supportsTools: false,
    supportsFunctions: false,
    chat: (messages: LLMMessage[]) => {
      lastPrompt = messages[1]?.content ?? '';
      const payload: LLMResponse = {
        id: 'mock-response',
        content: response,
      };
      return Effect.succeed(payload);
    },
    stream: () => Effect.fail(new Error('not implemented')),
  };

  return { provider, getLastPrompt: () => lastPrompt };
}

describe('DialogueService (static)', () => {
  it('should generate personality-aware response', async () => {
    const { provider } = createMockProvider('Aye, what can I get ye?');

    const response = await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', topic: 'drinks' },
      provider
    );

    expect(response.content).toBe('Aye, what can I get ye?');
  });

  it('should maintain conversation history', async () => {
    const { provider, getLastPrompt } = createMockProvider('Hello!');

    await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', history: ['Hello!'] },
      provider
    );

    await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', history: ['What ales do you have?'] },
      provider
    );

    expect(getLastPrompt()).toContain('Hello!');
  });
});
