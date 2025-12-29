import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  createToolBasedTurnHandler,
  type ToolTurnHandlerConfig,
  ToolExecutor,
  type FallbackToolHandler,
  type LocationInfo,
  type ToolCallHistoryRecord,
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
import {
  HygieneService,
  FileHygieneModifiersProvider,
  DbHygieneRepository,
} from '@minimal-rpg/characters';
import { generateWithOpenRouter, chatWithOpenRouterTools } from '../llm/openrouter.js';
import { getConfig } from '../util/config.js';
import { getNpcMessages, appendToolCallHistoryBatch } from '../db/sessionsClient.js';
import { createSessionToolHandler, getSessionTools } from '../llm/tools/index.js';
import { db } from '../db/prismaClient.js';

// Simple process-local singletons for now; can be replaced with
// request-scoped or DI-driven instances later if needed.

const stateManager = new StateManager({
  ...DEFAULT_STATE_MANAGER_CONFIG,
  validateOnMerge: true,
  computeMinimalDiff: true,
});

const agentRegistry = createDefaultRegistry();

let hygieneService: HygieneService | null = null;

function getHygieneService(): HygieneService {
  if (hygieneService) {
    return hygieneService;
  }

  const repository = new DbHygieneRepository(db);
  const modifiers = new FileHygieneModifiersProvider();
  hygieneService = new HygieneService({ repository, modifiers });
  return hygieneService;
}

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
  /** Owner key for tenancy scoping */
  ownerEmail: string;
  sessionId: string;
  stateSlices: AgentStateSlices;
  turnTagContext?: import('@minimal-rpg/governor').TurnTagContext;
  /** Available locations for navigation (from LocationGraphService) */
  availableLocations?: Map<string, LocationInfo>;
  /** Current player location ID */
  playerLocationId?: string;
  /** Current turn index for tool history tracking */
  turnIdx?: number;
}

/**
 * Options for creating the tool turn handler.
 */
interface ToolTurnHandlerOptions {
  ownerEmail: string;
  sessionId: string;
  stateSlices: AgentStateSlices;
  turnTagContext?: import('@minimal-rpg/governor').TurnTagContext;
  availableLocations?: Map<string, LocationInfo>;
  playerLocationId?: string;
  turnIdx?: number;
}

/**
 * Create a tool-based turn handler (now the only mode).
 * Throws if OPENROUTER_API_KEY is not configured.
 */
function createToolTurnHandlerOrThrow(
  options: ToolTurnHandlerOptions
): ReturnType<typeof createToolBasedTurnHandler> {
  const { sessionId, stateSlices, turnTagContext, availableLocations, playerLocationId, turnIdx } =
    options;
  const { ownerEmail } = options;
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
  const sessionToolHandler = createSessionToolHandler({ ownerEmail, sessionId });
  const fallbackHandler: FallbackToolHandler = (toolCall) => sessionToolHandler.execute(toolCall);

  const toolExecutor = new ToolExecutor({
    sensoryAgent,
    npcAgent,
    hygieneService: getHygieneService(),
    sessionId,
    stateSlices,
    fallbackHandler,
    ...(turnTagContext !== undefined && { turnTagContext }),
    ...(availableLocations !== undefined && { availableLocations }),
    ...(playerLocationId !== undefined && { playerLocationId }),
  });

  // Create callback to persist tool call history
  const onToolCallsComplete = async (records: ToolCallHistoryRecord[]): Promise<void> => {
    if (records.length === 0) return;

    try {
      await appendToolCallHistoryBatch(
        records.map((r) => ({
          ownerEmail,
          sessionId,
          turnIdx: turnIdx ?? 0,
          toolName: r.toolName,
          toolArgs: r.toolArgs,
          toolResult: r.toolResult,
          success: r.success,
        }))
      );
    } catch (err) {
      // Non-fatal - log but don't fail the turn
      console.error('[Governor] Failed to persist tool call history:', err);
    }
  };

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
    onToolCallsComplete,
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
  const toolHandler = createToolTurnHandlerOrThrow({
    ownerEmail: options.ownerEmail,
    sessionId: options.sessionId,
    stateSlices: options.stateSlices,
    ...(options.turnTagContext !== undefined && { turnTagContext: options.turnTagContext }),
    ...(options.availableLocations !== undefined && {
      availableLocations: options.availableLocations,
    }),
    ...(options.playerLocationId !== undefined && { playerLocationId: options.playerLocationId }),
    ...(options.turnIdx !== undefined && { turnIdx: options.turnIdx }),
  });

  const governorConfig: GovernorConfig = {
    stateManager,
    toolTurnHandler: toolHandler,
    npcTranscriptLoader: async ({ sessionId, npcId, limit }) => {
      const rows = await getNpcMessages(options.ownerEmail, sessionId, npcId, {
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
