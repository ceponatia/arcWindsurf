import { GovernorFactory, type Governor, type GovernorConfig } from '@minimal-rpg/governor';
import {
  StateManager,
  DEFAULT_STATE_MANAGER_CONFIG,
  ProximityService,
} from '@minimal-rpg/state-manager';
import {
  createDefaultRegistry,
  NpcAgent,
  SensoryService,
  type LlmProvider as AgentLlmProvider,
  type LlmGenerateOptions as AgentLlmGenerateOptions,
  type LlmResponse as AgentLlmResponse,
  type AgentStateSlices,
  type NpcMessageRepository,
} from '@minimal-rpg/agents';
import { generateWithOpenRouter } from '@minimal-rpg/utils';
import { getConfig } from '../utils/config.js';
import { getNpcOwnHistory } from '../db/sessionsClient.js';

const stateManager = new StateManager({
  ...DEFAULT_STATE_MANAGER_CONFIG,
  validateOnMerge: true,
  computeMinimalDiff: true,
});

const agentRegistry = createDefaultRegistry();

let sharedAgentLlmProvider: AgentLlmProvider | undefined;

const npcMessageRepository: NpcMessageRepository = {
  async fetchOwnHistory({ ownerEmail, sessionId, npcId, limit }) {
    const rows = await getNpcOwnHistory(
      ownerEmail,
      sessionId,
      npcId,
      limit !== undefined ? { limit } : {}
    );
    return rows.map((row) => ({
      speaker: row.speaker === 'npc' ? 'character' : row.speaker,
      content: row.content,
      timestamp: new Date(row.createdAt),
    }));
  },
};

function getAgentLlmProvider(): AgentLlmProvider | undefined {
  if (sharedAgentLlmProvider) {
    return sharedAgentLlmProvider;
  }

  const cfg = getConfig();
  if (!cfg.openrouterApiKey) {
    // NPC dialogue will fall back to template-based responses
    return undefined;
  }

  sharedAgentLlmProvider = {
    async generate(prompt: string, options?: AgentLlmGenerateOptions): Promise<AgentLlmResponse> {
      const messages: { role: 'system' | 'user'; content: string }[] = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const result = await generateWithOpenRouter(
        {
          apiKey: cfg.openrouterApiKey,
          model: cfg.openrouterModel,
          messages,
        },
        (() => {
          const generationOptions: { temperature?: number; max_tokens?: number } = {};
          if (options?.temperature !== undefined) {
            generationOptions.temperature = options.temperature;
          }
          if (options?.maxTokens !== undefined) {
            generationOptions.max_tokens = options.maxTokens;
          }
          return generationOptions;
        })()
      );

      if ('ok' in result) {
        const err = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
        throw new Error(`Agent LLM failed: ${err}`);
      }

      const response: AgentLlmResponse = {
        text: result.content,
        model: result.model,
      };

      if (result.usage) {
        response.usage = {
          prompt: result.usage.promptTokens ?? 0,
          completion: result.usage.completionTokens ?? 0,
          total: result.usage.totalTokens ?? 0,
        };
      }

      return response;
    },
  };

  return sharedAgentLlmProvider;
}

function ensureAgentsRegistered(): void {
  if (agentRegistry.size > 0) {
    return;
  }

  const llmProvider = getAgentLlmProvider();
  const sensoryService = new SensoryService(llmProvider ? { llmProvider } : {});
  const proximityService = new ProximityService();

  agentRegistry.register(
    new NpcAgent(
      llmProvider
        ? {
            llmProvider,
            services: {
              messageRepository: npcMessageRepository,
              sensoryService,
              proximityService,
            },
            historyLimit: 50,
          }
        : {
            services: {
              messageRepository: npcMessageRepository,
              sensoryService,
              proximityService,
            },
            historyLimit: 50,
          }
    )
  );
}

export interface GovernorFactoryOptions {
  logging?: GovernorConfig['logging'];
  /** Owner key for tenancy scoping */
  ownerEmail: string;
  sessionId: string;
  stateSlices: AgentStateSlices;
  turnTagContext?: import('@minimal-rpg/governor').TurnTagContext;
}

let governorFactory: GovernorFactory | undefined;

export function createGovernorForRequest(options: GovernorFactoryOptions): Governor {
  const cfg = getConfig();

  ensureAgentsRegistered();

  governorFactory ??= new GovernorFactory({
    stateManager,
    agentRegistry,
    npcTranscriptLoader: async ({
      sessionId,
      npcId,
      limit,
    }: {
      sessionId: string;
      npcId: string;
      limit?: number;
    }) => {
      const rows = await getNpcOwnHistory(options.ownerEmail, sessionId, npcId, {
        limit: limit ?? 50,
      });
      return rows.map((row) => ({
        speaker:
          row.speaker === 'npc' ? 'character' : row.speaker === 'player' ? 'player' : 'narrator',
        content: row.content,
        timestamp: new Date(row.createdAt),
      }));
    },
    devMode: cfg.governorDevMode,
  });

  return governorFactory.createForRequest({
    ownerEmail: options.ownerEmail,
    sessionId: options.sessionId,
    stateSlices: options.stateSlices,
  });
}
