import { describe, expect, test, vi } from 'vitest';
import {
  loadAndValidatePromptConfig,
  loadAndValidatePromptConfigFromJson,
} from '../src/api/promptConfig.js';
import promptConfigFixture from './fixtures/prompt-config-v1.json' with { type: 'json' };

describe('api/promptConfig loader', () => {
  test('throws for deprecated loader', () => {
    expect(() => loadAndValidatePromptConfig()).toThrow('no longer supported');
  });

  test('parses prompt config inputs', () => {
    const result = loadAndValidatePromptConfigFromJson({
      systemPrompt: promptConfigFixture,
      safetyRules: promptConfigFixture,
      safetyMode: { safetyModeMessage: 'safe', sensitiveNote: 'note' },
    });

    expect(result.systemRules).toEqual(['always respond in character']);
    expect(result.safetyRules).toEqual(['always respond in character']);
    expect(result.safetyMode.safetyModeMessage).toBe('safe');
  });

  test('throws a friendly error for invalid inputs', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      loadAndValidatePromptConfigFromJson({
        systemPrompt: { rules: [] },
        safetyRules: promptConfigFixture,
        safetyMode: { safetyModeMessage: 'safe', sensitiveNote: 'note' },
      })
    ).toThrow('Invalid prompt JSON configuration');

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
