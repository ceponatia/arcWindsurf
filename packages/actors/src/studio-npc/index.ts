// Types
export * from './types.js';

// Machine
export { createStudioMachine } from './studio-machine.js';

// Conversation
export { ConversationManager, type ConversationManagerConfig } from './conversation.js';

// Prompts
export {
  buildStudioSystemPrompt,
  buildInternalMonologuePrompt,
  buildDilemmaPrompt,
  buildEmotionalRangePrompt,
  buildVignettePrompt,
  buildMemoryPrompt,
  buildFirstImpressionPrompt,
} from './prompts.js';

// Actor
export { StudioNpcActor, createStudioNpcActor } from './studio-actor.js';

export { TraitInferenceEngine, type TraitInferenceEngineConfig } from './inference.js';
export { DiscoveryGuide, type DiscoveryGuideConfig } from './discovery.js';
export { DilemmaEngine, type DilemmaEngineConfig } from './dilemma.js';
export { EmotionalRangeGenerator } from './emotional-range.js';
export { ContradictionMirror } from './contradiction.js';
export { VignetteGenerator } from './vignettes.js';
export { MemoryExcavator } from './memory-excavation.js';
export { FirstImpressionGenerator } from './first-impression.js';
export { InternalMonologueGenerator } from './internal-monologue.js';
export { VoiceFingerprintAnalyzer } from './voice-fingerprint.js';
export { isValidCharacterResponse, validateCharacterResponse, type ValidationResult } from './validation.js';
