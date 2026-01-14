import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { EmotionalRangeRequest, EmotionalRangeResponse, EmotionState } from './types.js';
import { buildStudioSystemPrompt, buildEmotionalRangePrompt } from './prompts.js';

/**
 * Generates emotional variations of a response to test a character's emotional range.
 */
export class EmotionalRangeGenerator {
  constructor(private readonly llmProvider: LLMProvider) { }

  /**
   * Generate emotional variations for a given base prompt and set of emotions.
   */
  async generate(
    profile: Partial<CharacterProfile>,
    request: EmotionalRangeRequest
  ): Promise<EmotionalRangeResponse> {
    const variations: Array<{ emotion: EmotionState; response: string }> = [];
    const systemPrompt = buildStudioSystemPrompt(profile, null);

    for (const emotion of request.emotions) {
      const userPrompt = buildEmotionalRangePrompt(request.basePrompt, emotion);
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      try {
        const result = await Effect.runPromise(this.llmProvider.chat(messages));
        variations.push({ emotion, response: result.content ?? '' });
      } catch {
        variations.push({ emotion, response: '[Unable to generate response]' });
      }
    }

    // Calculate expressiveness based on variation in response lengths and styles
    const lengths = variations
      .filter(v => v.response !== '[Unable to generate response]')
      .map(v => v.response.length);

    let expressiveness = 0;
    if (lengths.length > 1) {
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) / lengths.length;
      expressiveness = Math.min(1, variance / 100);
    }

    return {
      variations,
      inferredRange: { dimension: 'expressiveness', value: expressiveness },
    };
  }
}
