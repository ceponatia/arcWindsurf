# Multi-LLM Governor Architecture (DeepSeek-Focused)

This document explores how Minimal RPG could leverage multiple DeepSeek instances (or models behind a single provider) to handle different responsibilities in the game, coordinated by a "governor" layer.

The core idea:

- A **Governor LLM** (or non-LLM orchestrator + small LLM) receives the player's input and high-level game state.
- It determines **intent** and which specialized LLM agents should be invoked (e.g., map/location, NPCs, rules, narration).
- Specialized LLM instances each maintain their own **focused context**, so their prompts stay small and coherent.
- The governor then **aggregates their outputs** into a final response for the player (and structured updates to game state).

This is primarily about **context partitioning** and **role specialization** to keep prompts efficient and behavior consistent as the game world grows.

## 1. Motivation and Feasibility

### 1.1. Why Multiple LLM Instances?

With a single monolithic prompt, we must:

- Stuff location, NPC, rules, and recent history into one context window.
- Rely on the model to self-organize reasoning about maps, NPC motivations, and rules.

By splitting responsibilities:

- Each agent works with a **narrow, stable context**:
  - Map agent sees location graph + movement/requested action.
  - NPC agents see their own profile + interaction history.
  - Rules agent sees character stats, items, and checks.
- We can evolve one subsystem (e.g., NPC memory) without inflating every prompt.

This is feasible because:

- The API layer already centralizes LLM calls behind provider modules (`packages/api/src/llm`).
- DeepSeek is accessible via OpenRouter now; nothing prevents **multiple sequential calls per turn** with different system prompts.

The main trade-offs are:

- **Latency**: more LLM calls per turn.
- **Complexity**: more orchestration code and prompt templates.

## 2. Roles and Responsibilities

### 2.1. Governor Layer

The governor is responsible for:

- Consuming **player input** + **session state** (location, flags, NPC states, etc.).
- Determining **intent**:
  - Movement, conversation, inspection, inventory, combat, meta-commands (save/quit), etc.
- Deciding which specialized agents to consult.
- Merging their responses into:
  - A single **user-facing narrative**.
  - A set of **structured updates** to game state.

The governor itself can be:

- Mostly deterministic code plus **small routing prompts** to a DeepSeek instance.
- Or a fully LLM-based planner that we constrain via structured outputs.

### 2.2. Specialized Agents

Potential LLM agents:

- **Map Agent** (location-focused):
  - Input: current node, requested movement/intent, map structure, location descriptions.
  - Output: whether movement is valid, any environment details, and suggested exits.
  - Context: limited to the local region/building/room cluster plus recent movement history.

- **NPC Agents** (per NPC or per conversation):
  - Input: NPC profile, recent dialog with player, relevant world events.
  - Output: NPC utterances, emotional state changes, relationship changes.
  - Context: only that NPC's long-term memory + last N turns.
  - We can:
    - Run **one LLM per NPC** in parallel (at least conceptually, even if calls are serialized in the API).
    - Or share a single NPC agent with a system prompt that says "You are NPC X" plus loaded memory.

- **Rules/Mechanics Agent** (optional):
  - Input: character stats, items, requested action, DC/difficulty.
  - Output: interpreted outcome, suggested consequences.
  - Alternatively, keep rules deterministic in code and just tell other agents the outcomes.

- **Narration/Stylistic Agent**:
  - Input: canonical events from map + NPC + rules.
  - Output: fluent, immersive narration tailored to the chosen style/setting.
  - This agent does not decide logic; it turns structured events into prose.

We may start with only **Map + NPC + Governor** and add more later.

## 3. High-Level Turn Flow

A single player turn could look like this:

1. **Input**: Player sends a message.
2. **Governor (intent detection)**:
   - Governor LLM (DeepSeek) receives:
     - Player utterance.
     - Summary of last few turns.
     - Minimal session state snapshot (location, recent actions, flags).
   - It returns a **structured intent** object, e.g.:
     - `intent: 'move' | 'talk' | 'inspect' | 'use_item' | 'meta' | ...`
     - `targets`: NPC IDs, items, or exits.
     - `notes`: short natural-language reasons.
3. **Routing & Agent Calls**:
   - Based on intent, the server decides which agents to call:
     - If `move` or location-sensitive: invoke Map Agent.
     - If `talk`: invoke one or more NPC Agents.
     - If `inspect` or `use_item`: involve Map + Rules/Inventory as needed.
4. **Agent Execution**:
   - For each selected agent, the server builds a **focused prompt**:
     - Pull only relevant data from schemas (location descriptions, NPC profiles) and session state.
   - Call DeepSeek with that prompt and parse a **structured response** (events, dialog, state suggestions).
5. **Aggregation**:
   - The server merges all agent outputs into a canonical **event list**, e.g.:
     - `events: { type: 'movement' | 'npc_dialog' | 'state_change' | ... }[]`.
   - It updates **authoritative state** in code (not left to the LLM).
6. **Final User Response**:
   - Either:
     - Use a dedicated Narration Agent to turn events into a nicely written response, or
     - Have the Governor generate the final text given event summaries.
   - Return both:
     - `messageForPlayer`: text.
     - `structuredChanges`: updated state fields.

This preserves context because each agent works in its own **narrow context window** and we avoid constant re-sending of all game data to a single monolithic prompt.

## 4. Architectural Sketch in Minimal RPG

### 4.1. Current Rough Layout (Simplified)

- `packages/schemas`: Zod schemas for characters, settings, and (soon) maps.
- `packages/api`:
  - `routes/` to handle HTTP requests.
  - `llm/` with provider wrappers (OpenRouter, DeepSeek, etc.).
  - `sessions/` and `db/` for session state and persistence.

### 4.2. Proposed Governor Module

Introduce a governor module under `packages/api/src/llm/governor/` with:

- `governorRouter.ts` (or similar): main orchestration function:
  - `handlePlayerTurn(session, playerMessage) -> { messageForPlayer, stateUpdates }`.
- Submodules:
  - `intentDetector.ts`: small DeepSeek prompt that produces structured intent.
  - `mapAgent.ts`: DeepSeek prompt for movement and location description.
  - `npcAgent.ts`: prompts for single NPC or multi-NPC interactions.
  - Optionally `narrationAgent.ts`: for final prose.

The governor function would:

1. Call `detectIntent()` with a **tiny prompt**.
2. Route to appropriate agents.
3. Aggregate outputs and update session state.
4. Call `composeNarration()` if using a narration agent.

### 4.3. Session State Extensions

Session state would gain more structure to support agents:

- `location`: current map node, visited nodes.
- `npcStates`: per-NPC memory pointers, emotional state sliders, relationship flags.
- `recentEvents`: last few canonical events for short-term context.
- `historySummaries`: optional LLM-generated rollups for long-term recall.

Agents do **not** own state; they propose changes which the governor validates and applies.

## 5. Prompt Design & Context Management

### 5.1. Governor / Intent Detector Prompt

- System: "You are an intent router for a text RPG. Classify what the player wants to do and identify targets..."
- Input:
  - The latest player message.
  - A short recap of the last 1–3 turns.
  - A minimal snapshot of location and active NPC names.
- Output format (JSON-like):
  - `intent`
  - `targets`
  - `confidence`

Because it sees only high-level summaries and a short slice of history, context remains small.

### 5.2. Map Agent Prompt

- System: "You manage spatial movement in a map-based RPG. You are given a graph of locations and must determine valid movement and environment details. You never contradict the map."
- Input:
  - Current node info, neighboring nodes, exits.
  - Player's requested direction or action.
  - Optional map-related flags (locked doors, hazards).
- Output:
  - `movementResult: 'success' | 'blocked' | 'invalid'`
  - `destinationNodeId?`
  - Short description of the new location or reason for block.

### 5.3. NPC Agent Prompt

- System: "You are NPC X in a roleplaying game. Respond in-character given your profile and conversation history."
- Input:
  - NPC profile (from schemas and domain data).
  - Short excerpt of recent dialog.
  - Relevant world facts (e.g., flags related to this NPC).
- Output:
  - `utterance`: what NPC says.
  - `stateChanges?`: proposed updates (trust +1, anger +2, etc.).

### 5.4. Narration Agent Prompt (Optional)

- System: "You are a narrator. Given a list of events, describe them immersively..."
- Input:
  - `events` array (movement, NPC dialog, world changes).
  - Desired tone / style.
- Output:
  - Single narrated paragraph (or multiple segments) to send to the player.

## 6. Performance and Cost Considerations

### 6.1. Latency

- Multiple DeepSeek calls per turn will increase latency.
- Mitigations:
  - Combine roles where possible (e.g., Map + Narration in one call in simple cases).
  - Avoid unnecessary agent calls when intent is clear and simple.
  - Cache static descriptions (locations, NPC bios) outside of LLM calls.

### 6.2. Token + Cost

- Narrow context **reduces tokens per call**.
- Multiple calls increase total tokens, but each is more focused and may be cheaper than a single massive prompt.
- We can introduce **tiers**:
  - Lightweight interaction mode: fewer agents, less structure.
  - Rich storytelling mode: full multi-agent pipeline.

## 7. Incremental Adoption Plan

Given current architecture, a plausible path:

1. **Phase 1 – Intent + Map Agent**
   - Add `intentDetector` and `mapAgent`.
   - Keep NPC/dialog as a single DeepSeek call like today, but governed by the intent/map decisions.
2. **Phase 2 – NPC Agentization**
   - Introduce an NPC agent that takes a single NPC + context.
   - For group scenes, call it multiple times or extend it to multi-speaker handling.
3. **Phase 3 – Narration Agent & Rules**
   - Split narrative flair into its own agent that consumes structured events.
   - Optionally add a rules agent if mechanical complexity grows.

At each stage, we can fall back to the existing **single-LLM** pipeline if something fails.

## 8. Summary

- Using multiple DeepSeek instances/roles is **feasible** with the current Minimal RPG stack.
- A governor layer can:
  - Interpret intent.
  - Route to specialized agents (Map, NPCs, Rules).
  - Merge their outputs into a single, coherent player response.
- Benefits:
  - Better context management.
  - Clear separation of concerns.
  - Flexibility to grow features (maps, NPC depth, rules) without exploding prompt size.
- Costs:
  - Increased complexity in the API.
  - Higher latency and token usage per turn (but potentially more predictable and controllable).

This design provides a conceptual blueprint for evolving Minimal RPG into a multi-agent, DeepSeek-driven system while keeping core logic and state under server control.
