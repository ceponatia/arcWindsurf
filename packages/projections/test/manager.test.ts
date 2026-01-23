import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectionManager } from '../src/manager.js';

const loadSnapshotMock = vi.fn();
const replayMock = vi.fn();
const getStateMock = vi.fn();
const getLastSequenceMock = vi.fn();

vi.mock('../src/projector.js', () => ({
  Projector: vi.fn().mockImplementation(() => ({
    loadSnapshot: loadSnapshotMock,
    replay: replayMock,
    getState: getStateMock,
    getLastSequence: getLastSequenceMock,
    projection: { name: 'session' },
  })),
}));

const saveProjectionStateMock = vi.fn();
vi.mock('../src/snapshot/store.js', () => ({
  saveProjectionState: saveProjectionStateMock,
}));

describe('ProjectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSnapshotMock.mockResolvedValue(undefined);
    replayMock.mockResolvedValue(undefined);
    getStateMock.mockReturnValue({});
    getLastSequenceMock.mockReturnValue(0n);
  });

  it('initializes all projectors', async () => {
    const manager = new ProjectionManager('session-1');

    await manager.init();

    expect(loadSnapshotMock).toHaveBeenCalled();
    expect(replayMock).toHaveBeenCalled();
  });

  it('saves snapshots for all projections', async () => {
    const manager = new ProjectionManager('session-1');

    await manager.saveSnapshots();

    expect(saveProjectionStateMock).toHaveBeenCalled();
  });

  it('returns combined state', () => {
    const manager = new ProjectionManager('session-1');

    const state = manager.getState();

    expect(state).toEqual({
      session: {},
      location: {},
      npcs: {},
      inventory: {},
      time: {},
    });
  });
});
