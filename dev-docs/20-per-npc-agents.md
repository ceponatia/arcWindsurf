# Per-NPC Agent Architecture

> Status: Brainstorm / Proposal  
> Created: 2025-12-05

## Problem Statement

In multi-NPC sessions, the current shared `NpcAgent` architecture has limitations:

1. **Context loss** – Each turn, the agent receives only the active NPC's slice; previous NPC interactions are not carried forward unless explicitly loaded
2. **No persistent NPC state** – NPCs don't remember their own conversation history across turns unless the governor explicitly loads `npc_messages`
3. **No per-NPC configuration** – All NPCs share the same temperature, prompt structure, and behavior rules
4. **Limited NPC-to-NPC awareness** – NPCs can't easily reference what another NPC said earlier

## Proposed Architecture: Per-NPC Agent Instances

### Core Concept

Instead of one shared `NpcAgent`, create **per-NPC agent instances** that:

1. Are instantiated when an NPC joins a session
2. Maintain their own conversation memory and context window
3. Can have NPC-specific configuration (temperature, prompt style, memory depth)
4. Persist across turns within a session
5. Can optionally share information with other NPC agents

### Data Model

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              npc_agents                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ id                  TEXT PRIMARY KEY  -- e.g., "taylor-1-abc123-agent"      │
│ session_id          TEXT REFERENCES user_sessions(id)                       │
│ character_instance_id TEXT REFERENCES character_instances(id)               │
│ config_json         JSONB             -- per-agent overrides                │
│ memory_json         JSONB             -- persistent working memory          │
│ context_window      JSONB             -- sliding window of recent context   │
│ mood_state          JSONB             -- current emotional state            │
│ created_at          TIMESTAMPTZ                                             │
│ updated_at          TIMESTAMPTZ                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Instance Lifecycle

```text
Session Start
     │
     ▼
┌─────────────────────────────────────────────┐
│ Character instance created (taylor-1-xyz)  │
│ NPC agent instance created (taylor-1-xyz-agent) │
│ Agent loads character profile into memory  │
└─────────────────────────────────────────────┘
     │
     ▼
Turn N: Player talks to Taylor
     │
     ▼
┌─────────────────────────────────────────────┐
│ Governor routes to taylor-1-xyz-agent      │
│ Agent loads its own context_window         │
│ Agent generates response                   │
│ Agent updates memory_json and mood_state   │
└─────────────────────────────────────────────┘
     │
     ▼
Turn N+1: Player talks to different NPC
     │
     ▼
┌─────────────────────────────────────────────┐
│ Governor routes to other-npc-agent         │
│ Taylor's agent state persists unchanged    │
│ Taylor "remembers" previous conversation   │
└─────────────────────────────────────────────┘
```

## Feature Ideas

### 1. Per-NPC Memory Tiers

Each NPC agent maintains three memory tiers:

| Tier                | Description                           | Persistence   | Example                                |
| ------------------- | ------------------------------------- | ------------- | -------------------------------------- |
| **Working Memory**  | Last 3-5 turns of direct conversation | Session       | "Player just asked about my music"     |
| **Episodic Memory** | Key moments from this session         | Session       | "Player complimented my shoes earlier" |
| **Semantic Memory** | Facts learned about the player        | Cross-session | "Player's favorite song is 'Lover'"    |

```typescript
interface NpcAgentMemory {
  working: ConversationTurn[]; // Last N turns
  episodic: EpisodicMemory[]; // Notable moments
  semantic: SemanticFact[]; // Learned facts
}

interface EpisodicMemory {
  timestamp: Date;
  summary: string;
  emotionalValence: number; // -1 to 1
  importance: number; // 0 to 1
}

interface SemanticFact {
  subject: string; // "player"
  predicate: string; // "favorite_song"
  object: string; // "Lover"
  confidence: number;
  source: string; // "direct statement" | "inference"
}
```

### 2. Emotional State Machine

Each NPC agent tracks mood that affects responses:

```typescript
interface NpcMoodState {
  current: EmotionType; // From Plutchik's wheel
  intensity: number; // 0-1
  trajectory: 'rising' | 'stable' | 'falling';
  triggers: MoodTrigger[]; // What caused current mood

  // Derived from personalityMap
  baselineMood: EmotionType;
  volatility: number; // How quickly mood changes
  recoveryRate: number; // How fast they return to baseline
}

interface MoodTrigger {
  event: string;
  impact: number;
  decayRate: number;
}
```

The agent's response style adapts based on mood:

- **High trust + joy** → More open, shares personal details
- **High anger** → Curt responses, may refuse to engage
- **High sadness** → Subdued, seeks comfort

### 3. Inter-NPC Awareness

NPCs can be aware of each other's presence and interactions:

```typescript
interface NpcAwareness {
  // NPCs this agent knows about in the session
  knownNpcs: {
    instanceId: string;
    name: string;
    relationship: 'stranger' | 'acquaintance' | 'friend' | 'rival' | 'enemy';
    lastInteractionSummary?: string;
  }[];

  // Events this NPC witnessed (even if not directly involved)
  witnessedEvents: {
    timestamp: Date;
    actors: string[];
    summary: string;
    reaction?: string;
  }[];
}
```

Example scenario:

1. Player talks to Taylor, compliments her songwriting
2. Player talks to another NPC (Selena) who overheard
3. Selena can reference: "Taylor seemed really happy when you said that about her songs"

### 4. NPC-Specific Configuration

Override agent behavior per-NPC:

```typescript
interface NpcAgentConfig {
  // LLM parameters
  temperature: number; // Default 0.7, but diva NPCs might be 0.9
  maxTokens: number;

  // Prompt structure
  systemPromptStyle: 'detailed' | 'minimal' | 'theatrical';
  includeInternalMonologue: boolean;

  // Memory settings
  workingMemoryDepth: number; // How many turns to remember
  episodicThreshold: number; // Importance threshold for episodic storage

  // Behavior flags
  canRefuseToTalk: boolean;
  canInitiateTopics: boolean;
  canAskQuestions: boolean;
  canExpressDisagreement: boolean;

  // Special abilities
  canReadPlayerMood: boolean; // Perceptive NPCs
  canRememberAcrossSessions: boolean;
  hasSecrets: Secret[]; // Info they won't share easily
}
```

### 5. Conversation Threading

Track multiple conversation threads per NPC:

```typescript
interface ConversationThread {
  id: string;
  topic: string; // "music career", "relationship advice"
  status: 'active' | 'paused' | 'resolved';
  turns: ConversationTurn[];
  playerGoal?: string; // What player seems to want
  npcGoal?: string; // What NPC wants from this thread
  unfinishedBusiness?: string; // "Player never answered my question about..."
}
```

When player returns to an NPC, the agent can:

- Resume a paused thread: "So, you never did tell me about your day job..."
- Reference resolved threads: "Remember when we talked about my tour? Well..."
- Track unfinished business: "You said you'd think about coming to my show. Did you decide?"

### 6. Proactive NPC Behavior

NPCs can initiate based on their state:

```typescript
interface NpcProactivity {
  // Conditions that trigger NPC-initiated dialogue
  triggers: {
    condition: 'player_nearby' | 'time_passed' | 'event_occurred' | 'mood_threshold';
    params: Record<string, unknown>;
    action: 'greet' | 'comment' | 'ask_question' | 'share_observation';
    priority: number;
  }[];

  // Pending things the NPC wants to say
  pendingUtterances: {
    content: string;
    urgency: number;
    expiresAt?: Date;
  }[];
}
```

Example: If player hasn't talked to Taylor in 10 turns but she's in the scene, she might interject: "Hey, you've been quiet. Everything okay?"

### 7. Secret Knowledge System

NPCs can have information they don't freely share:

```typescript
interface NpcSecret {
  id: string;
  content: string; // The actual secret
  revealConditions: {
    trustLevel: number; // Required trust to share
    topicsDiscussed: string[]; // Must have discussed these first
    moodRequired?: EmotionType; // Only shares when in certain mood
    directlyAsked: boolean; // Must be explicitly asked
  };
  partialRevealThresholds: {
    threshold: number;
    hint: string; // What they'll say before full reveal
  }[];
  revealed: boolean;
  revealedAt?: Date;
}
```

### 8. Voice Consistency Markers

Track and enforce consistent speech patterns:

```typescript
interface VoiceConsistency {
  // Phrases this NPC tends to use
  catchphrases: string[];

  // Words they never use
  avoidedWords: string[];

  // Tracked patterns from the session
  usedExpressions: Map<string, number>; // Track repetition

  // Consistency rules
  maxRepetitionPerSession: number;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
  sentenceLengthRange: [number, number];
}
```

## Implementation Phases

### Phase 1: Basic Per-NPC Agents

- [ ] Create `npc_agents` table
- [ ] Instantiate agent on NPC join
- [ ] Store/load context_window per turn
- [ ] Route to correct agent instance

### Phase 2: Memory Tiers

- [ ] Implement working memory (sliding window)
- [ ] Add episodic memory extraction (LLM summarization)
- [ ] Build semantic fact storage

### Phase 3: Emotional State

- [ ] Implement mood state machine
- [ ] Mood-aware prompt injection
- [ ] Mood decay over time

### Phase 4: Inter-NPC Features

- [ ] NPC awareness of other NPCs
- [ ] Witnessed events system
- [ ] Cross-NPC references in dialogue

### Phase 5: Advanced Features

- [ ] Proactive NPC behavior
- [ ] Secret knowledge system
- [ ] Conversation threading
- [ ] Voice consistency enforcement

## Open Questions

1. **Agent persistence scope** – Should agents persist across sessions, or start fresh each session?
2. **Memory limits** – How much memory per NPC before summarization/pruning?
3. **Computation cost** – Per-NPC agents mean more LLM calls; how to optimize?
4. **Conflict resolution** – What if two NPCs want to speak simultaneously?
5. **NPC-to-NPC dialogue** – Should NPCs be able to talk to each other without player?

## Related Documents

- [18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md) – Current multi-NPC architecture
- [11-governor-and-agents.md](11-governor-and-agents.md) – Governor/agent system overview
- [10-memory-and-timeline.md](10-memory-and-timeline.md) – Memory system design
