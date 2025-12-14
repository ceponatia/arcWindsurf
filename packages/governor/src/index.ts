// Core Governor
export { Governor, createGovernor } from './core/governor.js';

// Intent Types and Aliases (still used by agents for intent mapping)
export {
  INTENT_CONFIG,
  INTENT_TYPES,
  INTENT_ALIASES,
  INTENT_TO_AGENT_MAP,
  getIntentTypeList,
  isValidIntentType,
  resolveIntentType,
  mapToAgentIntent,
} from './intents/intents.js';

// Pre-Parser (converts player input into ParsedAction[] for action sequencing)
export {
  LlmPreParser,
  type LlmPreParserConfig,
  type PreParserMessage,
  type PreParserGenerateFn,
  type PreParserGenerationResult,
} from './intents/pre-parser.js';

// Equipment Slot Resolution (bridges body regions to item slots)
export {
  BODY_REGION_TO_EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_TO_BODY_REGIONS,
  getEquipmentSlotsForRegion,
  getBodyRegionsForSlot,
  doesSlotCoverRegion,
  resolveBodyWithEquipment,
  type EquipmentSlot,
  type BodyEquipmentResolution,
} from './utils/equipment-resolver.js';

// Action Sequencing
export {
  ActionSequencer,
  createBasicActionSequencer,
  createSensoryActionSequencer,
  createInterruptibleActionSequencer,
  type ActionSequencerConfig,
} from './core/action-sequencer.js';

// NPC Evaluation (Phase 5: Governor Simplification)
export {
  NpcEvaluator,
  createNpcEvaluator,
  type NpcEvaluationContext,
} from './core/npc-evaluator.js';

// Tool Calling (Phase 2: LLM Tool Integration)
export {
  // Types
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type StatePatches,
  type ChatMessageWithTools,
  type ToolParameterSchema,
  type OpenRouterToolResponse,

  // Tool Definitions
  GET_SENSORY_DETAIL_TOOL,
  NPC_DIALOGUE_TOOL,
  UPDATE_PROXIMITY_TOOL,
  NAVIGATE_PLAYER_TOOL,
  EXAMINE_OBJECT_TOOL,
  USE_ITEM_TOOL,
  GET_NPC_MEMORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  CORE_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  RELATIONSHIP_TOOLS,
  ALL_GAME_TOOLS,
  getActiveTools,

  // Executor
  ToolExecutor,
  createToolExecutor,
  type ToolExecutorConfig,
  type FallbackToolHandler,
} from './tools/index.js';

// Proximity State Management
export {
  ProximityManager,
  type ProximityUpdateResult,
  type UpdateProximityParams,
  type UpdateNpcProximityLevelParams,
} from './proximity/index.js';

// Tool-Based Turn Handler (Phase 4: LLM Tool Routing)
export {
  ToolBasedTurnHandler,
  createToolBasedTurnHandler,
  type ToolTurnHandlerConfig,
} from './core/tool-turn-handler.js';

// Types
export type {
  GovernorConfig,
  GovernorOptions,
  TurnInput,
  TurnResult,
  TurnEvent,
  TurnMetadata,
  TurnStateChanges,
  TurnStateContext,
  ConversationTurn,
  KnowledgeContextItem,
  ToolTurnHandler,
  StateObject,
  SessionTag,
} from './core/types.js';

export { DEFAULT_GOVERNOR_OPTIONS, TurnProcessingError } from './core/types.js';
