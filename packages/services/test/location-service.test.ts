import { describe, it, expect } from 'vitest';
import { LocationService } from '../src/location/location-service.js';
import type { LocationMap } from '@minimal-rpg/schemas';

function buildMap(): LocationMap {
  return {
    nodes: [
      {
        id: 'loc-1',
        name: 'Hall',
        summary: 'A long hall',
        ports: [{ id: 'p1', name: 'North Door', direction: 'north' }],
        properties: { capacity: 4 },
      },
      {
        id: 'loc-2',
        name: 'Kitchen',
        ports: [{ id: 'p2', name: 'South Door', direction: 'south' }],
      },
    ],
    connections: [
      {
        id: 'c1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        fromPortId: 'p1',
        toPortId: 'p2',
        bidirectional: true,
        travelMinutes: 3,
      },
    ],
  } as unknown as LocationMap;
}

describe('LocationService', () => {
  it('builds node index and adjacency list', () => {
    const map = buildMap();
    const index = LocationService.buildNodeIndex(map);
    const adjacency = LocationService.buildAdjacencyList(map);

    expect(index.get('loc-1')?.name).toBe('Hall');
    expect(adjacency.get('loc-1')?.length).toBe(1);
    expect(adjacency.get('loc-2')?.length).toBe(1);
  });

  it('resolves exits and directions', () => {
    const map = buildMap();
    const exits = LocationService.getExitsForLocation(map, 'loc-1');
    expect(exits[0]?.destinationName).toBe('Kitchen');

    const resolved = LocationService.resolveDirection(map, 'loc-1', 'north');
    expect(resolved.found).toBe(true);
    expect(resolved.exit?.destinationId).toBe('loc-2');

    const byName = LocationService.resolveDirection(map, 'loc-1', 'door');
    expect(byName.found).toBe(true);

    const missing = LocationService.resolveDirection(map, 'loc-1', 'west');
    expect(missing.found).toBe(false);
    expect(missing.error).toContain('No exit');
  });

  it('resolves destinations and checks reachability', () => {
    const map = buildMap();

    const byId = LocationService.resolveDestination(map, 'loc-1', 'loc-2');
    expect(byId.found).toBe(true);

    const byName = LocationService.resolveDestination(map, 'loc-1', 'kitchen');
    expect(byName.found).toBe(true);

    const reach = LocationService.canReachDirectly(map, 'loc-1', 'loc-2');
    expect(reach.reachable).toBe(true);

    const missing = LocationService.canReachDirectly(map, 'loc-2', 'loc-3');
    expect(missing.reachable).toBe(false);
  });

  it('finds paths and formats exits', () => {
    const map = buildMap();
    const path = LocationService.findPath(map, 'loc-1', 'loc-2');
    expect(path.reachable).toBe(true);
    expect(path.path).toEqual(['loc-1', 'loc-2']);

    const exits = LocationService.getExitsForLocation(map, 'loc-1');
    const prompt = LocationService.formatExitsForPrompt(exits);
    expect(prompt).toContain('Kitchen');

    const directions = LocationService.formatExitDirections(exits);
    expect(directions).toContain('north');
  });

  it('builds location info and search helpers', () => {
    const map = buildMap();
    const infoMap = LocationService.buildLocationInfoMap(map);
    const info = infoMap.get('loc-1');

    expect(info?.description).toBe('A long hall');
    expect(info?.capacity).toBe(4);

    expect(LocationService.getLocation(map, 'loc-2')?.name).toBe('Kitchen');
    expect(LocationService.getLocationByName(map, 'kitchen')?.id).toBe('loc-2');

    const results = LocationService.searchLocations(map, 'hall');
    expect(results).toHaveLength(1);

    expect(LocationService.getDefaultStartLocation(map)?.id).toBe('loc-1');
  });
});
