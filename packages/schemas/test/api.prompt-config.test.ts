import { describe, expect, test } from 'vitest';
import {
  SafetyModeSchema,
  SafetyRulesSchema,
  SystemPromptSchema,
} from '../src/api/promptConfigSchemas.js';
import promptConfigFixture from './fixtures/prompt-config-v1.json' with { type: 'json' };

describe('api/prompt-config schemas', () => {
  test('parses minimal valid prompt configurations', () => {
    expect(() => SystemPromptSchema.parse({ rules: ['follow the rules'] })).not.toThrow();
    expect(() => SafetyRulesSchema.parse({ rules: ['be safe'] })).not.toThrow();
    expect(() =>
      SafetyModeSchema.parse({
        safetyModeMessage: 'safe',
        sensitiveNote: 'note',
      })
    ).not.toThrow();
  });

  test('rejects empty rules and messages', () => {
    expect(() => SystemPromptSchema.parse({ rules: [] })).toThrow();
    expect(() => SafetyRulesSchema.parse({ rules: [''] })).toThrow();
    expect(() => SafetyModeSchema.parse({ safetyModeMessage: '', sensitiveNote: 'note' })).toThrow();
  });

  test('parses legacy prompt config fixture', () => {
    expect(() => SystemPromptSchema.parse(promptConfigFixture)).not.toThrow();
    expect(() => SafetyRulesSchema.parse(promptConfigFixture)).not.toThrow();
  });

  test('survives JSON round-trip', () => {
    const original = {
      safetyModeMessage: 'safe',
      sensitiveNote: 'note',
    };

    const parsed = SafetyModeSchema.parse(original);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => SafetyModeSchema.parse(roundTripped)).not.toThrow();
  });
});
