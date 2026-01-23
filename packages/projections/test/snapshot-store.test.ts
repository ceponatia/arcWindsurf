import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn().mockReturnThis();
const valuesMock = vi.fn().mockReturnThis();
const onConflictMock = vi.fn();

vi.mock('@minimal-rpg/db', () => ({
  db: {
    insert: () => ({
      values: valuesMock,
      onConflictDoUpdate: onConflictMock,
    }),
  },
  sessionProjections: { sessionId: 'sessionId' },
}));

import { saveProjectionState } from '../src/snapshot/store.js';

describe('snapshot store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws for unknown projection name', async () => {
    await expect(saveProjectionState({ sessionId: 's1', name: 'unknown', state: {}, lastEventSeq: 1n }))
      .rejects.toThrow('Unknown projection name');
  });

  it('saves projection state for known name', async () => {
    await saveProjectionState({ sessionId: 's1', name: 'location', state: { loc: 1 }, lastEventSeq: 1n });

    expect(valuesMock).toHaveBeenCalled();
    expect(onConflictMock).toHaveBeenCalled();
  });
});
