import type { LlmGenerationOptions } from '../types.js';

// Build provider options object excluding undefined values
export function buildProviderOptions(opts?: LlmGenerationOptions): {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
} {
  if (!opts) return {};
  const out: { temperature?: number; top_p?: number; max_tokens?: number } = {};
  if (opts.temperature !== undefined) out.temperature = opts.temperature;
  if (opts.top_p !== undefined) out.top_p = opts.top_p;
  if (opts.max_tokens !== undefined) out.max_tokens = opts.max_tokens;
  return out;
}
