import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { worldBus } from '@minimal-rpg/bus';
import { timeService } from '@minimal-rpg/services';
import * as dbNode from '@minimal-rpg/db/node';
import { createOpenRouterProviderFromEnv, type LLMProvider } from '@minimal-rpg/llm';
import { TurnOrchestrator, type TurnConfig } from '../../src/services/turn-orchestrator.js';

// Mock NPC data for integration tests - must use valid UUIDs
const mockNpcId = '550e8400-e29b-41d4-a716-446655440001';
const mockSessionId = '550e8400-e29b-41d4-a716-446655440002';
const mockProfileId = '550e8400-e29b-41d4-a716-446655440003';

const mockActorState = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  sessionId: mockSessionId,
  actorType: 'npc',
  actorId: mockNpcId,
  entityProfileId: mockProfileId,
  state: { locationId: 'tavern' },
  lastEventSeq: BigInt(0),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEntityProfile = {
  id: mockProfileId,
  entityType: 'character',
  name: 'Barkeep Marcus',
  ownerEmail: 'test@example.com',
  visibility: 'private',
  tier: 'minor',
  profileJson: {
    id: mockNpcId,
    name: 'Barkeep Marcus',
    summary: 'A friendly tavern keeper who loves to chat with customers.',
    backstory: 'Marcus has run the Silver Flagon tavern for 20 years.',
    race: 'Human',
    personality: 'Friendly, talkative, and always ready with a joke.',
    tags: ['npc', 'tavern'],
    tier: 'minor',
  },
  tags: ['npc'],
  embedding: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Integration tests for TurnOrchestrator using real LLM provider.
 * These tests require OPENROUTER_API_KEY to be set in environment.
 */
describe('services/turn-orchestrator integration', () => {
  let llmProvider: LLMProvider | null = null;

  const config: TurnConfig = {
    minutesPerTurn: 5,
    enableAmbientUpdates: false,
    maxAmbientNarrations: 0,
    narrativeMode: 'minimal',
  };

  beforeAll(() => {
    llmProvider = createOpenRouterProviderFromEnv({ id: 'turn-orchestrator-integration-test' });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // Mock external services to isolate LLM testing
    vi.spyOn(worldBus, 'emit').mockResolvedValue();
    vi.spyOn(timeService, 'emitTick').mockResolvedValue();
  });

  it.skipIf(!process.env['OPENROUTER_API_KEY'])(
    'should generate NPC response via real LLM',
    async () => {
      if (!llmProvider) {
        throw new Error('LLM provider not available');
      }

      // Mock DB to return valid NPC data
      vi.spyOn(dbNode, 'getActorState').mockResolvedValue(mockActorState);
      vi.spyOn(dbNode, 'getEntityProfile').mockResolvedValue(mockEntityProfile);

      const orchestrator = new TurnOrchestrator(config, llmProvider);

      const result = await orchestrator.processTurn({
        sessionId: mockSessionId,
        playerId: 'player-1',
        playerMessage: 'Hello! What drinks do you have today?',
        focusedNpcId: mockNpcId,
        locationId: 'tavern',
      });

      expect(result).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);
      // Should have a real LLM-generated response
      expect(result.npcResponse).not.toBeNull();
      expect(result.npcResponse).not.toBe('[NPC response placeholder]');
      expect(typeof result.npcResponse).toBe('string');
      expect(result.npcResponse!.length).toBeGreaterThan(0);
    },
    15000
  );

  it.skipIf(!process.env['OPENROUTER_API_KEY'])(
    'should return null when no actor state found',
    async () => {
      if (!llmProvider) {
        throw new Error('LLM provider not available');
      }

      // Mock DB to return no data
      vi.spyOn(dbNode, 'getActorState').mockResolvedValue(undefined);
      vi.spyOn(dbNode, 'getEntityProfile').mockResolvedValue(undefined);

      const orchestrator = new TurnOrchestrator(config, llmProvider);

      const result = await orchestrator.processTurn({
        sessionId: 'test-session',
        playerId: 'player-1',
        playerMessage: 'Hello!',
        focusedNpcId: 'nonexistent-npc',
        locationId: 'tavern',
      });

      expect(result).toBeDefined();
      expect(result.npcResponse).toBeNull();
    },
    10000
  );

  it.skipIf(!process.env['OPENROUTER_API_KEY'])(
    'should complete turn within acceptable time',
    async () => {
      if (!llmProvider) {
        throw new Error('LLM provider not available');
      }

      // Mock DB to return valid NPC data for realistic timing
      vi.spyOn(dbNode, 'getActorState').mockResolvedValue(mockActorState);
      vi.spyOn(dbNode, 'getEntityProfile').mockResolvedValue(mockEntityProfile);

      const orchestrator = new TurnOrchestrator(config, llmProvider);
      const startTime = Date.now();

      await orchestrator.processTurn({
        sessionId: mockSessionId,
        playerId: 'player-1',
        playerMessage: 'What time is it?',
        focusedNpcId: mockNpcId,
        locationId: 'tavern',
      });

      const elapsed = Date.now() - startTime;
      // Should complete within 5 seconds even with real LLM call
      expect(elapsed).toBeLessThan(5000);
    },
    15000
  );
});
