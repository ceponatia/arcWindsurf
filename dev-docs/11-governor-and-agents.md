# Governor and Agents

This document describes the current Governor orchestration layer, how it is intended to interact with specialized agents, and how it connects to the state manager and future retrieval/embedding systems.

The goal is to give a clear picture of what exists in the code today and what is planned, without assuming unimplemented pieces already work.

## 1. Role of the Governor

The Governor is a thin coordination layer implemented in [packages/governor/src/governor.ts](packages/governor/src/governor.ts). It is responsible for:

- Receiving player input for a given session.
- Orchestrating high‑level turn handling (intent, routing, state recall, state updates).
- Delegating all state operations to @minimal-rpg/state-manager.
- Eventually invoking one or more specialized agents (LLM-backed or otherwise) and aggregating their responses.

The public surface today is:

- class Governor
  - constructor(config: GovernorConfig)
  - handleTurn(sessionId: string, input: string): Promise<TurnResult>

Where GovernorConfig currently requires:

- stateManager: StateManager – a dependency from @minimal-rpg/state-manager, used for state recall and commits.

TurnResult is a simple structure:

- message: string – the player-facing narrative or status text for this turn.

At the moment, handleTurn is a scaffold: it logs the request and returns an echo-style message indicating the Governor is not fully implemented. The rest of this document describes the intended flow that will gradually be filled in around this scaffold.

## 2. High-level Turn Flow

The intended per-turn flow for the Governor is:

1. Intent detection
   - Analyze the raw player input and recent context to determine what the player is trying to do (e.g., move, talk, inspect, use item).
   - This will eventually be driven by an LLM or classifier, but is not yet implemented in code.
2. State recall
   - Use stateManager to fetch the relevant effective state for the current session.
   - The effective state is built using the template + snapshot instance pattern documented in earlier dev docs (templates are immutable; instances carry per-session overrides).
   - The Governor does not perform merging logic directly; it relies on the StateManager interface for that.
3. Agent routing and execution
   - Based on the detected intent, choose one or more specialized agents (e.g., NPC/dialogue agent, map/navigation agent, rules/system agent).
   - Provide each agent with the effective state slice and the player input.
   - Collect agent responses, including any proposed state changes.
   - This entire phase is currently TODO in the implementation.
4. State update
   - Take structured state change proposals from agents and pass them to stateManager for application.
   - The Governor does not write to the database directly; it delegates that responsibility.
5. Response aggregation
   - Combine the agent narratives and system messages into a single TurnResult.
   - For now, the scaffold simply returns an echo-style message.

## 3. Governor Configuration and Dependencies

The Governor is instantiated with a GovernorConfig object. In code today it looks like:

- GovernorConfig
  - stateManager: StateManager
  - // In the future: llmProvider, routing configuration, logging hooks, etc.

Key points about this configuration:

- The Governor does not construct or own the StateManager; it receives a ready-to-use instance.
- This keeps orchestration logic separate from persistence, making it easier to test the Governor in isolation by swapping in a mock StateManager.
- Additional dependencies (LLM provider, embeddings, routing tables) will be added to GovernorConfig as those systems come online.

## 4. Interaction with the State Manager

The State Manager lives in the @minimal-rpg/state-manager package and encapsulates all logic for managing baseline templates, per-session overrides, and effective state computation.

Conceptually, the responsibilities are:

- StateManager
  - Provides an API to load effective state for a given session/entity.
  - Accepts patches or structured updates and persists them as per-session overrides.
  - Owns any knowledge about database schema, JSON shapes, and template/instance separation.

The Governor only interacts with StateManager via its public interface (for example, calls like getEffectiveState and applyPatches in the scaffolded comments). The exact method names and signatures are defined in the state-manager package; this document avoids duplicating them in case they evolve.

Important design constraints:

- The Governor must treat StateManager as the single source of truth for state.
- All mutations go through StateManager; the Governor should never bypass it and touch DB clients directly.
- StateManager is responsible for reconciling immutable templates with mutable per-session overrides, and for any JSON patch application.

## 5. Specialized Agents (Conceptual)

The Governor is designed to orchestrate one or more specialized agents, but these agents are not yet implemented as concrete classes in the codebase. Instead, the design is informed by earlier architecture docs and the high-level responsibilities already referenced in packages/governor/README.md.

The main agent types we plan to support are:

- Map / Navigation Agent
  - Interprets movement and exploration intents.
  - Decides which location the player moves to and what they perceive there.

- NPC / Dialogue Agent
  - Handles conversation with characters.
  - Uses character and relationship state to shape responses.

- Rules / System Agent
  - Applies core game rules (success/failure checks, resource updates, consequences).

Each agent is expected to:

- Receive:
  - A slice of effective state relevant to its domain (e.g., current location, nearby entities, character profile).
  - The normalized player intent and raw input.
  - Optional retrieved knowledge/context (see Section 6).
- Return:
  - Narrative output (what the player sees or hears).
  - Structured state changes (e.g., JSON patches or higher-level operations) that can be fed into StateManager.

The exact TypeScript interfaces for these agents are still evolving and are not yet part of the codebase.

## 6. Context Retrieval and Embeddings (Future)

Earlier design documents describe a knowledge-node and vector-based retrieval system where character and setting profiles are decomposed into nodes, embedded, and retrieved via pgvector. That design is not yet wired into the Governor, but the intended relationship is:

- The Governor (or a dedicated retrieval component invoked by the Governor) will:
  - Use recent player input and session context to build a retrieval query.
  - Ask the state/knowledge layer to return a ranked list of relevant nodes for the active entities.
  - Combine these nodes into a compact context block for each agent.

- Agents will then:
  - Consume only the retrieved/salient details, not entire raw JSON profiles.
  - Optionally adjust importance scores or flags in response to narrative events (e.g., marking an item as highly salient).

Because the concrete implementation of this retrieval layer is still in flux, details like table names, embedding models, and scoring formulas are intentionally omitted here and should be referenced from the dedicated knowledge-node and retrieval docs instead.

## 7. Error Handling and Observability

Planned responsibilities for the Governor around robustness include:

- Logging each turn with:
  - sessionId
  - player input summary
  - chosen intent and routed agents
  - high-level state changes (counts, not full diffs)

- Handling partial failures:
  - If an agent fails, the Governor should surface a safe fallback message and avoid committing partial or inconsistent state.

- Integrating with tracing/metrics (TBD) so that downstream issues in agents or the state layer can be inspected.

The current scaffold only logs a single console line when handleTurn is called; richer observability will be added as the orchestration logic is implemented.

## 8. Open Questions and TBDs

The following aspects are intentionally left as TBD because they are not yet implemented or are still being designed:

- Exact intent detection mechanism
  - Whether this is a dedicated LLM call, a rule-based classifier, or a hybrid.
  - How intent schemas are defined and versioned.

- Agent interface definitions
  - Concrete TypeScript interfaces for agents, including error/timeout contracts.
  - How multiple agents are composed (sequential vs. parallel, priority rules).

- State update format
  - Whether agents emit RFC 6902 JSON Patch operations, higher-level domain events, or both.
  - How conflicting updates from multiple agents in a single turn are resolved.

- Retrieval and embedding pipeline
  - Exact shape of knowledge nodes and how they relate to state-manager types.
  - Where embedding generation and refresh live (Governor vs. background jobs).
  - How salience/importance is tracked over time.

- Session lifecycle
  - How sessions are created, resumed, and terminated from the Governor’s point of view.
  - How much historical context (previous turns) the Governor keeps in memory vs. re-derives from state.

These items should be updated once corresponding implementations land in the codebase.
