import { createGovernor, type Governor, type GovernorConfig } from '@minimal-rpg/governor';
import { StateManager, DEFAULT_STATE_MANAGER_CONFIG } from '@minimal-rpg/state-manager';
import { createDefaultRegistry } from '@minimal-rpg/agents';
import { InMemoryRetrievalService } from '@minimal-rpg/retrieval';

// Simple process-local singletons for now; can be replaced with
// request-scoped or DI-driven instances later if needed.

const stateManager = new StateManager({
  ...DEFAULT_STATE_MANAGER_CONFIG,
  validateOnMerge: true,
  computeMinimalDiff: true,
});

const agentRegistry = createDefaultRegistry();

const retrievalService = new InMemoryRetrievalService();

export interface GovernorFactoryOptions {
  logging?: GovernorConfig['logging'];
}

export function createGovernorForRequest(options: GovernorFactoryOptions = {}): Governor {
  return createGovernor({
    stateManager,
    agentRegistry,
    retrievalService,
    options: {
      maxAgentsPerTurn: 3,
      continueOnAgentError: true,
      applyPatchesOnPartialFailure: false,
      intentConfidenceThreshold: 0.6,
    },
    logging: options.logging,
  });
}
