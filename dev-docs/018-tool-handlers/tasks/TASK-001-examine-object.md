# TASK-001: Implement examine_object Handler

**Priority**: P2
**Estimate**: 2-3 hours
**Depends On**: None
**Category**: Tool Handlers

---

## Objective

Implement the `examine_object` tool handler that returns detailed descriptions of objects in the game world.

## Tool Definition

```typescript
// From packages/llm/src/tools/tool-definitions.ts
export const EXAMINE_OBJECT_TOOL = {
  type: 'function',
  function: {
    name: 'examine_object',
    description: 'Look closely at an object in the environment',
    parameters: {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'ID of object to examine' },
        detail_level: {
          type: 'string',
          enum: ['quick', 'thorough', 'forensic'],
          default: 'quick',
        },
      },
      required: ['object_id'],
    },
  },
};
```

## Target Implementation

```typescript
// packages/api/src/game/tools/handlers.ts

import { worldBus } from '@minimal-rpg/bus';
import {
  getLocationObject,
  getObjectDescription,
  getObjectSecrets,
  getActorPerception,
} from '@minimal-rpg/db';

interface ExamineObjectArgs {
  object_id: string;
  detail_level?: 'quick' | 'thorough' | 'forensic';
}

/**
 * Handle examine_object tool call.
 *
 * Returns description of an object based on detail level and actor perception.
 */
async function handleExamineObject(
  args: ExamineObjectArgs,
  context: SessionContext
): Promise<ToolResult> {
  const { object_id, detail_level = 'quick' } = args;
  const { sessionId, actorId, locationId } = context;

  // Validate object exists at current location
  const object = await getLocationObject(sessionId, locationId, object_id);

  if (!object) {
    return {
      success: false,
      error: `You don't see anything called "${object_id}" here.`,
    };
  }

  // Get base description
  const description = await getObjectDescription(object_id);
  const result: ExamineResult = {
    name: object.name,
    description: description.base,
    interactable: object.interactable ?? false,
  };

  // Get actor's perception skill
  const perception = await getActorPerception(sessionId, actorId);

  // Detail level determines what's revealed
  if (detail_level === 'thorough' || detail_level === 'forensic') {
    result.details = description.details;

    // Check for hidden features based on perception
    if (perception >= (description.perceptionRequired ?? 10)) {
      result.hiddenFeatures = description.hiddenFeatures;
    }
  }

  if (detail_level === 'forensic') {
    // Forensic examination takes time
    result.forensicDetails = description.forensicDetails;

    // High perception reveals secrets
    const secrets = await getObjectSecrets(object_id, perception);
    if (secrets.length > 0) {
      result.secrets = secrets;
    }
  }

  // Emit event for game state tracking
  await worldBus.emit({
    type: 'OBJECT_EXAMINED',
    sessionId,
    actorId,
    objectId: object_id,
    detailLevel: detail_level,
    timestamp: new Date(),
  });

  return {
    success: true,
    data: result,
  };
}

interface ExamineResult {
  name: string;
  description: string;
  interactable: boolean;
  details?: string;
  hiddenFeatures?: string[];
  forensicDetails?: string;
  secrets?: string[];
}
```

## Database Queries

Need these functions in `@minimal-rpg/db`:

```typescript
/**
 * Get an object at a specific location.
 */
export async function getLocationObject(
  sessionId: string,
  locationId: string,
  objectId: string
): Promise<LocationObject | null>;

/**
 * Get full description data for an object.
 */
export async function getObjectDescription(
  objectId: string
): Promise<ObjectDescription>;

/**
 * Get secrets visible at given perception level.
 */
export async function getObjectSecrets(
  objectId: string,
  perceptionLevel: number
): Promise<string[]>;

/**
 * Get an actor's perception skill value.
 */
export async function getActorPerception(
  sessionId: string,
  actorId: string
): Promise<number>;
```

## Testing

```typescript
describe('handleExamineObject', () => {
  const context = createTestContext({
    sessionId: 'test-session',
    actorId: 'player',
    locationId: 'tavern',
  });

  it('should return basic description for quick examine', async () => {
    mockGetLocationObject({ id: 'chest', name: 'Wooden Chest' });
    mockGetObjectDescription({
      base: 'A sturdy wooden chest.',
      details: 'Iron bands reinforce the corners.',
    });

    const result = await handleExamineObject(
      { object_id: 'chest', detail_level: 'quick' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.description).toBe('A sturdy wooden chest.');
    expect(result.data.details).toBeUndefined();
  });

  it('should reveal details for thorough examine', async () => {
    mockGetLocationObject({ id: 'chest', name: 'Wooden Chest' });
    mockGetObjectDescription({
      base: 'A sturdy wooden chest.',
      details: 'Iron bands reinforce the corners.',
      perceptionRequired: 12,
      hiddenFeatures: ['A small keyhole is hidden under a decorative plate.'],
    });
    mockGetActorPerception(15);

    const result = await handleExamineObject(
      { object_id: 'chest', detail_level: 'thorough' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.details).toContain('Iron bands');
    expect(result.data.hiddenFeatures).toHaveLength(1);
  });

  it('should fail for non-existent object', async () => {
    mockGetLocationObject(null);

    const result = await handleExamineObject(
      { object_id: 'nonexistent' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("don't see");
  });
});
```

## Acceptance Criteria

- [x] Target resolution across locations, actors, and items
- [x] Returns description for matched targets
- [x] Returns error for non-existent targets
- [x] Emits OBJECT_EXAMINED event via WorldBus
- [x] Optional focus parameter supported
- [ ] Unit tests pass (tests not yet implemented)

## Notes

- Perception checks add gameplay depth
- Consider time cost for thorough/forensic examinations
- Object descriptions should be in DB, not hardcoded
