# TASK-003: Wire TurnOrchestrator to /game/turn Endpoint

**Priority**: P0
**Estimate**: 3 hours
**Depends On**: TASK-001 (TurnOrchestrator), TASK-002 (IntentParser)
**Category**: Living World Game Loop

---

## Objective

Create an API endpoint that exposes the `TurnOrchestrator` functionality, allowing clients to submit player turns and receive composed responses.

## Files to Create

- `packages/api/src/routes/game.ts`

## Files to Modify

- `packages/api/src/server.ts` (register new routes)

## API Design

### POST /game/turn

Process a player turn in an active game session.

**Request Body:**

```typescript
interface TurnRequest {
  sessionId: string;
  playerId: string;
  message: string;
}
```

**Response Body:**

```typescript
interface TurnResponse {
  success: boolean;
  turn: {
    composedResponse: string;
    events: WorldEvent[];
    newLocationId: string | null;
    gameTime: { hour: number; minute: number };
    focusedNpc: { id: string; name: string } | null;
  };
  error?: string;
}
```

### GET /game/session/:sessionId

Get current game session state.

**Response Body:**

```typescript
interface SessionStateResponse {
  sessionId: string;
  playerId: string;
  locationId: string;
  focusedNpcId: string | null;
  gameTime: { hour: number; minute: number };
  npcsPresent: { id: string; name: string; tier: string }[];
  availableExits: { id: string; name: string; direction: string }[];
}
```

### POST /game/start

Start a new game session.

**Request Body:**

```typescript
interface StartGameRequest {
  sessionId: string;
  playerId: string;
  startingLocationId: string;
  config?: Partial<TurnConfig>;
}
```

**Response Body:**

```typescript
interface StartGameResponse {
  success: boolean;
  initialState: SessionStateResponse;
  initialNarration: string;
}
```

## Implementation Steps

### 1. Create Game Router

```typescript
import { Hono } from 'hono';
import { TurnOrchestrator } from '../services/turn-orchestrator.js';
import { IntentParser } from '../services/intent-parser.js';
import { getLLMProvider } from '@minimal-rpg/llm';
import { getSessionProjection, getLocationWithExits, getNpcsAtLocation } from '@minimal-rpg/db';

const router = new Hono();

// Create shared instances
const llmProvider = getLLMProvider();
const intentParser = new IntentParser(llmProvider);
const turnOrchestrator = new TurnOrchestrator({}, llmProvider);
```

### 2. Implement POST /game/turn

```typescript
router.post('/turn', async (c) => {
  const body = await c.req.json();
  const { sessionId, playerId, message } = body;

  // Validate request
  if (!sessionId || !playerId || !message) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  try {
    // Get session state
    const session = await getSessionProjection(sessionId);
    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    // Build parsing context
    const location = await getLocationWithExits(session.locationId);
    const npcs = await getNpcsAtLocation(sessionId, session.locationId);

    const context = {
      locationId: session.locationId,
      availableExits: location?.exits ?? [],
      npcsPresent: npcs.map((n) => ({ id: n.id, name: n.name })),
      inventory: [], // TODO: Get from projection
      visibleItems: [], // TODO: Get from location
      focusedNpcId: session.focusedNpcId ?? null,
    };

    // Parse intent
    const parsed = await intentParser.parse(message, context);

    // Process turn
    const result = await turnOrchestrator.processTurn({
      sessionId,
      playerId,
      playerMessage: message,
      focusedNpcId: session.focusedNpcId ?? null,
      locationId: session.locationId,
    });

    return c.json({
      success: true,
      turn: {
        composedResponse: result.composedResponse,
        events: result.events,
        newLocationId: result.newLocationId,
        gameTime: result.gameTime,
        focusedNpc: session.focusedNpcId
          ? {
              id: session.focusedNpcId,
              name: npcs.find((n) => n.id === session.focusedNpcId)?.name ?? 'Unknown',
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error processing turn:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
```

### 3. Implement GET /game/session/:sessionId

```typescript
router.get('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    const session = await getSessionProjection(sessionId);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const location = await getLocationWithExits(session.locationId);
    const npcs = await getNpcsAtLocation(sessionId, session.locationId);

    return c.json({
      sessionId,
      playerId: session.playerId,
      locationId: session.locationId,
      focusedNpcId: session.focusedNpcId ?? null,
      gameTime: session.gameTime ?? { hour: 12, minute: 0 },
      npcsPresent: npcs.map((n) => ({ id: n.id, name: n.name, tier: n.tier })),
      availableExits: location?.exits ?? [],
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});
```

### 4. Implement POST /game/start

```typescript
import { generateEncounterNarration } from '@minimal-rpg/services';

router.post('/start', async (c) => {
  const body = await c.req.json();
  const { sessionId, playerId, startingLocationId, config } = body;

  if (!sessionId || !playerId || !startingLocationId) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  try {
    // Initialize session (may already exist from studio)
    // TODO: Create or update session with game state

    // Get location info
    const location = await getLocationWithExits(startingLocationId);
    const npcs = await getNpcsAtLocation(sessionId, startingLocationId);

    // Generate initial scene narration
    const narration = generateEncounterNarration({
      locationName: location?.name ?? 'Unknown Location',
      locationDescription: location?.description,
      npcsPresent: npcs.map((n) => ({
        npcId: n.id,
        name: n.name,
        appearance: n.appearance,
        activity: n.activity ?? {
          type: 'idle',
          description: 'standing around',
          engagement: 'idle',
        },
        tier: n.tier as 'major' | 'minor' | 'background' | 'transient',
      })),
      crowdLevel: 'moderate',
      playerEntering: true,
    });

    // Emit SESSION_START event
    await worldBus.emit({
      type: 'SESSION_START',
      sessionId,
      timestamp: new Date(),
    });

    return c.json({
      success: true,
      initialState: {
        sessionId,
        playerId,
        locationId: startingLocationId,
        focusedNpcId: null,
        gameTime: { hour: 12, minute: 0 },
        npcsPresent: npcs.map((n) => ({ id: n.id, name: n.name, tier: n.tier })),
        availableExits: location?.exits ?? [],
      },
      initialNarration: narration.fullNarration,
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default router;
```

### 5. Register Routes

In `packages/api/src/server.ts`:

```typescript
import gameRoutes from './routes/game.js';

// Add with other routes
app.route('/game', gameRoutes);
```

## Acceptance Criteria

- [ ] `/game/turn` endpoint accepts player messages and returns composed responses
- [ ] `/game/session/:sessionId` returns current session state
- [ ] `/game/start` initializes a new game session with initial narration
- [ ] All endpoints handle errors gracefully with proper status codes
- [ ] WorldBus events emitted during turn processing
- [ ] Proper validation of request bodies
- [ ] Integration with IntentParser and TurnOrchestrator
- [ ] Route registered in main server

## Testing

```typescript
describe('Game Routes', () => {
  describe('POST /game/turn', () => {
    it('should process a turn and return composed response', async () => {
      const res = await app.request('/game/turn', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session',
          playerId: 'player-1',
          message: 'Hello there!',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.turn.composedResponse).toBeDefined();
    });

    it('should return 404 for unknown session', async () => {
      const res = await app.request('/game/turn', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'nonexistent',
          playerId: 'player-1',
          message: 'Hello!',
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /game/start', () => {
    it('should initialize session with initial narration', async () => {
      const res = await app.request('/game/start', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'new-session',
          playerId: 'player-1',
          startingLocationId: 'tavern',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.initialNarration).toContain('tavern');
    });
  });
});
```

## Notes

- Consider rate limiting turn processing
- May want to add WebSocket alternative for lower latency
- Session state should include game configuration (turn duration, etc.)
