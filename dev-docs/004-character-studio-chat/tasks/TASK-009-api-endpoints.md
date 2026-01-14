# TASK-009: API Endpoints for Studio Conversation

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 60 minutes
**Depends On**: TASK-001, TASK-006

---

## Objective

Extend the existing `/studio` API routes to use the new StudioNpcActor system with session persistence.

## File to Modify

`packages/api/src/routes/studio.ts`

## New Endpoints

### POST /studio/conversation

Main conversation endpoint that creates or continues a studio session.

### POST /studio/suggest-prompt

Get suggested prompts based on profile gaps.

### DELETE /studio/session/:id

Delete a studio session.

## Implementation

Add the following to `packages/api/src/routes/studio.ts`:

```typescript
import {
  createStudioNpcActor,
  StudioNpcActor,
  DiscoveryGuide,
  type StudioResponse,
} from '@minimal-rpg/actors';
import {
  createStudioSession,
  getStudioSession,
  updateStudioSession,
  deleteStudioSession,
  cleanupExpiredSessions,
  type StudioSession,
} from '@minimal-rpg/db';

// In-memory actor cache (actors are expensive to create)
const actorCache = new Map<string, StudioNpcActor>();

// Cleanup expired sessions on startup
cleanupExpiredSessions();

// Request schemas
const ConversationRequestSchema = z.object({
  sessionId: z.string().optional(),
  profile: z.record(z.string(), z.unknown()),
  message: z.string(),
});

const SuggestPromptRequestSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  exploredTopics: z.array(z.string()).optional(),
});

// POST /studio/conversation - Main conversation endpoint
app.post('/studio/conversation', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ConversationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ ok: false, error: 'Invalid request' }, 400);
    }

    if (!llmProvider) {
      return c.json({ ok: false, error: 'LLM not configured', code: 'CONFIG_ERROR' }, 503);
    }

    const { message, profile } = parsed.data;
    let { sessionId } = parsed.data;

    // Get or create session
    let session: StudioSession | null = null;
    let actor: StudioNpcActor | undefined;

    if (sessionId) {
      session = getStudioSession(sessionId);
      actor = actorCache.get(sessionId);
    }

    if (!session) {
      // Create new session
      sessionId = crypto.randomUUID();
      session = createStudioSession(sessionId, profile);
    }

    if (!actor) {
      // Create actor for this session
      actor = createStudioNpcActor({
        sessionId,
        profile: profile as Partial<CharacterProfile>,
        llmProvider,
      });
      actorCache.set(sessionId, actor);

      // Restore state if session had previous conversation
      if (session.conversation.length > 0) {
        actor.restoreState({
          conversation: session.conversation.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
          summary: session.summary,
          inferredTraits: session.inferredTraits,
          exploredTopics: session.exploredTopics as any[],
        });
      }
    }

    // Update profile in actor
    actor.updateProfile(profile as Partial<CharacterProfile>);

    // Send message and get response
    const response = await actor.respond(message);

    // Persist updated state
    const state = actor.exportState();
    updateStudioSession(sessionId, {
      profileSnapshot: profile,
      conversation: state.conversation.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
      summary: state.summary,
      inferredTraits: state.inferredTraits,
      exploredTopics: state.exploredTopics,
    });

    return c.json({
      ok: true,
      sessionId,
      response: response.response,
      thought: response.thought,
      inferredTraits: response.inferredTraits,
      suggestedPrompts: response.suggestedPrompts,
      meta: response.meta,
    });
  } catch (error) {
    console.error('Studio conversation error:', error);
    return c.json({ ok: false, error: 'Conversation failed' }, 500);
  }
});

// POST /studio/suggest-prompt - Get suggested prompts
app.post('/studio/suggest-prompt', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SuggestPromptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ ok: false, error: 'Invalid request' }, 400);
    }

    const { profile, exploredTopics } = parsed.data;

    const guide = new DiscoveryGuide({
      profile: profile as Partial<CharacterProfile>,
    });

    // Mark already explored topics
    if (exploredTopics) {
      for (const topic of exploredTopics) {
        guide.markExplored(topic as any);
      }
    }

    // Get suggested topic and prompts
    const topic = guide.suggestTopic();
    const prompts = guide.generatePrompts(topic, 3);

    return c.json({
      ok: true,
      topic,
      prompts,
      unexploredTopics: guide.getUnexploredTopics(),
    });
  } catch (error) {
    console.error('Suggest prompt error:', error);
    return c.json({ ok: false, error: 'Failed to generate prompts' }, 500);
  }
});

// DELETE /studio/session/:id - Delete a session
app.delete('/studio/session/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');

    // Remove from cache
    const actor = actorCache.get(sessionId);
    if (actor) {
      actor.stop();
      actorCache.delete(sessionId);
    }

    // Remove from database
    const deleted = deleteStudioSession(sessionId);

    if (!deleted) {
      return c.json({ ok: false, error: 'Session not found' }, 404);
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return c.json({ ok: false, error: 'Failed to delete session' }, 500);
  }
});

// GET /studio/session/:id - Get session state
app.get('/studio/session/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const session = getStudioSession(sessionId);

    if (!session) {
      return c.json({ ok: false, error: 'Session not found' }, 404);
    }

    return c.json({
      ok: true,
      session: {
        id: session.id,
        conversation: session.conversation,
        summary: session.summary,
        inferredTraits: session.inferredTraits,
        exploredTopics: session.exploredTopics,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return c.json({ ok: false, error: 'Failed to get session' }, 500);
  }
});
```

## Response Types

```typescript
// POST /studio/conversation response
interface ConversationResponse {
  ok: true;
  sessionId: string;
  response: string;
  thought?: string;
  inferredTraits: InferredTrait[];
  suggestedPrompts: SuggestedPrompt[];
  meta: {
    messageCount: number;
    summarized: boolean;
    exploredTopics: string[];
  };
}

// POST /studio/suggest-prompt response
interface SuggestPromptResponse {
  ok: true;
  topic: string;
  prompts: SuggestedPrompt[];
  unexploredTopics: string[];
}
```

## Acceptance Criteria

- [ ] `POST /studio/conversation` creates session if needed
- [ ] `POST /studio/conversation` reuses existing session by ID
- [ ] `POST /studio/conversation` returns response with traits and prompts
- [ ] Session state persisted to database after each message
- [ ] Actor cache prevents recreating actors unnecessarily
- [ ] `POST /studio/suggest-prompt` returns prompts based on gaps
- [ ] `DELETE /studio/session/:id` removes session and stops actor
- [ ] `GET /studio/session/:id` returns session state
- [ ] Expired session cleanup on startup
- [ ] Proper error handling and status codes
