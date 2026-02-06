import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleExamineObject,
  handleNavigatePlayer,
  handleUseItem,
} from '../../../src/game/tools/gameplay-handlers.js';

const gameplayMocks = vi.hoisted(() => ({
  getActorStateMock: vi.fn(),
  listActorStatesForSessionMock: vi.fn(),
  getSessionProjectionMock: vi.fn(),
  getSessionMock: vi.fn(),
  getLocationMapMock: vi.fn(),
  getInventoryItemsMock: vi.fn(),
  getActorsAtLocationMock: vi.fn(),
  updateActorStateMock: vi.fn(),
  upsertProjectionMock: vi.fn(),
  worldBusEmitMock: vi.fn(),
  locationServiceGetExitsMock: vi.fn(),
  locationServiceFormatExitsMock: vi.fn(),
  locationServiceFormatExitDirectionsMock: vi.fn(),
  locationServiceResolveDestinationMock: vi.fn(),
  locationServiceResolveDirectionMock: vi.fn(),
  locationServiceGetLocationMock: vi.fn(),
  locationServiceSearchLocationsMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getActorState: gameplayMocks.getActorStateMock,
  listActorStatesForSession: gameplayMocks.listActorStatesForSessionMock,
  getSessionProjection: gameplayMocks.getSessionProjectionMock,
  getSession: gameplayMocks.getSessionMock,
  getLocationMap: gameplayMocks.getLocationMapMock,
  getInventoryItems: gameplayMocks.getInventoryItemsMock,
  getActorsAtLocation: gameplayMocks.getActorsAtLocationMock,
  updateActorState: gameplayMocks.updateActorStateMock,
  upsertProjection: gameplayMocks.upsertProjectionMock,
  LocationDataValidationError: class LocationDataValidationError extends Error {
    details: unknown;
    constructor(message?: string) {
      super(message);
      this.name = 'LocationDataValidationError';
      this.details = { reason: 'invalid' };
    }
  },
}));

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: gameplayMocks.worldBusEmitMock,
  },
}));

vi.mock('@minimal-rpg/services', () => ({
  LocationService: {
    getExitsForLocation: gameplayMocks.locationServiceGetExitsMock,
    formatExitsForPrompt: gameplayMocks.locationServiceFormatExitsMock,
    formatExitDirections: gameplayMocks.locationServiceFormatExitDirectionsMock,
    resolveDestination: gameplayMocks.locationServiceResolveDestinationMock,
    resolveDirection: gameplayMocks.locationServiceResolveDirectionMock,
    getLocation: gameplayMocks.locationServiceGetLocationMock,
    searchLocations: gameplayMocks.locationServiceSearchLocationsMock,
  },
}));

const ownerEmail = 'owner@example.com';
const sessionId = '11111111-1111-4111-8111-111111111111';
const context = { ownerEmail, sessionId };

const locationNodes = [
  {
    id: 'loc-1',
    name: 'Bridge',
    type: 'room',
    parentId: null,
    depth: 2,
    summary: 'Upper deck command center.',
    ports: [],
    position: { x: 0.1, y: 0.2 },
  },
  {
    id: 'loc-2',
    name: 'Hall',
    type: 'room',
    parentId: null,
    depth: 2,
    summary: 'Main hall.',
    ports: [],
    position: { x: 0.4, y: 0.2 },
  },
];

const locationMapRow = {
  id: 'map-1',
  name: 'Starship',
  description: null,
  settingId: 'setting-1',
  nodesJson: locationNodes,
  connectionsJson: [],
  defaultStartLocationId: 'loc-1',
  tags: [],
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('game/tools/gameplay-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    gameplayMocks.listActorStatesForSessionMock.mockResolvedValue([
      { actorId: 'player', actorType: 'player', state: { locationId: 'loc-1' } },
    ]);
    gameplayMocks.getActorStateMock.mockResolvedValue({
      state: { location: { currentLocationId: 'loc-1' } },
    });
    gameplayMocks.getSessionProjectionMock.mockResolvedValue({
      location: { currentLocationId: 'loc-1' },
      inventory: { items: [] },
    });
    gameplayMocks.getSessionMock.mockResolvedValue({ id: sessionId, locationMapId: 'map-1' });
    gameplayMocks.getLocationMapMock.mockResolvedValue(locationMapRow);

    gameplayMocks.locationServiceGetLocationMock.mockImplementation(
      (_map: unknown, id: string) => locationNodes.find((node) => node.id === id) ?? null
    );
    gameplayMocks.locationServiceSearchLocationsMock.mockReturnValue([]);
  });

  it('rejects invalid examine_object args', async () => {
    const result = await handleExamineObject({}, context);

    expect(result).toEqual({ success: false, error: 'Invalid arguments for examine_object.' });
  });

  it('rejects blank examine_object targets', async () => {
    const result = await handleExamineObject({ target: '   ' }, context);

    expect(result).toEqual({
      success: false,
      error: 'Target is required for examine_object.',
    });
  });

  it('examines the current location', async () => {
    const result = await handleExamineObject({ target: 'here' }, context);

    expect(result).toEqual({
      success: true,
      target: 'Bridge',
      kind: 'location',
      description: 'Upper deck command center.',
    });
    expect(gameplayMocks.worldBusEmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'OBJECT_EXAMINED',
        actorId: 'player',
        target: 'Bridge',
        sessionId,
      })
    );
  });

  it('describes exits when navigate_player uses describe_only', async () => {
    gameplayMocks.locationServiceGetExitsMock.mockReturnValue([
      {
        name: 'North Gate',
        direction: 'north',
        destinationId: 'loc-2',
        destinationName: 'Hall',
        locked: false,
      },
    ]);
    gameplayMocks.locationServiceFormatExitsMock.mockReturnValue('north to Hall');

    const result = await handleNavigatePlayer({ describe_only: true }, context);

    expect(result).toEqual({
      success: true,
      describe_only: true,
      locationId: 'loc-1',
      exits: [
        {
          direction: 'north',
          destinationId: 'loc-2',
          destinationName: 'Hall',
          locked: false,
          lockReason: undefined,
        },
      ],
      narrative: 'north to Hall',
    });
  });

  it('returns suggestions when navigate_player lacks a target', async () => {
    gameplayMocks.locationServiceGetExitsMock.mockReturnValue([]);
    gameplayMocks.locationServiceFormatExitDirectionsMock.mockReturnValue('north, south');

    const result = await handleNavigatePlayer({}, context);

    expect(result).toEqual({
      success: false,
      error: 'Provide a direction or destination to navigate.',
      suggestion: 'north, south',
    });
  });

  it('navigates to a valid exit', async () => {
    gameplayMocks.locationServiceGetExitsMock.mockReturnValue([
      {
        name: 'North Gate',
        direction: 'north',
        destinationId: 'loc-2',
        destinationName: 'Hall',
        locked: false,
      },
    ]);
    gameplayMocks.locationServiceResolveDirectionMock.mockReturnValue({
      found: true,
      exit: {
        name: 'North Gate',
        direction: 'north',
        destinationId: 'loc-2',
        destinationName: 'Hall',
        locked: false,
      },
    });

    const result = await handleNavigatePlayer({ direction: 'north' }, context);

    expect(result).toEqual({
      success: true,
      previousLocation: 'loc-1',
      newLocation: 'loc-2',
      locationName: 'Hall',
      description: 'Main hall.',
      exit: { direction: 'north', name: 'North Gate' },
    });
    expect(gameplayMocks.updateActorStateMock).toHaveBeenCalledWith(
      expect.any(String),
      'player',
      expect.objectContaining({ locationId: 'loc-2' })
    );
    expect(gameplayMocks.worldBusEmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MOVED',
        actorId: 'player',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      })
    );
  });

  it('returns an error when use_item cannot find the item', async () => {
    gameplayMocks.getInventoryItemsMock.mockResolvedValue([]);

    const result = await handleUseItem({ item_name: 'Potion' }, context);

    expect(result).toEqual({
      success: false,
      error: 'You don\'t have "Potion" in your inventory.',
    });
  });

  it('returns an error when use_item is not usable', async () => {
    gameplayMocks.getInventoryItemsMock.mockResolvedValue([
      { id: 'item-1', name: 'Relic', usable: false },
    ]);

    const result = await handleUseItem({ item_name: 'Relic' }, context);

    expect(result).toEqual({
      success: false,
      error: 'Relic cannot be used that way.',
    });
  });

  it('returns an error when use_item is depleted', async () => {
    gameplayMocks.getInventoryItemsMock.mockResolvedValue([
      { id: 'item-1', name: 'Potion', quantity: 0 },
    ]);

    const result = await handleUseItem({ item_name: 'Potion' }, context);

    expect(result).toEqual({
      success: false,
      error: 'Potion is depleted.',
    });
  });

  it('uses an inventory item and updates remaining quantity', async () => {
    gameplayMocks.getInventoryItemsMock.mockResolvedValue([
      { id: 'item-1', name: 'Potion', quantity: 2 },
    ]);
    gameplayMocks.getSessionProjectionMock.mockResolvedValue({
      inventory: { items: [{ id: 'item-1', name: 'Potion', quantity: 2 }] },
    });

    const result = await handleUseItem({ item_name: 'Potion' }, context);

    expect(result).toEqual({
      success: true,
      item: 'Potion',
      itemId: 'item-1',
      target: null,
      action: null,
      remainingQuantity: 1,
    });
    const updateArgs = gameplayMocks.upsertProjectionMock.mock.calls[0]?.[1] as {
      inventory?: { items?: { id: string; name: string; quantity?: number }[] };
    };
    expect(updateArgs.inventory?.items).toEqual([
      { id: 'item-1', name: 'Potion', quantity: 1 },
    ]);
    expect(gameplayMocks.worldBusEmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ITEM_USED',
        actorId: 'player',
        itemId: 'item-1',
      })
    );
  });
});
