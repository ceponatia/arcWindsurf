import { StateManager } from '@minimal-rpg/state-manager';

export interface GovernorConfig {
  stateManager: StateManager;
  // In the future: llmProvider, etc.
}

export interface TurnResult {
  message: string;
  // events, etc.
}

export class Governor {
  private stateManager: StateManager;

  constructor(config: GovernorConfig) {
    this.stateManager = config.stateManager;
  }

  async handleTurn(sessionId: string, input: string): Promise<TurnResult> {
    // Scaffold implementation
    console.log(`[Governor] Handling turn for session ${sessionId}: "${input}"`);

    // 1. Intent Detection (TODO)

    // 2. State Recall (Example)
    // const { effective } = this.stateManager.getEffectiveState(baseline, overrides);

    // 3. Agent Execution (TODO)

    // 4. State Update (TODO)
    // this.stateManager.applyPatches(baseline, overrides, patches);

    return {
      message: `You said: "${input}". (Governor is not yet fully implemented)`,
    };
  }
}
