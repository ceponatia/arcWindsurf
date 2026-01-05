# Refactor Vision: ArcAgentic (Minimal RPG)

This document outlines a "blue-sky" refactor vision for the project, removing existing constraints and leveraging modern TypeScript, LLM agent patterns, and web application architecture.

## 1. Core Philosophy: The World as a Simulation
Move from a "Turn-based CLI-style API" to a "Living Simulation Engine". The goal is to treat the LLM agents not just as chat participants, but as actors within a reactive state machine.

## 2. Architectural Overhaul

### A. From Governor to Message Bus (Event-Driven)
*Current*: A central `Governor` orchestrates everything in a request/response cycle.
*Vision*: Implement an **Event-Driven Architecture (EDA)**.
- **The World Bus**: Every action (movement, speech, state change) is an event.
- **Reactive Agents**: Agents subscribe to event streams (sensory input) and emit intent events.
- **System Services**: Services like `PhysicsEngine`, `SocialEngine`, and `TimeService` listen for intents and resolve them into state changes.

### B. Hybrid State Engine (Relational + Graph + Vector)
*Current*: In-memory JSON with patches.
*Vision*: A three-tier persistence layer:
- **Relational (PostgreSQL)**: Hard state (HP, Inventory, Location).
- **Graph (Neo4j/Entro)**: Social relationships, knowledge graphs, and world connectivity.
- **Vector (Pinecone/pgvector)**: "Semantic Memory" for NPCs—long-term recall of conversations and lore.

### C. The "Actor" Model for Agents
*Vision*: Each NPC is an autonomous "Actor" (e.g., using `XState` or `Effect` for robust state management).
- **Perception**: Filter the world event bus based on proximity and sensory stats.
- **Cognition**: A tiered LLM approach:
    - *Fast (GPT-4o-mini)*: Immediate reactions, pathfinding, social pleasantries.
    - *Deep (Claude 3.5 Sonnet / O1)*: Long-term planning, complex dialogue, goal revision.
- **Action**: Emit intents that are validated by the `RulesAgent`.

## 3. Technical Enhancements

### A. TypeScript & Performance
- **Effect-TS Integration**: Use `Effect` for better error handling, concurrency, and dependency injection across the monorepo.
- **WebWorker/Thread Offloading**: Run agent cognition off the main API thread to ensure the "World Heartbeat" remains stable.
- **Zod-First Schema Generation**: Unified schema source of truth that generates both DB migrations and LLM Tool definitions.

### B. The "God Mode" Dashboard (DX)
- **Live Trace Visualization**: A React Flow-based view showing agent thought processes, memory retrievals, and state updates in real-time.
- **Time Travel Debugging**: Leveraging the event-sourced nature of the engine to replay world events and see where an agent "lost its mind".

## 4. LLM RPG Specific Patterns

### A. Dynamic World Generation
Move beyond static JSON data. Implement a **Generator Service** that:
- Uses LLMs to procedurally generate room descriptions, NPC backstories, and quest lines on-demand.
- Maintains consistency via a "World Bible" stored in the Knowledge Graph.

### B. Multi-Modal Sensory Input
Instead of just text, agents receive:
- **Visual**: Minimalist grid/coordinate maps.
- **Audio**: "Hearing" distance-based events (e.g., "You hear a crash from the North").
- **Emotional**: Metadata attached to speech (tone, intent, hidden agendas).

### C. Emergent Gameplay via Utility AI
Combine LLMs with traditional Utility AI (Needs/Desires).
- NPCs have "Hunger", "Boredom", and "Ambition" stats.
- LLMs are used to *decide how to fulfill* these needs, creating less predictable and more organic behavior.

## 5. Phased Implementation Strategy

1.  **Phase 1: The Event Bus**: Introduce a lightweight event emitter for world actions.
2.  **Phase 2: Persistent Slices**: Move state slices from `StateManager` to a persistent DB while keeping the `StateManager` as an L1 cache.
3.  **Phase 3: Autonomous Loops**: Give NPCs a "heartbeat" so they can act without player input.
4.  **Phase 4: Multi-Model Orchestration**: Route different agent tasks to different LLMs based on cost and complexity.

---
*Created by Cascade (Jan 2026)*
