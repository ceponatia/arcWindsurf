/**
 * Intent types and related interfaces.
 *
 * Note: The intent detection system (IntentDetector, DetectedIntent, etc.) has been
 * removed in favor of LLM tool calling. This file now only exports IntentType for
 * backwards compatibility with agents that still reference intent types.
 */

// Re-export IntentType for consumers
export type { IntentType } from './intents.js';
