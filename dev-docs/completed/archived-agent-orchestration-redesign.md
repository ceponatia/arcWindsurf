# Agent Orchestration Redesign

This document tracks the ongoing redesign of the agent system to improve response quality and enable true multi-NPC interactions.

## Problem Statement

The current architecture routes player input through an intent detector that sends requests to either:

- **NPC Agent**: Triggered on `talk` and `narrate` intents
- **Sensory Agent**: Triggered on sensory-related intents (smell, touch, etc.)

This results in:

1. Over-reliance on sensory descriptions ("the air smells floral") without narrative progression
2. Fragmented responses that don't blend sensory detail with story
3. Unpredictable quality due to rigid intent-based routing

## Design Goals

1. **Containerized NPC agents** - Each NPC has isolated context (memories, goals, personality) to prevent hallucination and context pollution
2. **Unified response composition** - Sensory details woven naturally into narrative, not separate
3. **Multi-NPC awareness** - Characters can observe each other's actions without reading minds
4. **Player agency preservation** - NPCs respond to player input without railroading the plot

---

## Proposed Architecture

### Turn Processing Pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│                     Turn Processing                         │
├─────────────────────────────────────────────────────────────┤
│  1. Intent Detection (what is player trying to do?)         │
│  2. Sensory Enrichment (structured env/body state)          │
│  3. Scene State Update (who's present, recent actions)      │
├─────────────────────────────────────────────────────────────┤
│  4. NPC Evaluation Phase (parallel, cheap calls)            │
│     Each NPC: "Would I respond? How urgently?"              │
│     Output: { respond: bool, priority: float, type: str }   │
├─────────────────────────────────────────────────────────────┤
│  5. Governor Selection                                      │
│     Pick 0-2 NPCs to actually respond this turn             │
│     Consider: priority, scene pacing, narrative flow        │
├─────────────────────────────────────────────────────────────┤
│  6. NPC Response Phase (sequential for selected NPCs)       │
│     Each selected NPC generates full response               │
│     Scene state updated between each                        │
├─────────────────────────────────────────────────────────────┤
│  7. Response Assembly                                       │
│     Combine NPC responses + any environmental narration     │
│     Format as discrete blocks or woven narrative            │
└─────────────────────────────────────────────────────────────┘
```

### Sensory Agent → Context Enricher

#### Current Problem

The sensory agent writes prose descriptions ("the air smells of jasmine and sweat"). The NPC agent writes dialogue/actions. The Governor tries to combine them. Result: awkward concatenation that reads like two different writers.

#### Why Governor Composition Fails

1. Two prose outputs have different voices/styles
2. Governor is asked to "blend" but ends up copy-pasting
3. Sensory descriptions feel bolted-on, not woven into narrative
4. No amount of prompt tuning fixes this - it's architectural

#### The Fix: Single Writer with Rich Context

Instead of:

```text
Sensory Agent → prose description → Governor
NPC Agent     → dialogue/actions  → Governor → concatenated mess
```

Do this:

```text
Sensory Data Prep (no LLM) → structured context ─┐
                                                  ├→ NPC Agent → unified response
Scene State, Intent, etc. ────────────────────────┘
```

The NPC agent is the **sole prose composer**. It receives sensory data as structured input and decides how (or whether) to incorporate it into its narrative.

**What Sensory Data Prep Provides:**

This is NOT an LLM call. It's a data retrieval + formatting step.

```typescript
interface SensoryContextForNpc {
  // What sensory details are AVAILABLE (from DB)
  available: {
    smell?: {
      sources: Array<{
        entity: string; // "Taylor", "the room", "your own hands"
        bodyPart?: string; // "hair", "feet", "armpits"
        scent: string; // from DB: "jasmine and sweat"
        intensity: number; // 0-1 scale
        freshness?: string; // "fresh", "lingering", "stale"
      }>;
    };
    touch?: {
      surfaces: Array<{
        entity: string;
        bodyPart?: string;
        texture: string; // from DB
        temperature?: string;
        moisture?: string;
      }>;
    };
    // ... other senses
  };

  // What the PLAYER is focusing on (from intent/action)
  playerFocus?: {
    sense: 'smell' | 'touch' | 'sight' | 'sound' | 'taste';
    target?: string; // "Taylor's hair", "the food"
    bodyPart?: string;
  };

  // Relevance hints for the NPC
  narrativeHints: {
    playerIsSniffing: boolean;
    playerIsTouching: boolean;
    recentSensoryAction: boolean;
    // NPC can use these to decide whether to describe sensory details
  };
}
```

#### How NPC Agent Uses This

The NPC agent's prompt includes the sensory context as structured data:

```text
## Sensory Context (available for narrative use)

The player is currently focusing on: smell (Taylor's hair)

Available sensory data:
- Taylor's hair: jasmine shampoo, faint sweat, intensity 0.7
- Room ambient: coffee, old books

You may weave these details into your response naturally, or ignore them
if they don't fit the narrative moment. The player's focus suggests they
want sensory description, but you control HOW it's delivered.
```

The NPC agent then writes something like:

> Taylor tilts her head, and you catch the scent of jasmine from her hair—expensive shampoo, but underneath it, the faint salt of exertion. She's been nervous. "Why do you ask?" she says, her voice carefully neutral.

This is **one coherent voice** that integrates sensory detail with character action and dialogue.

#### Comparison: Old vs New

| Aspect              | Old (Sensory Agent writes prose) | New (Sensory as data) |
| ------------------- | -------------------------------- | --------------------- |
| LLM calls           | 2+ (sensory + NPC + governor)    | 1 (NPC only)          |
| Voice consistency   | Poor (multiple writers)          | Good (single writer)  |
| Sensory integration | Bolted-on                        | Woven in              |
| Governor role       | Awkward compositor               | Eliminated or minimal |
| Latency             | Higher                           | Lower                 |
| Cost                | Higher                           | Lower                 |

**What Happens to Sensory Agent Code?**

The "sensory agent" becomes a **data preparation utility**, not an LLM agent:

```typescript
// OLD: LLM agent that writes prose
class SensoryAgent {
  async generateResponse(context: SensoryContext): Promise<string> {
    return await llm.complete(buildSensoryPrompt(context));
  }
}

// NEW: Data utility that retrieves and formats context
class SensoryContextBuilder {
  async buildContext(
    sessionId: string,
    targetEntity: string,
    playerFocus?: { sense: string; bodyPart?: string }
  ): Promise<SensoryContextForNpc> {
    // 1. Query DB for body attributes and sensory data
    const bodyData = await getBodyAttributes(targetEntity);
    const environmentData = await getEnvironmentSensory(sessionId);

    // 2. Format as structured context (no LLM needed)
    return {
      available: {
        smell: this.extractSmellData(bodyData, environmentData),
        touch: this.extractTouchData(bodyData, environmentData),
        // ...
      },
      playerFocus,
      narrativeHints: {
        playerIsSniffing: playerFocus?.sense === 'smell',
        // ...
      },
    };
  }
}
```

#### When IS an LLM Needed for Sensory?

Only in edge cases:

1. **Dynamic scent generation**: If the DB doesn't have a specific scent for a body part, LLM could generate one based on character profile + situation
2. **Scent mixing**: If multiple sources combine, LLM could describe the mixture
3. **Unusual requests**: Player asks to smell something not in DB

But these could be **on-demand LLM calls within the NPC agent's context**, not a separate agent.

#### Updated Turn Pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│                     Turn Processing                         │
├─────────────────────────────────────────────────────────────┤
│  1. Pre-Parser (segments + observability)                   │
│  2. Intent Detection (what player wants to do)              │
│  3. Sensory Context Build (DB query, NO LLM)                │
│  4. Scene State Update (who's present, recent actions)      │
├─────────────────────────────────────────────────────────────┤
│  5. NPC Evaluation Phase (parallel, cheap calls)            │
│     Each NPC: "Would I respond? How urgently?"              │
├─────────────────────────────────────────────────────────────┤
│  6. Governor Selection                                       │
│     Pick 0-2 NPCs to actually respond this turn             │
├─────────────────────────────────────────────────────────────┤
│  7. NPC Response Phase (THE prose writing step)             │
│     Selected NPC receives:                                   │
│     - Player's observable segments                          │
│     - Intent                                                │
│     - Sensory context (structured data)                     │
│     - Scene state                                           │
│     - NPC's private context (memories, goals, personality)  │
│     NPC writes COMPLETE response including sensory          │
├─────────────────────────────────────────────────────────────┤
│  8. Response Assembly (minimal)                              │
│     - Just format multiple NPC responses if needed          │
│     - Add scene dividers if using discrete block mode       │
│     - NO prose rewriting                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Key Insight: Governor's New Role

The Governor should NOT be a prose writer. It should be:

1. **Orchestrator**: Decides which NPCs respond
2. **Formatter**: Combines NPC outputs (without rewriting)
3. **Validator**: Checks for conflicts/contradictions

If we need prose polish, that's a **post-processing step** (optional), not core composition.

### NPC Container Model

Each NPC agent operates as an isolated container:

```text
NPC Container:
├── Personality (static-ish traits, voice, mannerisms)
├── Goals (can evolve based on events)
├── Memories (isolated RAG per NPC)
├── Current emotional state
├── Sensory perception (filtered by what they can actually perceive)
└── Agency (ability to act on own initiative)
```

### Context Separation

| Context Type  | Scope                       | Examples                                            |
| ------------- | --------------------------- | --------------------------------------------------- |
| **Private**   | Per-NPC only                | Memories, internal thoughts, goals, emotional state |
| **Public**    | All NPCs in scene           | Spoken words, visible actions, environmental state  |
| **Perceived** | Filtered by presence/senses | What this NPC can see/hear from their position      |

---

## Input Analysis: Intent Detection + Pre-Parser

### Current Intent Detector

The existing `RuleBasedIntentDetector` in `packages/governor/src/intents/intent-detector.ts` uses keyword/pattern matching to determine **what the player is trying to do**:

- Keywords like "walk", "go", "run" → `move` intent
- Keywords like "talk", "say", "ask" → `talk` intent
- Keywords like "smell", "sniff" → `smell` intent (routed to sensory agent)

This is **intent classification** - determining the action type.

### The Pre-Parser's Role

The pre-parser addresses a different question: **what parts of this input are observable by NPCs?**

| Component       | Question Answered                  | Output                                   |
| --------------- | ---------------------------------- | ---------------------------------------- |
| Intent Detector | "What does the player want to do?" | `{ type: 'talk', confidence: 0.85 }`     |
| Pre-Parser      | "What can NPCs perceive?"          | `{ segments: [...], observable: [...] }` |

These are **complementary**, not competing.

### Integration Options

#### Option A: Sequential (Pre-Parser First)

```text
Player Input
    ↓
┌──────────────────────┐
│     Pre-Parser       │  → Segments with observability
│   (LLM or hybrid)    │
└──────────────────────┘
    ↓
┌──────────────────────┐
│   Intent Detector    │  → Intent per segment (or dominant intent)
│    (rule-based)      │
└──────────────────────┘
    ↓
Governor + Agents
```

**Pros**: Intent detection runs on clean, segmented input
**Cons**: Two sequential steps, slightly slower

#### Option B: Parallel (Both Run Simultaneously)

```text
                    ┌──────────────────────┐
                    │     Pre-Parser       │ → Segments
Player Input ──────┼──────────────────────┼──────→ Merge → Governor
                    │   Intent Detector    │ → Intent
                    └──────────────────────┘
```

**Pros**: Faster (parallel execution), independent concerns
**Cons**: Need to reconcile if intent doesn't match segments

#### Option C: Merged Input Analyzer (Single LLM Call)

```text
Player Input
    ↓
┌──────────────────────────────────────────┐
│            Input Analyzer                 │
│  (LLM call that does both tasks)          │
│                                           │
│  Output: {                                │
│    intent: { type, confidence },          │
│    segments: [{ type, content, observable }] │
│  }                                        │
└──────────────────────────────────────────┘
    ↓
Governor + Agents
```

**Pros**: Single LLM call, unified context
**Cons**: More complex prompt, loses rule-based speed for intent

### Recommendation: Option A (Sequential) with Caching

1. **Pre-parser runs first** (LLM call with heuristic fallback)
2. **Intent detector runs on segments** (fast, rule-based)
3. **Primary intent** = intent of first observable segment, or dominant intent across all

This keeps intent detection fast (no LLM needed) while adding the observability layer.

### Development Feedback Loop

During development, we should display the pre-parser output in the UI:

```typescript
interface DebugPreParserOutput {
  rawInput: string;
  segments: ParsedSegment[];
  primaryIntent: IntentType;
  confidence: number;
  warnings: string[]; // e.g., "Ambiguous: '*I feel*' could be thought or action"
}
```

This allows tuning by:

- Seeing what the system thinks is observable
- Catching misclassifications early
- Adjusting heuristics or prompt

### Dev Mode: Interactive Turn Debugging

When `governorDevMode: true`, the turn processing pipeline should pause after the analysis phase and allow manual intervention before NPC agents run.

**Flow with Dev Mode Enabled:**

```text
┌─────────────────────────────────────────────────────────────┐
│  Player Input: "~she's hiding something~ Tell me about      │
│                 your day *leans back casually*"             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1-3: Analysis Phase (runs automatically)              │
│  - Pre-Parser                                               │
│  - Intent Detection                                         │
│  - Sensory Enrichment                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ╔═══════════════════╗
                    ║   ⏸️ PAUSED       ║
                    ╚═══════════════════╝
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  DEV PANEL: Analysis Results (Editable)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Segments:                                                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 1. [thought ▼] "she's hiding something"    [👁️ hidden] ││
│  │ 2. [speech ▼]  "Tell me about your day"    [👁️ visible]││
│  │ 3. [action ▼]  "leans back casually"       [👁️ visible]││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Primary Intent: [talk ▼]  Confidence: [0.85]              │
│                                                             │
│  Sensory Context:                                           │
│  ┌────────────────────────────────────────────────────────┐│
│  │ smell: { dominant: "coffee", intensity: 0.6 }          ││
│  │ sound: { ambient: ["distant traffic"] }                ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Warnings:                                                  │
│  ⚠️ None                                                    │
│                                                             │
│  [▶️ Continue to NPC Phase]  [🔄 Re-analyze]  [❌ Cancel]   │
└─────────────────────────────────────────────────────────────┘
```

**Editable Fields:**

| Field           | Editable?      | Notes                     |
| --------------- | -------------- | ------------------------- |
| Segment type    | ✅ Dropdown    | speech/thought/action     |
| Segment content | ✅ Text        | Can fix typos or rephrase |
| Observable flag | ✅ Toggle      | Override visibility       |
| Primary intent  | ✅ Dropdown    | Override detected intent  |
| Confidence      | ❌ Read-only   | Informational only        |
| Sensory context | ✅ JSON editor | Advanced, collapsible     |

**User Actions:**

1. **Continue**: Accept (possibly modified) analysis, proceed to NPC evaluation
2. **Re-analyze**: Re-run pre-parser/intent detection (useful after tweaking prompts)
3. **Cancel**: Abort the turn entirely

**Data Logging:**

When user makes corrections, log both original and corrected values:

```typescript
interface AnalysisCorrectionLog {
  turnId: string;
  timestamp: number;
  rawInput: string;
  original: {
    segments: ParsedSegment[];
    intent: IntentType;
    confidence: number;
  };
  corrected: {
    segments: ParsedSegment[];
    intent: IntentType;
  };
  correctionsMade: string[]; // e.g., ["segment[0].type: action→thought"]
}
```

This log becomes training data for improving:

- The pre-parser prompt
- Intent detection patterns
- Heuristic fallbacks

**Implementation Considerations:**

```typescript
interface TurnProcessingState {
  phase: 'analyzing' | 'awaiting-review' | 'processing-npcs' | 'complete';
  analysisResult?: {
    segments: ParsedSegment[];
    intent: IntentDetectionResult;
    sensoryContext: SensoryContext;
  };
  userOverrides?: Partial<AnalysisResult>;
  continueCallback?: () => void;
}

// In the governor
async function processTurn(input: string): Promise<TurnResult> {
  // Phase 1-3: Analysis
  const analysis = await runAnalysisPhase(input);

  if (config.governorDevMode) {
    // Pause and wait for user review
    const reviewed = await waitForUserReview(analysis);
    if (reviewed.cancelled) {
      return { cancelled: true };
    }
    // Use overrides if provided
    analysis = applyOverrides(analysis, reviewed.overrides);
    logCorrections(input, originalAnalysis, analysis);
  }

  // Phase 4-7: NPC processing (uses reviewed analysis)
  return await runNpcPhase(analysis);
}
```

**UI Location:**

The dev panel could appear:

- **Option A**: Inline in the chat (expands below the input)
- **Option B**: Side panel (always visible in dev mode)
- **Option C**: Modal dialog (blocks until resolved)

Recommendation: **Option B (Side Panel)** - keeps chat clean, allows comparison with previous turns, can show history of corrections.

---

## Open Problem: Action vs Thought Parsing

### The Challenge

NPCs need to know what they can observe. A player typing:

> _I wonder if she's lying_ "That's interesting, tell me more."

The NPC should:

- ✅ Hear and respond to "That's interesting, tell me more."
- ❌ NOT know the player is wondering if she's lying

Current approach uses asterisk convention (`*thought*` vs spoken text), but:

1. Players may not follow the convention
2. LLMs are inconsistent at parsing this
3. We don't want to restrict how players can write

### Potential Solutions

#### Option 1: Explicit UI Separation

Add UI controls that let players explicitly mark intent:

```text
[Speak] [Think] [Act] [Narrate]
┌────────────────────────────┐
│ Player input here...       │
└────────────────────────────┘
```

**Pros**: Unambiguous, no parsing needed
**Cons**: Breaks immersion, friction in typing flow

#### Option 2: LLM Pre-Parser

A lightweight LLM call that parses player input into structured form before NPC processing:

```typescript
interface ParsedPlayerInput {
  segments: Array<{
    type: 'speech' | 'thought' | 'action' | 'narration';
    content: string;
    observable: boolean; // Can NPCs perceive this?
  }>;
}
```

Example:

```text
Input: "*I wonder if she's lying* That's interesting. *I lean forward*"

Output: {
  segments: [
    { type: 'thought', content: "I wonder if she's lying", observable: false },
    { type: 'speech', content: "That's interesting.", observable: true },
    { type: 'action', content: "I lean forward", observable: true }
  ]
}
```

**Pros**: Preserves free-form input, explicit observability
**Cons**: Extra LLM call per turn, potential parsing errors

#### Option 3: Conservative Default + Hints

Assume everything is observable unless clearly marked as internal:

- Text in quotes → speech (observable)
- Text in asterisks → check for action words vs internal words
- Plain text → assume speech or action (observable)

Use keyword hinting:

- "I think", "I wonder", "I feel" → likely internal
- "I walk", "I grab", "I look" → likely action

**Pros**: No extra LLM call, graceful degradation
**Cons**: Will sometimes get it wrong

#### Option 4: Hybrid Structured Input with Mode Toggle (Recommended for Mobile)

Combine deterministic parsing with a mobile-friendly mode toggle button.

**Notation Convention:**

| Mode    | Notation                | Observable | Example                     |
| ------- | ----------------------- | ---------- | --------------------------- |
| Speech  | No wrapper (plain text) | ✅ Yes     | `Hello there`               |
| Thought | `~tildes~`              | ❌ No      | `~I wonder if she's lying~` |
| Action  | `*asterisks*`           | ✅ Yes     | `*leans forward*`           |

**Why no quotes for speech?** Plain text is the most common input. Requiring quotes adds friction. The absence of markers = speech is the simplest default.

**Mode Toggle UX:**

```text
┌────────────────────────────────────────────────────┐
│  ~I don't trust her~ Hello there *smiles warmly*  │
└────────────────────────────────────────────────────┘
                    [💬 Talk]  ← Current mode indicator / toggle button
```

- **Tap to cycle**: Talk → Thought → Action → Talk...
- **On toggle**: Insert appropriate markers at cursor position
- **Smart cleanup**: If mode switched but no text entered, remove empty markers

**Toggle Behavior Example:**

```text
1. User types: "Hello there"
2. User taps toggle → switches to Thought mode
   Input becomes: "Hello there ~|~" (cursor between tildes)
3. User types: "she seems nervous"
   Input: "Hello there ~she seems nervous~"
4. User taps toggle → switches to Action mode
   Input: "Hello there ~she seems nervous~ *|*"
5. User decides not to add action, taps toggle → back to Talk
   Empty markers removed: "Hello there ~she seems nervous~ "
6. User types: "Tell me more"
   Final: "Hello there ~she seems nervous~ Tell me more"
```

**Implementation Notes:**

```typescript
type InputMode = 'speech' | 'thought' | 'action';

interface ModeConfig {
  mode: InputMode;
  prefix: string;
  suffix: string;
  observable: boolean;
}

const MODE_CYCLE: ModeConfig[] = [
  { mode: 'speech', prefix: '', suffix: '', observable: true },
  { mode: 'thought', prefix: '~', suffix: '~', observable: false },
  { mode: 'action', prefix: '*', suffix: '*', observable: true },
];

function toggleMode(currentMode: InputMode): InputMode {
  const idx = MODE_CYCLE.findIndex((m) => m.mode === currentMode);
  return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length].mode;
}

function cleanupEmptyMarkers(text: string): string {
  // Remove ~~ and ** (empty thought/action markers)
  return text
    .replace(/~~|[*][*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Pros**:

- Mobile-friendly (no special keyboard needed)
- Power users can still type markers directly
- Deterministic parsing (no LLM ambiguity)
- Graceful - works with partial adoption

**Cons**:

- Players need to learn the toggle exists
- Still requires some convention awareness

#### Option 5: Hybrid with LLM Fallback

Combine Option 4 (deterministic parsing of marked segments) with Option 2 (LLM) for unmarked text:

1. **First pass**: Deterministically extract `~thought~` and `*action*` segments
2. **Remaining text**: If ambiguous, use LLM to classify
3. **Fallback**: If LLM unavailable, assume speech

This gives best of both worlds - explicit markers are respected, but free-form input still works.

### Preventing LLM Laziness

**The Risk**: If the LLM learns to expect markers, it might stop inferring from context and just treat everything unmarked as speech.

**Mitigations:**

1. **Prompt framing**: Tell the LLM that markers are _hints_, not requirements:

   ```text
   The player MAY use notation (~thought~, *action*) but is not required to.
   You must still analyze unmarked text for intent. Examples:
   - "I wonder about that" → likely thought (no tilde, but internal verb)
   - "walks to the door" → action (no asterisk, but physical verb)
   - "Hello" → speech (greeting)
   Markers are confirmations, not the only signal.
   ```

2. **Training diversity**: Ensure examples include both marked and unmarked versions:

   ```text
   Input: "~I don't trust her~ Hello"        → thought + speech
   Input: "I don't trust her. Hello"          → thought + speech (inferred)
   Input: "*leans forward* Tell me more"     → action + speech
   Input: "leans forward and says tell me more" → action + speech (inferred)
   ```

3. **Confidence scoring**: LLM outputs confidence. Low confidence on unmarked text → ask for clarification or default conservative.

4. **Marker stripping in some prompts**: Occasionally strip markers before sending to LLM to force inference. Compare results to validate the model isn't over-relying on markers.

### Recommendation

**Primary**: Option 4 (Mode Toggle + Deterministic Parsing) for the UI layer
**Fallback**: Option 2/5 (LLM Pre-Parser) for unmarked ambiguous segments

The mode toggle solves the mobile UX problem elegantly. Deterministic parsing handles marked text perfectly. LLM only needed for edge cases where the player writes free-form without markers.

---

## Multi-Action Turns and Action Sequencing

### The Problem

Players often chain multiple actions in a single prompt:

> "I walk into the kitchen, turn on the faucet, and take a drink"

This contains THREE sequential actions:

1. Move to kitchen
2. Use faucet
3. Consume water

Each action may:

- Change game state (location, inventory)
- Trigger sensory context (smell of kitchen, feel of water)
- Allow NPC reactions
- Be **interrupted** by game events

### Action Sequence Model

The pre-parser should extract not just segments (speech/thought/action) but also **ordered actions**:

```typescript
interface ParsedAction {
  id: string;
  order: number; // Sequence position (1, 2, 3...)
  type: ActionType; // 'move' | 'take' | 'use' | 'consume' | etc.
  description: string; // "walk into the kitchen"
  target?: string; // "kitchen", "faucet", "water"
  requirements?: ActionRequirement[]; // What must be true for this to succeed
  stateChanges?: StateChange[]; // What this action would change if successful
}

interface ActionSequence {
  actions: ParsedAction[];
  dependencies: Map<string, string[]>; // action2 depends on action1 completing
}
```

Example parse:

```typescript
{
  actions: [
    { id: "a1", order: 1, type: "move", target: "kitchen", description: "walk into the kitchen" },
    { id: "a2", order: 2, type: "use", target: "faucet", description: "turn on the faucet" },
    { id: "a3", order: 3, type: "consume", target: "water", description: "take a drink" }
  ],
  dependencies: {
    "a2": ["a1"],  // Can't use faucet until in kitchen
    "a3": ["a2"]   // Can't drink until faucet is on
  }
}
```

### State Processing Loop

Each action is processed sequentially with state updates:

```text
┌─────────────────────────────────────────────────────────────┐
│  ACTION SEQUENCE PROCESSOR                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  For each action in sequence:                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  1. CHECK PRECONDITIONS                                 ││
│  │     - Is player in right location?                      ││
│  │     - Does player have required items?                  ││
│  │     - Is action physically possible?                    ││
│  │                                                         ││
│  │  2. APPLY STATE CHANGES (if preconditions met)          ││
│  │     - Update location (map-agent)                       ││
│  │     - Update inventory (item-agent)                     ││
│  │     - Update world state                                ││
│  │                                                         ││
│  │  3. CHECK FOR INTERRUPTS                                ││
│  │     - Does environment/NPC block this action?           ││
│  │     - Random event triggers?                            ││
│  │     - Rule violations?                                  ││
│  │                                                         ││
│  │  4. COLLECT CONTEXT FOR THIS ACTION                     ││
│  │     - What sensory data is now available?               ││
│  │     - What can NPCs observe?                            ││
│  │                                                         ││
│  │  5. IF INTERRUPTED: Break loop, mark remaining actions  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Output: {                                                  │
│    completedActions: [...],                                 │
│    interruptedAt?: { action, reason, consequence },         │
│    pendingActions: [...],  // Actions that didn't happen    │
│    accumulatedContext: {   // All sensory/state for NPC     │
│      sensory: [...],                                        │
│      stateChanges: [...],                                   │
│      npcObservations: [...]                                 │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Interrupt Handling

When something blocks an action mid-sequence:

```typescript
interface ActionInterrupt {
  interruptedActionId: string;
  reason: string; // "tripped over broken chair"
  source: 'environment' | 'npc' | 'rule' | 'random';
  blocking: boolean; // Does this stop subsequent actions?
  consequence?: string; // "fell to the ground"
  recoverable: boolean; // Can player retry?
}
```

#### Philosophy: Show, Don't Tell

When interrupted, the response should naturally show what happened without pedantically listing what didn't:

❌ Bad (pedantic):

> "You walked into the kitchen but tripped over a broken chair. You were unable to turn on the faucet. You were unable to take a drink."

✅ Good (narrative):

> "You step into the kitchen—and your foot catches on a broken chair leg. You hit the floor hard, the faucet still out of reach."

The pending actions are **implied** by where the narrative stopped. The player understands they didn't get to drink.

### NPC Agent Instructions for Multi-Action Turns

The NPC agent prompt should include:

```text
## Action Sequence

The player attempted the following actions in order:

1. ✅ COMPLETED: Walk into the kitchen
   - State: Player is now in kitchen
   - Sensory: smell of stale coffee, hum of refrigerator

2. ✅ COMPLETED: Turn on the faucet
   - State: Faucet is running
   - Sensory: sound of water, cool mist

3. ✅ COMPLETED: Take a drink
   - State: Player consumed water
   - Sensory: taste of slightly metallic tap water

Write a narrative response that covers these actions IN ORDER. Each action
should flow naturally into the next. Do not describe action 3 before action 1
completes in your narrative.

[OR if interrupted:]

1. ✅ COMPLETED: Walk into the kitchen
2. ❌ INTERRUPTED: Turn on the faucet
   - Interrupt: NPC grabbed player's arm
   - Reason: "Taylor stops you before you reach the sink"
3. ⏸️ PENDING: Take a drink (not attempted)

Write a narrative that shows the completed action, then the interruption.
Do NOT explicitly list what the player "couldn't do" - let the narrative
imply it by ending at the interruption point.
```

### Multiple Sensory Types Per Turn

A single turn might involve multiple senses across multiple actions:

```typescript
interface AccumulatedSensoryContext {
  // Organized by when in the action sequence it becomes relevant
  perAction: Array<{
    actionId: string;
    actionDescription: string;
    sensory: {
      smell?: SensoryDetail[];
      touch?: SensoryDetail[];
      taste?: SensoryDetail[];
      sound?: SensoryDetail[];
      sight?: SensoryDetail[];
    };
  }>;

  // Flattened for quick reference
  allSmells: SensoryDetail[];
  allTouches: SensoryDetail[];
  // etc.
}

interface SensoryDetail {
  source: string; // "the apple", "Taylor's hand", "kitchen air"
  bodyPart?: string; // If targeting a body part
  description: string; // From DB or generated
  intensity: number;
  triggeredByAction: string; // Which action made this relevant
}
```

Example for "I take the apple and bite into it":

```typescript
{
  perAction: [
    {
      actionId: 'a1',
      actionDescription: 'take the apple',
      sensory: {
        touch: [{ source: 'apple', description: 'cool, smooth skin', intensity: 0.6 }],
        sight: [{ source: 'apple', description: 'deep red with a small bruise', intensity: 0.8 }],
      },
    },
    {
      actionId: 'a2',
      actionDescription: 'bite into apple',
      sensory: {
        taste: [{ source: 'apple', description: 'sweet, slightly tart, crisp', intensity: 0.9 }],
        sound: [{ source: 'apple', description: 'satisfying crunch', intensity: 0.7 }],
        touch: [{ source: 'apple juice', description: 'cool juice on lips', intensity: 0.5 }],
      },
    },
  ];
}
```

The NPC agent can then write:

> "You pick up the apple—cool and smooth in your hand, its skin a deep red marred by a small bruise. Your teeth break through with a satisfying crunch, and the taste hits you: sweet, just slightly tart, juice cool on your lips."

### NPC Agent Output Guidelines

To ensure the NPC agent writes substantive responses that cover all provided context:

```text
## Response Guidelines

1. MINIMUM LENGTH: Write at least 2-3 sentences per completed action
2. SENSORY COVERAGE: Include at least one sensory detail per action where provided
3. TEMPORAL ORDER: Actions must appear in narrative in the order they occurred
4. NO PREMATURE DESCRIPTION: Cannot describe consequences of action N+1 before action N
5. INTERRUPTS: If interrupted, end the narrative at the interruption point naturally

Current action count: 3
Minimum expected response length: 6-9 sentences
Sensory data points to potentially include: 5

You don't need to include every sensory detail, but the response should feel
rich and grounded in the physical world.
```

### When Do NPCs React?

Options for NPC reaction timing in multi-action sequences:

#### Option A: React After Full Sequence

- Process all player actions
- NPC responds to the cumulative outcome
- Simpler, but NPCs feel passive

#### Option B: React Per-Action (Expensive)\*\*

- After each action, NPCs evaluate if they'd interrupt
- More realistic, but N actions = N evaluation calls
- Could be prohibitively slow

#### Option C: Pre-Evaluate Interrupt Points (Recommended)

- Before processing, identify which actions COULD be interrupted
- Only run interrupt checks on those
- Balance of realism and performance

```typescript
interface InterruptOpportunity {
  actionId: string;
  potentialInterrupters: string[]; // NPC IDs who might react
  interruptType: 'speech' | 'physical' | 'observation';
}

// Quick heuristic check (no LLM)
function findInterruptOpportunities(actions: ParsedAction[], npcs: NPC[]): InterruptOpportunity[] {
  const opportunities: InterruptOpportunity[] = [];

  for (const action of actions) {
    // Physical actions near NPCs might be interrupted
    if (action.type === 'take' || action.type === 'use' || action.type === 'attack') {
      const nearbyNpcs = npcs.filter((n) => n.location === action.location);
      if (nearbyNpcs.length > 0) {
        opportunities.push({
          actionId: action.id,
          potentialInterrupters: nearbyNpcs.map((n) => n.id),
          interruptType: 'physical',
        });
      }
    }
  }

  return opportunities;
}
```

---

## Scene State Model

To enable multi-NPC coordination, we need a shared scene state:

```typescript
interface SceneState {
  location: {
    id: string;
    name: string;
    description: string;
  };

  presentEntities: Array<{
    id: string;
    type: 'player' | 'npc';
    position?: string; // "by the window", "seated at table"
  }>;

  recentActions: Array<{
    actor: string;
    type: 'speech' | 'action' | 'observation';
    content: string;
    timestamp: number;
    observableBy: string[]; // Entity IDs who can perceive this
  }>;

  environmentState: {
    timeOfDay: string;
    weather?: string;
    lighting: string;
    ambientSounds: string[];
  };

  pendingConflicts: Array<{
    description: string;
    involvedEntities: string[];
  }>;
}
```

Each NPC receives a filtered view of `recentActions` based on:

1. Were they present when it happened?
2. Could they perceive it (sight/sound range, not a private thought)?

---

## Response Format Options

### Option A: Woven Narrative (Governor Composes)

```text
Taylor's eyes narrow as you speak. "That's interesting," she says slowly,
the floral scent of her perfume mixing with the evening air. Sarah doesn't
look up from her book, but you notice her grip tighten on the pages.
```

**Pros**: Reads like a novel, immersive
**Cons**: Governor must maintain all NPC voices, complex composition

### Option B: Discrete Blocks (NPCs Compose Independently)

```text
[Scene] The evening light fades through the window. A floral scent drifts from Taylor's direction.

[Taylor] Her eyes narrow. "That's interesting," she says slowly, studying your face.

[Sarah] She doesn't look up from her book, but her grip tightens on the pages.
```

**Pros**: Each NPC maintains own voice, clearer attribution
**Cons**: More "game-like", less novelistic

### Recommendation

Support both modes via configuration. Some players prefer immersive prose, others prefer clear turn structure.

---

## Implementation Phases

### Overview

This implementation plan is organized to minimize rework. Each phase builds on the previous, and we avoid touching the same files multiple times where possible.

**Package Dependency Map:**

```text
packages/schemas     ← New types/schemas (touched in Phase 1, 2, 3)
packages/utils       ← Parsing utilities (touched in Phase 2)
packages/agents      ← SensoryAgent refactor, NpcAgent enhancement (Phase 1, 4)
packages/governor    ← Intent detector, pre-parser, action sequencer (Phase 2, 3, 5)
packages/api         ← Route changes, composition refactor (Phase 1, 3, 5)
packages/state-manager ← Action state tracking (Phase 3)
packages/web         ← Dev mode UI, mode toggle (Phase 2, 6)
packages/db          ← Scene state tables (Phase 3)
```

---

### Phase 1: Sensory Context as Structured Data (No LLM)

**Goal:** Remove prose generation from SensoryAgent. Make it a data utility that provides structured context to NpcAgent.

**Files to Modify:**

| Package   | File                           | Changes                                                                                                                                  |
| --------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas` | `src/api/sensory-context.ts`   | NEW: `SensoryContextSchema`, `SensoryContextForNpc` type                                                                                 |
| `agents`  | `src/sensory/sensory-agent.ts` | Refactor to output structured data, not prose. Remove LLM calls for primary flow. Keep LLM only for edge-case generation (missing data). |
| `agents`  | `src/sensory/types.ts`         | Update `AgentOutput` to include `sensoryContext?: SensoryContextForNpc`                                                                  |
| `agents`  | `src/npc/npc-agent.ts`         | Accept `sensoryContext` in input. Enhance system prompt to include sensory data. Increase `maxTokens` from 500 to 800+.                  |
| `agents`  | `src/core/types.ts`            | Add `sensoryContext` to `AgentInput` interface                                                                                           |
| `api`     | `src/governor/composition.ts`  | Remove `ResponseComposer` LLM call. NpcAgent is now sole prose writer. Simplify to just formatting/concatenation.                        |

**New Schema (packages/schemas/src/api/sensory-context.ts):**

```typescript
import { z } from 'zod';

export const SensoryDetailSchema = z.object({
  source: z.string(),
  bodyPart: z.string().optional(),
  description: z.string(),
  intensity: z.number().min(0).max(1),
  triggeredByAction: z.string().optional(),
});

export const SensoryContextForNpcSchema = z.object({
  available: z.object({
    smell: z.array(SensoryDetailSchema).optional(),
    touch: z.array(SensoryDetailSchema).optional(),
    taste: z.array(SensoryDetailSchema).optional(),
    sound: z.array(SensoryDetailSchema).optional(),
    sight: z.array(SensoryDetailSchema).optional(),
  }),
  playerFocus: z
    .object({
      sense: z.enum(['smell', 'touch', 'taste', 'sound', 'sight']),
      target: z.string().optional(),
      bodyPart: z.string().optional(),
    })
    .optional(),
  narrativeHints: z.object({
    playerIsSniffing: z.boolean(),
    playerIsTouching: z.boolean(),
    playerIsTasting: z.boolean(),
    recentSensoryAction: z.boolean(),
  }),
});

export type SensoryDetail = z.infer<typeof SensoryDetailSchema>;
export type SensoryContextForNpc = z.infer<typeof SensoryContextForNpcSchema>;
```

**Key Changes in SensoryAgent:**

```typescript
// OLD: Returns prose
async process(input: AgentInput): Promise<AgentOutput> {
  // ... LLM call to generate prose description ...
  return { narrative: "The air smells of jasmine..." };
}

// NEW: Returns structured data
async process(input: AgentInput): Promise<AgentOutput> {
  const sensoryContext = this.buildSensoryContext(input);
  return {
    narrative: '', // Empty - NPC agent writes prose
    sensoryContext,
  };
}
```

**Key Changes in NpcAgent Prompt:**

```typescript
// Add to buildDialogueSystemPrompt()
if (input.sensoryContext) {
  parts.push('\n--- SENSORY CONTEXT (available for narrative use) ---');
  const sc = input.sensoryContext;

  if (sc.playerFocus) {
    parts.push(
      `Player is focusing on: ${sc.playerFocus.sense}` +
        (sc.playerFocus.target ? ` (${sc.playerFocus.target})` : '')
    );
  }

  if (sc.available.smell?.length) {
    parts.push('\nSmell data:');
    for (const s of sc.available.smell) {
      parts.push(`- ${s.source}: ${s.description} (intensity: ${s.intensity})`);
    }
  }
  // ... similar for touch, taste, etc.

  parts.push('\nWeave these details naturally into your response where appropriate.');
  parts.push('Do NOT invent sensory details not listed above.');
}
```

**Testing Checkpoint:**

- Run existing tests, ensure NpcAgent still produces coherent output
- Verify sensory data appears in NpcAgent responses
- Compare response quality to old multi-agent composition

---

### Phase 2: Input Pre-Parser + Mode Toggle UI

**Goal:** Parse player input into segments with observability flags. Add mobile-friendly mode toggle.

**Files to Modify:**

| Package    | File                           | Changes                                                          |
| ---------- | ------------------------------ | ---------------------------------------------------------------- |
| `schemas`  | `src/api/parsed-input.ts`      | NEW: `ParsedSegment`, `ParsedPlayerInput` schemas                |
| `utils`    | `src/parsing/input-parser.ts`  | NEW: Deterministic parser for `~thought~` and `*action*` markers |
| `governor` | `src/intents/pre-parser.ts`    | NEW: LLM-based pre-parser for ambiguous segments                 |
| `governor` | `src/intents/types.ts`         | Add `ParsedPlayerInput` to intent detection output               |
| `governor` | `src/core/governor.ts`         | Integrate pre-parser before intent detection                     |
| `web`      | `src/components/ChatInput.tsx` | Add mode toggle button, marker insertion logic                   |
| `web`      | `src/hooks/useInputMode.ts`    | NEW: Mode cycling logic, empty marker cleanup                    |

**New Schema (packages/schemas/src/api/parsed-input.ts):**

```typescript
import { z } from 'zod';

export const SegmentTypeSchema = z.enum(['speech', 'thought', 'action']);

export const ParsedSegmentSchema = z.object({
  id: z.string(),
  type: SegmentTypeSchema,
  content: z.string(),
  observable: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  rawMarkers: z
    .object({
      prefix: z.string(),
      suffix: z.string(),
    })
    .optional(),
});

export const ParsedPlayerInputSchema = z.object({
  rawInput: z.string(),
  segments: z.array(ParsedSegmentSchema),
  primaryIntent: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

export type SegmentType = z.infer<typeof SegmentTypeSchema>;
export type ParsedSegment = z.infer<typeof ParsedSegmentSchema>;
export type ParsedPlayerInput = z.infer<typeof ParsedPlayerInputSchema>;
```

**Deterministic Parser (packages/utils/src/parsing/input-parser.ts):**

```typescript
export function parsePlayerInput(input: string): ParsedPlayerInput {
  const segments: ParsedSegment[] = [];

  // Regex to match ~thought~, *action*, and plain text
  const pattern = /~([^~]+)~|\*([^*]+)\*|([^~*]+)/g;
  let match;
  let order = 0;

  while ((match = pattern.exec(input)) !== null) {
    const [, thought, action, speech] = match;

    if (thought) {
      segments.push({
        id: `seg-${order++}`,
        type: 'thought',
        content: thought.trim(),
        observable: false,
        rawMarkers: { prefix: '~', suffix: '~' },
      });
    } else if (action) {
      segments.push({
        id: `seg-${order++}`,
        type: 'action',
        content: action.trim(),
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      });
    } else if (speech?.trim()) {
      segments.push({
        id: `seg-${order++}`,
        type: 'speech',
        content: speech.trim(),
        observable: true,
      });
    }
  }

  return { rawInput: input, segments };
}
```

**Mode Toggle Component (packages/web/src/hooks/useInputMode.ts):**

```typescript
type InputMode = 'speech' | 'thought' | 'action';

const MODE_CONFIG: Record<InputMode, { prefix: string; suffix: string; icon: string }> = {
  speech: { prefix: '', suffix: '', icon: '💬' },
  thought: { prefix: '~', suffix: '~', icon: '💭' },
  action: { prefix: '*', suffix: '*', icon: '🎬' },
};

export function useInputMode() {
  const [mode, setMode] = useState<InputMode>('speech');

  const cycleMode = () => {
    const modes: InputMode[] = ['speech', 'thought', 'action'];
    const idx = modes.indexOf(mode);
    setMode(modes[(idx + 1) % modes.length]);
  };

  const insertModeMarkers = (
    text: string,
    cursorPos: number
  ): { newText: string; newCursor: number } => {
    const config = MODE_CONFIG[mode];
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    const newText = `${before}${config.prefix}${config.suffix}${after}`;
    const newCursor = cursorPos + config.prefix.length;
    return { newText, newCursor };
  };

  const cleanupEmptyMarkers = (text: string): string => {
    return text
      .replace(/~~|\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return { mode, cycleMode, insertModeMarkers, cleanupEmptyMarkers, config: MODE_CONFIG[mode] };
}
```

**Testing Checkpoint:**

- Test deterministic parser with various inputs
- Test mode toggle in UI
- Verify segments appear correctly in dev panel

---

### Phase 3: Action Sequencing + State Updates

**Goal:** Parse multi-action turns into ordered sequences. Process each action through state updates.

**Files to Modify:**

| Package         | File                           | Changes                                                          |
| --------------- | ------------------------------ | ---------------------------------------------------------------- |
| `schemas`       | `src/api/action-sequence.ts`   | NEW: `ParsedAction`, `ActionSequence`, `ActionInterrupt` schemas |
| `governor`      | `src/core/action-sequencer.ts` | NEW: Action sequence processor with state loop                   |
| `governor`      | `src/core/governor.ts`         | Integrate action sequencer after intent detection                |
| `state-manager` | `src/types.ts`                 | Add action tracking types                                        |
| `db`            | `sql/XXX_scene_state.sql`      | NEW: `scene_actions` table for recent action log                 |
| `api`           | `src/db/sessionsClient.ts`     | Add scene action CRUD functions                                  |
| `api`           | `src/routes/turns.ts`          | Wire up action sequencer in turn processing                      |

**Action Sequencer Core Logic:**

```typescript
interface ActionSequencerConfig {
  stateManager: StateManager;
  interruptChecker?: (action: ParsedAction, state: StateObject) => Promise<ActionInterrupt | null>;
}

export class ActionSequencer {
  async processSequence(
    actions: ParsedAction[],
    initialState: TurnStateContext
  ): Promise<ActionSequenceResult> {
    const completedActions: ParsedAction[] = [];
    const accumulatedContext: AccumulatedSensoryContext = { perAction: [] };
    let currentState = initialState;
    let interrupt: ActionInterrupt | null = null;

    for (const action of actions) {
      // 1. Check preconditions
      const preconditionResult = await this.checkPreconditions(action, currentState);
      if (!preconditionResult.met) {
        interrupt = {
          interruptedActionId: action.id,
          reason: preconditionResult.reason,
          source: 'rule',
          blocking: true,
          recoverable: false,
        };
        break;
      }

      // 2. Apply state changes
      currentState = await this.applyStateChanges(action, currentState);

      // 3. Check for interrupts (NPC reactions, random events)
      if (this.config.interruptChecker) {
        interrupt = await this.config.interruptChecker(action, currentState);
        if (interrupt?.blocking) {
          completedActions.push(action); // Action completed but triggered interrupt
          break;
        }
      }

      // 4. Collect sensory context for this action
      const sensoryForAction = await this.collectSensoryContext(action, currentState);
      accumulatedContext.perAction.push({
        actionId: action.id,
        actionDescription: action.description,
        sensory: sensoryForAction,
      });

      completedActions.push(action);
    }

    const pendingActions = actions.slice(completedActions.length + (interrupt ? 0 : 0));

    return {
      completedActions,
      interruptedAt: interrupt ?? undefined,
      pendingActions,
      accumulatedContext,
      finalState: currentState,
    };
  }
}
```

**Testing Checkpoint:**

- Test multi-action parsing: "I walk to the door, open it, and step outside"
- Verify state updates happen in order
- Test interrupt handling

---

### Phase 4: NPC Agent Enhancement

**Goal:** Enhance NpcAgent to handle action sequences, sensory context, and write richer responses.

**Files to Modify:**

| Package   | File                    | Changes                                                                 |
| --------- | ----------------------- | ----------------------------------------------------------------------- |
| `agents`  | `src/npc/npc-agent.ts`  | Enhanced prompt with action sequence, sensory data, response guidelines |
| `agents`  | `src/npc/types.ts`      | NEW: `NpcAgentInput` extended type                                      |
| `agents`  | `src/core/types.ts`     | Update `AgentInput` with action sequence fields                         |
| `schemas` | `src/api/npc-config.ts` | NEW: Config for response length, sensory coverage requirements          |

**Enhanced NpcAgent System Prompt Template:**

```typescript
private buildEnhancedSystemPrompt(input: NpcAgentInput): string {
  const parts: string[] = [];

  // Character identity (existing)
  parts.push(`You are ${input.character.name}.`);
  // ... existing personality, backstory, etc.

  // Action sequence (NEW)
  if (input.actionSequence?.completedActions.length) {
    parts.push('\n--- ACTION SEQUENCE ---');
    parts.push('The player performed these actions in order:');

    for (const action of input.actionSequence.completedActions) {
      const sensory = input.accumulatedContext?.perAction.find(p => p.actionId === action.id);
      parts.push(`\n${action.order}. ✅ ${action.description}`);

      if (sensory?.sensory) {
        const senses = Object.entries(sensory.sensory)
          .filter(([_, v]) => v?.length)
          .map(([k, v]) => `${k}: ${v.map(s => s.description).join(', ')}`);
        if (senses.length) {
          parts.push(`   Sensory: ${senses.join('; ')}`);
        }
      }
    }

    if (input.actionSequence.interruptedAt) {
      parts.push(`\n❌ INTERRUPTED: ${input.actionSequence.interruptedAt.reason}`);
    }

    if (input.actionSequence.pendingActions.length) {
      parts.push('\n⏸️ PENDING (not attempted):');
      for (const action of input.actionSequence.pendingActions) {
        parts.push(`   - ${action.description}`);
      }
    }
  }

  // Response guidelines (NEW)
  const actionCount = input.actionSequence?.completedActions.length ?? 1;
  const sensoryCount = this.countSensoryDetails(input.accumulatedContext);

  parts.push('\n--- RESPONSE GUIDELINES ---');
  parts.push(`Actions to cover: ${actionCount}`);
  parts.push(`Sensory details available: ${sensoryCount}`);
  parts.push(`Minimum response length: ${actionCount * 2}-${actionCount * 3} sentences`);
  parts.push('');
  parts.push('RULES:');
  parts.push('1. Cover each action IN ORDER in your narrative');
  parts.push('2. Do not describe action N+1 consequences before action N completes');
  parts.push('3. Weave sensory details naturally where they enhance the scene');
  parts.push('4. If interrupted, end narrative at the interruption point');
  parts.push('5. Do NOT list what player "couldn\'t do" - let narrative imply it');

  return parts.join('\n');
}
```

**Testing Checkpoint:**

- Test with multi-action inputs
- Verify temporal ordering in responses
- Compare response quality/length to previous implementation

---

### Phase 5: Governor Simplification + NPC Selection

**Goal:** Remove ResponseComposer LLM call. Add NPC evaluation phase for multi-NPC scenes.

**Files to Modify:**

| Package    | File                          | Changes                                                      |
| ---------- | ----------------------------- | ------------------------------------------------------------ |
| `governor` | `src/core/governor.ts`        | Remove responseComposer usage. Add NPC evaluation phase.     |
| `governor` | `src/core/npc-evaluator.ts`   | NEW: "Would I respond?" evaluation logic                     |
| `governor` | `src/core/types.ts`           | Add `NpcEvaluation`, `GovernorSelection` types               |
| `api`      | `src/governor/composition.ts` | Remove `getResponseComposer()`. Simplify to formatting only. |

**NPC Evaluator:**

```typescript
interface NpcEvaluation {
  npcId: string;
  wouldRespond: boolean;
  priority: number; // 0-1
  responseType: 'speech' | 'action' | 'observation' | 'silent';
  reason: string;
}

export class NpcEvaluator {
  async evaluate(
    npc: CharacterSlice,
    context: {
      playerSegments: ParsedSegment[];
      recentActions: SceneAction[];
      sensoryContext: SensoryContextForNpc;
    }
  ): Promise<NpcEvaluation> {
    // Quick heuristic check first (no LLM)
    const addressed = this.isDirectlyAddressed(npc, context.playerSegments);
    if (addressed) {
      return {
        npcId: npc.instanceId,
        wouldRespond: true,
        priority: 0.9,
        responseType: 'speech',
        reason: 'directly addressed',
      };
    }

    // Check if NPC would react to observable actions
    const observableActions = context.playerSegments.filter((s) => s.observable);
    if (observableActions.some((a) => this.wouldReactTo(npc, a))) {
      return {
        npcId: npc.instanceId,
        wouldRespond: true,
        priority: 0.5,
        responseType: 'observation',
        reason: 'reacting to player action',
      };
    }

    return {
      npcId: npc.instanceId,
      wouldRespond: false,
      priority: 0,
      responseType: 'silent',
      reason: 'no relevant trigger',
    };
  }
}
```

**Testing Checkpoint:**

- Verify single NPC responses work without ResponseComposer
- Test NPC selection logic with multiple NPCs
- Compare latency (should be faster without composition LLM call)

---

### Phase 6: Dev Mode Interactive Debugging

**Goal:** Add pause points and editable dev panel for turn analysis.

**Files to Modify:**

| Package   | File                                        | Changes                                                                             |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `api`     | `src/routes/turns.ts`                       | Add `devMode: true` response format with analysis data                              |
| `api`     | `src/routes/dev-turns.ts`                   | NEW: Endpoints for `/sessions/:id/turns/analyze` and `/sessions/:id/turns/continue` |
| `web`     | `src/features/dev-panel/`                   | NEW: Dev panel components                                                           |
| `web`     | `src/features/dev-panel/AnalysisEditor.tsx` | Editable segment/intent display                                                     |
| `web`     | `src/features/dev-panel/SensoryViewer.tsx`  | JSON viewer for sensory context                                                     |
| `web`     | `src/features/dev-panel/DevPanel.tsx`       | Main panel with Continue/Re-analyze/Cancel                                          |
| `schemas` | `src/api/dev-mode.ts`                       | NEW: `AnalysisCorrectionLog`, `TurnProcessingState` schemas                         |
| `db`      | `sql/XXX_dev_logs.sql`                      | NEW: `analysis_corrections` table for training data                                 |

**Dev Mode Turn Flow:**

```typescript
// packages/api/src/routes/dev-turns.ts

// Step 1: Analyze (returns after pre-parser + intent detection)
app.post('/sessions/:id/turns/analyze', async (c) => {
  const { input } = await c.req.json();

  const analysis = await governor.analyzeOnly({
    sessionId: id,
    playerInput: input,
    // ... baseline, overrides
  });

  return c.json({
    phase: 'awaiting-review',
    analysis: {
      segments: analysis.parsedInput.segments,
      intent: analysis.intent,
      sensoryContext: analysis.sensoryContext,
      warnings: analysis.warnings,
    },
    continueToken: generateToken(analysis),
  });
});

// Step 2: Continue with (possibly modified) analysis
app.post('/sessions/:id/turns/continue', async (c) => {
  const { continueToken, overrides } = await c.req.json();

  const originalAnalysis = validateToken(continueToken);
  const analysis = applyOverrides(originalAnalysis, overrides);

  // Log corrections for training data
  if (hasCorrections(originalAnalysis, analysis)) {
    await logCorrection(id, originalAnalysis, analysis);
  }

  const result = await governor.continueFromAnalysis(analysis);

  return c.json(result);
});
```

**Testing Checkpoint:**

- Test dev panel appears when devMode is on
- Verify edits are applied correctly
- Check correction logs are saved

---

### Phase 7: Scene State + Multi-NPC Coordination

**Goal:** Implement full scene state with presence tracking and action observability.

**Files to Modify:**

| Package    | File                        | Changes                                                 |
| ---------- | --------------------------- | ------------------------------------------------------- |
| `schemas`  | `src/api/scene-state.ts`    | NEW: Full `SceneState` schema                           |
| `db`       | `sql/XXX_scene_state.sql`   | `scene_state`, `scene_entities`, `scene_actions` tables |
| `api`      | `src/db/sceneClient.ts`     | NEW: Scene state CRUD                                   |
| `governor` | `src/core/scene-manager.ts` | NEW: Scene state management, action filtering           |
| `governor` | `src/core/governor.ts`      | Integrate scene state in turn processing                |
| `agents`   | `src/npc/npc-agent.ts`      | Receive filtered scene state per-NPC                    |

**Scene Action Filtering:**

```typescript
function filterActionsForNpc(
  npc: CharacterSlice,
  allActions: SceneAction[],
  sceneState: SceneState
): SceneAction[] {
  const npcEntity = sceneState.presentEntities.find((e) => e.id === npc.instanceId);
  if (!npcEntity) return []; // NPC not in scene, sees nothing

  return allActions.filter((action) => {
    // Thoughts are never observable
    if (action.type === 'thought') return false;

    // Check if NPC is in observableBy list
    if (action.observableBy && !action.observableBy.includes(npc.instanceId)) {
      return false;
    }

    // Check location proximity (future: more sophisticated)
    return true;
  });
}
```

---

## Migration Strategy

**Backward Compatibility:**

Each phase should maintain backward compatibility with the existing API:

1. **Phase 1**: `ResponseComposer` still works but is deprecated. New responses come from NpcAgent.
2. **Phase 2**: Pre-parser is optional; falls back to raw input if disabled.
3. **Phase 3-7**: Feature flags control new behavior.

**Feature Flags (packages/api/src/util/config.ts):**

```typescript
interface FeatureFlags {
  useSensoryAsContext: boolean; // Phase 1
  usePreParser: boolean; // Phase 2
  useActionSequencer: boolean; // Phase 3
  useNpcEvaluator: boolean; // Phase 5
  useSceneState: boolean; // Phase 7
}
```

**Rollout Order:**

1. Deploy Phase 1 with `useSensoryAsContext: true`
2. Monitor response quality, iterate on NpcAgent prompt
3. Deploy Phase 2 with `usePreParser: true`
4. Continue...

---

## Open Questions

1. **How do we handle NPCs in different rooms?** They shouldn't perceive anything from the player's current scene.

2. **Should NPCs have "attention" that can be directed?** (e.g., Taylor is focused on the window, might miss whispered conversation)
   YES

3. **How do we prevent response bloat?** If 3 NPCs all want to respond, that's a lot of text.
   Let's not worry about this for now as we will be testing with one NPC

4. **What triggers NPC initiative?** When does an NPC act without being addressed?
   This will be determined by game rules but for now the NPC will respond every turn.

5. **How do we handle time passage?** Actions take time; can NPCs interrupt?
   Do not implement yet but eventually this will be a setting configuration to determine how often time updates

---

## Related Documents

- [11-governor-and-agents.md](11-governor-and-agents.md) - Current governor design
- [13-agent-io-contracts.md](13-agent-io-contracts.md) - Agent input/output specs
- [18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md) - Multi-NPC state management
- [20-per-npc-agents.md](20-per-npc-agents.md) - Per-NPC agent design
