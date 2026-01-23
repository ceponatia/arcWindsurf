import { describe, expect, test } from 'vitest';
import { TagDefinitionSchema, TagTriggerSchema } from '../src/tags/definitions.js';
import { incrementVersion, isConditionalTag, validateTrigger } from '../src/tags/helpers.js';

describe('tags schemas and helpers', () => {
  test('TagDefinitionSchema applies defaults', () => {
    const parsed = TagDefinitionSchema.parse({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Strict Tone',
      promptText: 'Be concise.',
    });

    expect(parsed.owner).toBe('admin');
    expect(parsed.visibility).toBe('public');
    expect(parsed.category).toBe('style');
    expect(parsed.activationMode).toBe('always');
    expect(parsed.targetType).toBe('session');
    expect(parsed.triggers).toEqual([]);
    expect(parsed.priority).toBe('normal');
    expect(parsed.compositionMode).toBe('append');
    expect(parsed.isBuiltIn).toBe(false);
    expect(parsed.version).toBe('1.0.0');
  });

  test('isConditionalTag requires activationMode and triggers', () => {
    const conditional = TagDefinitionSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Keyword check',
      promptText: 'React to keywords.',
      activationMode: 'conditional',
      triggers: [
        TagTriggerSchema.parse({
          condition: 'keyword',
          params: { keywords: ['danger'] },
        }),
      ],
    });

    const unconditional = TagDefinitionSchema.parse({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Always on',
      promptText: 'Always active.',
      activationMode: 'conditional',
    });

    expect(isConditionalTag(conditional)).toBe(true);
    expect(isConditionalTag(unconditional)).toBe(false);
  });

  test('incrementVersion rolls over patch and minor values', () => {
    expect(incrementVersion('1.2.9', true)).toBe('1.3.0');
    expect(incrementVersion('1.9.9', true)).toBe('2.0.0');
    expect(incrementVersion('bad', true)).toBe('1.0.1');
    expect(incrementVersion('1.0.0', false)).toBe('1.0.0');
  });

  test('validateTrigger enforces params by condition', () => {
    const intentTrigger = TagTriggerSchema.parse({
      condition: 'intent',
      params: { intents: ['talk'] },
    });

    const locationTrigger = TagTriggerSchema.parse({
      condition: 'location',
      params: { locationIds: ['loc-1'] },
    });

    const invalid = TagTriggerSchema.parse({ condition: 'emotion' });

    expect(validateTrigger(intentTrigger)).toEqual({ valid: true });
    expect(validateTrigger(locationTrigger)).toEqual({ valid: true });
    expect(validateTrigger(invalid).valid).toBe(false);
  });
});
