import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  createToolBasedTurnHandler,
  type ToolTurnHandlerConfig,
  ToolExecutor,
  type FallbackToolHandler,
} from '@minimal-rpg/governor';
import { StateManager, DEFAULT_STATE_MANAGER_CONFIG } from '@minimal-rpg/state-manager';
import {
  createDefaultRegistry,
  MapAgent,
  NpcAgent,
  RulesAgent,
  SensoryAgent,
  type LlmProvider as AgentLlmProvider,
  type LlmGenerateOptions as AgentLlmGenerateOptions,
  type LlmResponse as AgentLlmResponse,
  type AgentStateSlices,
} from '@minimal-rpg/agents';
import { InMemoryRetrievalService } from '@minimal-rpg/retrieval';
import { generateWithOpenRouter, chatWithOpenRouterTools } from '../llm/openrouter.js';
import { getConfig } from '../util/config.js';
import { getNpcMessages } from '../db/sessionsClient.js';
import { createSessionToolHandler, getSessionTools } from '../llm/tools/index.js';

// Simple process-local singletons for now; can be replaced with
// request-scoped or DI-driven instances later if needed.

const stateManager = new StateManager({
  ...DEFAULT_STATE_MANAGER_CONFIG,
  validateOnMerge: true,
  computeMinimalDiff: true,
});

const agentRegistry = createDefaultRegistry();

const retrievalService = new InMemoryRetrievalService();

let sharedAgentLlmProvider: AgentLlmProvider | undefined;

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
  // Only perform one-time registration on first use
  if (agentRegistry.size > 0) {
    return;
  }

  const llmProvider = getAgentLlmProvider();

  agentRegistry.register(new MapAgent());
  agentRegistry.register(new NpcAgent(llmProvider ? { llmProvider } : {}));
  agentRegistry.register(new RulesAgent());
  agentRegistry.register(new SensoryAgent(llmProvider ? { llmProvider } : {}));
}

export interface GovernorFactoryOptions {
  logging?: GovernorConfig['logging'];
  sessionId: string;
  stateSlices: AgentStateSlices;
}

/**
 * Create a tool-based turn handler (now the only mode).
 * Throws if OPENROUTER_API_KEY is not configured.
 */
function createToolTurnHandlerOrThrow(
  sessionId: string,
  stateSlices: AgentStateSlices
): ReturnType<typeof createToolBasedTurnHandler> {
  const cfg = getConfig();

  if (!cfg.openrouterApiKey) {
    throw new Error('[Governor] OPENROUTER_API_KEY is required for tool-calling mode');
  }

  // Ensure agents are registered for tool executor
  ensureAgentsRegistered();

  const sensoryAgent = agentRegistry.get('sensory') as SensoryAgent | undefined;
  const npcAgent = agentRegistry.get('npc') as NpcAgent | undefined;

  if (!sensoryAgent || !npcAgent) {
    throw new Error('[Governor] Required agents (sensory, npc) not registered');
  }

  // Create session tool handler as fallback for session-focused tools
  const sessionToolHandler = createSessionToolHandler({ sessionId });
  const fallbackHandler: FallbackToolHandler = (toolCall) => sessionToolHandler.execute(toolCall);

  const toolExecutor = new ToolExecutor({
    sensoryAgent,
    npcAgent,
    sessionId,
    stateSlices,
    fallbackHandler,
  });

  const config: ToolTurnHandlerConfig = {
    chatWithTools: async (opts) => {
      return chatWithOpenRouterTools(opts);
    },
    apiKey: cfg.openrouterApiKey,
    model: cfg.openrouterModel,
    toolExecutor,
    sessionId,
    stateSlices,
    additionalTools: getSessionTools(),
    debug: cfg.governorDevMode,
  };

  return createToolBasedTurnHandler(config);
}

/**
 * Create a Governor configured for tool-calling mode.
 * Tool-calling is now the only supported mode.
 */
export function createGovernorForRequest(options: GovernorFactoryOptions): Governor {
  const cfg = getConfig();

  // Ensure core agents are wired into the registry before handling turns
  ensureAgentsRegistered();

  // Create tool turn handler (required)
  const toolHandler = createToolTurnHandlerOrThrow(options.sessionId, options.stateSlices);

  const governorConfig: GovernorConfig = {
    stateManager,
    toolTurnHandler: toolHandler,
    npcTranscriptLoader: async ({ sessionId, npcId, limit }) => {
      const rows = await getNpcMessages(sessionId, npcId, { limit: limit ?? 50 });
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
