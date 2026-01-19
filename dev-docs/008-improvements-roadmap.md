# Comprehensive Improvements Roadmap

> **Created**: January 18, 2026
> **Scope**: Systems, UI/UX, Database/Backend, and Architecture improvements
> **Context**: TypeScript RPG with Deepseek 3.1 via OpenRouter, featuring Character Studio with AI chat

---

## Executive Summary

After reviewing the codebase, this document outlines strategic improvements across five key areas:

1. **Character Studio UX** - Solving the schema complexity problem
2. **AI/LLM Enhancements** - Better leveraging Deepseek's capabilities
3. **Game Systems Architecture** - Making the game portion fully functional
4. **Database & Backend Optimizations** - Performance and scalability
5. **Novel Features** - Differentiating capabilities

---

## 1. Character Studio UX Improvements

### Problem Statement

The character schema (`CharacterProfileSchema`) has ~100+ fields across personality, appearance, body regions, values, fears, speech patterns, etc. Current UI presents these as collapsible cards, but:

- Users face decision fatigue with so many options
- Missing fields from schema aren't surfaced
- Context switching between chat and forms is jarring

### 1.1 Progressive Disclosure via "Character Layers"

**Concept**: Instead of showing all fields, reveal complexity gradually based on user intent.

```text
Layer 0: Quick Start (5 fields)
├── Name, Age, Gender, Race
├── One-line summary
└── "Start chatting" to discover personality

Layer 1: Core Identity (unlocked after basic chat)
├── Backstory
├── Big Five personality sliders
├── 3-5 trait keywords

Layer 2: Behavioral Depth (unlocked when user edits Layer 1)
├── Values & Motivations
├── Fears & Triggers
├── Social patterns
├── Speech style

Layer 3: Advanced/Simulation (opt-in)
├── Body regions
├── Sensory details (scent, texture, taste)
├── Hygiene tracking
├── Schedule templates
```

**Implementation**:

- Add `builderLayer: 0|1|2|3` to studio signals
- Cards render based on current layer
- "Unlock more" prompts appear when appropriate
- Persist layer preference per-user

#### PM Notes

- I don't want to gradually reveal fields one-by-one because chatting with your characters in the studio is optional.
- The deep schema is an essential feature of our project - we just need to manage complexity better.
  - What if we set default values for a lot of things based on race, gender, and other fields?
    - I'm thinking specifically of the sensory fields in this case. We could have default scent/texture/taste profiles for different races, genders, ages, and body types.
    - We can still allow users to customize these if they want, perhaps through a json settings page similar to how you can edit settings in vs code via the in-editor visual settings OR directly edit the json file if you want access to ALL fields. Currently, there is no json accessible to the user for their character profile so that would need to be built out as well.
    - Along with that, it would be cool to add a command palette to the overall application (similar to vs code) that allows users to quickly navigate to different parts of the character studio or even different parts of the overall app. Making it a true studio experience, not just related to characters.

  **Example of Default Sensory Profiles**:
  In plain text (pseudocode): if character.age <= 25 && character.age >=18, then scentProfile = "youthful", textureProfile = "smooth", tasteProfile = "fresh".
  if character.race == "elf", then scentProfile = "earthy", textureProfile = "light", tasteProfile = "herbal".

  Those are just examples. We'd need a way to augment the values added to the character when the age is youthful and race is elf, for example. Rather than simply concatenating the values from each profile, we could have a system that builds profiles based on a hierarchical order. So race is taken first, then gender, then age, etc. Each subsequent profile could override or augment the previous one. We need to think deeply on the best way to implement this.

### 1.2 AI-Guided Character Discovery

**Concept**: Let the conversation drive field population more aggressively.

**Current flow**: Chat → Manual trait inference → User accepts/rejects

**Proposed flow**:

```text
1. User chats with embryonic character
2. AI acts "in character" based on minimal seed data
3. Background: AI analyzes conversation for personality signals
4. System generates "Character Insights" panel showing:
   - Detected traits with evidence quotes
   - Confidence scores
   - One-click "Apply all high-confidence" button
5. User can drill into any insight to see/edit the actual field
```

**New Component**: `CharacterInsightsPanel`

```typescript
interface CharacterInsight {
  field: keyof CharacterProfile | `personalityMap.${string}`;
  suggestedValue: unknown;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[]; // Quotes from conversation
  currentValue?: unknown;
  conflictsWithExisting: boolean;
}
```

### 1.3 Smart Field Groupings by Archetype

**Concept**: Offer pre-configured "archetype templates" that set reasonable defaults.

```typescript
const ARCHETYPES = {
  'The Warrior': {
    personalityMap: {
      dimensions: { conscientiousness: 0.8, agreeableness: 0.4, neuroticism: 0.3 },
      values: [
        { value: 'loyalty', priority: 1 },
        { value: 'authority', priority: 2 },
      ],
      stress: { primary: 'fight', threshold: 0.7 },
    },
  },
  'The Scholar': {
    /* ... */
  },
  'The Trickster': {
    /* ... */
  },
  'The Healer': {
    /* ... */
  },
  // User can create/save custom archetypes
};
```

**UI**: Gallery of archetype cards at character creation start. Selecting one populates defaults but everything remains editable.

### 1.4 Visual Personality Radar + Comparison

**Current**: `RadarChart.tsx` exists but underutilized

**Enhancement**:

- Show radar chart prominently (not hidden in collapsed card)
- Add "Compare to archetype" overlay
- Show how conversation is shifting the radar in real-time
- Add mini-radar to conversation pane header

### 1.5 Body Region Builder Redesign

**Current**: `BodyCard.tsx` is functional but dense

**Proposed**: Interactive body silhouette

```text
┌─────────────────────────────────────────┐
│  [SVG body silhouette - click regions]  │
│                                         │
│     👤 Click a body part to describe    │
│                                         │
│  HEAD ●────────────────────────── 0/8   │
│  TORSO ●───────────────────────── 0/6   │
│  ARMS ●────────────────────────── 0/4   │
│  ...                                    │
└─────────────────────────────────────────┘
```

- Click region → slide-out drawer with that region's fields
- Progress indicators show completion
- AI can suggest descriptions: "Describe their hands in 2-3 words"

---

## 2. AI/LLM Enhancements

### 2.1 Tiered Cognition Implementation

**Current**: Single OpenRouter provider with one model

**Proposed**: Implement the `CognitionTaskType` system already in schemas:

```typescript
// Already defined in @minimal-rpg/llm/types.ts
type CognitionTaskType = 'fast' | 'deep' | 'reasoning' | 'vision';
```

**Implementation**:

| Task Type   | Use Case                           | Model       | Max Tokens |
| ----------- | ---------------------------------- | ----------- | ---------- |
| `fast`      | Quick reactions, simple chat       | deepseek-v3 | 256        |
| `deep`      | Character responses, narration     | deepseek-v3 | 1024       |
| `reasoning` | Complex decisions, plot generation | deepseek-r1 | 2048       |
| `vision`    | Image description (future)         | gpt-4o-mini | 512        |

**Benefits**:

- Cost optimization (fast tasks = fewer tokens)
- Better quality for complex tasks
- Future-proof for multimodal

### 2.2 Structured Output for Trait Inference

**Current**: Free-form LLM responses parsed client-side

**Proposed**: Use `response_format: { type: 'json_object' }` for trait inference:

```typescript
const TRAIT_INFERENCE_SCHEMA = {
  type: 'object',
  properties: {
    traits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' }, // e.g., 'personalityMap.social.strangerDefault'
          value: {},
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
        },
      },
    },
  },
};
```

### 2.3 Character Voice Consistency Engine

**Problem**: AI responses can drift from established personality over long conversations.

**Solution**: Dynamic system prompt injection based on personality map:

```typescript
function buildCharacterSystemPrompt(profile: CharacterProfile): string {
  const injections: string[] = [];

  // From TRAIT_PROMPTS mapping
  if (profile.personalityMap?.speech?.vocabulary === 'erudite') {
    injections.push(TRAIT_PROMPTS['speech:elaborate'].prompt);
  }

  // Build composite prompt under token budget
  return budgetPromptInjections(injections, CATEGORY_LIMITS);
}
```

The `TRAIT_PROMPTS` and `CATEGORY_LIMITS` already exist in `personality.ts` - wire them up!

### 2.4 Conversation Memory & Summarization

**Current**: Full conversation history sent with each request

**Proposed**: Sliding window + summarization:

```text
┌─────────────────────────────────────────────────┐
│ [System prompt with character card]             │
│ [Compressed summary of turns 1-N]               │
│ [Full context of last 5 turns]                  │
│ [User's new message]                            │
└─────────────────────────────────────────────────┘
```

**Implementation**:

- Store `conversationSummary` in `studioSessions` table (already has `summary` column!)
- Trigger summarization every 10 turns or on explicit action
- Use `fast` tier for summarization

### 2.5 Proactive Character Agency

**Concept**: Characters can initiate topics, not just respond.

```typescript
interface ProactivePrompt {
  trigger: 'idle_30s' | 'topic_exhausted' | 'emotional_peak';
  characterAction: string; // What the character does
  suggestedTopics: string[];
}
```

After user silence or topic completion:

> _Elara shifts in her chair, glancing toward the window._ "You know what always bothered me about my childhood?"

---

## 3. Game Systems Architecture

### 3.1 Event-Sourced World State (Leverage Existing Schema)

**Current schema supports it** - `events` table with:

- `sequence` (bigint)
- `type` ('SPOKE', 'MOVED', 'TICK', etc.)
- `payload` (JSONB)
- `causedByEventId` (causal chain)

**Missing**: Event handlers that rebuild state

```typescript
// Proposed: packages/projections/src/handlers/
interface EventHandler<T extends EventType> {
  type: T;
  apply(state: SessionProjection, event: Event<T>): SessionProjection;
}

const handlers: EventHandler[] = [
  { type: 'MOVED', apply: (s, e) => ({ ...s, location: e.payload.to }) },
  { type: 'SPOKE', apply: (s, e) => ({ ...s, lastDialogue: e.payload }) },
  { type: 'TICK', apply: (s, e) => ({ ...s, time: e.payload.newTime }) },
];
```

### 3.2 NPC Autonomy via Actor Model

**Existing**: `@minimal-rpg/actors` package with XState machines

**Gap**: Not wired to game sessions

**Proposed Connection**:

```text
┌──────────────┐     Events      ┌──────────────┐
│   Session    │ ──────────────► │   WorldBus   │
└──────────────┘                 └──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐       ┌──────────┐       ┌──────────┐
              │ NPC Actor│       │ NPC Actor│       │ NPC Actor│
              │  (Elara) │       │  (Guard) │       │  (Merchant)│
              └──────────┘       └──────────┘       └──────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
                                  ┌──────────────┐
                                  │  Intent Bus  │
                                  └──────────────┘
                                        │
                                        ▼
                                  ┌──────────────┐
                                  │  Narration   │
                                  │   Engine     │
                                  └──────────────┘
```

### 3.3 Location Graph Navigation

**Existing**: `locations`, `locationMaps`, `locationPrefabs` tables

**Missing**: Interactive navigation UI

**Proposed**: `WorldMap.tsx` enhancement

```typescript
interface LocationNode {
  id: string;
  name: string;
  type: 'room' | 'area' | 'building' | 'district';
  connections: { toId: string; travelMinutes: number; locked: boolean }[];
  npcsPresent: string[]; // From simulation cache
  atmosphere: { lighting: string; sounds: string[]; smells: string[] };
}
```

**UI**: Interactive graph with:

- Click to travel (triggers MOVED event)
- Hover to see NPCs present
- Time-of-day visual changes
- Locked paths show requirements

### 3.4 Time System & NPC Schedules

**Existing**: `schedule_templates`, `npc_schedules` tables, `GameTime` schema

**Missing**: Time advancement UI and schedule execution

```typescript
// Time control component
interface TimeControl {
  currentTime: GameTime;
  actions: {
    wait15min: () => void;
    wait1hour: () => void;
    waitUntil: (time: GameTime) => void;
    skipToNextEvent: () => void;
  };
  upcomingEvents: ScheduledEvent[]; // "Elara arrives at tavern in 30 min"
}
```

### 3.5 Turn-Based vs Real-Time Modes

**Concept**: Support both play styles

| Mode           | Time Flow                           | NPC Behavior             | Best For    |
| -------------- | ----------------------------------- | ------------------------ | ----------- |
| **Turn-based** | Player action → NPCs react → Player | Reactive only            | Story focus |
| **Real-time**  | Continuous ticks                    | Autonomous               | Simulation  |
| **Hybrid**     | Pauses on interaction               | Autonomous until engaged | Balanced    |

---

## 4. Database & Backend Optimizations

### 4.1 Vector Search for Character Matching

**Existing**: `embedding` columns on `entityProfiles`, `locations`, `knowledgeNodes`

**Not utilized**: pgvector similarity search

**Use cases**:

- "Find NPCs similar to this character"
- "Suggest locations matching this mood"
- "Retrieve relevant memories for this context"

```sql
-- Example: Find similar characters
SELECT id, name, profile_json
FROM entity_profiles
WHERE entity_type = 'character'
ORDER BY embedding <-> $1  -- $1 = query embedding
LIMIT 5;
```

### 4.2 Knowledge Graph Activation

**Existing**: `knowledgeNodes` and `knowledgeEdges` tables

**Opportunity**: NPCs with actual memory

```typescript
interface KnowledgeQuery {
  actorId: string;
  context: string; // Current situation
  limit: number;
}

// Returns relevant facts this NPC knows
async function recallKnowledge(query: KnowledgeQuery): Promise<KnowledgeFact[]> {
  // 1. Embed context
  // 2. Vector search knowledge_nodes for this actor
  // 3. Follow edges for related facts
  // 4. Filter by confidence/importance
  // 5. Decay old memories
}
```

### 4.3 Session State Caching

**Current**: `sessionProjections` table exists but underutilized

**Proposed**: Redis-like caching layer

```typescript
interface SessionCache {
  // Hot data - keep in memory/Redis
  currentLocation: Location;
  npcsInScene: NpcState[];
  recentEvents: Event[]; // Last 50

  // Warm data - quick DB fetch
  inventories: Map<string, Inventory>;
  relationships: Map<string, Affinity>;

  // Cold data - lazy load
  fullHistory: Event[];
  allKnowledge: KnowledgeNode[];
}
```

### 4.4 Audit Trail & Rollback

**Concept**: Leverage event sourcing for "undo"

```typescript
// Already have causedByEventId - extend it
interface RollbackRequest {
  sessionId: string;
  toEventSeq: bigint; // Restore state before this event
}

async function rollbackSession(req: RollbackRequest): Promise<void> {
  // 1. Mark events after toEventSeq as 'rolled_back'
  // 2. Rebuild projections from remaining events
  // 3. Notify connected clients
}
```

### 4.5 Multi-Tenancy Improvements

**Current**: `ownerEmail` on most tables

**Enhancement**: Organization/team support

```sql
-- New table
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT REFERENCES user_accounts(email),
  settings JSONB DEFAULT '{}'
);

CREATE TABLE organization_members (
  org_id UUID REFERENCES organizations(id),
  user_email TEXT REFERENCES user_accounts(email),
  role TEXT DEFAULT 'member',  -- 'admin', 'member', 'viewer'
  PRIMARY KEY (org_id, user_email)
);

-- Add to sessions, entity_profiles, etc.
ALTER TABLE sessions ADD COLUMN org_id UUID REFERENCES organizations(id);
```

---

## 5. Novel Features (Differentiators)

### 5.1 Character Export/Import Ecosystem

**Concept**: Characters as portable, shareable assets

```typescript
interface CharacterPackage {
  version: '1.0';
  profile: CharacterProfile;
  relationships: RelationshipSeed[]; // "Distrustful of authority"
  memories: KnowledgeSeed[]; // Pre-loaded backstory facts
  voiceSamples: ConversationExample[]; // Training data for consistency
  thumbnail?: string; // Base64 or URL
}
```

**Features**:

- Export to JSON/YAML
- Import with conflict resolution
- Community character library (future)
- "Character card" shareable links

### 5.2 Scenario/Campaign Builder

**Beyond individual sessions** - linked narrative arcs

```typescript
interface Campaign {
  id: string;
  name: string;
  chapters: Chapter[];
  globalState: CampaignState; // Persists across sessions
  characters: CharacterRef[]; // Shared character roster
}

interface Chapter {
  id: string;
  name: string;
  premise: string;
  startingConditions: Partial<SessionState>;
  objectives: Objective[];
  possibleOutcomes: Outcome[];
}
```

### 5.3 "Director Mode" - AI as Game Master

**Concept**: Meta-AI that orchestrates NPCs and events

```text
┌─────────────────────────────────────────────────┐
│                   Director AI                   │
│  (Observes session, introduces plot elements)   │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Inject  │    │ Trigger │    │ Modify  │
   │ Events  │    │ NPCs    │    │ World   │
   └─────────┘    └─────────┘    └─────────┘
```

**Example behaviors**:

- Notice player hasn't explored an area → NPC mentions rumor
- Conversation stalling → Introduce interruption
- Player achieving goal too easily → Add complication

### 5.4 Voice Integration Preparation

**Future-ready architecture**:

```typescript
interface VoiceProfile {
  characterId: string;
  ttsProvider: 'elevenlabs' | 'azure' | 'local';
  voiceId: string;
  styleParameters: {
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

// API endpoint ready for voice generation
POST /api/voice/generate
{
  characterId: string;
  text: string;
  emotion?: CoreEmotion;
}
```

### 5.5 Character Evolution Tracking

**Concept**: Characters that grow based on experiences

```typescript
interface CharacterEvolution {
  characterId: string;
  snapshots: {
    eventSeq: bigint;
    personalityMapDelta: Partial<PersonalityMap>;
    cause: string; // "Betrayed by trusted ally"
  }[];

  // Computed
  trajectory: {
    dimension: PersonalityDimension;
    trend: 'increasing' | 'stable' | 'decreasing';
    magnitude: number;
  }[];
}
```

**UI**: Timeline showing personality shifts with event causation.

---

## 6. Character Studio Schema Field Integration

### Missing Fields Checklist

Based on `CharacterProfileSchema` vs current UI:

| Field                   | Schema Location          | Current UI    | Priority               |
| ----------------------- | ------------------------ | ------------- | ---------------------- |
| `emotePic`              | `CharacterProfileSchema` | ❌ Hidden     | Low (future image gen) |
| `body` (sensory)        | `BodyMapSchema`          | ✅ `BodyCard` | Done                   |
| `hygiene`               | `NpcHygieneStateSchema`  | ❌ Missing    | Medium                 |
| `personalityMap.facets` | `PersonalityMapSchema`   | ❌ Missing    | High                   |
| `details` (facts array) | `CharacterDetailSchema`  | ❌ Missing    | Medium                 |
| `personality` (simple)  | `CharacterProfileSchema` | ❌ Hidden     | Low (legacy)           |

### Recommended UI Additions

1. **Facets Drill-Down** in Big Five card
   - Click a dimension → expand to show its 6 facets
   - Each facet gets its own mini-slider

2. **Character Facts/Details** as dynamic list
   - "Add fact" button
   - Categories: history, beliefs, secrets, relationships
   - Importance slider for RAG retrieval priority

3. **Hygiene** (for simulation-heavy games)
   - Optional toggle in Advanced mode
   - Per-body-part cleanliness with decay over time

---

## 7. Implementation Priorities

### Phase 1: Character Studio Polish (2-3 weeks)

- [ ] Progressive disclosure layers
- [ ] Facets drill-down UI
- [ ] Character insights panel (AI-driven)
- [ ] Archetype templates

### Phase 2: Game Core (3-4 weeks)

- [ ] Wire up WorldBus to sessions
- [ ] Basic location navigation
- [ ] Time advancement controls
- [ ] NPC actor spawning

### Phase 3: AI Enhancement (2 weeks)

- [ ] Tiered cognition implementation
- [ ] Conversation summarization
- [ ] Trait prompt injection

### Phase 4: Advanced Features (4+ weeks)

- [ ] Vector search integration
- [ ] Knowledge graph queries
- [ ] Campaign builder
- [ ] Director mode prototype

---

## Appendix: Technical Debt Items

1. **Duplicate type definitions**: `FormState` in web vs schema types
2. **Unused provider**: `anthropic.ts` and `ollama.ts` in LLM package
3. **Stale migrations**: `types.ts.new` file in db/repositories
4. **Incomplete tests**: Many packages lack test coverage
5. **Session workspace**: Large `store.ts` (26KB) needs decomposition

---

_This document should be treated as a living roadmap. Prioritize based on user feedback and game testing._
