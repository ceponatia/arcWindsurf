export type OpenRouterProviderSort = 'price' | 'throughput' | 'latency';

export interface OpenRouterEnvConfig {
  /** Provider ID used for metrics/logging. Defaults to 'openrouter'. */
  id?: string;
  /** Fallback model if OPENROUTER_MODEL is missing. */
  defaultModel?: string;
}

export interface OpenRouterEnvSettings {
  apiKey: string;
  baseURL: string;
  id: string;
  model: string;
  providerSort?: OpenRouterProviderSort;
}

/**
 * Read OpenRouter configuration from environment variables.
 *
 * @param {OpenRouterEnvConfig | undefined} config Optional defaults.
 * @returns {OpenRouterEnvSettings | null} Settings or null when missing API key.
 */
export function getOpenRouterEnvSettings(
  config?: OpenRouterEnvConfig
): OpenRouterEnvSettings | null {
  const apiKey = process.env['OPENROUTER_API_KEY'] ?? '';
  if (!apiKey) return null;

  const model = process.env['OPENROUTER_MODEL'] ?? config?.defaultModel ?? 'deepseek/deepseek-v3.2';
  const baseURL = process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1';
  const id = config?.id ?? 'openrouter';
  const providerSort = process.env['OPENROUTER_PROVIDER_SORT'] as
    | OpenRouterProviderSort
    | undefined;

  return {
    apiKey,
    baseURL,
    id,
    model,
    ...(providerSort ? { providerSort } : {}),
  };
}
