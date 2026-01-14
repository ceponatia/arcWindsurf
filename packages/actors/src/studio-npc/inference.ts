// packages/actors/src/studio-npc/inference.ts
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { InferredTrait } from './types.js';

const TRAIT_INFERENCE_SYSTEM_PROMPT = `You analyze RPG character conversations to infer personality traits.
Respond with JSON ONLY. No prose, notes, or markdown.

Output format:
[
  {
    "path": "<trait path>",
    "value": <string|number|object>,
    "confidence": <0.0-1.0>,
    "evidence": "<quote or paraphrase>",
    "reasoning": "<why this evidence supports this trait>"
  }
]

Valid trait paths:
- personalityMap.dimensions.openness (0-1)
- personalityMap.dimensions.conscientiousness (0-1)
- personalityMap.dimensions.extraversion (0-1)
- personalityMap.dimensions.agreeableness (0-1)
- personalityMap.dimensions.neuroticism (0-1)
- personalityMap.values (array item: { value: string, priority: 1-10 })
- personalityMap.fears (array item: { category: string, specific: string, intensity: 0-1 })
- personalityMap.social.strangerDefault (welcoming|neutral|guarded|hostile)
- personalityMap.social.warmthRate (fast|moderate|slow|very-slow)
- personalityMap.social.preferredRole (leader|supporter|advisor|loner|entertainer|caretaker)
- personalityMap.social.conflictStyle (confrontational|diplomatic|avoidant|passive-aggressive|collaborative)
- personalityMap.social.criticismResponse (defensive|reflective|dismissive|hurt|grateful)
- personalityMap.social.boundaries (rigid|healthy|porous|nonexistent)
- personalityMap.speech.vocabulary (simple|average|educated|erudite|archaic)
- personalityMap.speech.sentenceStructure (terse|simple|moderate|complex|elaborate)
- personalityMap.speech.formality (casual|neutral|formal|ritualistic)
- personalityMap.speech.humor (none|rare|occasional|frequent|constant)
- personalityMap.speech.humorType (dry|sarcastic|witty|slapstick|dark|self-deprecating)
- personalityMap.speech.expressiveness (stoic|reserved|moderate|expressive|dramatic)
- personalityMap.speech.directness (blunt|direct|tactful|indirect|evasive)
- personalityMap.speech.pace (slow|measured|moderate|quick|rapid)
- personalityMap.stress.primary (fight|flight|freeze|fawn)
- personalityMap.stress.secondary (fight|flight|freeze|fawn)
- personalityMap.stress.threshold (0-1)
- personalityMap.stress.recoveryRate (slow|moderate|fast)

Confidence calibration:
- 0.3-0.5: Weak hint, could be situational
- 0.5-0.7: Clear pattern in word choice or behavior
- 0.7-0.85: Explicit self-description or repeated strong signal
- 0.85-1.0: Defining statement about core identity

Only return traits with confidence >= 0.4.
If nothing is clearly evidenced, return [].`;

export interface TraitInferenceEngineConfig {
  llmProvider: LLMProvider;
  initialEvidence?: InferredTrait[];
}

export class TraitInferenceEngine {
  private readonly llmProvider: LLMProvider;
  private accumulatedEvidence = new Map<string, InferredTrait[]>();

  constructor(config: TraitInferenceEngineConfig) {
    this.llmProvider = config.llmProvider;
    if (config.initialEvidence) {
      for (const trait of config.initialEvidence) {
        this.accumulateEvidence(trait);
      }
    }
  }

  /**
   * Infer traits from a single exchange.
   */
  async inferFromExchange(
    userMessage: string,
    characterResponse: string,
    profile: Partial<CharacterProfile>
  ): Promise<InferredTrait[]> {
    const prompt = this.buildInferencePrompt(userMessage, characterResponse, profile);

    const messages: LLMMessage[] = [
      { role: 'system', content: TRAIT_INFERENCE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      const traits = this.parseInferenceResponse(result.content);

      // Check for contradictions
      for (const trait of traits) {
        const contradiction = this.detectContradiction(trait, profile);
        if (contradiction) {
          trait.contradicts = contradiction.path;
          trait.resolution = 'flag-for-review';
        }
      }

      // Accumulate evidence
      for (const trait of traits) {
        this.accumulateEvidence(trait);
      }

      return traits;
    } catch (error) {
      console.error('[TraitInferenceEngine] Inference failed:', error);
      return [];
    }
  }

  /**
   * Accumulate evidence for a trait across multiple exchanges.
   */
  accumulateEvidence(trait: InferredTrait): void {
    const existing = this.accumulatedEvidence.get(trait.path) ?? [];
    existing.push(trait);
    this.accumulatedEvidence.set(trait.path, existing);
  }

  /**
   * Get traits that have accumulated high confidence.
   */
  getHighConfidenceTraits(): InferredTrait[] {
    const result: InferredTrait[] = [];

    for (const [path, traits] of this.accumulatedEvidence) {
      if (traits.length === 0) continue;

      // Calculate accumulated confidence
      const baseConfidence = Math.max(...traits.map(t => t.confidence));
      const bonus = Math.min(0.3, (traits.length - 1) * 0.1);
      const finalConfidence = Math.min(1.0, baseConfidence + bonus);

      if (finalConfidence >= 0.6) {
        // Merge evidence
        const evidence = traits.map(t => t.evidence).join('; ');
        const latestTrait = traits[traits.length - 1];

        if (latestTrait) {
          result.push({
            path,
            value: latestTrait.value,
            confidence: finalConfidence,
            evidence,
            reasoning: `Accumulated from ${traits.length} observations`,
          });
        }
      }
    }

    return result;
  }

  /**
   * Detect if a trait contradicts the existing profile.
   */
  detectContradiction(
    trait: InferredTrait,
    profile: Partial<CharacterProfile>
  ): { path: string; existingValue: unknown } | null {
    const existingValue = this.getValueAtPath(profile, trait.path);

    if (existingValue === undefined || existingValue === null) {
      return null;
    }

    // For numeric values, check if difference is significant
    if (typeof trait.value === 'number' && typeof existingValue === 'number') {
      const diff = Math.abs(trait.value - existingValue);
      if (diff > 0.3) {
        return { path: trait.path, existingValue };
      }
    }

    // For string enums, check if different
    if (typeof trait.value === 'string' && typeof existingValue === 'string') {
      if (trait.value !== existingValue) {
        return { path: trait.path, existingValue };
      }
    }

    return null;
  }

  /**
   * Clear accumulated evidence.
   */
  clear(): void {
    this.accumulatedEvidence.clear();
  }

  /**
   * Get all accumulated evidence for debugging.
   */
  getAccumulatedEvidence(): Map<string, InferredTrait[]> {
    return new Map(this.accumulatedEvidence);
  }

  private buildInferencePrompt(
    userMessage: string,
    characterResponse: string,
    profile: Partial<CharacterProfile>
  ): string {
    const lines: string[] = [];

    lines.push('Analyze this conversation exchange for personality traits:');
    lines.push('');
    lines.push('User: ' + userMessage);
    lines.push('');
    lines.push('Character: ' + characterResponse);
    lines.push('');
    lines.push('Current profile context (avoid contradicting established traits):');
    lines.push(JSON.stringify(this.buildProfileSnapshot(profile), null, 2));
    lines.push('');
    lines.push('Identify traits evidenced by the character response.');
    lines.push('Focus on HOW they speak, WHAT they reveal, and emotional subtext.');

    return lines.join('\n');
  }

  private buildProfileSnapshot(profile: Partial<CharacterProfile>): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};

    if (profile.name) snapshot['name'] = profile.name;
    if (profile.summary) snapshot['summary'] = profile.summary;
    if (profile.personalityMap?.dimensions) {
      snapshot['dimensions'] = profile.personalityMap.dimensions;
    }
    if (profile.personalityMap?.values?.length) {
      snapshot['values'] = profile.personalityMap.values;
    }
    if (profile.personalityMap?.social) {
      snapshot['social'] = profile.personalityMap.social;
    }
    if (profile.personalityMap?.speech) {
      snapshot['speech'] = profile.personalityMap.speech;
    }

    return snapshot;
  }

  private parseInferenceResponse(content: string | null): InferredTrait[] {
    if (!content) return [];

    try {
      // Handle potential markdown formatting from LLM
      const jsonStr = content.includes('```json')
        ? content.split('```json')[1]?.split('```')[0]?.trim() ?? ''
        : content.trim();

      if (!jsonStr) return [];

      const parsed = JSON.parse(jsonStr) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((t: unknown): t is InferredTrait => this.isValidTrait(t))
        .filter(t => t.confidence >= 0.4);
    } catch {
      console.warn('[TraitInferenceEngine] Failed to parse response');
      return [];
    }
  }

  private isValidTrait(value: unknown): value is InferredTrait {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
      typeof record['path'] === 'string' &&
      'value' in record &&
      typeof record['confidence'] === 'number' &&
      typeof record['evidence'] === 'string'
    );
  }

  private getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }

      // Security check for prototype pollution
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        return undefined;
      }

      const record = current as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, part)) {
        // Use Type Assertion for property access to satisfy compiler
        current = (record as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
