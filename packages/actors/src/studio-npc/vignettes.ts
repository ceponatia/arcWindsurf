import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { VignetteRequest, VignetteResponse } from './types.js';
import { buildStudioSystemPrompt, buildVignettePrompt } from './prompts.js';

/**
 * Generates social vignettes to test character interactions with different archetypes.
 */
export class VignetteGenerator {
  constructor(private readonly llmProvider: LLMProvider) { }

  /**
   * Play out a short social vignette.
   */
  async generate(
    profile: Partial<CharacterProfile>,
    request: VignetteRequest
  ): Promise<VignetteResponse> {
    const systemPrompt = buildStudioSystemPrompt(profile, null);
    const userPrompt = buildVignettePrompt(request.archetype, request.scenario);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let dialogue = '';
    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      dialogue = result.content ?? '';
    } catch {
      return { dialogue: '[Unable to generate vignette]', inferredPatterns: {} };
    }

    // Infer social patterns from the response
    const inferredPatterns = this.inferPatterns(dialogue, request);

    return { dialogue, inferredPatterns };
  }

  private inferPatterns(dialogue: string, request: VignetteRequest): VignetteResponse['inferredPatterns'] {
    const patterns: VignetteResponse['inferredPatterns'] = {};
    const lower = dialogue.toLowerCase();

    if (request.archetype === 'stranger') {
      if (lower.includes('welcome') || lower.includes('pleased')) {
        patterns.strangerDefault = 'welcoming';
      } else if (lower.includes('careful') || lower.includes('wary')) {
        patterns.strangerDefault = 'guarded';
      }
    }

    if (request.scenario === 'conflict') {
      if (lower.includes('sorry') || lower.includes('understand')) {
        patterns.conflictStyle = 'diplomatic';
      } else if (lower.includes('wrong') || lower.includes('fault')) {
        patterns.conflictStyle = 'confrontational';
      }
    }

    return patterns;
  }
}
