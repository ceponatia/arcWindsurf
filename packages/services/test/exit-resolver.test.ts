import { describe, it, expect } from 'vitest';
import { ExitResolver } from '../src/location/exit-resolver.js';
import type { LocationMap } from '@minimal-rpg/schemas';

const map = {
  nodes: [
    { id: 'a', name: 'A', ports: [{ id: 'p1', name: 'Door', direction: 'north' }] },
    { id: 'b', name: 'B', ports: [{ id: 'p2', name: 'Door', direction: 'south' }] },
  ],
  connections: [
    {
      id: 'c1',
      fromLocationId: 'a',
      toLocationId: 'b',
      fromPortId: 'p1',
      toPortId: 'p2',
      bidirectional: true,
    },
  ],
} as unknown as LocationMap;

describe('ExitResolver', () => {
  it('delegates to LocationService resolveDirection', () => {
    const result = ExitResolver.resolveExit(map, 'a', 'north');
    expect(result.found).toBe(true);
    expect(result.exit?.destinationId).toBe('b');
  });
});
