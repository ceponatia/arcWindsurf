# Unconstrained Refactoring Vision for ArcAgentic

**Author**: Opus 4.5 (Thinking)
**Date**: January 2026
**Status**: Vision Document

---

## Executive Summary

This document presents an unconstrained refactoring vision for the ArcAgentic RPG platform (forked from Minimal RPG). The codebase is a sophisticated TypeScript monorepo powering an LLM-driven roleplaying experience with rich NPC systems, location graphs, and state management. While the architecture is solid, there are significant opportunities to modernize, simplify, and extend the platform.

---

## Current Architecture Assessment

### Strengths

- **Clean monorepo structure** with well-defined package boundaries
- **Rich domain modeling** via Zod schemas (characters, locations, inventory, time, affinity)
- **Governor pattern** for turn orchestration with tool-based LLM integration
- **State manager** with JSON Patch operations and slice-based architecture
- **Comprehensive NPC systems**: tiers, schedules, hygiene, proximity, affinity

### Areas for Improvement

- **LLM coupling**: Tight binding to OpenRouter; no abstraction for model switching
- **Synchronous turn processing**: No streaming or progressive response rendering
- **Monolithic frontend**: Feature folders are large and could benefit from lazy loading
- **Limited real-time capabilities**: No WebSocket/SSE for live session updates
- **No event sourcing**: State changes are patched directly, no audit trail
- **Testing gaps**: Business logic mixed with I/O, harder to unit test
- **No multi-user support**: Sessions are single-player, no collaborative play

---

## Vision: ArcAgentic 2.0

### 1. LLM Abstraction Layer

**Problem**: Direct OpenRouter coupling limits model experimentation and fallback strategies.

**Solution**: Introduce a `@arcagentic/llm` package with provider abstraction.

```typescript
// packages/llm/src/types.ts
interface LLMProvider {
  chat(request: ChatRequest): AsyncGenerator<ChatChunk>;
  complete(request: CompletionRequest): Promise<string>;
  embeddings(texts: string[]): Promise<number[][]>;
  supportedFeatures(): ProviderCapabilities;
}

interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  contextWindow: number;
  jsonMode: boolean;
}

// Implementations
class OpenRouterProvider implements LLMProvider { ... }
class OllamaProvider implements LLMProvider { ... }
class AnthropicProvider implements LLMProvider { ... }
class OpenAIProvider implements LLMProvider { ... }
```

**Benefits**:
- Hot-swap models mid-session for cost optimization
- Fallback chains for reliability
- Local model support (Ollama) for offline play
- A/B testing different models for NPC personality

---

### 2. Event-Sourced Game State

**Problem**: Direct state mutation via JSON Patch loses history and prevents replay/debugging.

**Solution**: Event sourcing with CQRS (Command Query Responsibility Segregation).

```typescript
// packages/events/src/types.ts
interface GameEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: string;
  payload: unknown;
  metadata: EventMetadata;
}

type GameEventType =
  | { type: 'PLAYER_MOVED'; payload: { from: string; to: string } }
  | { type: 'NPC_SPOKE'; payload: { npcId: string; dialogue: string } }
  | { type: 'ITEM_ACQUIRED'; payload: { itemId: string; source: string } }
  | { type: 'TIME_ADVANCED'; payload: { delta: TimeSpan } }
  | { type: 'RELATIONSHIP_CHANGED'; payload: AffinityDelta }
  // ...
```

**Benefits**:
- **Time travel debugging**: Replay sessions to any point
- **Branching narratives**: Fork session state for "what if" scenarios
- **Analytics**: Rich telemetry on player behavior patterns
- **Undo/redo**: Player can rewind decisions
- **Multi-device sync**: Events sync across clients

---

### 3. Streaming Turn Responses

**Problem**: Blocking turn processing creates poor UX; players wait for full responses.

**Solution**: Server-Sent Events (SSE) with chunked response streaming.

```typescript
// API endpoint
app.get('/sessions/:id/turns/stream', async (c) => {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of governor.streamTurn(input)) {
        controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
});

// Governor streaming
async *streamTurn(input: TurnInput): AsyncGenerator<TurnChunk> {
  yield { type: 'thinking', agent: 'npc' };
  yield { type: 'tool_call', tool: 'get_sensory_detail', params: {...} };
  yield { type: 'tool_result', result: {...} };
  yield { type: 'text_delta', content: 'The tavern keeper' };
  yield { type: 'text_delta', content: ' looks up...' };
  yield { type: 'state_patch', patches: [...] };
  yield { type: 'complete', metadata: {...} };
}
```

**Benefits**:
- Immediate feedback on player actions
- Progressive rendering of NPC dialogue
- Visibility into agent reasoning (thinking indicators)
- Better perceived performance

---

### 4. Agent Orchestration Framework

**Problem**: Current agent system is implicit; tool definitions scattered across governor.

**Solution**: Explicit agent framework with capability declaration.

```typescript
// packages/agents-v2/src/types.ts
interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  tools: ToolDefinition[];

  // Lifecycle hooks
  onActivate?(context: AgentContext): Promise<void>;
  onDeactivate?(context: AgentContext): Promise<void>;

  // Core execution
  execute(input: AgentInput): AsyncGenerator<AgentOutput>;
}

interface AgentCapability {
  domain: 'navigation' | 'dialogue' | 'combat' | 'crafting' | 'social' | 'time';
  priority: number;
  triggers: TriggerCondition[];
}

// Agent composition
class CompositeAgent implements Agent {
  constructor(private agents: Agent[]) {}

  async *execute(input: AgentInput) {
    const relevantAgents = this.selectAgents(input);
    for (const agent of relevantAgents) {
      yield* agent.execute(input);
    }
  }
}
```

**New Agent Types**:
- **CombatAgent**: Turn-based or real-time combat resolution
- **CraftingAgent**: Item creation with recipes and skill checks
- **QuestAgent**: Objective tracking and narrative progression
- **WeatherAgent**: Dynamic environment conditions
- **EconomyAgent**: Price fluctuations, supply/demand
- **FactionAgent**: Reputation and political systems

---

### 5. Reactive State with Signals

**Problem**: Zustand stores are good but lack fine-grained reactivity for complex UIs.

**Solution**: Adopt signals (via @preact/signals or custom) for reactive state.

```typescript
// packages/web/src/state/signals.ts
import { signal, computed, effect } from '@preact/signals-react';

// Fine-grained reactive state
const session = signal<Session | null>(null);
const messages = signal<Message[]>([]);
const npcs = signal<NpcInstance[]>([]);

// Computed derivations
const activeNpc = computed(() =>
  npcs.value.find(n => n.role === 'primary')
);

const unreadCount = computed(() =>
  messages.value.filter(m => !m.read).length
);

// Effects for side-effects
effect(() => {
  if (session.value) {
    subscribeToSessionEvents(session.value.id);
  }
});
```

**Benefits**:
- Surgical re-renders (only affected components update)
- Simpler mental model than selector-based stores
- Better DevTools integration
- Easier testing

---

### 6. Component Architecture Overhaul

**Problem**: Large feature folders with mixed concerns; no design system.

**Solution**: Atomic design with a proper component library.

```text
packages/
├── ui/                          # Design system (rename from current)
│   ├── atoms/                   # Button, Input, Text, Icon
│   ├── molecules/               # FormField, Card, Badge, Avatar
│   ├── organisms/               # MessageList, NpcCard, LocationMap
│   ├── templates/               # SessionLayout, BuilderLayout
│   └── tokens/                  # Colors, spacing, typography
├── web/
│   └── src/
│       ├── pages/               # Route-level components
│       ├── features/            # Feature-specific logic only
│       └── widgets/             # Composed UI blocks
```

**Key Changes**:
- **Storybook** for component documentation
- **Radix UI** primitives for accessibility
- **CSS Modules** or **Vanilla Extract** for type-safe styling
- **React Query** (TanStack Query) for server state

---

### 7. Multi-Player Sessions

**Problem**: Single-player only; no shared narrative experiences.

**Solution**: WebSocket-based real-time collaboration.

```typescript
// packages/realtime/src/session-socket.ts
interface SessionEvent {
  type: 'player_joined' | 'player_left' | 'turn_taken' | 'state_sync';
  payload: unknown;
  senderId: string;
  timestamp: number;
}

class SessionSocket {
  private ws: WebSocket;
  private handlers = new Map<string, Set<Handler>>();

  join(sessionId: string, playerId: string): void;
  broadcast(event: SessionEvent): void;
  on(type: string, handler: Handler): () => void;

  // Conflict resolution
  reconcile(local: GameState, remote: GameState): GameState;
}
```

**Modes**:
- **GM Mode**: One player controls NPCs, others are PCs
- **Troupe Play**: Rotating GM, shared NPC control
- **Solo with Audience**: Streamer mode with viewer interactions
- **PvP**: Competitive faction scenarios

---

### 8. Modular Game Systems (Plugin Architecture)

**Problem**: Core systems are tightly coupled; hard to add new mechanics.

**Solution**: Plugin-based extension system.

```typescript
// packages/core/src/plugin.ts
interface GamePlugin {
  id: string;
  name: string;
  version: string;

  // Registration
  schemas?: ZodSchema[];         // Extend state schema
  tools?: ToolDefinition[];      // Add LLM tools
  agents?: Agent[];              // Register agents
  routes?: RouteConfig[];        // API endpoints
  ui?: UIExtension[];            // Frontend components

  // Hooks
  onSessionCreate?(ctx: SessionContext): Promise<void>;
  onTurnStart?(ctx: TurnContext): Promise<void>;
  onTurnEnd?(ctx: TurnContext): Promise<void>;
}

// Example plugin
const combatPlugin: GamePlugin = {
  id: 'combat',
  name: 'Tactical Combat System',
  version: '1.0.0',

  schemas: [CombatStateSchema, InitiativeSchema],
  tools: [ATTACK_TOOL, DEFEND_TOOL, CAST_SPELL_TOOL],
  agents: [new CombatAgent()],

  onTurnStart: async (ctx) => {
    if (ctx.state.combat?.active) {
      await ctx.agents.combat.processRound();
    }
  }
};
```

**Core Plugins**:
- `@arcagentic/plugin-combat` - Tactical combat
- `@arcagentic/plugin-crafting` - Item creation
- `@arcagentic/plugin-quests` - Objective tracking
- `@arcagentic/plugin-magic` - Spell systems
- `@arcagentic/plugin-economy` - Trading & currency

---

### 9. Knowledge Graph & Memory

**Problem**: Retrieval is basic; no persistent NPC memory or world knowledge.

**Solution**: Graph-based knowledge system with vector embeddings.

```typescript
// packages/knowledge/src/graph.ts
interface KnowledgeNode {
  id: string;
  type: 'fact' | 'event' | 'relationship' | 'location' | 'item';
  content: string;
  embedding: number[];
  metadata: {
    source: string;          // Which session/turn created this
    confidence: number;      // How certain is this knowledge
    decay: number;           // Memory fade factor
    owner?: string;          // Which NPC knows this
  };
  edges: KnowledgeEdge[];
}

interface KnowledgeEdge {
  target: string;
  relation: 'knows' | 'witnessed' | 'heard_rumor' | 'believes' | 'contradicts';
  strength: number;
}

class KnowledgeGraph {
  async query(question: string, context: QueryContext): Promise<KnowledgeNode[]>;
  async addFact(fact: Fact, source: FactSource): Promise<KnowledgeNode>;
  async propagate(event: GameEvent): Promise<void>; // Gossip spreads!
}
```

**Features**:
- NPCs remember past interactions
- Rumors spread through NPC networks
- Contradictory beliefs create conflict
- Player reputation persists across sessions

---

### 10. Developer Experience Improvements

#### Testing Infrastructure

```typescript
// packages/testing/src/fixtures.ts
export const testSession = createSessionFixture({
  character: sampleCharacter,
  setting: tavernSetting,
  messages: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Welcome, traveler.' }
  ]
});

// Snapshot testing for LLM outputs
test('NPC responds appropriately to greeting', async () => {
  const result = await governor.processTurn({
    input: 'Hello there!',
    session: testSession,
  });
  expect(result).toMatchNarrativeSnapshot();
});
```

#### Observability

```typescript
// packages/observability/src/tracing.ts
import { trace, context, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer('arcagentic');

async function processTurn(input: TurnInput) {
  return tracer.startActiveSpan('turn.process', async (span) => {
    span.setAttribute('session.id', input.sessionId);
    span.setAttribute('input.length', input.content.length);

    const result = await governor.execute(input);

    span.setAttribute('tools.called', result.toolsCalled.length);
    span.setAttribute('tokens.used', result.tokenUsage.total);
    span.end();

    return result;
  });
}
```

#### CLI Tooling

```bash
# New CLI commands
arcagentic session create --character "Marcus" --setting "Tavern"
arcagentic session replay <session-id> --to-turn 15
arcagentic character generate --theme "mysterious" --tier major
arcagentic migrate --from v1 --to v2 --dry-run
arcagentic plugin add @arcagentic/plugin-combat
```

---

### 11. Database Evolution

**Current**: PostgreSQL with pgvector, raw SQL queries.

**Proposed**: Drizzle ORM with typed schemas.

```typescript
// packages/db-v2/src/schema.ts
import { pgTable, text, jsonb, timestamp, vector } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull(),
  settingId: text('setting_id').notNull(),
  state: jsonb('state').$type<SessionState>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id),
  role: text('role').$type<'user' | 'assistant' | 'system'>(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata').$type<MessageMetadata>(),
});

// Type-safe queries
const recentMessages = await db
  .select()
  .from(messages)
  .where(eq(messages.sessionId, sessionId))
  .orderBy(desc(messages.createdAt))
  .limit(10);
```

---

### 12. Mobile & Desktop Clients

**Problem**: Web-only; no native experiences.

**Solution**: Shared core with platform-specific shells.

```text
packages/
├── core/                        # Business logic (pure TypeScript)
├── web/                         # React SPA (current)
├── mobile/                      # React Native app
│   ├── ios/
│   ├── android/
│   └── src/
├── desktop/                     # Electron or Tauri app
│   └── src/
└── shared-ui/                   # Cross-platform components
```

**Mobile Features**:
- Offline play with local LLM (Ollama)
- Push notifications for multiplayer
- Voice input for hands-free play
- Haptic feedback for combat

---

## Migration Strategy

### Phase 1: Foundation (Weeks 1-4)

1. Add LLM abstraction layer
2. Implement SSE streaming for turns
3. Set up OpenTelemetry tracing
4. Migrate to Drizzle ORM

### Phase 2: State & Events (Weeks 5-8)

1. Implement event sourcing
2. Add session replay capability
3. Build knowledge graph foundation
4. Enhance NPC memory system

### Phase 3: Real-time & Multi-user (Weeks 9-12)

1. Add WebSocket infrastructure
2. Implement multiplayer sessions
3. Build conflict resolution
4. Add GM mode

### Phase 4: Extensibility (Weeks 13-16)

1. Design plugin architecture
2. Extract core systems to plugins
3. Build plugin marketplace UI
4. Create plugin SDK & docs

### Phase 5: Platforms (Weeks 17-20)

1. React Native mobile app
2. Desktop app (Tauri)
3. Offline mode with local models
4. Cross-platform sync

---

## Technical Debt to Address

| Issue | Current State | Target State | Priority |
|-------|--------------|--------------|----------|
| No streaming | Blocking requests | SSE streaming | High |
| OpenRouter lock-in | Direct API calls | Provider abstraction | High |
| Manual SQL | Raw query strings | Drizzle ORM | Medium |
| No event history | Direct mutation | Event sourcing | Medium |
| Large bundles | Single chunk | Code splitting | Medium |
| No offline | Server required | Local LLM support | Low |
| Single player | Solo only | Multiplayer | Low |

---

## File Structure After Refactor

```text
arcAgentic/
├── packages/
│   ├── core/                    # Pure business logic
│   │   ├── src/
│   │   │   ├── domain/          # Entities, value objects
│   │   │   ├── events/          # Event types and handlers
│   │   │   ├── services/        # Domain services
│   │   │   └── ports/           # Interface definitions
│   │   └── test/
│   ├── llm/                     # LLM provider abstraction
│   │   ├── src/
│   │   │   ├── providers/       # OpenRouter, Ollama, etc.
│   │   │   ├── streaming/       # Chunk handling
│   │   │   └── tools/           # Tool calling utilities
│   │   └── test/
│   ├── agents/                  # Agent framework
│   │   ├── src/
│   │   │   ├── framework/       # Base classes, composition
│   │   │   ├── builtin/         # NPC, Map, Combat, etc.
│   │   │   └── registry/        # Agent discovery
│   │   └── test/
│   ├── state/                   # State management
│   │   ├── src/
│   │   │   ├── events/          # Event sourcing
│   │   │   ├── slices/          # State slice definitions
│   │   │   └── projections/     # Read models
│   │   └── test/
│   ├── knowledge/               # Knowledge graph
│   │   ├── src/
│   │   │   ├── graph/           # Graph operations
│   │   │   ├── memory/          # NPC memory
│   │   │   └── retrieval/       # Vector search
│   │   └── test/
│   ├── db/                      # Database layer
│   │   ├── src/
│   │   │   ├── schema/          # Drizzle schemas
│   │   │   ├── migrations/      # SQL migrations
│   │   │   └── repositories/    # Data access
│   │   └── test/
│   ├── api/                     # HTTP API
│   │   ├── src/
│   │   │   ├── routes/          # Hono routes
│   │   │   ├── middleware/      # Auth, logging, etc.
│   │   │   └── streaming/       # SSE endpoints
│   │   └── test/
│   ├── realtime/                # WebSocket layer
│   │   ├── src/
│   │   │   ├── server/          # WS server
│   │   │   ├── client/          # WS client
│   │   │   └── sync/            # State synchronization
│   │   └── test/
│   ├── ui/                      # Design system
│   │   ├── src/
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   └── tokens/
│   │   └── .storybook/
│   ├── web/                     # React SPA
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── widgets/
│   │   │   └── state/
│   │   └── test/
│   ├── plugins/                 # Plugin SDK
│   │   ├── core/                # Plugin framework
│   │   ├── combat/              # Combat plugin
│   │   ├── crafting/            # Crafting plugin
│   │   └── quests/              # Quest plugin
│   ├── cli/                     # Developer CLI
│   │   └── src/
│   └── testing/                 # Test utilities
│       └── src/
├── apps/
│   ├── mobile/                  # React Native
│   └── desktop/                 # Tauri/Electron
└── docs/
    ├── api/                     # API documentation
    ├── plugins/                 # Plugin authoring guide
    └── architecture/            # Architecture decision records
```

---

## Conclusion

This refactoring vision transforms ArcAgentic from a solid single-player LLM RPG into a **platform** for collaborative AI-driven storytelling. The key themes are:

1. **Abstraction**: Decouple from specific providers (LLM, database)
2. **Streaming**: Real-time feedback for better UX
3. **Events**: Auditable, replayable, branchable game state
4. **Extensibility**: Plugin architecture for community contributions
5. **Collaboration**: Multiplayer and GM modes
6. **Cross-platform**: Web, mobile, and desktop clients

The phased migration approach allows incremental delivery of value while maintaining a working system throughout the transition.

---

*This document represents an unconstrained vision. Actual implementation should be prioritized based on user feedback, resource constraints, and business goals.*
