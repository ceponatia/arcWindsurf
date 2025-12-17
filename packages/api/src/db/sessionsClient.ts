import {
  createSession as rawCreateSession,
  getSession as rawGetSession,
  listSessions as rawListSessions,
  deleteSession as rawDeleteSession,
  appendMessage as rawAppendMessage,
  appendNpcMessage as rawAppendNpcMessage,
  getNpcMessages as rawGetNpcMessages,
  appendStateChangeLog as rawAppendStateChangeLog,
  appendSessionHistoryEntry as rawAppendSessionHistoryEntry,
  getSessionHistory as rawGetSessionHistory,
  getLocationState as rawGetLocationState,
  upsertLocationState as rawUpsertLocationState,
  getInventoryState as rawGetInventoryState,
  upsertInventoryState as rawUpsertInventoryState,
  getTimeState as rawGetTimeState,
  upsertTimeState as rawUpsertTimeState,
  getAffinityState as rawGetAffinityState,
  getAllAffinityStates as rawGetAllAffinityStates,
  upsertAffinityState as rawUpsertAffinityState,
  deleteAffinityState as rawDeleteAffinityState,
  deleteAllAffinityStates as rawDeleteAllAffinityStates,
  // NPC location state functions
  getNpcLocationState as rawGetNpcLocationState,
  getAllNpcLocationStates as rawGetAllNpcLocationStates,
  getNpcsAtLocation as rawGetNpcsAtLocation,
  upsertNpcLocationState as rawUpsertNpcLocationState,
  bulkUpsertNpcLocationStates as rawBulkUpsertNpcLocationStates,
  deleteNpcLocationState as rawDeleteNpcLocationState,
  deleteAllNpcLocationStates as rawDeleteAllNpcLocationStates,
  // Occupancy cache functions
  getLocationOccupancyCache as rawGetLocationOccupancyCache,
  upsertLocationOccupancyCache as rawUpsertLocationOccupancyCache,
  deleteLocationOccupancyCache as rawDeleteLocationOccupancyCache,
  deleteAllOccupancyCaches as rawDeleteAllOccupancyCaches,
  // Simulation cache functions
  getNpcSimulationCache as rawGetNpcSimulationCache,
  getAllNpcSimulationCaches as rawGetAllNpcSimulationCaches,
  upsertNpcSimulationCache as rawUpsertNpcSimulationCache,
  bulkUpsertNpcSimulationCaches as rawBulkUpsertNpcSimulationCaches,
  deleteNpcSimulationCache as rawDeleteNpcSimulationCache,
  deleteAllNpcSimulationCaches as rawDeleteAllNpcSimulationCaches,
  invalidateStaleSimulationCaches as rawInvalidateStaleSimulationCaches,
  // Player interest functions
  getPlayerInterestScore as rawGetPlayerInterestScore,
  getAllPlayerInterestScores as rawGetAllPlayerInterestScores,
  getNpcsAboveInterestThreshold as rawGetNpcsAboveInterestThreshold,
  upsertPlayerInterestScore as rawUpsertPlayerInterestScore,
  updateNpcTier as rawUpdateNpcTier,
  deletePlayerInterestScore as rawDeletePlayerInterestScore,
  deleteAllPlayerInterestScores as rawDeleteAllPlayerInterestScores,
  // Enhanced tag functions
  listPromptTags as rawListPromptTags,
  getPromptTag as rawGetPromptTag,
  createPromptTag as rawCreatePromptTag,
  updatePromptTag as rawUpdatePromptTag,
  deletePromptTag as rawDeletePromptTag,
  // Session tag binding functions
  createSessionTagBinding as rawCreateSessionTagBinding,
  getSessionTagBindings as rawGetSessionTagBindings,
  getSessionTagsWithDefinitions as rawGetSessionTagsWithDefinitions,
  toggleSessionTagBinding as rawToggleSessionTagBinding,
  deleteSessionTagBinding as rawDeleteSessionTagBinding,
  clearSessionTagBindings as rawClearSessionTagBindings,
  // Scene action functions
  createSceneAction as rawCreateSceneAction,
  getSceneActions as rawGetSceneActions,
  getRecentSceneActions as rawGetRecentSceneActions,
  pruneOldSceneActions as rawPruneOldSceneActions,
  deleteSceneActions as rawDeleteSceneActions,
  // Session location map functions
  getSessionLocationMap as rawGetSessionLocationMap,
  createSessionLocationMap as rawCreateSessionLocationMap,
  deleteSessionLocationMap as rawDeleteSessionLocationMap,
  // Tool call history functions
  appendToolCallHistory as rawAppendToolCallHistory,
  appendToolCallHistoryBatch as rawAppendToolCallHistoryBatch,
  getRecentToolCalls as rawGetRecentToolCalls,
  getToolCallStats as rawGetToolCallStats,
  deleteToolCallHistory as rawDeleteToolCallHistory,
  // Conversation summary functions
  upsertConversationSummary as rawUpsertConversationSummary,
  getConversationSummary as rawGetConversationSummary,
  getAllConversationSummaries as rawGetAllConversationSummaries,
  deleteConversationSummaries as rawDeleteConversationSummaries,
} from '@minimal-rpg/db/node';
import type { SessionsClientLike } from './types.js';

export const createSession = rawCreateSession as SessionsClientLike['createSession'];
export const getSession = rawGetSession as SessionsClientLike['getSession'];
export const listSessions = rawListSessions as SessionsClientLike['listSessions'];
export const deleteSession = rawDeleteSession as SessionsClientLike['deleteSession'];
export const appendMessage = rawAppendMessage as SessionsClientLike['appendMessage'];
export const appendNpcMessage = rawAppendNpcMessage as SessionsClientLike['appendNpcMessage'];
export const getNpcMessages = rawGetNpcMessages as SessionsClientLike['getNpcMessages'];
export const appendStateChangeLog =
  rawAppendStateChangeLog as SessionsClientLike['appendStateChangeLog'];
export const appendSessionHistoryEntry =
  rawAppendSessionHistoryEntry as SessionsClientLike['appendSessionHistoryEntry'];
export const getSessionHistory = rawGetSessionHistory as SessionsClientLike['getSessionHistory'];

// Per-session state slice helpers
export const getLocationState = rawGetLocationState;
export const upsertLocationState = rawUpsertLocationState;
export const getInventoryState = rawGetInventoryState;
export const upsertInventoryState = rawUpsertInventoryState;
export const getTimeState = rawGetTimeState;
export const upsertTimeState = rawUpsertTimeState;
export const getAffinityState = rawGetAffinityState;
export const getAllAffinityStates = rawGetAllAffinityStates;
export const upsertAffinityState = rawUpsertAffinityState;
export const deleteAffinityState = rawDeleteAffinityState;
export const deleteAllAffinityStates = rawDeleteAllAffinityStates;

// NPC location state functions
export const getNpcLocationState = rawGetNpcLocationState;
export const getAllNpcLocationStates = rawGetAllNpcLocationStates;
export const getNpcsAtLocation = rawGetNpcsAtLocation;
export const upsertNpcLocationState = rawUpsertNpcLocationState;
export const bulkUpsertNpcLocationStates = rawBulkUpsertNpcLocationStates;
export const deleteNpcLocationState = rawDeleteNpcLocationState;
export const deleteAllNpcLocationStates = rawDeleteAllNpcLocationStates;

// Occupancy cache functions
export const getLocationOccupancyCache = rawGetLocationOccupancyCache;
export const upsertLocationOccupancyCache = rawUpsertLocationOccupancyCache;
export const deleteLocationOccupancyCache = rawDeleteLocationOccupancyCache;
export const deleteAllOccupancyCaches = rawDeleteAllOccupancyCaches;

// Simulation cache functions
export const getNpcSimulationCache = rawGetNpcSimulationCache;
export const getAllNpcSimulationCaches = rawGetAllNpcSimulationCaches;
export const upsertNpcSimulationCache = rawUpsertNpcSimulationCache;
export const bulkUpsertNpcSimulationCaches = rawBulkUpsertNpcSimulationCaches;
export const deleteNpcSimulationCache = rawDeleteNpcSimulationCache;
export const deleteAllNpcSimulationCaches = rawDeleteAllNpcSimulationCaches;
export const invalidateStaleSimulationCaches = rawInvalidateStaleSimulationCaches;

// Player interest functions
export const getPlayerInterestScore = rawGetPlayerInterestScore;
export const getAllPlayerInterestScores = rawGetAllPlayerInterestScores;
export const getNpcsAboveInterestThreshold = rawGetNpcsAboveInterestThreshold;
export const upsertPlayerInterestScore = rawUpsertPlayerInterestScore;
export const updateNpcTier = rawUpdateNpcTier;
export const deletePlayerInterestScore = rawDeletePlayerInterestScore;
export const deleteAllPlayerInterestScores = rawDeleteAllPlayerInterestScores;

// Re-export PlayerInterestRecord type for consumers
export type { PlayerInterestRecord } from '@minimal-rpg/db/node';

// Enhanced tag CRUD functions
export const listPromptTags = rawListPromptTags;
export const getPromptTag = rawGetPromptTag;
export const createPromptTag = rawCreatePromptTag;
export const updatePromptTag = rawUpdatePromptTag;
export const deletePromptTag = rawDeletePromptTag;

// Session tag binding functions
export const createSessionTagBinding = rawCreateSessionTagBinding;
export const getSessionTagBindings = rawGetSessionTagBindings;
export const getSessionTagsWithDefinitions = rawGetSessionTagsWithDefinitions;
export const toggleSessionTagBinding = rawToggleSessionTagBinding;
export const deleteSessionTagBinding = rawDeleteSessionTagBinding;
export const clearSessionTagBindings = rawClearSessionTagBindings;

// Scene action functions
export const createSceneAction = rawCreateSceneAction;
export const getSceneActions = rawGetSceneActions;
export const getRecentSceneActions = rawGetRecentSceneActions;
export const pruneOldSceneActions = rawPruneOldSceneActions;
export const deleteSceneActions = rawDeleteSceneActions;

// Session location map functions
export const getSessionLocationMap = rawGetSessionLocationMap;
export const createSessionLocationMap = rawCreateSessionLocationMap;
export const deleteSessionLocationMap = rawDeleteSessionLocationMap;

// Re-export SessionLocationMapRecord type for consumers
export type { SessionLocationMapRecord } from '@minimal-rpg/db/node';

// Tool call history functions
export const appendToolCallHistory = rawAppendToolCallHistory;
export const appendToolCallHistoryBatch = rawAppendToolCallHistoryBatch;
export const getRecentToolCalls = rawGetRecentToolCalls;
export const getToolCallStats = rawGetToolCallStats;
export const deleteToolCallHistory = rawDeleteToolCallHistory;

// Re-export ToolCallRecord type for consumers
export type { ToolCallRecord } from '@minimal-rpg/db/node';

// Conversation summary functions
export const upsertConversationSummary = rawUpsertConversationSummary;
export const getConversationSummary = rawGetConversationSummary;
export const getAllConversationSummaries = rawGetAllConversationSummaries;
export const deleteConversationSummaries = rawDeleteConversationSummaries;

// Re-export ConversationSummaryRecord type for consumers
export type { ConversationSummaryRecord } from '@minimal-rpg/db/node';
