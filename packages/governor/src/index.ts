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
  MOVE_TO_LOCATION_TOOL,
  GET_LOCATION_INFO_TOOL,
  USE_ITEM_TOOL,
  ADVANCE_TIME_TOOL,
  GET_NPC_MEMORY_TOOL,
  UPDATE_RELATIONSHIP_TOOL,
  UPDATE_NPC_HYGIENE_TOOL,
  GET_HYGIENE_SENSORY_TOOL,
  GENERATE_NPC_SCHEDULE_TOOL,
  ASSIGN_NPC_LOCATION_TOOL,
  GET_SCHEDULE_RESOLUTION_TOOL,
  CORE_TOOLS,
  DEBUG_TOOLS,
  ENVIRONMENT_TOOLS,
  INVENTORY_TOOLS,
  LOCATION_TOOLS,
  TIME_TOOLS,
  RELATIONSHIP_TOOLS,
  HYGIENE_TOOLS,
  SCHEDULE_TOOLS,
  ALL_GAME_TOOLS,
  TOOLING_FAILURE_REPORT_TOOL,
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

// Location Graph Service (navigation, pathfinding, exit resolution)
export {
  LocationGraphService,
  type LocationInfo,
  type ResolvedExit,
  type PathResult,
  type DirectionResolution,
  type ReachabilityResult,
} from './location/index.js';

// Tool-Based Turn Handler (Phase 4: LLM Tool Routing)
export {
  ToolBasedTurnHandler,
  createToolBasedTurnHandler,
  type ToolTurnHandlerConfig,
  type ToolCallHistoryRecord,
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
  ToolHistoryContext,
  TagInstruction,
  TurnTagContext,
} from './core/types.js';

export { DEFAULT_GOVERNOR_OPTIONS, TurnProcessingError } from './core/types.js';
