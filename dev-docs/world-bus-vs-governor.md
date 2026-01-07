# World Bus Architecture vs. Current Governor/State Systems

Created: January 2026

---

## 1) Executive Summary

- **World Bus (Event-Driven World)**: A central, typed event stream where all in-game actions (movement, speech, time, state changes) are events. Systems and agents subscribe and react, enabling autonomous NPCs, continuous simulation, and rich observability.
- **Current System (Governor + StateManager + npc-agent)**:
  - `Governor` orchestrates a player turn by delegating to a tool turn handler (`NpcTurnHandler`), then applies JSON patches to state via `StateManager`.
  - `NpcAgent` produces narrative per turn; `NpcTurnHandler` runs NPCs in a batch, orders results, and aggregates patches.
  - `StateManager` is an in-memory slice registry applying JSON Patch (no event store).
- **High-level contrast**: World Bus favors decoupled, continuous simulation and multi-producer/multi-consumer workflows; the current Governor favors synchronous, turn-scoped orchestration. A hybrid path can phase in the bus while preserving existing APIs and state behavior.

---

## 2) The World Bus Concept (Expanded)

A typed event-stream backbone for the RPG world.

- **Event model**: Discriminated unions; immutable, append-only. Examples:
  - `turn.started`, `turn.completed`, `npc.spoke`, `player.moved`, `time.advanced`, `relationship.changed`, `inventory.updated`.
- **Producers**: Player input adapter, NPC actors, simulation ticks, system services (Time, Social, Physics), tools.
- **Consumers**: NPC actors, governor adapter, reducers/projectors, audit/analytics, knowledge/memory graph, streaming UI.
- **Delivery**: In-process pub/sub at first; later pluggable transports (Redis, in-memory queue). SSE/WebSocket stream to clients.
- **Persistence**: Optional event store for replay (enables branching, undo/redo, time travel debugging).

Type sketch:

```ts
// dev-only sketch, not production code
export type WorldEvent =
  | { type: 'turn.started'; ts: number; sessionId: string; turn: number }
  | { type: 'turn.completed'; ts: number; sessionId: string; ok: boolean }
  | { type: 'npc.spoke'; ts: number; sessionId: string; npcId: string; text: string }
  | { type: 'player.moved'; ts: number; sessionId: string; from: string; to: string }
  | { type: 'time.advanced'; ts: number; sessionId: string; deltaMinutes: number }
  | { type: 'state.patch'; ts: number; sessionId: string; patches: Operation[] };

export interface WorldBus {
  publish(evt: WorldEvent): void;
  subscribe(filter: (e: WorldEvent) => boolean, h: (e: WorldEvent) => void): () => void;
}
```

---

## 3) World Bus vs. Current Governor (packages/governor)

### 3.1 Orchestration Model (Deep Dive)

| Aspect | Governor (Current) | World Bus (Target) |
|--------|-------------------|--------------------|
| **Control flow** | Synchronous request→handler→response | Async publish→subscribe→react |
| **Entry point** | Single `handleTurn()` method | Multiple event producers |
| **Coordination** | Implicit via call stack | Explicit via event ordering/causality |
| **Extensibility** | New handler = new code path | New consumer = new subscription |

**Current Governor Flow** (from `governor.ts:71-140`):

```text
handleTurn(input) → toolTurnHandler.handleTurn(input) → applyStateChanges(patches) → return TurnResult
```

The Governor is a thin orchestrator that:

2. Delegates to `ToolTurnHandler` (line 96)
3. Applies patches via `StateManager` (lines 99-130)
4. Handles errors uniformly (lines 137-139)

**World Bus equivalent** would replace step 2 with event publication, letting any number of actors/services react independently.

### 3.2 Temporal Model Comparison

- **Governor**: Turn-scoped. The `NpcTurnHandler.handleTurn()` executes all NPCs in parallel via `Promise.all()` (line 145-147), then sorts by tier/priority (line 150). Time only advances when the player acts.
  
- **World Bus**: Continuous. A `time.advanced` event can fire from a cron/interval, triggering NPC actors to evaluate whether they should speak or act—**without player input**. This is the key unlock for "living world" feel.

### 3.3 Agent Execution Deep Comparison

**Current NpcTurnHandler execution model** (`npc-turn-handler.ts:99-240`):

```ts
// Batch execution - all NPCs run in parallel for one turn
const results = await Promise.all(
  npcContexts.map((ctx, index) => this.runNpc(ctx, input, events, index))
);
const sorted = this.sortResults(results); // tier + priority ordering
```

Characteristics:
- **Stateless per turn**: Each `runNpc()` builds fresh `NpcAgentInput`, calls `NpcAgent.execute()`, returns
- **No inter-NPC communication**: NPCs can't react to each other's speech within the same turn
- **Priority computed post-hoc**: `computeNpcPriority()` in `NpcAgent` (lines 163-176) uses `isDirectlyAddressed`, `proximityLevel`, and tags
- **Deterministic ordering**: Results sorted by addressed > nearby > background, then by priority score

**World Bus actor model** would allow:
- NPCs to react to `npc.spoke` events from other NPCs (chained dialogue)
- Priority/scheduling decisions before execution (not after)
- Utility-driven activation ("do I even want to speak right now?")

### 3.4 State Management Flow

**Current flow** (`StateManager.applyPatches` from `manager.ts:161-257`):

```text
baseline + overrides → effectiveState → apply patches → diff against baseline → minimal newOverrides
```

This is a **command-sourced** model: patches are the "commands" applied to state.

**World Bus + Event Sourcing** would invert this:

```text
event stream → projector/reducer → patches → StateManager.applyPatches (for API compat)
```

The key insight: **events become the source of truth**, patches become a derived artifact for backward compatibility.

### 3.5 Error Handling Comparison

| Governor | World Bus |
|----------|----------|
| `TurnProcessingError` thrown, caught in `handleError()` | Per-consumer error isolation |
| Single failure = entire turn fails | Faulty consumer can be disabled/retried |
| Synchronous error propagation | Dead-letter queues, supervision trees |
| No retry semantics | Built-in retry with backoff possible |

Reference points in code:
- `Governor.handleTurn` orchestrates and applies patches via `StateManager.applyPatches(...)`.
- `NpcTurnHandler` executes `NpcAgent` across contexts, emits per-NPC events, aggregates narratives/patches.
- `TurnProcessingError` (types.ts:261-280) provides structured error info but no recovery path.

---

## 4) State Management Implications (packages/state-manager)

- **Current**: `StateManager` is a pure in-memory slice registry applying JSON Patch (`fast-json-patch`) to merge baseline + overrides. No event history.
- **With World Bus**:
  - Introduce an optional event store; derive state via reducers/projectors.
  - Keep `StateManager` as the read/write façade to maintain API compatibility, by feeding it patches produced by projectors.
  - Dual-path transition: persist events; generate patches from reducers; apply via `StateManager` so existing UI/APIs remain unchanged.

Pattern:

```ts
// Event -> Reducer -> Patch -> StateManager
bus.subscribe(e => e.type.endsWith('changed') || e.type === 'state.patch', evt => {
  const patches = reduceEventToPatches(evt); // domain-specific reducers
  if (patches.length) {
    stateManager.applyPatches(baseline, overrides, patches);
  }
});
```

---

## 5) Gemini Actor Model vs. Our npc-agent (packages/agents/src/npc)

### 5.1 Execution Model Deep Dive

**Current NpcAgent architecture** (`npc-agent.ts`):

```ts
class NpcAgent extends BaseAgent {
  async execute(input: AgentInput): Promise<NpcAgentOutput> {
    // 1. Resolve character slice (lines 62-71)
    // 2. Optionally enrich with sensory context (lines 74-83)
    // 3. Build dialogue input with history (lines 85-109)
    // 4. Generate via LLM or template (lines 87-89)
    // 5. Compute priority score (lines 93-96)
    // 6. Return narrative + optional patches
  }
}
```

Key characteristics:
- **Request-scoped**: Created/invoked per turn, no persistent memory between `execute()` calls
- **History via repository**: `loadConversationHistory()` fetches from `NpcMessageRepository` (lines 112-140)
- **Services injected**: `sensoryService`, `proximityService`, `hygieneService`, `memoryService` (lines 143-160)
- **LLM call is blocking**: Single `llmProvider.generate()` per execution (lines 181-232)

**Actor Model equivalent**:

```ts
class NpcActor {
  private state: NpcActorState;  // Persistent FSM state
  private mailbox: EventQueue;   // Buffered incoming events
  private goals: Goal[];         // Active goal stack
  
  async tick() {
    const events = this.mailbox.drain();
    for (const evt of events) {
      this.state = await this.transition(this.state, evt);
    }
    const action = this.evaluateUtility();
    if (action) await this.execute(action);
  }
}
```

### 5.2 Statefulness Comparison

| Aspect | NpcAgent (Current) | NpcActor (Target) |
|--------|-------------------|-------------------|
| **Lifecycle** | Per-request instantiation | Long-lived process |
| **Memory** | External via `NpcMessageRepository` | Internal state + external backing |
| **Goals** | None (reactive only) | Goal stack with priorities |
| **Needs** | None | Utility scores (hunger, boredom, etc.) |
| **FSM** | None | XState/Effect machine per actor |

**Current services used by NpcAgent** (from `NpcAgentServices`):
- `messageRepository`: Fetches conversation history
- `sensoryService`: Provides NPC-specific sensory details to the player (e.g., scent, skin texture); not general environment awareness
- `proximityService`: Distance-based filtering
- `hygieneService`: (unused currently)
- `memoryService`: (unused currently)

These would become **subscriptions** in the actor model—the actor receives sensory events rather than pulling on demand.

### 5.3 Priority & Scheduling

**Current priority computation** (`npc-agent.ts:163-176`):

```ts
private computeNpcPriority(input: NpcAgentInput): number {
  const base = input.isDirectlyAddressed ? 3 : 1;
  const proximityScore = { intimate: 2.5, close: 2, near: 1.5, distant: 1 };
  const proximity = proximityScore[input.proximityLevel] ?? 1;
  const tagWeight = (input.npcTags?.length ?? 0) > 0 ? 0.5 : 0;
  return base + proximity + tagWeight;
}
```

This is **post-hoc ordering**—all NPCs execute, then results are sorted.

**Actor model scheduling** would be **pre-execution**:

```ts
class ActorScheduler {
  selectActors(tick: number): NpcActor[] {
    return this.actors
      .filter(a => a.shouldActivate(tick))  // Utility threshold
      .sort((a, b) => b.urgency - a.urgency) // Priority queue
      .slice(0, this.maxConcurrent);         // Budget limiting
  }
}
```

Player-first scheduling policies (anti-spam and “jump-in” friendliness):
- **Conversation focus**: The player can set focus on 1-2 NPCs. Focused NPCs get a strong activation bias; non-focused NPCs are capped or deferred.
- **Addressed detection**: If the player explicitly addresses an NPC by name/mention, that actor’s urgency is boosted; others back off.
- **Grace window after player input**: After `player.spoke`, open a short silence window (e.g., 600–1200ms) where only directly addressed or focused NPCs may speak; background chatter queues as intents.
- **Intent → commit two-step**: Actors publish `npc.intent` first; a scheduler selects 0-2 winners to emit `npc.spoke`, dropping or delaying the rest. Prevents multi-speaker dogpiles.
- **Per-NPC patience budget**: Each actor has a patience counter that decays when pre-empted; repeated deferrals cause the actor to stand down or switch activities.
- **Vicinity gating**: Actors outside the player’s vicinity can still act (simulation continues), but their dialogue is not eligible for the player-facing feed unless the player’s focus follows them.
- **Budgeted concurrency**: Hard cap on concurrent `npc.spoke` per time slice (e.g., max 2), with jitter to avoid synchronized bursts.

### 5.4 Concurrency & Isolation

**Current** (`NpcTurnHandler`):
- All NPCs run in parallel via `Promise.all()`
- No isolation—shared event array, shared patches array
- If one NPC throws, error handling at handler level catches it

**Actor model**:
- Each actor has isolated mailbox and state
- Supervision tree can restart failed actors
- Backpressure via mailbox size limits
- Circuit breakers for LLM failures

### 5.5 Migration Path: NpcActor Wrapper

The `NpcActor` wrapper reuses `NpcAgent` internally while adding actor semantics:

```ts
class NpcActor {
  constructor(
    private npcId: string,
    private agent: NpcAgent,
    private bus: WorldBus,
    private stateStore: ActorStateStore
  ) {}

  async onEvent(evt: WorldEvent) {
    // Filter: should I care about this event?
    if (!this.isRelevant(evt)) return;
    
    // Evaluate: should I speak/act?
    const utility = await this.computeUtility(evt);
    if (utility < this.activationThreshold) return;
    
    // Execute: reuse existing NpcAgent
    const input = await this.buildInput(evt);
    const output = await this.agent.execute(input);
    
    // Publish: emit events to bus
    if (output.narrative) {
      this.bus.publish({ type: 'npc.spoke', ... });
    }
  }
}
```

This preserves all existing prompt engineering, LLM configuration, and service integrations while enabling event-driven behavior.

Conclusion: Our `npc-agent` is well-suited to turn-bound dialogue; the actor model is suited for continuous, autonomous simulation. A wrapper `NpcActor` can adapt `NpcAgent` to run as an event-driven actor without rewriting dialogue logic.

---

## 6) Reference Design: Coexistence Layer

- **Bus adapter for Governor**: Publish/translate existing `TurnEvent[]` to `WorldEvent` and stream via SSE.
- **NpcActor wrapper**: Convert `NpcAgent.execute` into an event-driven loop subscribed to relevant events.
- **Projectors**: Reduce events to patches and apply via `StateManager` to preserve existing consumers.

Sketches:

```ts
// A) Bridge: Governor -> World Bus
function bridgeGovernorToBus(governor: Governor, bus: WorldBus) {
  const original = governor.handleTurn.bind(governor);
  governor.handleTurn = async (input: TurnInput | string, text?: string) => {
    const turn = typeof input === 'string' ? { sessionId: input, playerInput: text! } : input;
    bus.publish({ type: 'turn.started', ts: Date.now(), sessionId: turn.sessionId, turn: turn.turnNumber ?? 0 });
    const result = await original(input as any, text as any);
    // forward notable events
    for (const evt of result.events ?? []) {
      switch (evt.type) {
        case 'npc-priority-ordering':
          // optional translate to bus events
          break;
      }
    }
    if (result.stateChanges?.patches?.length) {
      bus.publish({ type: 'state.patch', ts: Date.now(), sessionId: turn.sessionId, patches: result.stateChanges.patches });
    }
    bus.publish({ type: 'turn.completed', ts: Date.now(), sessionId: turn.sessionId, ok: result.success });
    return result;
  } as any;
}

// B) NpcActor wrapper around NpcAgent
class NpcActor {
  constructor(private npcId: string, private agent: NpcAgent, private bus: WorldBus) {}
  start() {
    return this.bus.subscribe(
      e => e.type === 'turn.started' || e.type === 'player.moved' || e.type === 'time.advanced',
      async (e) => {
        if (e.type === 'turn.started') {
          // decide to speak or not; reuse NpcTurnHandler input shape
          const input: NpcAgentInput = {/* build from cached slices and context */} as any;
          const out = await this.agent.execute(input);
          if (out.narrative) {
            this.bus.publish({ type: 'npc.spoke', ts: Date.now(), sessionId: e.sessionId, npcId: this.npcId, text: out.narrative });
          }
          if (out.statePatches?.length) {
            this.bus.publish({ type: 'state.patch', ts: Date.now(), sessionId: e.sessionId, patches: out.statePatches });
          }
        }
      }
    );
  }
}

// C) Projector: events -> patches -> StateManager
function attachProjector(bus: WorldBus, sm: StateManager, getBaseline: () => any, getOverrides: () => any) {
  return bus.subscribe(e => e.type === 'state.patch', (e) => {
    const baseline = getBaseline();
    const overrides = getOverrides();
    sm.applyPatches(baseline, overrides, e.patches);
  });
}
```

---

## 7) Migration Plan (Phased)

1. **Phase 1: Event Overlay**
   - Add lightweight `WorldBus` interface (in-memory).
   - Bridge `Governor.handleTurn` to publish turn lifecycle and collected patches.
   - Stream World Bus to UI via SSE for developer visibility.
2. **Phase 2: Projectors**
   - Implement projectors that reduce events to patches and apply via `StateManager` (no API changes).
   - Start persisting events (append-only) for replay in dev.
3. **Phase 3: Actor Pilot**
   - Introduce `NpcActor` wrapper for a small subset of NPCs (major tier) reacting to `turn.started` and `time.advanced`.
   - Keep `NpcTurnHandler` for others; compare outcomes.
4. **Phase 4: Simulation Ticks**
   - Add background tick events (`time.advanced`) and utility-driven triggers (hygiene/affinity decay).
5. **Phase 5: Optional Event-Sourced State**
   - For sessions flagged experimental, rebuild state from events; retain `StateManager` for patch application toward the API/web.

---

## 8) Pros/Cons and Risk Mitigations

- **Pros**
  - Decoupled systems; easier to add features (knowledge graph, narrative director, job queues).
  - Autonomous NPCs and background simulation possible.
  - First-class observability; straightforward SSE/WebSocket streaming.
- **Cons**
  - Architectural and operational complexity.
  - Requires scheduling, buffering, and supervision policies.
- **Mitigations**
  - Start with an in-memory bus and overlays; do not remove Governor/StateManager paths.
  - Feature-flag actors; pilot with limited NPCs.
  - Keep JSON Patch as compatibility layer via projectors.

---

## 10) Refactor Complexity Analysis

### 10.1 Effort Estimation by Component

| Component | Effort | Risk | Dependencies |
|-----------|--------|------|-------------|
| **WorldBus interface** | 1-2 days | Low | None |
| **Governor bridge** | 1 day | Low | WorldBus |
| **SSE streaming endpoint** | 1-2 days | Low | WorldBus, API routes |
| **Basic projector** | 2-3 days | Medium | WorldBus, StateManager |
| **NpcActor wrapper** | 3-4 days | Medium | WorldBus, NpcAgent |
| **Actor scheduler** | 3-5 days | High | NpcActor, utility system |
| **Event persistence** | 2-3 days | Medium | DB schema, WorldBus |
| **Utility AI system** | 5-7 days | High | Actor state, needs model |
| **Background tick service** | 2-3 days | Medium | WorldBus, scheduler |
| **Web UI event feed** | 2-3 days | Low | SSE endpoint |

**Total estimated effort**: 22-33 developer days for full implementation

### 10.2 Code Change Surface Area

**Minimal changes (Phase 1-2)**:
- New package: `packages/world-bus/` (~500-800 LOC)
- Modified: `packages/governor/src/core/governor.ts` (+50 LOC for bridge)
- Modified: `packages/api/src/routes/` (+100 LOC for SSE endpoint)
- New: projector module (~200 LOC)

**Moderate changes (Phase 3-4)**:
- New: `packages/agents/src/actor/` (~800-1200 LOC)
- Modified: `packages/agents/src/npc/` (wrap, don't rewrite)
- New: scheduler/supervisor (~400 LOC)
- Modified: API session handlers (+200 LOC)

**Significant changes (Phase 5)**:
- New: event store schema + repository (~600 LOC)
- Modified: StateManager facade for event-sourced path (~300 LOC)
- New: replay/time-travel utilities (~400 LOC)

### 10.3 Breaking Change Risk Assessment

| Risk | Description | Mitigation |
|------|-------------|------------|
| **API contract** | None—HTTP endpoints unchanged | Bridge publishes internally |
| **State shape** | None—StateManager facade preserved | Projectors emit same patches |
| **Web UI** | Enhancement only (SSE feed) | Additive, opt-in |
| **Test suite** | New tests needed; existing pass | Parallel validation |
| **Performance** | Potential latency from bus overhead | Benchmark each phase |

### 10.4 Recommended Approach

**Low-risk incremental path**:
1. Implement WorldBus as opt-in overlay (feature flag)
2. Bridge Governor without modifying its core logic
3. Add SSE streaming for dev visibility
4. Pilot actors for 2-3 NPCs before wider rollout
5. Keep Governor as fallback for any actor failures

This approach allows **rollback at any point** without data migration or schema changes.

---

## 11) LLM Efficiency Predictions for World Bus

### 11.1 Model Selection by Task Type

| Task | Recommended Model | Latency | Cost/1K tokens | Notes |
|------|------------------|---------|----------------|-------|
| **Quick reactions** | GPT-4o-mini, Gemini Flash | 200-400ms | $0.00015-0.0003 | "Hmm", nods, brief acknowledgments |
| **Standard dialogue** | GPT-4o, Claude 3.5 Haiku | 400-800ms | $0.001-0.003 | Normal NPC conversation |
| **Complex reasoning** | Claude 3.5 Sonnet, GPT-4o | 800-1500ms | $0.003-0.015 | Goal planning, plot decisions |
| **Deep narrative** | Claude 3 Opus, o1-preview | 2-5s | $0.015-0.06 | Major story beats, complex scenes |

### 11.2 Event-Driven LLM Call Patterns

**Current (turn-scoped)**:

```text
Player input → All NPCs execute in parallel → All LLM calls fire simultaneously
```

- **Burst pattern**: 3-10 LLM calls per turn
- **Latency**: Bounded by slowest NPC (~800-1500ms typical)
- **Cost**: Predictable per turn

**World Bus (continuous)**:

```text
Event stream → Actors filter relevance → Selective LLM calls → Staggered responses
```

- **Spread pattern**: LLM calls distributed over time
- **Latency**: Per-actor, not per-turn
- **Cost**: Higher total but better UX

### 11.3 Efficiency Strategies

#### A) Tiered Model Routing

```ts
function selectModel(actor: NpcActor, event: WorldEvent): LLMConfig {
  // Utility-based selection
  if (actor.urgency > 0.8) return { model: 'claude-3.5-sonnet', maxTokens: 500 };
  if (event.type === 'time.advanced') return { model: 'gpt-4o-mini', maxTokens: 150 };
  if (actor.isAddressed) return { model: 'gpt-4o', maxTokens: 400 };
  return { model: 'gpt-4o-mini', maxTokens: 200 }; // Background chatter
}
```

#### B) Response Caching & Templating

- Cache common responses: greetings, farewells, idle observations
- Use templates for low-stakes interactions
- LLM only for novel situations or high-engagement moments

#### C) Batch Inference Windows

- Collect events over 100-200ms window
- Batch multiple actor prompts to same model endpoint
- Reduces API overhead, enables better rate limit management

### 11.4 Cost Projections

#### Scenario: 10 active NPCs, 5-minute play session

| Mode | LLM Calls | Avg Tokens | Est. Cost (GPT-4o-mini) | Est. Cost (GPT-4o) |
|------|-----------|------------|------------------------|--------------------|
| **Governor (turn-based)** | ~50 calls | 400 in/200 out | $0.015 | $0.15 |
| **World Bus (hybrid)** | ~80 calls | 300 in/150 out | $0.018 | $0.18 |
| **World Bus (continuous)** | ~150 calls | 250 in/100 out | $0.023 | $0.23 |

**Key insight**: Continuous simulation increases call volume 2-3x, but **smaller, faster calls** with tiered routing can keep costs within 50% of baseline while dramatically improving UX.

### 11.5 Latency Budget for "Living World" Feel

| Event Type | Target Response Time | Acceptable Max |
|------------|---------------------|----------------|
| Player speech | < 500ms first token | 1500ms |
| NPC-to-NPC reaction | < 300ms | 800ms |
| Background observation | < 200ms | 500ms |
| Time tick effects | < 100ms | 300ms |

**Recommendation**: Use streaming responses for player-facing dialogue; batch/async for background simulation.

---

## 12) Realtime Event Architecture

### 12.1 Event Delivery Options

| Transport | Latency | Complexity | Browser Support | Recommendation |
|-----------|---------|------------|-----------------|----------------|
| **SSE** | ~50-100ms | Low | Excellent | **Phase 1-3** |
| **WebSocket** | ~20-50ms | Medium | Excellent | Phase 4+ |
| **WebTransport** | ~10-30ms | High | Limited | Future |
| **Long polling** | ~200-500ms | Low | Universal | Fallback only |

### 12.2 SSE Implementation (Recommended Start)

```ts
// packages/api/src/routes/events.ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const eventsRouter = new Hono();

eventsRouter.get('/sessions/:sessionId/events', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  return streamSSE(c, async (stream) => {
    const unsubscribe = worldBus.subscribe(
      (e) => e.sessionId === sessionId,
      async (event) => {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
          id: `${event.ts}-${event.type}`,
        });
      }
    );
    
    // Keep connection alive
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: 'ping', data: '' });
    }, 30000);
    
    stream.onAbort(() => {
      unsubscribe();
      clearInterval(heartbeat);
    });
  });
});
```

### 12.3 Client-Side Event Handling

```ts
// packages/web/src/hooks/useWorldEvents.ts
export function useWorldEvents(sessionId: string) {
  const [events, setEvents] = useState<WorldEvent[]>([]);
  
  useEffect(() => {
    const source = new EventSource(`/api/sessions/${sessionId}/events`);
    
    source.addEventListener('npc.spoke', (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [...prev.slice(-100), event]); // Keep last 100
    });
    
    source.addEventListener('state.patch', (e) => {
      const event = JSON.parse(e.data);
      // Optimistic UI update
      applyPatchesToLocalState(event.patches);
    });
    
    return () => source.close();
  }, [sessionId]);
  
  return events;
}
```

### 12.4 Event Ordering & Consistency

**Challenge**: Events from multiple actors may arrive out of order.

**Solutions**:
1. **Lamport timestamps**: Each event carries logical clock
2. **Causal ordering**: Events reference parent event IDs
3. **Server-side sequencing**: Bus assigns monotonic sequence numbers

```ts
export type WorldEvent = {
  type: string;
  ts: number;           // Wall clock
  seq: number;          // Monotonic sequence (server-assigned)
  causedBy?: string;    // Parent event ID for causal chains
  sessionId: string;
  // ... payload
};
```

### 12.5 Optimistic UI Updates

For perceived instant feedback:

```ts
// When player submits input
function onPlayerSubmit(input: string) {
  // 1. Optimistic local event
  const optimisticEvent = { type: 'player.spoke', text: input, pending: true };
  addToFeed(optimisticEvent);
  
  // 2. Send to server
  await api.submitTurn(sessionId, input);
  
  // 3. SSE will deliver confirmed events; reconcile
}
```

### 12.6 Player Text Input + World Bus: Conversation Flow and Anti-Spam

Goal: Let players “jump in” with chosen NPCs while the world remains live, without NPCs spamming before the player can respond.

- **Input as events**:
  - `player.spoke { text }`
  - `player.focus.set { npcIds: string[] }` and `player.focus.clear`
  - `player.addressed { npcId }` (explicit addressing parsed from input)
  - Optional `player.interrupt` to preempt ongoing narration

- **Event flow (proposed)**:
  1) Player submits text → publish `player.spoke` (+ optional `player.addressed`/`player.focus.set`).
  2) A short, configurable silence window starts. Only focused or addressed NPCs are eligible to respond immediately.
  3) NPCs publish `npc.intent` (with metadata like priority, proximity, patience). A scheduler selects at most N winners to emit `npc.spoke`.
  4) Non-winning intents decay or are rescheduled; patience budgets prevent endless retries.

- **Visibility and vicinity**:
  - Each dialogue event includes `locationId` and an `audience` hint: `direct` (player-focused), `vicinity` (same room/area), or `global` (rare system-level broadcasts).
  - The client subscribes to a filtered feed: player session + location/vicinity + direct focus. Off-vicinity events are still produced on the bus for simulation, but are not shown to the player unless they move focus or location.

- **Mitigations against spam and impatience**:
  - Grace window after `player.spoke` with a max-concurrency cap (e.g., 1–2 NPC responses).
  - Intent/commit handshake so multiple NPCs don’t speak simultaneously.
  - Per-actor cooldowns and patience budgets that back off after deferrals.
  - Address/focus boosts that help the player talk to chosen NPCs first.

- **Thriving without player interaction**:
  - Background ticks (`time.advanced`) continue to drive goals and actions for all NPCs.
  - Off-vicinity actions are reduced to state changes and analytics events; they only surface to the player UI when relevant by focus/vicinity rules.
  - This preserves a living world while keeping the player’s view uncluttered.

Type sketch for intents and visibility:

```ts
type Audience = 'direct' | 'vicinity' | 'global';

type NpcIntent = {
  type: 'npc.intent';
  ts: number;
  sessionId: string;
  npcId: string;
  locationId: string;
  audience: Audience;
  priority: number;      // computed from utility, focus, addressing
  patienceMs: number;    // willingness to wait before speaking
};

type NpcSpoke = {
  type: 'npc.spoke';
  ts: number;
  sessionId: string;
  npcId: string;
  locationId: string;
  audience: Audience;    // used by UI subscription filter
  text: string;
};
```

These policies ensure the player can always “jump in” with targeted NPCs, while the rest of the world continues to evolve unobtrusively.

---

## 13) Core Systems for MVP "Living World"

### 13.1 Minimum Viable World Bus (Week 1)

**Goal**: SSE stream showing turn lifecycle in dev panel.

**Components**:
1. `WorldBus` class (in-memory pub/sub)
2. Governor bridge (publish on turn start/complete)
3. SSE endpoint (`/sessions/:id/events`)
4. Basic web component to display event feed

```ts
// Minimal WorldBus implementation
export class WorldBus {
  private subscribers = new Map<string, Set<(e: WorldEvent) => void>>();
  private seq = 0;
  
  publish(event: Omit<WorldEvent, 'seq'>): void {
    const fullEvent = { ...event, seq: ++this.seq };
    const sessionSubs = this.subscribers.get(event.sessionId) ?? new Set();
    for (const handler of sessionSubs) {
      try { handler(fullEvent); } catch (e) { console.error(e); }
    }
  }
  
  subscribe(sessionId: string, handler: (e: WorldEvent) => void): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    this.subscribers.get(sessionId)!.add(handler);
    return () => this.subscribers.get(sessionId)?.delete(handler);
  }
}
```

### 13.2 Projector System (Week 2)

**Goal**: Events flow through projector to StateManager; verify identical state.

**Components**:
1. Projector registry (event type → reducer function)
2. Subscription to `state.patch` events
3. Validation: compare Governor-applied state vs projector-applied state

```ts
export class Projector {
  constructor(
    private bus: WorldBus,
    private stateManager: StateManager,
    private sessionStore: SessionStore
  ) {}
  
  attach(sessionId: string): () => void {
    return this.bus.subscribe(sessionId, async (event) => {
      if (event.type === 'state.patch') {
        const session = await this.sessionStore.get(sessionId);
        const result = this.stateManager.applyPatches(
          session.baseline,
          session.overrides,
          event.patches
        );
        await this.sessionStore.updateOverrides(sessionId, result.newOverrides);
      }
    });
  }
}
```

### 13.3 NpcActor Pilot (Week 3-4)

**Goal**: 2-3 NPCs running as actors alongside traditional NpcTurnHandler.

**Components**:
1. `NpcActor` wrapper (reuses `NpcAgent`)
2. Actor registry (which NPCs are actors vs handler-managed)
3. Feature flag per session
4. Fallback to handler on actor error

### 13.4 Background Tick Service (Week 4-5)

**Goal**: NPCs can act between player turns.

**Components**:
1. `TickService` that emits `time.advanced` events
2. Configurable tick interval (e.g., every 30s real-time = 5 min game-time)
3. Actor scheduler that wakes actors on tick
4. Utility threshold to prevent spam

```ts
export class TickService {
  private intervals = new Map<string, NodeJS.Timeout>();
  
  startSession(sessionId: string, config: TickConfig): void {
    const interval = setInterval(() => {
      this.bus.publish({
        type: 'time.advanced',
        ts: Date.now(),
        sessionId,
        deltaMinutes: config.gameMinutesPerTick,
      });
    }, config.realMsPerTick);
    
    this.intervals.set(sessionId, interval);
  }
  
  stopSession(sessionId: string): void {
    const interval = this.intervals.get(sessionId);
    if (interval) clearInterval(interval);
    this.intervals.delete(sessionId);
  }
}
```

### 13.5 Living World MVP Checklist

- [ ] WorldBus with session-scoped pub/sub
- [ ] Governor bridge publishing turn events
- [ ] SSE endpoint streaming to web
- [ ] Dev panel showing event feed
- [ ] Projector applying patches from events
- [ ] 2-3 NpcActors reacting to events
- [ ] Background tick every 30s
- [ ] At least one NPC speaking unprompted on tick
- [ ] Feature flag to enable/disable per session

**When complete**: The web app will show NPCs occasionally commenting, moving, or reacting even when the player hasn't typed—creating the "living world" feel.

---

## 14) Technology Recommendations

### 14.1 Keep (No Changes Needed)

| Component | Current | Reason to Keep |
|-----------|---------|----------------|
| **StateManager** | `fast-json-patch` | Solid, well-tested, JSON Patch is the right abstraction |
| **NpcAgent** | Custom + LLM | Dialogue logic is good; wrap, don't rewrite |
| **Hono API** | Hono | Lightweight, fast, good SSE support |
| **Zod schemas** | `@minimal-rpg/schemas` | Type-safe, generates both TS and validation |
| **PostgreSQL** | `@minimal-rpg/db` | Relational data, session storage |

### 14.2 Add (New Technologies)

| Component | Recommendation | Why |
|-----------|---------------|-----|
| **Event Bus** | Custom in-memory → **BullMQ** (later) | Start simple; BullMQ adds persistence, retries, priorities |
| **Actor Framework** | **XState v5** or **Effect** | FSM for actor state; Effect for typed async/concurrency |
| **Realtime Transport** | **SSE** → **Socket.io** (later) | SSE is simpler; Socket.io adds rooms, reconnection |
| **LLM Router** | **Custom tiered router** | Route by urgency/task to different models |
| **Observability** | **OpenTelemetry** | Distributed tracing for event flows |
| **Rate Limiting** | **Bottleneck** or **p-limit** | Control LLM call concurrency per session |

### 14.3 Consider Replacing

| Current | Replacement | Reason | Effort | Priority |
|---------|-------------|--------|--------|----------|
| **In-memory bus** | **Redis Streams** | Durability, multi-instance, replay | Medium | Phase 4+ |
| **Session state in memory** | **Redis + PostgreSQL** | Horizontal scaling, persistence | Medium | Phase 4+ |
| **Polling for updates** | **SSE/WebSocket** | True realtime, lower latency | Low | Phase 1 |
| **Single LLM provider** | **LLM Gateway (LiteLLM/Portkey)** | Model routing, fallbacks, observability | Low | Phase 2 |

### 14.4 Effect-TS Consideration

**Pros**:
- Excellent error handling and typed effects
- Built-in concurrency primitives (fibers, queues)
- Great for actor-style patterns

**Cons**:
- Steep learning curve
- Different paradigm from current codebase
- May slow initial development

**Recommendation**: Introduce Effect incrementally for new actor/scheduler code. Don't rewrite existing packages.

### 14.5 Architecture Decision: Event Store

#### Option A: PostgreSQL table (Recommended for MVP)

```sql
CREATE TABLE world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  seq BIGINT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, seq)
);
```

#### Option B: EventStoreDB (Future consideration)

- Purpose-built for event sourcing
- Built-in projections, subscriptions
- Overkill for MVP, consider at scale

#### Option C: Redis Streams (Good middle ground)

- Fast, supports consumer groups
- Good for multi-instance deployment
- Consider when horizontal scaling needed

### 14.6 Recommended Tech Stack Evolution

```text
Phase 1-2 (MVP):          Phase 3-4 (Growth):        Phase 5+ (Scale):
─────────────────         ──────────────────         ────────────────
In-memory WorldBus   →    Redis Streams         →   EventStoreDB/Kafka
SSE                  →    Socket.io             →   WebTransport
Single LLM           →    LiteLLM Gateway       →   Custom router + cache
PostgreSQL events    →    PostgreSQL + Redis    →   Dedicated event store
Simple actors        →    XState actors         →   Effect runtime
```

---

## 15) Summary: When to use which?

- **Stay with Governor-only** if scope is single-player, turn-driven chat with minimal background activity.
- **Adopt World Bus (hybrid)** to unlock streaming telemetry, background ticks, and incremental autonomy while preserving current APIs.
- **Go full Actor + Bus** when aiming for living worlds, multiplayer, or complex systemic gameplay; plan for increased complexity and supervision.

### Key Takeaways

1. **Refactor is incremental, not big-bang**: Each phase delivers value and is rollback-safe
2. **Current code is reusable**: NpcAgent, StateManager, schemas all stay—we wrap, not rewrite
3. **LLM costs manageable**: Tiered routing + caching keeps continuous simulation within 50% of current costs
4. **Living world MVP in ~4-5 weeks**: With focused effort, can have NPCs acting autonomously
5. **Technology evolution is gradual**: Start with in-memory/SSE, upgrade to Redis/WebSocket as needed
