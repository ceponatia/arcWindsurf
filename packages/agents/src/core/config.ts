import type { TokenUsage } from './output.js';

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Configuration for creating an agent.
 */
export interface AgentConfig {
  /** LLM provider to use for this agent (if needed) */
  llmProvider?: LlmProvider;

  /** Default temperature for LLM calls */
  temperature?: number;

  /** Maximum tokens for LLM responses */
  maxTokens?: number;

  /** Additional agent-specific configuration */
  options?: Record<string, unknown>;
}

/**
 * Minimal LLM provider interface for agents.
 * The actual implementation lives in @minimal-rpg/api.
 */
export interface LlmProvider {
  /** Generate a response given a prompt */
  generate(prompt: string, options?: LlmGenerateOptions): Promise<LlmResponse>;
}

/**
 * Options for LLM generation.
 */
export interface LlmGenerateOptions {
  /** Temperature (0-1) */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** System prompt */
  systemPrompt?: string;
}

/**
 * Response from LLM generation.
 */
export interface LlmResponse {
  /** Generated text */
  text: string;

  /** Token usage */
  usage?: TokenUsage;

  /** Model used */
  model?: string;
}
