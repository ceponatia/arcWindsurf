# @minimal-rpg/actors

## Purpose

XState-based autonomous actors with perception, cognition, and action loops. Implements the actor model for NPCs and players, enabling them to react to world events and make decisions independently.

## Scope

- Base actor infrastructure (lifecycle, state machines)
- NPC actors with perception/cognition/action layers
- Player actors (multiplayer-ready)
- Actor registry for spawn/despawn management
- WorldBus integration for event-driven behavior
- Memory and context management for actors

## Core Components

### Base Layer (`src/base/`)

- Actor interface and base implementation
- Lifecycle management (start, stop, pause)
- State machine foundations
- Common actor types and utilities

### NPC Layer (`src/npc/`)

- NPC state machine (XState)
- Perception: Filter and process WorldBus events
- Cognition: Decision-making and intent generation
- Action: Execute and emit intents
- Memory: Short-term context and long-term recall

### Player Layer (`src/player/`)

- Player state machine (for multiplayer)
- Input handling and validation
- Player-specific actions

### Registry (`src/registry/`)

- Actor spawning and despawning
- Actor lookup and management
- Session-scoped actor lifecycle

## Actor State Machine

NPCs cycle through these states:
1. **idle** - Waiting for relevant events
2. **perceiving** - Processing incoming events
3. **thinking** - Deciding on actions (may call LLM)
4. **acting** - Emitting intents to WorldBus
5. **waiting** - Cooldown or scheduled delay

## Package Connections

- **bus**: Subscribe to events, emit intents
- **schemas**: Event types, actor state schemas
- **services**: Query world state (location, proximity, time)

Actors should remain autonomous. Avoid tight coupling to specific services or game mechanics.
