import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { InternalMonologueResponse } from './types.js';
import { buildStudioSystemPrompt, buildInternalMonologuePrompt } from './prompts.js';

/**
 * Generates responses that include both spoken words and internal thoughts.
 */
export class InternalMonologueGenerator {
  constructor(private readonly llmProvider: LLMProvider) { }

  /**
   * Generate a dual spoken/thought response to a user message.
   */
  async generate(
    profile: Partial<CharacterProfile>,
    userMessage: string
  ): Promise<InternalMonologueResponse> {
    const systemPrompt = buildStudioSystemPrompt(profile, null) + '\n\n' + buildInternalMonologuePrompt();

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      return this.parseResponse(result.content ?? '');
    } catch {
      return { spoken: '[Unable to generate internal monologue]', thought: '', inferredTraits: [] };
    }
  }

  private parseResponse(content: string): InternalMonologueResponse {
    try {
      const parsed = JSON.parse(content) as { spoken?: string; thought?: string };
      return {
        spoken: parsed.spoken ?? content,
        thought: parsed.thought ?? '',
        inferredTraits: [],
      };
    } catch {
      // Fallback: treat as spoken only
      return { spoken: content, thought: '', inferredTraits: [] };
    }
  }
}
