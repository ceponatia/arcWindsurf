import { Effect } from 'effect';
import type { LLMProvider, CognitionTask, LLMResponse } from '../types.js';

export interface TieredCognitionConfig {
  fast: LLMProvider;
  deep: LLMProvider;
  reasoning: LLMProvider;
}

export class TieredCognitionRouter {
  constructor(private config: TieredCognitionConfig) {}

  route(task: CognitionTask): LLMProvider {
    switch (task.type) {
      case 'fast':
        return this.config.fast;
      case 'deep':
        return this.config.deep;
      case 'reasoning':
        return this.config.reasoning;
      case 'vision':
        // For now, use deep for vision tasks if not specified
        return this.config.deep;
      default:
        return this.config.fast;
    }
  }

  execute(task: CognitionTask): Effect.Effect<LLMResponse, Error> {
    const provider = this.route(task);
    return provider.chat(task.messages, task.options);
  }
}
