# TASK-002: Implement navigate_player Handler

**Priority**: P2
**Estimate**: 2-3 hours
**Depends On**: None
**Category**: Tool Handlers

---

## Objective

Implement the `navigate_player` tool handler that moves the player between connected locations.

## Tool Definition

```typescript
// From packages/llm/src/tools/tool-definitions.ts
export const NAVIGATE_PLAYER_TOOL = {
  type: 'function',
  function: {
    name: 'navigate_player',
    description: 'Move the player to a connected location',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'ID or name of the destination location',
        },
        path: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Specific path to take through locations',
        },
      },
      required: ['destination'],
    },
  },
};
```

## Target Implementation

```typescript
// packages/api/src/game/tools/handlers.ts

import { worldBus } from '@minimal-rpg/bus';
import {
  getLocationConnections,
  getLocationById,
  updateActorLocation,
  resolveLocationByName,
} from '@minimal-rpg/db';

interface NavigatePlayerArgs {
  destination: string;
  path?: string[];
}

/**
 * Handle navigate_player tool call.
 *
 * Moves the player to a connected location, validating the path is
 * valid and the destination is reachable.
 */
async function handleNavigatePlayer(
  args: NavigatePlayerArgs,
  context: SessionContext
): Promise<ToolResult> {
  const { destination, path } = args;
  const { sessionId, actorId, locationId: currentLocationId } = context;

  // Resolve destination (could be ID or name)
  let destinationId = destination;
  const directLocation = await getLocationById(sessionId, destination);

  if (!directLocation) {
    // Try resolving by name
    const resolved = await resolveLocationByName(sessionId, destination);
    if (!resolved) {
      return {
        success: false,
        error: `Unknown location: "${destination}"`,
      };
    }
    destinationId = resolved.id;
  }

  // If specific path provided, validate each step
  if (path && path.length > 0) {
    const pathValidation = await validatePath(sessionId, currentLocationId, path);
    if (!pathValidation.valid) {
      return {
        success: false,
        error: pathValidation.error,
      };
    }

    // Execute path step by step
    return executeMultiStepNavigation(sessionId, actorId, path, context);
  }

  // Check if destination is directly reachable
  const connections = await getLocationConnections(sessionId, currentLocationId);
  const connection = connections.find(
    c => c.targetLocationId === destinationId || c.targetName === destination
  );

  if (!connection) {
    // Destination not directly connected - suggest available exits
    const availableExits = connections.map(c => c.targetName || c.targetLocationId);
    return {
      success: false,
      error: `You can't get to "${destination}" from here directly.`,
      suggestion: `Available exits: ${availableExits.join(', ')}`,
    };
  }

  // Check if path is blocked
  if (connection.blocked) {
    return {
      success: false,
      error: connection.blockedReason || `The path to ${destination} is blocked.`,
    };
  }

  // Execute the move
  await updateActorLocation(sessionId, actorId, destinationId);

  // Get destination details for response
  const destinationLocation = await getLocationById(sessionId, destinationId);

  // Emit navigation event
  await worldBus.emit({
    type: 'PLAYER_MOVED',
    sessionId,
    actorId,
    fromLocationId: currentLocationId,
    toLocationId: destinationId,
    timestamp: new Date(),
  });

  return {
    success: true,
    data: {
      previousLocation: currentLocationId,
      newLocation: destinationId,
      locationName: destinationLocation?.name ?? destination,
      description: destinationLocation?.description ?? '',
    },
  };
}

/**
 * Validate a multi-step path.
 */
async function validatePath(
  sessionId: string,
  startLocationId: string,
  path: string[]
): Promise<{ valid: boolean; error?: string }> {
  let currentLocation = startLocationId;

  for (const step of path) {
    const connections = await getLocationConnections(sessionId, currentLocation);
    const connection = connections.find(
      c => c.targetLocationId === step || c.targetName === step
    );

    if (!connection) {
      return {
        valid: false,
        error: `Cannot reach "${step}" from intermediate location`,
      };
    }

    if (connection.blocked) {
      return {
        valid: false,
        error: `Path blocked at ${step}: ${connection.blockedReason}`,
      };
    }

    currentLocation = connection.targetLocationId;
  }

  return { valid: true };
}

/**
 * Execute navigation through multiple locations.
 */
async function executeMultiStepNavigation(
  sessionId: string,
  actorId: string,
  path: string[],
  context: SessionContext
): Promise<ToolResult> {
  let currentLocation = context.locationId;
  const traversedLocations: string[] = [];

  for (const step of path) {
    // Resolve step location ID
    const stepLocation = await resolveLocationByName(sessionId, step);
    const stepId = stepLocation?.id ?? step;

    // Update location
    await updateActorLocation(sessionId, actorId, stepId);
    traversedLocations.push(stepId);

    // Emit event for each step
    await worldBus.emit({
      type: 'PLAYER_MOVED',
      sessionId,
      actorId,
      fromLocationId: currentLocation,
      toLocationId: stepId,
      timestamp: new Date(),
    });

    currentLocation = stepId;
  }

  const finalLocation = await getLocationById(sessionId, currentLocation);

  return {
    success: true,
    data: {
      previousLocation: context.locationId,
      newLocation: currentLocation,
      locationName: finalLocation?.name ?? currentLocation,
      description: finalLocation?.description ?? '',
      path: traversedLocations,
    },
  };
}
```

## Testing

```typescript
describe('handleNavigatePlayer', () => {
  const context = createTestContext({
    sessionId: 'test-session',
    actorId: 'player',
    locationId: 'tavern',
  });

  it('should move player to connected location', async () => {
    mockGetLocationConnections([
      { targetLocationId: 'street', targetName: 'Main Street' },
      { targetLocationId: 'cellar', targetName: 'Cellar' },
    ]);
    mockGetLocationById('street', { id: 'street', name: 'Main Street' });

    const result = await handleNavigatePlayer(
      { destination: 'street' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.newLocation).toBe('street');
    expect(mockUpdateActorLocation).toHaveBeenCalledWith(
      'test-session',
      'player',
      'street'
    );
  });

  it('should fail for unconnected location', async () => {
    mockGetLocationConnections([
      { targetLocationId: 'street', targetName: 'Main Street' },
    ]);
    mockGetLocationById(null);
    mockResolveLocationByName(null);

    const result = await handleNavigatePlayer(
      { destination: 'castle' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("can't get to");
  });

  it('should fail for blocked path', async () => {
    mockGetLocationConnections([
      {
        targetLocationId: 'cellar',
        targetName: 'Cellar',
        blocked: true,
        blockedReason: 'The door is locked',
      },
    ]);

    const result = await handleNavigatePlayer(
      { destination: 'cellar' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('locked');
  });

  it('should handle multi-step paths', async () => {
    // Setup path: tavern -> street -> market
    mockGetLocationConnections([
      { targetLocationId: 'street', targetName: 'Main Street' },
    ]);
    // After first move
    mockGetLocationConnectionsAtLocation('street', [
      { targetLocationId: 'market', targetName: 'Market Square' },
    ]);

    const result = await handleNavigatePlayer(
      { destination: 'market', path: ['street', 'market'] },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.path).toEqual(['street', 'market']);
  });
});
```

## Acceptance Criteria

- [ ] Player can move to directly connected locations
- [ ] Location names and IDs both work as destination
- [ ] Blocked paths return appropriate error
- [ ] Unknown locations return helpful error
- [ ] Multi-step paths are validated and executed
- [ ] PLAYER_MOVED events emitted for each step
- [ ] Unit tests pass

## Notes

- Consider travel time for distant locations
- Path-finding could be added for distant destinations
- Events should trigger NPC reactions (via WorldBus)
