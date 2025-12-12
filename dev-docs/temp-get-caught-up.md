# Optimal Development Order

Based on dependencies and the current implementation status:

## Phase 1: Complete Tool Calling (Blocking Many Features)

Per 24-tool-calling-integration-plan.md:

- Phase 4: Tool-Based Turn Handler - Use tools for all turn processing
- Phase 5: Governor Integration - Hybrid mode with fallback
- Phase 6: Full Rollout - Remove classic handler

Why first: Tool calling is the foundation for NPC behaviors, time tools, environment tools - everything below depends on tools working reliably.

## Phase 2: Location Persistence Layer

Per 05-locations-schema.md - "not yet fully integrated":

- Create session_npc_location_state table
- Wire location schemas into session runtime
- Add location tracking to governor context

Why second: NPC schedules, time-based behaviors, and encounters ALL require knowing where NPCs are. No location layer = no schedules.

## Phase 3: Time System Foundation

Per 26-time-system.md:

- Add GameTime utilities and schema
- Expand session_time_state with calendar fields
- Add advance_time tool

Why third: Schedules, routines, and behaviors are all time-dependent. Need time before schedules.

## Phase 4: NPC Tier System

Per 30-npc-tiers-and-promotion.md:

- Add tier field to character schema/instances
- Implement tier config (major/minor/background/transient)
- Add promotion trigger logic

Why fourth: Different tiers get different schedule/simulation treatment. Define tiers before implementing schedules.

## Phase 5: NPC Schedules

Per 27-npc-schedules-and-routines.md (once fixed):

- Add NpcScheduleSchema to schemas
- Implement schedule resolution (slots, choices, conditions)
- Add schedule templates

Why fifth: Depends on locations, time, and tiers all being in place.

## Phase 6: NPC Simulation & Encounters

Per [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) and [32-npc-encounters-and-occupancy.md](32-npc-encounters-and-occupancy.md):

- Implement lazy simulation engine
- Add occupancy calculation
- Create encounter narration

## Phase 7: Affinity & Relationships

Per 28-affinity-and-relationship-dynamics.md:

- Add relationship dimensions to state
- Implement affinity change mechanics
- Wire into NPC dialogue/behavior
