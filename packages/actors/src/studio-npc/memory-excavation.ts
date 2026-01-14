import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { MemoryTopic, BackstoryElement } from './types.js';
import { buildStudioSystemPrompt, buildMemoryPrompt } from './prompts.js';

/**
 * Handles the excavation of character memories to build backstory.
 */
export class MemoryExcavator {
  constructor(private readonly llmProvider: LLMProvider) { }

  /**
   * Excavate a specific memory topic and return the dialogue plus extracted backstory elements.
   */
  async excavate(
    profile: Partial<CharacterProfile>,
    topic: MemoryTopic
  ): Promise<{ memory: string; elements: BackstoryElement[] }> {
    const systemPrompt = buildStudioSystemPrompt(profile, null);
    const userPrompt = buildMemoryPrompt(topic);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let memory = '';
    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      memory = result.content ?? '';
    } catch {
      return { memory: '[Unable to excavate memory]', elements: [] };
    }

    const elements = this.extractBackstoryElements(memory, topic);
    return { memory, elements };
  }

  private extractBackstoryElements(memory: string, topic: MemoryTopic): BackstoryElement[] {
    const elements: BackstoryElement[] = [];

    // Simple extraction - find key phrases
    const sentences = memory.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences.slice(0, 3)) {
      elements.push({
        content: sentence.trim(),
        confidence: 0.7,
        suggestedIntegration: this.getSuggestedIntegration(topic),
      });
    }

    return elements;
  }

  private getSuggestedIntegration(topic: MemoryTopic): string {
    const map = new Map<MemoryTopic, string>([
      ['earliest-memory', 'childhood section of backstory'],
      ['proudest-moment', 'achievements or defining moments'],
      ['deepest-regret', 'internal conflicts or character flaws'],
      ['first-loss', 'formative experiences'],
      ['defining-choice', 'turning points in life story'],
    ]);
    return map.get(topic) ?? 'general backstory';
  }
}
