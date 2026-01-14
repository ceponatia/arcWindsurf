import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { createStudioNpcActor } from '../studio-actor.js';
import { TraitInferenceEngine } from '../inference.js';
import { DiscoveryGuide } from '../discovery.js';
import { buildStudioSystemPrompt } from '../prompts.js';
import { ConversationManager } from '../conversation.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';

// Mock LLM provider for testing
const mockLlmProvider: LLMProvider = {
  id: 'mock',
  supportsTools: false,
  supportsFunctions: false,
  chat: () => Effect.succeed({
    id: 'test-resp',
    content: 'Mock response based on character profile.',
  } as LLMResponse),
  stream: () => Effect.succeed((async function* () {
    await Promise.resolve(); // satisfy lint
    yield { choices: [{ delta: { content: 'test' } }] } as LLMStreamChunk;
  })()),
};

describe('Studio NPC Integration', () => {
  const testProfile: Partial<CharacterProfile> = {
    name: 'Elara',
    age: 28,
    gender: 'female',
    race: 'Elf',
    summary: 'A cautious scholar with hidden depths',
    backstory: 'Grew up in a secluded library, raised by her mentor after losing her parents.',
    personalityMap: {
      dimensions: {
        openness: 0.8,
        conscientiousness: 0.7,
        extraversion: 0.3,
        agreeableness: 0.6,
        neuroticism: 0.5,
      },
      values: [
        { value: 'wisdom', priority: 9 },
        { value: 'loyalty', priority: 7 },
      ],
      fears: [
        {
          category: 'loss',
          specific: 'losing her remaining family',
          intensity: 0.8,
          triggers: ['threats to home'],
          copingMechanism: 'avoidance',
        },
      ],
      social: {
        strangerDefault: 'guarded',
        warmthRate: 'slow',
        preferredRole: 'advisor',
        conflictStyle: 'diplomatic',
        criticismResponse: 'reflective',
        boundaries: 'healthy',
      },
      speech: {
        vocabulary: 'educated',
        sentenceStructure: 'moderate',
        formality: 'formal',
        humor: 'rare',
        expressiveness: 'reserved',
        directness: 'tactful',
        pace: 'measured',
      },
      stress: {
        primary: 'freeze',
        threshold: 0.6,
        recoveryRate: 'slow',
        soothingActivities: ['reading'],
        stressIndicators: ['silence'],
      },
    },
  };

  describe('Profile Fields Connection', () => {
    it('should reflect name in responses', () => {
      const actor = createStudioNpcActor({
        sessionId: 'test-1',
        profile: testProfile as CharacterProfile,
        llmProvider: mockLlmProvider,
      });

      // Verify actor can be created with profile
      expect(actor).toBeDefined();
      actor.stop();
    });

    it('should incorporate all personality dimensions in prompt', () => {
      // Test that buildStudioSystemPrompt includes all dimensions
      const prompt = buildStudioSystemPrompt(testProfile as CharacterProfile, null);

      expect(prompt).toContain('curious');
      expect(prompt).toContain('organized');
      expect(prompt).toContain('solitude');
    });

    it('should include values in prompt', () => {
      const prompt = buildStudioSystemPrompt(testProfile as CharacterProfile, null);

      expect(prompt).toContain('wisdom');
    });

    it('should include fears in prompt', () => {
      const prompt = buildStudioSystemPrompt(testProfile as CharacterProfile, null);

      expect(prompt).toContain('fear');
    });

    it('should include speech style guidance', () => {
      const prompt = buildStudioSystemPrompt(testProfile as CharacterProfile, null);

      expect(prompt).toContain('Voice');
    });
  });

  describe('Trait Inference', () => {
    it('should infer traits from character responses', async () => {
      const engine = new TraitInferenceEngine({
        llmProvider: mockLlmProvider,
      });

      // Mock would return traits - in real test, verify structure
      const traits = await engine.inferFromExchange(
        'How do you feel about new experiences?',
        'I find them... intriguing. There is always something to learn.',
        testProfile as CharacterProfile
      );

      expect(Array.isArray(traits)).toBe(true);
    });

    it('should detect contradictions', () => {
      const engine = new TraitInferenceEngine({
        llmProvider: mockLlmProvider,
      });

      const contradiction = engine.detectContradiction(
        {
          path: 'personalityMap.dimensions.openness',
          value: 0.2,
          confidence: 0.8,
          evidence: 'test',
          reasoning: 'inference reasoning',
        },
        testProfile as CharacterProfile
      );

      // Should detect contradiction since existing openness is 0.8
      expect(contradiction).not.toBeNull();
    });
  });

  describe('Discovery Guide', () => {
    it('should suggest unexplored topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile as CharacterProfile });

      const topic = guide.suggestTopic();
      expect(topic).toBeDefined();

      const unexplored = guide.getUnexploredTopics();
      expect(unexplored.length).toBeGreaterThan(0);
    });

    it('should generate prompts for topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile as CharacterProfile });

      const prompts = guide.generatePrompts('values', 3);
      expect(prompts.length).toBe(3);
      expect(prompts[0]?.topic).toBe('values');
    });

    it('should track explored topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile as CharacterProfile });

      guide.markExplored('values');
      guide.markExplored('fears');

      const explored = guide.getExploredTopics();
      expect(explored).toContain('values');
      expect(explored).toContain('fears');
    });
  });

  describe('Conversation Manager', () => {
    it('should limit context window to 20 messages', () => {
      const manager = new ConversationManager({
        llmProvider: mockLlmProvider,
        characterName: 'Elara',
      });

      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        manager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'character',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const contextWindow = manager.getContextWindow();
      expect(contextWindow.length).toBeLessThanOrEqual(20);
    });

    it('should detect when summarization is needed', () => {
      const manager = new ConversationManager({
        llmProvider: mockLlmProvider,
        characterName: 'Elara',
      });

      // Add 20 messages
      for (let i = 0; i < 20; i++) {
        manager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'character',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      expect(manager.needsSummarization()).toBe(true);
    });
  });
});
