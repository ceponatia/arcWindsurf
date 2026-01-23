import { describe, it, expect, afterEach } from 'vitest';
import { getConfig } from '../../src/utils/config.js';

const originalEnv = process.env;

/**
 * Update process.env for test cases.
 */
function setEnv(next: Record<string, string | undefined>): void {
  process.env = { ...originalEnv, ...next };
}

describe('utils/config', () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env is missing', () => {
    setEnv({
      PORT: undefined,
      CONTEXT_WINDOW: undefined,
      TEMPERATURE: undefined,
      TOP_P: undefined,
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_MODEL: undefined,
      DEBUG_LLM: undefined,
    });

    const cfg = getConfig();

    expect(cfg).toEqual({
      port: 3001,
      contextWindow: 30,
      temperature: 0.7,
      topP: 0.9,
      openrouterApiKey: '',
      openrouterModel: 'deepseek/deepseek-chat',
      debugLlm: false,
    });
  });

  it('reads numeric and string values from env', () => {
    setEnv({
      PORT: '4000',
      CONTEXT_WINDOW: '64',
      TEMPERATURE: '0.2',
      TOP_P: '0.6',
      OPENROUTER_API_KEY: 'key',
      OPENROUTER_MODEL: 'model',
      DEBUG_LLM: 'true',
    });

    const cfg = getConfig();

    expect(cfg).toEqual({
      port: 4000,
      contextWindow: 64,
      temperature: 0.2,
      topP: 0.6,
      openrouterApiKey: 'key',
      openrouterModel: 'model',
      debugLlm: true,
    });
  });

  it('falls back when numeric env values are invalid', () => {
    setEnv({
      PORT: '0',
      CONTEXT_WINDOW: 'nope',
      TEMPERATURE: 'invalid',
      TOP_P: 'invalid',
    });

    const cfg = getConfig();

    expect(cfg.port).toBe(3001);
    expect(cfg.contextWindow).toBe(30);
    expect(cfg.temperature).toBe(0.7);
    expect(cfg.topP).toBe(0.9);
  });
});
