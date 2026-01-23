import { describe, it, expect } from 'vitest';
import { PathfindingService } from '../src/physics/pathfinding.js';
import type { LocationMap } from '@minimal-rpg/schemas';

const map = {
  nodes: [
    { id: 'a', name: 'A', ports: [{ id: 'p1', name: 'Door' }] },
    { id: 'b', name: 'B', ports: [{ id: 'p2', name: 'Door' }] },
    { id: 'c', name: 'C', ports: [{ id: 'p3', name: 'Door' }] },
  ],
  connections: [
    { id: 'c1', fromLocationId: 'a', toLocationId: 'b', fromPortId: 'p1', toPortId: 'p2', bidirectional: true, travelMinutes: 2 },
    { id: 'c2', fromLocationId: 'b', toLocationId: 'c', fromPortId: 'p2', toPortId: 'p3', bidirectional: true, travelMinutes: 5, locked: true },
  ],
} as unknown as LocationMap;

describe('PathfindingService', () => {
  it('gets reachable locations within time', () => {
    const reachable = PathfindingService.getReachableLocations(map, 'a', 3);
    const ids = reachable.map((r) => r.id);

    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');
  });
});
