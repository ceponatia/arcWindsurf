import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  NpcTurnHandler,
  type NpcTurnHandlerConfig,
} from '@minimal-rpg/governor';
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
import { generateWithOpenRouter } from '../llm/openrouter.js';
import { getConfig } from '../util/config.js';
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

interface NpcTurnHandlerOptions {
  ownerEmail: string;
  stateSlices: AgentStateSlices;
}

function createNpcTurnHandler(options: NpcTurnHandlerOptions): NpcTurnHandler {
  ensureAgentsRegistered();

  const npcAgent = agentRegistry.get('npc') as NpcAgent | undefined;

  if (!npcAgent) {
    throw new Error('[Governor] Required agent (npc) not registered');
  }

  const handlerConfig: NpcTurnHandlerConfig = {
    npcAgent,
    ownerEmail: options.ownerEmail,
    stateSlices: options.stateSlices,
  };

  return new NpcTurnHandler(handlerConfig);
}

export function createGovernorForRequest(options: GovernorFactoryOptions): Governor {
  const cfg = getConfig();

  ensureAgentsRegistered();

  const npcTurnHandler = createNpcTurnHandler({
    ownerEmail: options.ownerEmail,
    stateSlices: options.stateSlices,
  });

  const governorConfig: GovernorConfig = {
    stateManager,
    toolTurnHandler: npcTurnHandler,
    npcTranscriptLoader: async ({ sessionId, npcId, limit }) => {
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
    options: {
      devMode: cfg.governorDevMode,
    },
  };

  if (options.logging) {
    governorConfig.logging = options.logging;
  }

  return createGovernor(governorConfig);
}
