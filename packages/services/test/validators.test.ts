import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Validators, type ValidationContext } from '../src/rules/validators.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

const {
  getLocationConnectionsMock,
  getActorStateMock,
  getInventoryItemMock,
} = vi.hoisted(() => ({
  getLocationConnectionsMock: vi.fn(async () => [
    { targetLocationId: 'street', targetName: 'Street' },
    { targetLocationId: 'cellar', targetName: 'Cellar' },
  ]),
  getActorStateMock: vi.fn(async () => ({
    actorId: 'npc-1',
    state: { interruptible: true },
  })),
  getInventoryItemMock: vi.fn(async () => null),
}));

vi.mock('@minimal-rpg/db', () => ({
  getLocationConnections: getLocationConnectionsMock,
  getActorState: getActorStateMock,
  getInventoryItem: getInventoryItemMock,
}));

function createTestContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    sessionId: 'test-session',
    actorId: 'player',
    currentLocationId: 'tavern',
    actorsAtLocation: ['bartender', 'merchant'],
    inventoryItemIds: ['key', 'torch'],
    ...overrides,
  };
}

describe('Validators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid result for unknown event types', async () => {
    const context = createTestContext();
    const result = await Validators.validateAction(
      { type: 'UNKNOWN_EVENT' } as WorldEvent,
      context
    );

    expect(result.valid).toBe(true);
    expect(result.reason).toBe('');
  });

  describe('MOVE_INTENT', () => {
    it('allows moves to connected locations', async () => {
      const context = createTestContext({ currentLocationId: 'tavern' });
      const event = { type: 'MOVE_INTENT', destinationId: 'street' } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(true);
    });

    it('blocks moves to unconnected locations', async () => {
      const context = createTestContext({ currentLocationId: 'tavern' });
      const event = { type: 'MOVE_INTENT', destinationId: 'castle' } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Cannot reach');
      expect(result.suggestion).toContain('Available exits');
    });

    it('rejects move without destination', async () => {
      const context = createTestContext();
      const event = { type: 'MOVE_INTENT' } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No destination specified');
    });
  });

  describe('SPEAK_INTENT', () => {
    it('allows speaking to present NPCs', async () => {
      const context = createTestContext({
        actorsAtLocation: ['bartender', 'merchant'],
      });
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: 'Hello!',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(true);
    });

    it('blocks speaking to absent NPCs', async () => {
      const context = createTestContext({
        actorsAtLocation: ['merchant'],
      });
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: 'Hello!',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not at your current location');
    });

    it('rejects speaking without content', async () => {
      const context = createTestContext();
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: '',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot speak without content');
    });

    it('blocks speaking to busy NPCs', async () => {
      getActorStateMock.mockResolvedValueOnce({
        actorId: 'bartender',
        state: { interruptible: false },
      });

      const context = createTestContext({
        actorsAtLocation: ['bartender'],
      });
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: 'Hello!',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too busy to talk');
    });
  });

  describe('USE_ITEM_INTENT', () => {
    it('allows using items in inventory', async () => {
      const context = createTestContext({
        inventoryItemIds: ['key', 'torch'],
      });
      const event = {
        type: 'USE_ITEM_INTENT',
        itemId: 'key',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(true);
    });

    it('rejects using items not in inventory', async () => {
      const context = createTestContext({
        inventoryItemIds: ['torch'],
      });
      const event = {
        type: 'USE_ITEM_INTENT',
        itemId: 'gold-key',
      } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("don't have");
    });

    it('rejects use without item specified', async () => {
      const context = createTestContext();
      const event = { type: 'USE_ITEM_INTENT' } as WorldEvent;

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No item specified');
    });
  });
});
