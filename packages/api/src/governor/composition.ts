import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  type ResponseComposer,
  LlmIntentDetector,
  createRuleBasedIntentDetector,
  type IntentDetector,
  type LlmIntentMessage,
  createToolBasedTurnHandler,
  type ToolTurnHandlerConfig,
  ToolExecutor,
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

// Simple process-local singletons for now; can be replaced with
// request-scoped or DI-driven instances later if needed.

const stateManager = new StateManager({
  ...DEFAULT_STATE_MANAGER_CONFIG,
  validateOnMerge: true,
  computeMinimalDiff: true,
});

const agentRegistry = createDefaultRegistry();

const retrievalService = new InMemoryRetrievalService();

let sharedIntentDetector: IntentDetector | undefined;
let sharedAgentLlmProvider: AgentLlmProvider | undefined;
let sharedResponseComposer: ResponseComposer | undefined;

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

/**
 * Get response composer for Phase 5: Simplified formatting only.
 *
 * Phase 5 redesign: NPC agent is now the sole prose writer.
 * This composer just formats/concatenates outputs without LLM rewriting.
 * The ResponseComposer LLM call has been removed - agents write complete prose.
 */
function getResponseComposer(): ResponseComposer | undefined {
  if (sharedResponseComposer) {
    return sharedResponseComposer;
  }

  // Simple concatenation - NPC agent has already woven in sensory details
  sharedResponseComposer = ({ executionResult }) => {
    // Get successful agent outputs
    const narratives = executionResult.agentResults
      .filter((r) => r.success && r.output.narrative?.trim())
      .map((r) => r.output.narrative.trim());

    // Simple concatenation with scene dividers for multiple NPCs
    if (narratives.length === 0) {
      return Promise.resolve(undefined);
    }

    if (narratives.length === 1) {
      return Promise.resolve(narratives[0]);
    }

    // Multiple outputs - join with scene dividers
    return Promise.resolve(narratives.join('\n\n---\n\n'));
  };

  return sharedResponseComposer;
}

function resolveIntentDetector(): IntentDetector {
  if (sharedIntentDetector) {
    return sharedIntentDetector;
  }

  const cfg = getConfig();
  if (!cfg.openrouterApiKey) {
    console.warn('[Governor] OPENROUTER_API_KEY not set; using rule-based intent detector');
    sharedIntentDetector = createRuleBasedIntentDetector();
    return sharedIntentDetector;
  }

  sharedIntentDetector = new LlmIntentDetector({
    detectorName: 'openrouter-intent-detector',
    historyLimit: 3,
    minConfidence: 0.05,
    debug: cfg.intentDebug,
    callModel: async (messages: LlmIntentMessage[]) => {
      const result = await generateWithOpenRouter(
        {
          apiKey: cfg.openrouterApiKey,
          model: cfg.openrouterModel,
          messages,
        },
        {
          temperature: 0.1,
          top_p: 0.1,
          max_tokens: 256,
        }
      );

      if ('ok' in result) {
        const err = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
        throw new Error(`Intent detector LLM failed: ${err}`);
      }

      return {
        content: result.content,
        model: result.model,
        raw: result,
      };
    },
  });

  return sharedIntentDetector;
}

export interface GovernorFactoryOptions {
  logging?: GovernorConfig['logging'];
  intentDetector?: IntentDetector;
  sessionId?: string;
  stateSlices?: AgentStateSlices;
}

/**
 * Create a tool-based turn handler if tool calling mode is enabled.
 */
function createToolTurnHandler(
  sessionId: string,
  stateSlices: AgentStateSlices
): ReturnType<typeof createToolBasedTurnHandler> | undefined {
  const cfg = getConfig();

  if (cfg.turnHandler === 'classic') {
    return undefined;
  }

  if (!cfg.openrouterApiKey) {
    console.warn('[ToolTurnHandler] OPENROUTER_API_KEY not set; falling back to classic mode');
    return undefined;
  }

  // Ensure agents are registered for tool executor
  ensureAgentsRegistered();

  const sensoryAgent = agentRegistry.get('sensory') as SensoryAgent | undefined;
  const npcAgent = agentRegistry.get('npc') as NpcAgent | undefined;

  if (!sensoryAgent || !npcAgent) {
    console.warn('[ToolTurnHandler] Required agents not registered; falling back to classic mode');
    return undefined;
  }

  const toolExecutor = new ToolExecutor({
    sensoryAgent,
    npcAgent,
    sessionId,
    stateSlices,
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
    debug: cfg.governorDevMode,
  };

  return createToolBasedTurnHandler(config);
}

export function createGovernorForRequest(options: GovernorFactoryOptions = {}): Governor {
  const cfg = getConfig();
  const intentDetector = options.intentDetector ?? resolveIntentDetector();
  const responseComposer = getResponseComposer();

  // Ensure core agents are wired into the registry before handling turns
  ensureAgentsRegistered();

  const governorConfig: GovernorConfig = {
    stateManager,
    agentRegistry,
    retrievalService,
    intentDetector,
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
      maxAgentsPerTurn: 5,
      continueOnAgentError: true,
      applyPatchesOnPartialFailure: false,
      intentConfidenceThreshold: 0.6,
      devMode: cfg.governorDevMode,
      turnHandler: cfg.turnHandler,
    },
  };

  // Add tool turn handler if enabled and we have the required context
  if (cfg.turnHandler !== 'classic' && options.sessionId && options.stateSlices) {
    const toolHandler = createToolTurnHandler(options.sessionId, options.stateSlices);
    if (toolHandler) {
      governorConfig.toolTurnHandler = toolHandler;
    }
  }

  if (responseComposer) {
    governorConfig.responseComposer = responseComposer;
  }

  if (options.logging) {
    governorConfig.logging = options.logging;
  }

  return createGovernor(governorConfig);
}
