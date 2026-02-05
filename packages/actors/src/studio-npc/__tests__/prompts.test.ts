import { describe, it, expect } from 'vitest';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import {
  buildStudioSystemPrompt,
  buildInternalMonologuePrompt,
  buildDilemmaPrompt,
  buildEmotionalRangePrompt,
  buildVignettePrompt,
  buildMemoryPrompt,
  buildFirstImpressionPrompt,
} from '../prompts.js';

describe('studio-npc/prompts', () => {
  it('builds the studio system prompt with summary and personality details', () => {
    const profile: Partial<CharacterProfile> = {
      name: 'Elara',
      age: 28,
      gender: 'female',
      race: 'Elf',
      summary: 'A cautious scholar with hidden depths',
      backstory: 'Raised among quiet libraries and old scrolls.',
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
          expressiveness: 'reserved',
          directness: 'tactful',
          pace: 'measured',
          humor: 'rare',
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

    const prompt = buildStudioSystemPrompt(profile, 'Earlier summary.');

    expect(prompt).toContain('[Identity]');
    expect(prompt).toContain('You are Elara.');
    expect(prompt).toContain('You are 28 years old.');
    expect(prompt).toContain('You identify as female.');
    expect(prompt).toContain('You are Elf.');
    expect(prompt).toContain('[Your Story]');
    expect(prompt).toContain('[Who You Are]');
    expect(prompt).toContain('curious and imaginative');
    expect(prompt).toContain('What matters most to you: wisdom, loyalty');
    expect(prompt).toContain('Deep down, you fear: losing her remaining family');
    expect(prompt).toContain('With strangers, your default is guarded');
    expect(prompt).toContain('[Your Voice]');
    expect(prompt).toContain('Your vocabulary reflects your learning');
    expect(prompt).toContain('You choose words carefully');
    expect(prompt).toContain('You speak at a steady, thoughtful pace');
    expect(prompt).toContain('[What Has Come Before]');
    expect(prompt).toContain('Earlier summary.');
  });

  it('builds the internal monologue prompt', () => {
    const prompt = buildInternalMonologuePrompt();

    expect(prompt).toContain('spoken');
    expect(prompt).toContain('thought');
    expect(prompt).toContain('JSON');
  });

  it('builds the dilemma prompt', () => {
    const prompt = buildDilemmaPrompt('A test dilemma.', ['loyalty', 'honesty']);

    expect(prompt).toContain('A test dilemma.');
    expect(prompt).toContain('loyalty against honesty');
  });

  it('builds the emotional range prompt', () => {
    const prompt = buildEmotionalRangePrompt('Base prompt', 'angry');

    expect(prompt).toContain('Base prompt');
    expect(prompt).toContain('as if you were angry');
  });

  it('builds the vignette prompt', () => {
    const prompt = buildVignettePrompt('authority-figure', 'conflict');

    expect(prompt).toContain('someone with power over you');
    expect(prompt).toContain('There is tension between you');
  });

  it('builds the memory prompt', () => {
    const prompt = buildMemoryPrompt('earliest-memory');

    expect(prompt).toContain('earliest memory');
  });

  it('builds the first impression prompt', () => {
    const prompt = buildFirstImpressionPrompt('marketplace');

    expect(prompt).toContain('marketplace');
    expect(prompt).toContain('first time');
  });
});
