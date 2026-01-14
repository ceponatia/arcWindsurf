import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { FirstImpressionContext, FirstImpressionResponse } from './types.js';
import { buildStudioSystemPrompt, buildFirstImpressionPrompt } from './prompts.js';

/**
 * Generates an analysis of a character's first impression vs their internal reality.
 */
export class FirstImpressionGenerator {
  constructor(private readonly llmProvider: LLMProvider) { }

  /**
   * Generate a first impression scenario and reaction.
   */
  async generate(
    profile: Partial<CharacterProfile>,
    context?: FirstImpressionContext
  ): Promise<FirstImpressionResponse> {
    const systemPrompt = buildStudioSystemPrompt(profile, null);
    const userPrompt = buildFirstImpressionPrompt(context?.context);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      return this.parseResponse(result.content ?? '');
    } catch {
      return {
        externalPerception: '[Unable to generate first impression]',
        internalReaction: '',
        inferredGap: null,
      };
    }
  }

  private parseResponse(content: string): FirstImpressionResponse {
    // Split response into external and internal parts
    const parts = content.split(/but|however|though|although/i);

    return {
      externalPerception: parts[0]?.trim() ?? content,
      internalReaction: parts[1]?.trim() ?? '',
      inferredGap: null, // Could be enhanced with LLM analysis
    };
  }
}
