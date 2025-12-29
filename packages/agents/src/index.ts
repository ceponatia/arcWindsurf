// Core
export * from './core/types.js';
export { BaseAgent } from './core/base.js';
export { DefaultAgentRegistry, createDefaultRegistry } from './core/registry.js';

// Agents
export { MapAgent } from './map/map-agent.js';
export { NpcAgent } from './npc/npc-agent.js';
export { RulesAgent } from './rules/rules-agent.js';

// Domain types/constants
export { MAP_INTENT_TYPES, type MapIntentType } from './map/types.js';
export { RULES_INTENT_TYPES, type RulesIntentType } from './rules/types.js';

// Sensory agent
export {
  SensoryAgent,
  isSensoryIntent,
  type ScentData,
  type SensoryAgentConfig,
  type SensoryContext,
  type SensoryIntentType,
} from './sensory/index.js';

// NPC agent types
export type {
  NpcAgentConfig,
  NpcAgentInput,
  NpcAgentOutput,
  NpcMessageRepository,
  NpcAgentServices,
  HygieneServiceLike,
  MemoryServiceLike,
  SensoryAgentLike,
} from './npc/types.js';
