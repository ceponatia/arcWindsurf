import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  type ResponseComposer,
  LlmIntentDetector,
  createRuleBasedIntentDetector,
  type IntentDetector,
  type LlmIntentMessage,
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
} from '@minimal-rpg/agents';
import { InMemoryRetrievalService } from '@minimal-rpg/retrieval';
import { generateWithOpenRouter } from '../llm/openrouter.js';
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

function getResponseComposer(): ResponseComposer | undefined {
  if (sharedResponseComposer) {
    return sharedResponseComposer;
  }

  const cfg = getConfig();
  if (!cfg.openrouterApiKey) {
    // Without an LLM provider, fall back to raw agent narratives.
    return undefined;
  }

  sharedResponseComposer = async ({ executionResult, sessionTags }) => {
    // Get successful agent outputs
    const agentOutputs = executionResult.agentResults
      .filter((r) => r.success && r.output.narrative?.trim())
      .map((r) => `[${r.agentType.toUpperCase()}] ${r.output.narrative.trim()}`);

    // If only one agent or no agents, skip LLM composition
    if (agentOutputs.length <= 1) {
      return agentOutputs[0]?.replace(/^\[[A-Z]+\]\s*/, '') ?? '';
    }

    // Build compact system prompt
    const styleParts = sessionTags?.length ? sessionTags.map((t) => t.promptText).join('; ') : '';

    const systemPrompt = `Weave these agent outputs into ONE response. Keep all content. NPC dialogue in quotes, actions in *asterisks*. 2-4 sentences max.${styleParts ? ` Style: ${styleParts}` : ''}`;

    // Compact user prompt
    const userPrompt = agentOutputs.join('\n');

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const result = await generateWithOpenRouter(
      {
        apiKey: cfg.openrouterApiKey,
        model: cfg.openrouterModel,
        messages,
      },
      {
        temperature: 0.5,
        max_tokens: 200,
      }
    );

    if ('ok' in result) {
      const err = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      throw new Error(`Response composer LLM failed: ${err}`);
    }

    return result.content.trim();
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
}

export function createGovernorForRequest(options: GovernorFactoryOptions = {}): Governor {
  const cfg = getConfig();
  const intentDetector = options.intentDetector ?? resolveIntentDetector();
  const responseComposer = getResponseComposer();

  // Ensure core agents are wired into the registry before handling turns
  ensureAgentsRegistered();

  return createGovernor({
    stateManager,
    agentRegistry,
    retrievalService,
    intentDetector,
    responseComposer,
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
    },
    logging: options.logging,
  });
}
