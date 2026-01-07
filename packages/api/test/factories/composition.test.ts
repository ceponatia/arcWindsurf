import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGovernorForRequest } from '../../src/factories/composition.js';
import { getConfig } from '../../src/utils/config.js';
import { GovernorFactory } from '@minimal-rpg/governor';
import { NpcAgent } from '@minimal-rpg/agents';

const { mockRegistry } = vi.hoisted(() => {
  return {
    mockRegistry: {
      size: 0,
      register: vi.fn(),
    },
  };
});

// Mock dependencies
vi.mock('@minimal-rpg/db/node', () => ({
  db: {},
  createSession: vi.fn(),
  getSession: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  appendMessage: vi.fn(),
  appendNpcMessage: vi.fn(),
  getNpcMessages: vi.fn(),
  getNpcOwnHistory: vi.fn(),
  appendStateChangeLog: vi.fn(),
  appendSessionHistoryEntry: vi.fn(),
  getSessionHistory: vi.fn(),
  getLocationState: vi.fn(),
  upsertLocationState: vi.fn(),
  getInventoryState: vi.fn(),
  upsertInventoryState: vi.fn(),
  getTimeState: vi.fn(),
  upsertTimeState: vi.fn(),
  getAffinityState: vi.fn(),
  getAllAffinityStates: vi.fn(),
  upsertAffinityState: vi.fn(),
  deleteAffinityState: vi.fn(),
  deleteAllAffinityStates: vi.fn(),
  getNpcLocationState: vi.fn(),
  getAllNpcLocationStates: vi.fn(),
  getNpcsAtLocation: vi.fn(),
  upsertNpcLocationState: vi.fn(),
  bulkUpsertNpcLocationStates: vi.fn(),
  deleteNpcLocationState: vi.fn(),
  deleteAllNpcLocationStates: vi.fn(),
  getLocationOccupancyCache: vi.fn(),
  upsertLocationOccupancyCache: vi.fn(),
  deleteLocationOccupancyCache: vi.fn(),
  deleteAllOccupancyCaches: vi.fn(),
  getNpcSimulationCache: vi.fn(),
  getAllNpcSimulationCaches: vi.fn(),
  upsertNpcSimulationCache: vi.fn(),
  bulkUpsertNpcSimulationCaches: vi.fn(),
  deleteNpcSimulationCache: vi.fn(),
  deleteAllNpcSimulationCaches: vi.fn(),
  invalidateStaleSimulationCaches: vi.fn(),
  getPlayerInterestScore: vi.fn(),
  getAllPlayerInterestScores: vi.fn(),
  getNpcsAboveInterestThreshold: vi.fn(),
  upsertPlayerInterestScore: vi.fn(),
  updateNpcTier: vi.fn(),
  deletePlayerInterestScore: vi.fn(),
  deleteAllPlayerInterestScores: vi.fn(),
  listPromptTags: vi.fn(),
  getPromptTag: vi.fn(),
  createPromptTag: vi.fn(),
  updatePromptTag: vi.fn(),
  deletePromptTag: vi.fn(),
  createSessionTagBinding: vi.fn(),
  getSessionTagBindings: vi.fn(),
  getSessionTagsWithDefinitions: vi.fn(),
  toggleSessionTagBinding: vi.fn(),
  deleteSessionTagBinding: vi.fn(),
  clearSessionTagBindings: vi.fn(),
  createSceneAction: vi.fn(),
  getSceneActions: vi.fn(),
  getRecentSceneActions: vi.fn(),
  pruneOldSceneActions: vi.fn(),
  deleteSceneActions: vi.fn(),
  getSessionLocationMap: vi.fn(),
  createSessionLocationMap: vi.fn(),
  deleteSessionLocationMap: vi.fn(),
}));
vi.mock('../../src/utils/config.js');
vi.mock('../../src/db/sessionsClient.js');
vi.mock('@minimal-rpg/governor');
vi.mock('@minimal-rpg/agents', () => ({
  createDefaultRegistry: vi.fn(() => mockRegistry),
  NpcAgent: vi.fn(),
  SensoryService: vi.fn(),
}));
vi.mock('@minimal-rpg/utils', () => ({
  generateWithOpenRouter: vi.fn(),
}));

describe('factories/composition', () => {
  const mockGetConfig = getConfig as unknown as ReturnType<typeof vi.fn>;
  const mockGovernorFactory = GovernorFactory as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({
      openrouterApiKey: 'test-key',
      openrouterModel: 'test-model',
      governorDevMode: false,
    });

    // Reset mockRegistry state
    mockRegistry.size = 0;

    // Mock GovernorFactory instance
    mockGovernorFactory.mockImplementation(function () {
      return {
        createForRequest: vi.fn().mockReturnValue({
          // Mock Governor instance
          processTurn: vi.fn(),
        }),
      };
    });
  });

  it('should create a governor for request', () => {
    const options = {
      ownerEmail: 'test@example.com',
      sessionId: 'session-1',
      stateSlices: {} as any,
    };

    const governor = createGovernorForRequest(options);

    expect(governor).toBeDefined();
    expect(GovernorFactory).toHaveBeenCalled();
  });

  it('should register agents if not already registered', () => {
    // Reset registry size to 0 to trigger registration
    mockRegistry.size = 0;

    const options = {
      ownerEmail: 'test@example.com',
      sessionId: 'session-1',
      stateSlices: {} as any,
    };

    createGovernorForRequest(options);

    expect(NpcAgent).toHaveBeenCalled();
    expect(mockRegistry.register).toHaveBeenCalled();
  });

  it('should not register agents if already registered', () => {
    // Set registry size to > 0 to skip registration
    mockRegistry.size = 1;

    const options = {
      ownerEmail: 'test@example.com',
      sessionId: 'session-1',
      stateSlices: {} as any,
    };

    createGovernorForRequest(options);

    expect(mockRegistry.register).not.toHaveBeenCalled();
  });
});
