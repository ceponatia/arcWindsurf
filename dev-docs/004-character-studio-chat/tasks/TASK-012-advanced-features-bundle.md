# TASK-012: Advanced Features Bundle

**Priority**: P2
**Phase**: 5 - Advanced Features
**Estimate**: 90 minutes
**Depends On**: TASK-003, TASK-005

---

## Objective

Implement the remaining advanced conversation features: Emotional Range, Contradiction Mirror, Relationship Vignettes, Memory Excavation, First Impression, Internal Monologue, and Voice Fingerprint.

## Files to Create

1. `packages/actors/src/studio-npc/emotional-range.ts`
2. `packages/actors/src/studio-npc/contradiction.ts`
3. `packages/actors/src/studio-npc/vignettes.ts`
4. `packages/actors/src/studio-npc/memory-excavation.ts`
5. `packages/actors/src/studio-npc/first-impression.ts`
6. `packages/actors/src/studio-npc/internal-monologue.ts`
7. `packages/actors/src/studio-npc/voice-fingerprint.ts`

## Implementation 1: emotional-range.ts

```typescript
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { EmotionalRangeRequest, EmotionalRangeResponse, EmotionState } from './types.js';
import { buildStudioSystemPrompt, buildEmotionalRangePrompt } from './prompts.js';

export class EmotionalRangeGenerator {
  constructor(private readonly llmProvider: LLMProvider) {}

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
    const lengths = variations.map(v => v.response.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) / lengths.length;
    const expressiveness = Math.min(1, variance / 100);

    return {
      variations,
      inferredRange: { dimension: 'expressiveness', value: expressiveness },
    };
  }
}
```

## Implementation 2: contradiction.ts

```typescript
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { InferredTrait, Contradiction } from './types.js';

export class ContradictionMirror {
  detectContradiction(
    newTrait: InferredTrait,
    profile: Partial<CharacterProfile>
  ): Contradiction | null {
    const existingValue = this.getValueAtPath(profile, newTrait.path);
    if (existingValue === undefined) return null;

    const isContradiction = this.valuesConflict(existingValue, newTrait.value);
    if (!isContradiction) return null;

    return {
      existingTrait: { path: newTrait.path, value: existingValue },
      newEvidence: { path: newTrait.path, value: newTrait.value },
      reflectionPrompt: this.buildReflectionPrompt(newTrait.path, existingValue, newTrait.value),
    };
  }

  buildReflectionPrompt(path: string, oldValue: unknown, newValue: unknown): string {
    const fieldName = path.split('.').pop() ?? 'this aspect';
    return `Earlier, you seemed ${this.describeValue(oldValue)}, but just now you showed something different - ${this.describeValue(newValue)}. How do you make sense of that contradiction in yourself?`;
  }

  private valuesConflict(existing: unknown, newVal: unknown): boolean {
    if (typeof existing === 'number' && typeof newVal === 'number') {
      return Math.abs(existing - newVal) > 0.3;
    }
    if (typeof existing === 'string' && typeof newVal === 'string') {
      return existing !== newVal;
    }
    return false;
  }

  private describeValue(value: unknown): string {
    if (typeof value === 'number') {
      return value > 0.6 ? 'strongly inclined' : value < 0.4 ? 'resistant' : 'moderate';
    }
    return String(value);
  }

  private getValueAtPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce((curr: unknown, key) => {
      if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)[key];
      return undefined;
    }, obj);
  }
}
```

## Implementation 3: vignettes.ts

```typescript
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { VignetteRequest, VignetteResponse } from './types.js';
import { buildStudioSystemPrompt, buildVignettePrompt } from './prompts.js';

export class VignetteGenerator {
  constructor(private readonly llmProvider: LLMProvider) {}

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

    const result = await Effect.runPromise(this.llmProvider.chat(messages));
    const dialogue = result.content ?? '';

    // Infer social patterns from the response
    const inferredPatterns = this.inferPatterns(dialogue, request);

    return { dialogue, inferredPatterns };
  }

  private inferPatterns(dialogue: string, request: VignetteRequest): VignetteResponse['inferredPatterns'] {
    const patterns: VignetteResponse['inferredPatterns'] = {};
    const lower = dialogue.toLowerCase();

    if (request.archetype === 'stranger') {
      if (lower.includes('welcome') || lower.includes('pleased')) patterns.strangerDefault = 'welcoming';
      else if (lower.includes('careful') || lower.includes('wary')) patterns.strangerDefault = 'guarded';
    }

    if (request.scenario === 'conflict') {
      if (lower.includes('sorry') || lower.includes('understand')) patterns.conflictStyle = 'diplomatic';
      else if (lower.includes('wrong') || lower.includes('fault')) patterns.conflictStyle = 'confrontational';
    }

    return patterns;
  }
}
```

## Implementation 4: memory-excavation.ts

```typescript
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { MemoryTopic, BackstoryElement } from './types.js';
import { buildStudioSystemPrompt, buildMemoryPrompt } from './prompts.js';

export class MemoryExcavator {
  constructor(private readonly llmProvider: LLMProvider) {}

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

    const result = await Effect.runPromise(this.llmProvider.chat(messages));
    const memory = result.content ?? '';

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
    const map: Record<MemoryTopic, string> = {
      'earliest-memory': 'childhood section of backstory',
      'proudest-moment': 'achievements or defining moments',
      'deepest-regret': 'internal conflicts or character flaws',
      'first-loss': 'formative experiences',
      'defining-choice': 'turning points in life story',
    };
    return map[topic] ?? 'general backstory';
  }
}
```

## Implementation 5: first-impression.ts

```typescript
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { FirstImpressionContext, FirstImpressionResponse } from './types.js';
import { buildStudioSystemPrompt, buildFirstImpressionPrompt } from './prompts.js';

export class FirstImpressionGenerator {
  constructor(private readonly llmProvider: LLMProvider) {}

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

    const result = await Effect.runPromise(this.llmProvider.chat(messages));
    return this.parseResponse(result.content ?? '');
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
```

## Implementation 6: internal-monologue.ts

```typescript
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { InternalMonologueResponse } from './types.js';
import { buildStudioSystemPrompt, buildInternalMonologuePrompt } from './prompts.js';

export class InternalMonologueGenerator {
  constructor(private readonly llmProvider: LLMProvider) {}

  async generate(
    profile: Partial<CharacterProfile>,
    userMessage: string
  ): Promise<InternalMonologueResponse> {
    const systemPrompt = buildStudioSystemPrompt(profile, null) + '\n\n' + buildInternalMonologuePrompt();

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const result = await Effect.runPromise(this.llmProvider.chat(messages));
    return this.parseResponse(result.content ?? '');
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
```

## Implementation 7: voice-fingerprint.ts

```typescript
import type { ConversationMessage, VoiceFingerprint } from './types.js';

export class VoiceFingerprintAnalyzer {
  analyze(messages: ConversationMessage[]): VoiceFingerprint {
    const characterMessages = messages
      .filter(m => m.role === 'character')
      .map(m => m.content);

    if (characterMessages.length < 5) {
      return this.getDefaultFingerprint();
    }

    return {
      vocabulary: this.analyzeVocabulary(characterMessages),
      rhythm: this.analyzeRhythm(characterMessages),
      patterns: this.analyzePatterns(characterMessages),
      humor: this.analyzeHumor(characterMessages),
    };
  }

  private analyzeVocabulary(messages: string[]): VoiceFingerprint['vocabulary'] {
    const allWords = messages.join(' ').toLowerCase().split(/\s+/);
    const uniqueWords = new Set(allWords);
    const avgWordLength = allWords.reduce((sum, w) => sum + w.length, 0) / allWords.length;

    let level: VoiceFingerprint['vocabulary']['level'] = 'average';
    if (avgWordLength > 6) level = 'educated';
    if (avgWordLength > 7) level = 'erudite';
    if (avgWordLength < 4.5) level = 'simple';

    // Find distinctive words (appear in >30% of messages)
    const wordCounts = new Map<string, number>();
    for (const msg of messages) {
      const words = new Set(msg.toLowerCase().split(/\s+/));
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    const threshold = messages.length * 0.3;
    const distinctiveWords = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= threshold && word.length > 4)
      .map(([word]) => word)
      .slice(0, 5);

    return { level, distinctiveWords };
  }

  private analyzeRhythm(messages: string[]): VoiceFingerprint['rhythm'] {
    const sentenceLengths = messages.flatMap(m =>
      m.split(/[.!?]+/).filter(s => s.trim()).map(s => s.split(/\s+/).length)
    );

    const avg = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.abs(len - avg), 0) / sentenceLengths.length;

    let variability: VoiceFingerprint['rhythm']['variability'] = 'varied';
    if (variance < 3) variability = 'consistent';
    if (variance > 8) variability = 'erratic';

    return { averageSentenceLength: Math.round(avg), variability };
  }

  private analyzePatterns(messages: string[]): VoiceFingerprint['patterns'] {
    const text = messages.join(' ').toLowerCase();

    // Find repeated phrases (2-4 words)
    const phrases = new Map<string, number>();
    for (const msg of messages) {
      const words = msg.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
      }
    }

    const signaturePhrases = Array.from(phrases.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase]) => phrase);

    return { signaturePhrases, avoidedTopics: [], emotionalTriggers: [] };
  }

  private analyzeHumor(messages: string[]): VoiceFingerprint['humor'] {
    const humorIndicators = ['haha', 'heh', 'joke', 'kidding', 'funny', 'laugh', ':)', ';)'];
    const text = messages.join(' ').toLowerCase();

    const humorCount = humorIndicators.reduce((count, indicator) =>
      count + (text.split(indicator).length - 1), 0
    );

    const frequency = humorCount === 0 ? 'none' :
      humorCount < 2 ? 'rare' :
      humorCount < 5 ? 'occasional' : 'frequent';

    return { frequency, type: null };
  }

  private getDefaultFingerprint(): VoiceFingerprint {
    return {
      vocabulary: { level: 'average', distinctiveWords: [] },
      rhythm: { averageSentenceLength: 10, variability: 'varied' },
      patterns: { signaturePhrases: [], avoidedTopics: [], emotionalTriggers: [] },
      humor: { frequency: 'none', type: null },
    };
  }
}
```

## Export from index.ts

Add all exports:

```typescript
export { EmotionalRangeGenerator } from './emotional-range.js';
export { ContradictionMirror } from './contradiction.js';
export { VignetteGenerator } from './vignettes.js';
export { MemoryExcavator } from './memory-excavation.js';
export { FirstImpressionGenerator } from './first-impression.js';
export { InternalMonologueGenerator } from './internal-monologue.js';
export { VoiceFingerprintAnalyzer } from './voice-fingerprint.js';
```

## Acceptance Criteria

- [ ] All 7 feature classes created
- [ ] Each class has clear single responsibility
- [ ] LLM-based features use proper prompts
- [ ] Voice fingerprint works without LLM (client-side analysis)
- [ ] All classes exported from index.ts
- [ ] Graceful error handling in all LLM calls
- [ ] Type-safe responses matching defined interfaces
