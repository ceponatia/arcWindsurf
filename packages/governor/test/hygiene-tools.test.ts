import { describe, expect, it, vi } from 'vitest';
import type { ToolCall } from '../src/tools/types.js';
import { ToolExecutor } from '../src/tools/executor.js';
import type { SensoryAgent, NpcAgent, AgentStateSlices } from '@minimal-rpg/agents';
import {
  DEFAULT_HYGIENE_THRESHOLDS,
  type BodyPartHygieneState,
  type NpcHygieneState,
  type SensoryModifiersData,
} from '@minimal-rpg/schemas';
import {
  HygieneService,
  type HygieneModifiersProvider,
  type HygieneRepository,
} from '@minimal-rpg/characters';

type MutableState = NpcHygieneState & { bodyParts: Record<string, BodyPartHygieneState> };

class InMemoryHygieneRepository implements HygieneRepository {
  constructor(public state: MutableState) {}

  async getState(_sessionId: string, _npcId: string): Promise<NpcHygieneState> {
    return { npcId: this.state.npcId, bodyParts: { ...this.state.bodyParts } };
  }

  async upsertPart(
    _sessionId: string,
    _npcId: string,
    bodyPart: string,
    state: BodyPartHygieneState
  ): Promise<void> {
    this.state.bodyParts[bodyPart] = state;
  }

  async resetParts(
    _sessionId: string,
    _npcId: string,
    bodyParts: string[],
    at: Date
  ): Promise<void> {
    for (const part of bodyParts) {
      this.state.bodyParts[part] = { points: 0, level: 0, lastUpdatedAt: at.toISOString() };
    }
  }

  async initializeAll(
    _sessionId: string,
    npcId: string,
    at: Date,
    regions: readonly string[]
  ): Promise<NpcHygieneState> {
    const bodyParts: Record<string, BodyPartHygieneState> = {};
    for (const region of regions) {
      bodyParts[region] = { points: 0, level: 0, lastUpdatedAt: at.toISOString() };
    }
    this.state = { npcId, bodyParts };
    return this.state;
  }
}

function makeModifiersProvider(data: SensoryModifiersData): HygieneModifiersProvider {
  return {
    load: async () => data,
  };
}

function createToolExecutor(options: {
  repositoryState: MutableState;
  modifiers: SensoryModifiersData;
  sensoryAgent?: SensoryAgent;
  stateSlices?: AgentStateSlices;
}): { executor: ToolExecutor; repository: InMemoryHygieneRepository } {
  const repository = new InMemoryHygieneRepository(options.repositoryState);
  const hygieneService = new HygieneService({
    repository,
    modifiers: makeModifiersProvider(options.modifiers),
  });
  const sensoryAgent: SensoryAgent =
    options.sensoryAgent ??
    ({
      execute: vi.fn().mockResolvedValue({
        sensoryContext: {
          available: {
            smell: [
              {
                source: 'npc scent',
                bodyPart: 'feet',
                description: 'existing scent',
                intensity: 0.25,
              },
            ],
          },
          narrativeHints: {
            playerIsSniffing: true,
            playerIsTouching: false,
            playerIsTasting: false,
            recentSensoryAction: true,
          },
        },
      }),
    } as unknown as SensoryAgent);

  const npcAgent = { execute: vi.fn() } as unknown as NpcAgent;
  const executor = new ToolExecutor({
    sensoryAgent,
    npcAgent,
    hygieneService,
    ownerEmail: 'owner@example.com',
    sessionId: 'session-1',
    stateSlices: options.stateSlices ?? ({} as AgentStateSlices),
  });

  return { executor, repository };
}

const baseModifiers: SensoryModifiersData = {
  bodyParts: {
    feet: {
      smell: {
        '0': '',
        '1': 'fresh',
        '2': 'noticeable',
        '3': 'strong',
        '4': 'pungent',
        '5': 'overpowering',
        '6': 'putrid',
      },
    },
  },
  decayRates: {
    feet: {
      bodyPart: 'feet',
      thresholds: DEFAULT_HYGIENE_THRESHOLDS,
      baseDecayPerTurn: 4,
    },
  },
};

describe('hygiene tool handling', () => {
  it('get_hygiene_sensory returns modifier and level', async () => {
    const { executor } = createToolExecutor({
      repositoryState: {
        npcId: 'npc-1',
        bodyParts: { feet: { points: 120, level: 4, lastUpdatedAt: new Date().toISOString() } },
      },
      modifiers: baseModifiers,
    });

    const toolCall: ToolCall = {
      id: 'call-1',
      type: 'function',
      function: {
        name: 'get_hygiene_sensory',
        arguments: JSON.stringify({ npc_id: 'npc-1', body_part: 'feet', sense_type: 'smell' }),
      },
    };

    const result = await executor.execute(toolCall);

    expect(result.success).toBe(true);
    expect(result.hygiene_modifier).toBe('pungent');
    expect(result.hygiene_level).toBe(4);
  });

  it('update_npc_hygiene returns hygiene patches and updated state', async () => {
    const { executor, repository } = createToolExecutor({
      repositoryState: {
        npcId: 'npc-2',
        bodyParts: { feet: { points: 0, level: 0, lastUpdatedAt: new Date().toISOString() } },
      },
      modifiers: baseModifiers,
    });

    const toolCall: ToolCall = {
      id: 'call-2',
      type: 'function',
      function: {
        name: 'update_npc_hygiene',
        arguments: JSON.stringify({
          npc_id: 'npc-2',
          activity: 'running',
          turns_elapsed: 1,
          environment: 'humid',
          cleaned_parts: ['hands'],
        }),
      },
    };

    const result = await executor.execute(toolCall);

    expect(result.success).toBe(true);
    expect(result.statePatches?.hygiene?.[0]?.path).toBe('/npc-2');
    const updatedFeet = repository.state.bodyParts.feet;
    expect(updatedFeet.points).toBeGreaterThan(0);
    expect(updatedFeet.level).toBeGreaterThanOrEqual(0);
  });

  it('get_sensory_detail enriches response with hygiene metadata', async () => {
    const { executor } = createToolExecutor({
      repositoryState: {
        npcId: 'npc-3',
        bodyParts: { feet: { points: 120, level: 4, lastUpdatedAt: new Date().toISOString() } },
      },
      modifiers: baseModifiers,
      stateSlices: { npc: { instanceId: 'npc-3', name: 'Taylor' } },
    });

    const toolCall: ToolCall = {
      id: 'call-3',
      type: 'function',
      function: {
        name: 'get_sensory_detail',
        arguments: JSON.stringify({ sense_type: 'smell', target: 'npc-3', body_part: 'feet' }),
      },
    };

    const result = await executor.execute(toolCall);

    expect(result.success).toBe(true);
    expect(result.hygiene_modifier).toBe('pungent');
    expect(result.hygiene_level).toBe(4);
  });
});
