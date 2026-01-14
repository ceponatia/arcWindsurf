import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TraitInferenceEngine } from '../../src/studio-npc/inference.js';
import type { LLMProvider, LLMResponse } from '@minimal-rpg/llm';
import { Effect } from 'effect';
import type { InferredTrait } from '../../src/studio-npc/types.js';

describe('TraitInferenceEngine', () => {
  let mockLLM: LLMProvider;

  beforeEach(() => {
    mockLLM = {
      chat: vi.fn(),
      stream: vi.fn(),
      id: 'test-llm',
      supportsTools: false,
      supportsFunctions: false,
    } as unknown as LLMProvider;
  });

  const mockResult = (content: string): LLMResponse => ({
    id: 'test-resp',
    content,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });

  it('infers traits from an exchange', async () => {
    const engine = new TraitInferenceEngine({ llmProvider: mockLLM });
    const traits: InferredTrait[] = [
      {
        path: 'personalityMap.dimensions.extraversion',
        value: 0.8,
        confidence: 0.7,
        evidence: 'Loud and boisterous greeting',
        reasoning: 'The character is very outgoing',
      },
    ];

    vi.mocked(mockLLM.chat).mockReturnValue(
      Effect.succeed(mockResult(JSON.stringify(traits)))
    );

    const result = await engine.inferFromExchange(
      'Hello!',
      'HEY THERE! WOW! GREAT TO SEE YOU!',
      {}
    );

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('personalityMap.dimensions.extraversion');
    expect(result[0].value).toBe(0.8);
  });

  it('accumulates evidence across multiple exchanges', async () => {
    const engine = new TraitInferenceEngine({ llmProvider: mockLLM });

    const trait1: InferredTrait = {
      path: 'personalityMap.dimensions.agreeableness',
      value: 0.7,
      confidence: 0.5,
      evidence: 'Helpful tone',
      reasoning: 'Seems nice',
    };

    const trait2: InferredTrait = {
      path: 'personalityMap.dimensions.agreeableness',
      value: 0.8,
      confidence: 0.6,
      evidence: 'Offers a gift',
      reasoning: 'Very generous',
    };

    // First exchange
    vi.mocked(mockLLM.chat).mockReturnValueOnce(
      Effect.succeed(mockResult(JSON.stringify([trait1])))
    );
    await engine.inferFromExchange('Hi', 'How can I help you?', {});

    // Second exchange
    vi.mocked(mockLLM.chat).mockReturnValueOnce(
      Effect.succeed(mockResult(JSON.stringify([trait2])))
    );
    await engine.inferFromExchange('Help me', 'Here is a gift!', {});

    const highConfidence = engine.getHighConfidenceTraits();
    expect(highConfidence).toHaveLength(1);
    expect(highConfidence[0].path).toBe('personalityMap.dimensions.agreeableness');
    // base (0.6) + bonus (0.1 for 2nd observation) = 0.7
    expect(highConfidence[0].confidence).toBeCloseTo(0.7);
  });

  it('detects contradictions with existing profile', async () => {
    const engine = new TraitInferenceEngine({ llmProvider: mockLLM });
    const profile = {
      personalityMap: {
        dimensions: {
          extraversion: 0.2, // Very introverted
        },
      },
    };

    const inferredTrait: InferredTrait = {
      path: 'personalityMap.dimensions.extraversion',
      value: 0.9, // Very extraverted
      confidence: 0.8,
      evidence: 'Partying with everyone',
      reasoning: 'Total extrovert',
    };

    vi.mocked(mockLLM.chat).mockReturnValue(
      Effect.succeed(mockResult(JSON.stringify([inferredTrait])))
    );

    const result = await engine.inferFromExchange(
      'Wanna party?',
      'HELL YEAH! LETS GO!',
      profile
    );

    expect(result[0].contradicts).toBe('personalityMap.dimensions.extraversion');
    expect(result[0].resolution).toBe('flag-for-review');
  });

  it('supports initial evidence in constructor', async () => {
    const initialTraits: InferredTrait[] = [
      {
        path: 'personalityMap.dimensions.neuroticism',
        value: 0.9,
        confidence: 0.5,
        evidence: 'Anxious breathing',
        reasoning: 'Seems nervous',
      },
    ];

    const engine = new TraitInferenceEngine({
      llmProvider: mockLLM,
      initialEvidence: initialTraits
    });

    const secondTrait: InferredTrait = {
      path: 'personalityMap.dimensions.neuroticism',
      value: 0.8,
      confidence: 0.5,
      evidence: 'Flinching at noise',
      reasoning: 'Jumpsticks',
    };

    vi.mocked(mockLLM.chat).mockReturnValue(
      Effect.succeed(mockResult(JSON.stringify([secondTrait])))
    );

    await engine.inferFromExchange('BANG', 'EEK!', {});

    const highConfidence = engine.getHighConfidenceTraits();
    expect(highConfidence).toHaveLength(1);
    expect(highConfidence[0].path).toBe('personalityMap.dimensions.neuroticism');
    // 0.5 base + 0.1 bonus = 0.6
    expect(highConfidence[0].confidence).toBeGreaterThanOrEqual(0.6);
  });
});
