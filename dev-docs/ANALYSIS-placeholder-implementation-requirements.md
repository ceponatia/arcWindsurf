# Placeholder Implementation Requirements Analysis

**Generated**: January 30, 2026
**Purpose**: Detailed analysis of what's needed to turn placeholder code into functional implementations

---

## Executive Summary

| Placeholder | Complexity | Existing Infrastructure | Primary Work |
|-------------|------------|------------------------|--------------|
| TurnOrchestrator - NPC Response | Low | CognitionLayer exists | Wire existing code |
| TurnOrchestrator - Ambient Narration | Medium | Detailed task spec exists | Build AmbientCollector |
| DialogueService | High | None | Design dialogue tree system |
| FactionService | Medium | DB supports faction entities | Add relationship tables |
| Scheduler | Low | Schedule resolution exists | Wire to time ticks |
| RulesEngine/Validators | Medium | Interface defined | Define game rules |
| Tool Handlers (examine/navigate/use) | Medium | SessionToolHandler pattern exists | Implement handlers |

---

## 1. TurnOrchestrator - NPC Response

**Status**: Wiring task only - existing infrastructure available

### What Exists

1. **CognitionLayer** ([packages/actors/src/npc/cognition.ts](packages/actors/src/npc/cognition.ts))
   - `decideLLM(context, profile, llmProvider)` - Full LLM-backed NPC decision making
   - `decideSync(context)` - Rule-based fallback
   - Timeout handling with 2-second threshold
   - Falls back gracefully on LLM failure

2. **NPC Prompts** ([packages/actors/src/npc/prompts.ts](packages/actors/src/npc/prompts.ts))
   - `NPC_DECISION_SYSTEM_PROMPT` - Instructs NPC behavior
   - `buildNpcCognitionPrompt()` - Builds context from perception, state, and profile

3. **NpcMachine** ([packages/actors/src/npc/npc-machine.ts](packages/actors/src/npc/npc-machine.ts))
   - XState machine with perceive → think → act flow
   - Already wired to use `llmDecision` actor

### What's Needed

1. **Wire TurnOrchestrator.generateNpcResponse()** to use CognitionLayer:

```typescript
// In turn-orchestrator.ts
import { CognitionLayer } from '@minimal-rpg/actors';
import { getCharacterProfile, getActorState } from '@minimal-rpg/db'; // repository calls

private async generateNpcResponse(
  focusedNpcId: string | null,
  playerMessage: string,
  sessionId: string
): Promise<string | null> {
  if (!focusedNpcId) return null;

  // 1. Get NPC profile and state from DB
  const profile = await getCharacterProfile(focusedNpcId);
  const actorState = await getActorState(sessionId, focusedNpcId);

  // 2. Build cognition context
  const context: CognitionContext = {
    perception: {
      relevantEvents: [{ type: 'SPOKE', content: playerMessage, actorId: 'player' }],
      nearbyActors: [],
      currentLocation: actorState.locationId,
    },
    state: actorState,
    availableActions: ['SPEAK_INTENT'],
  };

  // 3. Call LLM cognition
  const result = await CognitionLayer.decideLLM(context, profile, this.llmProvider);
  return result?.intent?.content ?? null;
}
```

### Effort Estimate: 2-4 hours

---

## 2. TurnOrchestrator - Ambient Narration (AmbientCollector)

**Status**: Detailed implementation spec exists, needs to be built

### What Exists

1. **Task Specification** ([dev-docs/010-living-world-game-loop/tasks/TASK-004-implement-ambient-collector.md](dev-docs/010-living-world-game-loop/tasks/TASK-004-implement-ambient-collector.md))
   - Full interface design
   - Implementation steps with code examples
   - Priority assignment logic for NPC tiers
   - Narration generation patterns

2. **Encounter Service** ([packages/api/src/services/encounter-service.ts](packages/api/src/services/encounter-service.ts))
   - `generateNpcEntranceNarration()` - Already generates entrance text
   - `generateNpcExitNarration()` - Already generates exit text
   - Scene description generation

3. **WorldBus** - Events flow through the bus and could be collected

### What's Needed

1. **Create AmbientCollector service** (new file):
   - Filter WorldBus events by location and focused NPCs
   - Assign priority based on NPC tier (major/minor/background)
   - Convert MOVED events to entrance/exit narrations
   - Generate activity descriptions for background NPCs
   - Respect verbosity settings

2. **State Changes Table** ([TASK-006](dev-docs/010-living-world-game-loop/tasks/TASK-006-state-changes-table.md)):
   - Track ephemeral background NPC state changes
   - Support ambient narration queries
   - Implement pruning for session saves

### Effort Estimate: 8-12 hours (following existing spec)

---

## 3. DialogueService

**Status**: Requires new system design

### What Exists

- Placeholder service with interface defined
- Character profiles with personality data
- LLM infrastructure that could power dynamic dialogue

### What's Needed

#### Option A: Dialogue Trees (Data-Driven)

1. **Schema Design**:

   ```typescript
   interface DialogueNode {
     id: string;
     npcLine: string;
     conditions?: DialogueCondition[]; // relationship level, quest state, etc.
     options: DialogueOption[];
   }

   interface DialogueOption {
     playerText: string;
     nextNodeId: string | null;
     effects?: DialogueEffect[]; // reputation changes, quest triggers
   }
   ```

2. **DB Tables**:
   - `dialogue_trees` - Store node graphs per NPC/topic
   - `dialogue_state` - Track player progress in conversations

3. **Resolution Logic**:
   - Match topic from player input
   - Evaluate conditions for node selection
   - Track conversation state

#### Option B: LLM-Driven (Dynamic)

- Use existing CognitionLayer with dialogue-specific prompts
- Store conversation history for consistency
- Add guardrails for key plot points

#### Option C: Hybrid

- Key story moments use dialogue trees
- Casual conversation uses LLM
- Best of both worlds

### Effort Estimate: 20-40 hours (depending on approach)

---

## 4. FactionService

**Status**: Partial infrastructure exists, needs relationship storage

### What Exists

1. **Entity Profiles Table** supports factions:

   ```sql
   entity_type TEXT NOT NULL, -- 'character', 'setting', 'item', 'faction', 'persona'
   ```

2. **World Sim State** has flexible container:

   ```sql
   state_json JSONB NOT NULL DEFAULT '{}'
   -- Flexible container for additional state: weather, factions, quests, etc.
   ```

### What's Needed

1. **Faction Relationship Table**:

   ```sql
   CREATE TABLE faction_relationships (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     faction_a_id UUID REFERENCES entity_profiles(id),
     faction_b_id UUID REFERENCES entity_profiles(id),
     relationship INTEGER NOT NULL DEFAULT 0, -- -100 to 100
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(faction_a_id, faction_b_id)
   );
   ```

2. **Actor Reputation Table**:

   ```sql
   CREATE TABLE actor_faction_reputation (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_id UUID REFERENCES sessions(id),
     actor_id TEXT NOT NULL,
     faction_id UUID REFERENCES entity_profiles(id),
     reputation INTEGER NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(session_id, actor_id, faction_id)
   );
   ```

3. **Service Implementation**:

   ```typescript
   static async getRelationship(factionA: string, factionB: string): Promise<number> {
     const row = await drizzle.select()
       .from(factionRelationships)
       .where(/* bidirectional lookup */);
     return row?.relationship ?? 0;
   }

   static async updateReputation(sessionId: string, actorId: string, factionId: string, delta: number): Promise<void> {
     await drizzle.insert(actorFactionReputation)
       .values({ sessionId, actorId, factionId, reputation: delta })
       .onConflictDoUpdate({ reputation: sql`reputation + ${delta}` });
   }
   ```

### Effort Estimate: 8-12 hours

---

## 5. Scheduler

**Status**: Core logic exists, needs wiring

### What Exists

1. **Schedule Resolution** ([packages/api/src/services/schedule-service.ts](packages/api/src/services/schedule-service.ts)):
   - `resolveNpcScheduleAtTime()` - Resolves NPC location from schedule
   - `resolveNpcSchedulesBatch()` - Batch resolution for multiple NPCs
   - `checkNpcAvailability()` - Checks if NPC is interruptible
   - `getNpcsAtLocationBySchedule()` - Find NPCs at a location

2. **Schedule Types** ([packages/schemas/src/schedule/types.ts](packages/schemas/src/schedule/types.ts)):
   - Full schedule slot definitions
   - Choice-based destinations with weighted options
   - Override conditions
   - Template system with placeholders

3. **Schedule Templates** ([packages/schemas/src/schedule/defaults.ts](packages/schemas/src/schedule/defaults.ts)):
   - Shopkeeper, Guard, Tavern Keeper, Noble, Wanderer templates
   - Common activities (sleeping, working, eating, etc.)

4. **Tick Emitter** ([packages/services/src/time/tick-emitter.ts](packages/services/src/time/tick-emitter.ts)):
   - Emits TICK events to WorldBus

### What's Needed

1. **Wire Scheduler.processSchedules()** to use schedule-service:

```typescript
import { resolveNpcSchedulesBatch } from '@api/services/schedule-service';
import { worldBus } from '@minimal-rpg/bus';
import { getSessionNpcs, getGameTime } from '@minimal-rpg/db';

static async processSchedules(sessionId: string, tick: number): Promise<void> {
  // 1. Get current game time
  const gameTime = await getGameTime(sessionId);

  // 2. Get all NPCs with schedules for this session
  const npcs = await getSessionNpcs(sessionId);

  // 3. Resolve schedules
  const { locationStates, resolutions } = resolveNpcSchedulesBatch(npcs, {
    currentTime: gameTime,
  });

  // 4. Compare with current locations, emit MOVE_INTENT for changes
  for (const [npcId, newState] of locationStates) {
    const currentLocation = npcs.find(n => n.npcId === npcId)?.locationId;
    if (currentLocation !== newState.locationId) {
      await worldBus.emit({
        type: 'MOVE_INTENT',
        actorId: npcId,
        fromLocationId: currentLocation,
        toLocationId: newState.locationId,
        sessionId,
        timestamp: new Date(),
      });
    }
  }
}
```

2. **Subscribe to TICK events**:

   ```typescript
   // In API startup
   worldBus.subscribe(async (event) => {
     if (event.type === 'TICK') {
       await Scheduler.processSchedules(event.sessionId, event.tick);
     }
   });
   ```

### Effort Estimate: 4-6 hours

---

## 6. RulesEngine / Validators

**Status**: Interface defined, needs rule logic

### What Exists

- RulesEngine subscribes to WorldBus events
- Validators has interface for action validation
- ValidationContext type defined

### What's Needed

1. **Define validation rules per action type**:

```typescript
const VALIDATION_RULES: Record<string, (action: WorldEvent, ctx: ValidationContext) => ValidationResult> = {
  'MOVE_INTENT': (action, ctx) => {
    // Check if target location is accessible from current location
    // Check if path is not blocked
    return { valid: true, reason: '' };
  },

  'SPEAK_INTENT': (action, ctx) => {
    // Check if target NPC is in same location
    // Check if NPC is interruptible
    return { valid: true, reason: '' };
  },

  'USE_ITEM_INTENT': (action, ctx) => {
    // Check if actor has item in inventory
    // Check if item is usable on target
    return { valid: true, reason: '' };
  },
};
```

2. **Connect RulesEngine to reject invalid intents**:

   ```typescript
   private handler = async (event: WorldEvent): Promise<void> => {
     if (!event.type.endsWith('_INTENT')) return;

     const context = await this.buildContext(event.sessionId);
     const result = Validators.validateAction(event, context);

     if (!result.valid) {
       await worldBus.emit({
         type: 'ACTION_REJECTED',
         originalEvent: event,
         reason: result.reason,
         sessionId: event.sessionId,
         timestamp: new Date(),
       });
     }
   };
   ```

### Effort Estimate: 8-16 hours (depends on rule complexity)

---

## 7. Tool Handlers (examine_object, navigate_player, use_item)

**Status**: Pattern exists, handlers need implementation

### What Exists

1. **SessionToolHandler** ([packages/api/src/game/tools/handlers.ts](packages/api/src/game/tools/handlers.ts)):
   - Full handler pattern with execute(), switch on tool name
   - DB integration for session queries
   - Error handling pattern

2. **Tool Definitions** exist with schemas:
   - `EXAMINE_OBJECT_TOOL` - target, focus parameters
   - `NAVIGATE_PLAYER_TOOL` - direction, destination parameters
   - `USE_ITEM_TOOL` - item_name, target, action parameters

### What's Needed

1. **Extend SessionToolHandler or create GameplayToolHandler**:

```typescript
case 'examine_object':
  return this.executeExamineObject(args as ExamineObjectArgs);

private async executeExamineObject(args: ExamineObjectArgs): Promise<ToolResult> {
  // 1. Find object in current location or inventory
  const object = await findObject(this.sessionId, args.target);
  if (!object) {
    return { success: false, error: `Cannot find "${args.target}" to examine.` };
  }

  // 2. Get detailed description (possibly LLM-generated for focus)
  const description = args.focus
    ? await generateFocusedDescription(object, args.focus)
    : object.description;

  return { success: true, description, object };
}

case 'navigate_player':
  return this.executeNavigatePlayer(args as NavigatePlayerArgs);

private async executeNavigatePlayer(args: NavigatePlayerArgs): Promise<ToolResult> {
  if (args.describe_only) {
    const exits = await getLocationExits(this.sessionId, this.locationId);
    return { success: true, exits, narrative: formatExits(exits) };
  }

  // Emit MOVE_INTENT to WorldBus
  const targetLocation = await resolveDestination(args.direction, args.destination);
  await worldBus.emit({
    type: 'MOVE_INTENT',
    actorId: 'player',
    toLocationId: targetLocation,
    sessionId: this.sessionId,
  });

  return { success: true, moved: true, newLocationId: targetLocation };
}

case 'use_item':
  return this.executeUseItem(args as UseItemArgs);

private async executeUseItem(args: UseItemArgs): Promise<ToolResult> {
  // 1. Check player has item
  const item = await getInventoryItem(this.sessionId, 'player', args.item_name);
  if (!item) {
    return { success: false, error: `You don't have "${args.item_name}".` };
  }

  // 2. Validate usage
  const usage = validateItemUsage(item, args.action, args.target);
  if (!usage.valid) {
    return { success: false, error: usage.reason };
  }

  // 3. Apply effects
  const effects = await applyItemEffects(item, args.action, args.target);

  return { success: true, effects, narrative: formatEffects(effects) };
}
```

### Effort Estimate: 12-20 hours

---

## Implementation Priority

Based on impact and dependencies:

1. **TurnOrchestrator - NPC Response** (Low effort, high impact)
   - Unblocks playable game sessions
   - Uses existing infrastructure

2. **Scheduler** (Low effort, medium impact)
   - Enables NPC autonomy
   - Uses existing schedule-service

3. **AmbientCollector** (Medium effort, high impact)
   - Creates immersive world feel
   - Has detailed implementation spec

4. **Tool Handlers** (Medium effort, high impact)
   - Enables LLM-driven gameplay actions
   - Pattern already established

5. **FactionService** (Medium effort, medium impact)
   - Enables faction-based gameplay
   - Requires DB schema additions

6. **RulesEngine/Validators** (Medium effort, medium impact)
   - Enforces game rules
   - Prevents invalid actions

7. **DialogueService** (High effort, medium impact)
   - Design decision needed first
   - Could start with LLM-only approach

---

## Quick Wins (Can be done in < 1 day each)

1. Wire TurnOrchestrator to CognitionLayer
2. Wire Scheduler to schedule-service
3. Create basic tool handler stubs with error messages
4. Add faction relationship table to DB

## Next Steps

1. Decide on DialogueService approach (tree vs LLM vs hybrid)
2. Prioritize AmbientCollector following existing TASK-004 spec
3. Create DB migration for faction tables
4. Set up integration tests for each component
