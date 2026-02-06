import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const projectionMocks = vi.hoisted(() => ({
  initMock: vi.fn(),
  saveSnapshotsMock: vi.fn(),
  sessionReplayMock: vi.fn(),
  locationReplayMock: vi.fn(),
  npcsReplayMock: vi.fn(),
  inventoryReplayMock: vi.fn(),
  timeReplayMock: vi.fn(),
  instances: [] as unknown[],
}));

class MockProjectionManager {
  session = { replay: projectionMocks.sessionReplayMock };
  location = { replay: projectionMocks.locationReplayMock };
  npcs = { replay: projectionMocks.npcsReplayMock };
  inventory = { replay: projectionMocks.inventoryReplayMock };
  time = { replay: projectionMocks.timeReplayMock };

  constructor(public sessionId: string) {
    projectionMocks.instances.push(this);
  }

  init(): Promise<void> {
    projectionMocks.initMock();
    return Promise.resolve();
  }

  saveSnapshots(): Promise<void> {
    projectionMocks.saveSnapshotsMock();
    return Promise.resolve();
  }
}

vi.mock('@minimal-rpg/projections', () => ({
  ProjectionManager: MockProjectionManager,
}));

const { worldProjectionService } = await import('../../src/services/projection-service.js');

describe('services/projection-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectionMocks.instances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and reuses projection managers', async () => {
    const first = await worldProjectionService.getManager('session-1');
    const second = await worldProjectionService.getManager('session-1');

    expect(first).toBe(second);
    expect(projectionMocks.initMock).toHaveBeenCalledTimes(1);
    expect(projectionMocks.sessionReplayMock).toHaveBeenCalledTimes(1);
    expect(projectionMocks.locationReplayMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes and saves snapshots', async () => {
    await worldProjectionService.refreshAndSave('session-2');

    expect(projectionMocks.saveSnapshotsMock).toHaveBeenCalledTimes(1);
  });

  it('releases managers', async () => {
    const first = await worldProjectionService.getManager('session-3');
    worldProjectionService.release('session-3');
    const second = await worldProjectionService.getManager('session-3');

    expect(first).not.toBe(second);
  });
});
