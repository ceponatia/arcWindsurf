# Living World Game Loop - Status

**Last Updated**: January 21, 2026
**Overall Progress**: Planning Complete

---

## Phase 0: Schema Updates

| Task                                      | Status     | Notes                       |
| ----------------------------------------- | ---------- | --------------------------- |
| TASK-006: Add state_changes table         | 📋 Planned | Background NPC state deltas |
| TASK-007: Add session mode to projections | 📋 Planned | Combat/exploration modes    |

## Phase 1: Core Integration

| Task                                  | Status           | Notes                         |
| ------------------------------------- | ---------------- | ----------------------------- |
| TASK-001: Create TurnOrchestrator     | Ready for Review | Foundational service          |
| TASK-002: Implement IntentParser      | 📋 Planned       | Depends on TASK-001           |
| TASK-003: Wire /game/turn endpoint    | 📋 Planned       | Depends on TASK-001, TASK-002 |
| TASK-008: Turn-based time advancement | 📋 Planned       | Depends on TASK-001           |

## Phase 2: Ambient System

| Task                                   | Status     | Notes               |
| -------------------------------------- | ---------- | ------------------- |
| TASK-004: Implement AmbientCollector   | 📋 Planned |                     |
| TASK-005: Proximity interjection logic | 📋 Planned | Depends on TASK-004 |
| TASK-009: Response composer            | 📋 Planned |                     |
| TASK-010: Narrative mode toggle        | 📋 Planned |                     |

## Phase 3: Actor Lifecycle

| Task                                   | Status     | Notes |
| -------------------------------------- | ---------- | ----- |
| TASK-011: Lazy actor spawning          | 📋 Planned |       |
| TASK-012: Actor hibernation            | 📋 Planned |       |
| TASK-013: Batched background cognition | 📋 Planned |       |

## Phase 4: Frontend Integration

| Task                                     | Status     | Notes |
| ---------------------------------------- | ---------- | ----- |
| TASK-014: Game session chat component    | 📋 Planned |       |
| TASK-015: Ambient narration rendering    | 📋 Planned |       |
| TASK-016: Location transition animations | 📋 Planned |       |

---

## Legend

- 📋 Planned
- 🚧 In Progress
- ✅ Complete
- ⏸️ Blocked
- ❌ Cancelled

---

## Open Questions (Resolved)

All initial questions have been resolved. See PLAN-1.0 for details.

---

## Blockers

None currently.

---

## Decisions Made

| Date       | Decision                                     | Rationale                                                                         |
| ---------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| 2026-01-21 | Turn-based time advancement                  | Per user preference - time advances per chat turn, not real-time                  |
| 2026-01-21 | Unified natural language input               | Players type everything; system parses intent from natural language               |
| 2026-01-21 | Same-location background events in narration | Background NPCs at player's location appear as ambient narration                  |
| 2026-01-21 | Intelligent interjection filtering           | NPCs only interject when contextually relevant, based on LLM scoring              |
| 2026-01-21 | Player uses Persona schema                   | PersonaProfileSchema for player identity/appearance, no personality fields        |
| 2026-01-21 | NPCs aware of player occupation              | Interjection threshold raised when player is in active conversation               |
| 2026-01-21 | Combat uses separate turn system             | 6-second combat rounds vs 5-minute exploration turns                              |
| 2026-01-21 | Tiered persistence architecture              | Events table for major/minor, state_changes table for background NPC state deltas |
