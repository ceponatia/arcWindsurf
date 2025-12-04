import {
  createGovernor,
  type Governor,
  type GovernorConfig,
  LlmIntentDetector,
  createRuleBasedIntentDetector,
  type IntentDetector,
  type LlmIntentMessage,
} from '@minimal-rpg/governor';
import { StateManager, DEFAULT_STATE_MANAGER_CONFIG } from '@minimal-rpg/state-manager';
import { createDefaultRegistry } from '@minimal-rpg/agents';
import { InMemoryRetrievalService } from '@minimal-rpg/retrieval';
import { generateWithOpenRouter } from '../llm/openrouter.js';
import { getConfig } from '../util/config.js';

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

  return createGovernor({
    stateManager,
    agentRegistry,
    retrievalService,
    intentDetector,
    options: {
      maxAgentsPerTurn: 3,
      continueOnAgentError: true,
      applyPatchesOnPartialFailure: false,
      intentConfidenceThreshold: 0.6,
      devMode: cfg.governorDevMode,
    },
    logging: options.logging,
  });
}
