# TASK-014: Validation and End-to-End Testing

**Priority**: P0 (Final)
**Phase**: 7 - Validation & Testing
**Estimate**: 120 minutes
**Depends On**: All previous tasks

---

## Objective

Validate that all character profile fields are properly connected to the chat inference system and can be tested through conversation. Create comprehensive tests for the complete character creation flow.

## Validation Checklist

### Core Identity Fields

| Field | How to Test | Expected Inference |
|-------|-------------|-------------------|
| `name` | "What is your name?" | Character uses their name naturally |
| `age` | "How old are you?" / "Tell me about your childhood" | Age-appropriate responses |
| `gender` | "How do you identify?" | Consistent gender expression |
| `race` | "Where do your people come from?" | Cultural/racial references |
| `summary` | "Describe yourself in a few words" | Matches summary field |
| `backstory` | "Tell me about your past" | Draws from backstory |

### Big Five Personality Dimensions

| Dimension | Test Prompts | High Score Indicators | Low Score Indicators |
|-----------|--------------|----------------------|---------------------|
| `openness` | "What do you think about trying new things?" | Curiosity, creativity | Practicality, tradition |
| `conscientiousness` | "How do you approach your responsibilities?" | Organization, discipline | Spontaneity, flexibility |
| `extraversion` | "How do you feel in large social gatherings?" | Energy, enthusiasm | Preference for solitude |
| `agreeableness` | "How do you handle disagreements?" | Cooperation, trust | Competition, skepticism |
| `neuroticism` | "What happens when you're under stress?" | Emotional sensitivity | Emotional stability |

### Values and Fears

| Field | Test Approach |
|-------|---------------|
| `values[]` | Present dilemmas that pit values against each other |
| `fears[]` | Ask about worries, nightmares, things they avoid |

### Social Patterns

| Field | Test Prompt | What to Look For |
|-------|-------------|------------------|
| `strangerDefault` | Simulate meeting a stranger | Warm vs guarded initial response |
| `warmthRate` | Extended conversation | How quickly they open up |
| `preferredRole` | "What role do you take in groups?" | Leader/supporter/loner tendencies |
| `conflictStyle` | Present a conflict scenario | Confrontational vs avoidant |
| `criticismResponse` | "What if I told you that was wrong?" | Defensive vs reflective |
| `boundaries` | Push for personal information | How they set limits |

### Speech Style

| Field | Observable In |
|-------|---------------|
| `vocabulary` | Word choice complexity |
| `sentenceStructure` | Sentence length and complexity |
| `formality` | Register (casual vs formal) |
| `humor` | Presence and type of humor |
| `expressiveness` | Emotional color in responses |
| `directness` | How directly they answer questions |
| `pace` | Rhythm of responses (terse vs elaborate) |

### Stress Response

| Field | Test Approach |
|-------|---------------|
| `primary` | Present a threatening scenario |
| `secondary` | Continued pressure after initial response |
| `threshold` | Escalating stress situations |
| `recoveryRate` | Follow stressful topic with neutral one |
| `soothingActivities` | "What helps you calm down?" |
| `stressIndicators` | Observable in stressed responses |

## Test Implementation

### Create Test File

`packages/actors/src/studio-npc/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createStudioNpcActor } from '../studio-actor.js';
import { TraitInferenceEngine } from '../inference.js';
import { DiscoveryGuide } from '../discovery.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

// Mock LLM provider for testing
const mockLlmProvider = {
  chat: async (messages) => ({
    content: 'Mock response based on character profile.',
  }),
  stream: async function* () { yield { choices: [{ delta: { content: 'test' } }] }; },
};

describe('Studio NPC Integration', () => {
  const testProfile: Partial<CharacterProfile> = {
    name: 'Elara',
    age: 28,
    gender: 'female',
    race: 'elf',
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
        { value: 'knowledge', priority: 9 },
        { value: 'loyalty', priority: 7 },
      ],
      fears: [
        { category: 'loss', specific: 'losing her remaining family', intensity: 0.8 },
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
      },
    },
  };

  describe('Profile Fields Connection', () => {
    it('should reflect name in responses', async () => {
      const actor = createStudioNpcActor({
        sessionId: 'test-1',
        profile: testProfile,
        llmProvider: mockLlmProvider as any,
      });

      // Verify actor can be created with profile
      expect(actor).toBeDefined();
      actor.stop();
    });

    it('should incorporate all personality dimensions in prompt', () => {
      // Test that buildStudioSystemPrompt includes all dimensions
      const { buildStudioSystemPrompt } = require('../prompts.js');
      const prompt = buildStudioSystemPrompt(testProfile, null);

      expect(prompt).toContain('curious');
      expect(prompt).toContain('organized');
      expect(prompt).toContain('solitude');
    });

    it('should include values in prompt', () => {
      const { buildStudioSystemPrompt } = require('../prompts.js');
      const prompt = buildStudioSystemPrompt(testProfile, null);

      expect(prompt).toContain('knowledge');
    });

    it('should include fears in prompt', () => {
      const { buildStudioSystemPrompt } = require('../prompts.js');
      const prompt = buildStudioSystemPrompt(testProfile, null);

      expect(prompt).toContain('fear');
    });

    it('should include speech style guidance', () => {
      const { buildStudioSystemPrompt } = require('../prompts.js');
      const prompt = buildStudioSystemPrompt(testProfile, null);

      expect(prompt).toContain('Voice');
    });
  });

  describe('Trait Inference', () => {
    it('should infer traits from character responses', async () => {
      const engine = new TraitInferenceEngine({
        llmProvider: mockLlmProvider as any,
      });

      // Mock would return traits - in real test, verify structure
      const traits = await engine.inferFromExchange(
        'How do you feel about new experiences?',
        'I find them... intriguing. There is always something to learn.',
        testProfile
      );

      expect(Array.isArray(traits)).toBe(true);
    });

    it('should detect contradictions', () => {
      const engine = new TraitInferenceEngine({
        llmProvider: mockLlmProvider as any,
      });

      const contradiction = engine.detectContradiction(
        { path: 'personalityMap.dimensions.openness', value: 0.2, confidence: 0.8, evidence: 'test' },
        testProfile
      );

      // Should detect contradiction since existing openness is 0.8
      expect(contradiction).not.toBeNull();
    });
  });

  describe('Discovery Guide', () => {
    it('should suggest unexplored topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile });

      const topic = guide.suggestTopic();
      expect(topic).toBeDefined();

      const unexplored = guide.getUnexploredTopics();
      expect(unexplored.length).toBeGreaterThan(0);
    });

    it('should generate prompts for topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile });

      const prompts = guide.generatePrompts('values', 3);
      expect(prompts.length).toBe(3);
      expect(prompts[0].topic).toBe('values');
    });

    it('should track explored topics', () => {
      const guide = new DiscoveryGuide({ profile: testProfile });

      guide.markExplored('values');
      guide.markExplored('fears');

      const explored = guide.getExploredTopics();
      expect(explored).toContain('values');
      expect(explored).toContain('fears');
    });
  });

  describe('Conversation Manager', () => {
    it('should limit context window to 20 messages', () => {
      const { ConversationManager } = require('../conversation.js');
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
      const { ConversationManager } = require('../conversation.js');
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
```

## Manual Testing Script

Create a manual testing checklist at `packages/actors/src/studio-npc/__tests__/manual-test-script.md`:

```markdown
# Manual Testing Script for Studio NPC

## Setup
1. Start the API server
2. Open Character Studio with a new character
3. Fill in basic profile fields

## Test 1: Basic Conversation
- [ ] Send "Hello, who are you?"
- [ ] Verify character responds with name
- [ ] Verify response matches speech style settings

## Test 2: Values Discovery
- [ ] Ask "What matters most to you?"
- [ ] Check if inferred values appear in pending traits
- [ ] Accept a value and verify it's added to profile

## Test 3: Fears Discovery
- [ ] Ask "What are you afraid of?"
- [ ] Check for fear inference
- [ ] Verify fear matches intensity and category

## Test 4: Social Patterns
- [ ] Simulate meeting: "Imagine we just met. Introduce yourself."
- [ ] Check strangerDefault inference
- [ ] Follow up with personal questions
- [ ] Observe warmthRate behavior

## Test 5: Stress Response
- [ ] Present stressful scenario
- [ ] Observe primary stress response
- [ ] Check if stress indicators are inferred

## Test 6: Speech Style
- [ ] After 10+ messages, check Voice Fingerprint
- [ ] Verify vocabulary level matches setting
- [ ] Check humor detection

## Test 7: Summarization
- [ ] Have 20+ message conversation
- [ ] Verify summarization triggers
- [ ] Check that context is maintained

## Test 8: Session Persistence
- [ ] Refresh the page
- [ ] Verify conversation is restored
- [ ] Continue conversation and verify context
```

## Acceptance Criteria

- [ ] All Big Five dimensions reflected in prompts
- [ ] Values and fears included in character portrayal
- [ ] Social patterns influence conversation behavior
- [ ] Speech style observable in responses
- [ ] Stress response testable through scenarios
- [ ] Trait inference returns valid paths and values
- [ ] Contradiction detection works correctly
- [ ] Discovery guide covers all profile areas
- [ ] Conversation manager handles 20+ messages
- [ ] Session persistence works across page refresh
- [ ] Manual test script passes all checks
- [ ] Integration tests pass
