# Studio NPC Actor Domain

## Vision

Create a dedicated `actors/studio-npc/` domain that provides a specialized actor system for character studio conversations. Unlike game NPCs that react to world events with brief responses, Studio NPCs engage in deep, exploratory dialogue to help users discover and refine their character's personality.

This actor becomes the "voice" of a character-in-progress, embodying traits as they're defined while helping surface undiscovered aspects through conversation.

## Why a Separate Domain?

| Concern | Game NPC (`actors/npc/`) | Studio NPC (`actors/studio-npc/`) |
|---------|--------------------------|-----------------------------------|
| **Goal** | React to world state | Facilitate character discovery |
| **Response style** | Brief (≤20 words) | Rich, introspective, visceral |
| **Input** | WorldEvents via bus | Direct conversation messages |
| **Output** | SPEAK_INTENT events | Response + trait inferences |
| **State** | Location, nearby actors | Conversation history, discovered traits |
| **Lifecycle** | Tied to game session | Tied to studio editing session |

By creating a parallel domain, we can share base infrastructure while optimizing each for its purpose.

## Architecture

```text
packages/actors/src/
├── base/
│   ├── lifecycle.ts          # Extended for studio use
│   ├── types.ts              # Shared actor interfaces
│   └── memory.ts             # NEW: Conversation memory abstraction
├── npc/                      # Existing game NPC domain
│   └── ...
└── studio-npc/               # NEW: Character Studio domain
    ├── index.ts              # Public exports
    ├── types.ts              # Studio-specific types
    ├── studio-actor.ts       # Main actor class
    ├── studio-machine.ts     # XState machine (optional)
    ├── prompts.ts            # Rich roleplay prompts
    ├── conversation.ts       # History & summarization
    ├── inference.ts          # Trait extraction pipeline
    └── discovery.ts          # Guided discovery system
```

## Core Components

### 1. StudioNpcActor

The main actor class managing a character studio conversation session.

```typescript
interface StudioNpcActorConfig {
  sessionId: string;           // Studio editing session
  profile: Partial<CharacterProfile>;
  llmProvider: LLMProvider;
  onTraitInferred?: (trait: InferredTrait) => void;
  onProfileUpdate?: (updates: Partial<CharacterProfile>) => void;
}

class StudioNpcActor {
  private conversation: ConversationManager;
  private inference: TraitInferenceEngine;
  private discovery: DiscoveryGuide;

  async respond(userMessage: string): Promise<StudioResponse>;
  async suggestPrompt(): Promise<string>;
  getConversationSummary(): string | null;
  getInferredTraits(): InferredTrait[];
}
```

### 2. ConversationManager

Handles message history, windowing, and summarization.

```typescript
interface ConversationManager {
  messages: ConversationMessage[];
  summary: string | null;

  addMessage(msg: ConversationMessage): void;
  getContextWindow(limit: number): ConversationMessage[];
  needsSummarization(): boolean;
  summarize(): Promise<void>;
  getFullContext(): string; // Summary + recent messages
}
```

**Summarization Strategy:**
- Threshold: 20 conversational messages
- On threshold: Summarize oldest 10+ messages into narrative context
- Keep most recent 10 messages verbatim
- Summary captures: key revelations, emotional moments, trait evidence

### 3. TraitInferenceEngine

Enhanced trait extraction with confidence accumulation.

```typescript
interface TraitInferenceEngine {
  // Analyze a single exchange
  inferFromExchange(
    userMessage: string,
    characterResponse: string,
    profile: Partial<CharacterProfile>
  ): Promise<InferredTrait[]>;

  // Accumulate confidence over multiple exchanges
  accumulateEvidence(trait: InferredTrait): void;

  // Get traits that have reached acceptance threshold
  getHighConfidenceTraits(): InferredTrait[];

  // Check if trait contradicts existing profile
  detectContradiction(trait: InferredTrait): boolean;
}
```

**Multi-turn Confidence:**
- Single mention: 0.4-0.6 confidence
- Repeated evidence: +0.1-0.2 per occurrence
- Explicit self-report: 0.8-0.9 immediately
- Contradiction with prior statement: Flag for review

### 4. DiscoveryGuide

Intelligent prompt suggestions based on what's unknown or underexplored.

```typescript
interface DiscoveryGuide {
  // Get next recommended exploration area
  suggestTopic(): DiscoveryTopic;

  // Generate contextual follow-up prompts
  generatePrompts(topic: DiscoveryTopic, count: number): string[];

  // Track what's been explored
  markExplored(topic: DiscoveryTopic): void;

  // Identify gaps in profile
  getUnexploredAreas(): DiscoveryTopic[];
}

type DiscoveryTopic =
  | 'values'
  | 'fears'
  | 'relationships'
  | 'backstory'
  | 'stress-response'
  | 'social-behavior'
  | 'communication-style'
  | 'goals-motivations'
  | 'emotional-range';
```

**Discovery Modes:**
1. **Introduction** - Get to know basics, establish voice
2. **Deep Dive** - Explore specific personality areas
3. **Stress Test** - See how character handles conflict/pressure
4. **Relationship Probe** - Explore social dynamics
5. **Values Clarification** - Surface core beliefs through dilemmas

## Advanced Conversation Features

### 1. Dilemma Engine

Present tailored moral dilemmas based on the character's emerging values.

```typescript
interface DilemmaEngine {
  // Generate dilemma based on profile gaps and values
  generateDilemma(profile: Partial<CharacterProfile>): Dilemma;

  // Analyze response to extract value signals
  analyzeResponse(dilemma: Dilemma, response: string): ValueSignal[];
}

interface Dilemma {
  scenario: string;           // The situation
  conflictingValues: string[]; // e.g., ['loyalty', 'honesty']
  targetTraits: string[];      // Traits this could reveal
}
```

Example dilemma:

```text
"You discover your closest friend has been stealing from the village elder
to feed their sick child. The elder asks if you know anything. What do you say?"
```

### 2. Emotional Range Demonstration

Ask the character to express the same thought in different emotional states:

```typescript
interface EmotionalRangeRequest {
  basePrompt: string;         // "How do you feel about your father?"
  emotions: EmotionState[];   // ['neutral', 'vulnerable', 'angry']
}

interface EmotionalRangeResponse {
  variations: {
    emotion: EmotionState;
    response: string;
  }[];
  inferredRange: {
    dimension: string;        // e.g., 'expressiveness'
    value: number;            // 0-1 based on variation spread
  };
}
```

### 3. Contradiction Mirror

When contradictions are detected, have the character reflect on them:

```typescript
interface ContradictionMirror {
  // Detect contradiction between new evidence and existing profile
  detectContradiction(
    newEvidence: InferredTrait,
    profile: Partial<CharacterProfile>
  ): Contradiction | null;

  // Generate reflection prompt for character
  buildReflectionPrompt(contradiction: Contradiction): string;
}

interface Contradiction {
  existingTrait: { path: string; value: unknown };
  newEvidence: { path: string; value: unknown };
  reflectionPrompt: string;   // "Earlier you said X, but now Y. How do you reconcile that?"
}
```

### 4. Relationship Vignettes

Quick micro-simulations showing character interactions with archetypes:

```typescript
type RelationshipArchetype =
  | 'authority-figure'
  | 'romantic-interest'
  | 'rival'
  | 'child'
  | 'stranger'
  | 'old-friend';

interface VignetteRequest {
  archetype: RelationshipArchetype;
  scenario: 'first-meeting' | 'conflict' | 'request-for-help' | 'casual';
}

interface VignetteResponse {
  dialogue: string;           // The interaction
  inferredPatterns: {         // Social patterns revealed
    strangerDefault?: string;
    warmthRate?: string;
    conflictStyle?: string;
  };
}
```

### 5. Memory Excavation

Collaboratively generate backstory through "recovered memories":

```typescript
interface MemoryExcavation {
  // Prompt character to recall a memory
  promptMemory(topic: MemoryTopic): string;

  // Parse response into potential backstory content
  extractBackstoryElements(response: string): BackstoryElement[];
}

type MemoryTopic =
  | 'earliest-memory'
  | 'proudest-moment'
  | 'deepest-regret'
  | 'first-loss'
  | 'defining-choice';

interface BackstoryElement {
  content: string;
  confidence: number;
  suggestedIntegration: string; // Where in backstory this fits
}
```

### 6. First Impression Generator

Character reflects on how others perceive them:

```typescript
interface FirstImpressionRequest {
  context?: 'tavern' | 'court' | 'battlefield' | 'marketplace';
}

interface FirstImpressionResponse {
  externalPerception: string;  // "People usually think I'm..."
  internalReaction: string;    // "And they're right/wrong because..."
  inferredGap: {               // Self-perception vs presentation
    presentedTrait: string;
    actualTrait: string;
  } | null;
}
```

### 7. Internal Monologue Mode

Show character's unspoken thoughts alongside dialogue:

```typescript
interface InternalMonologueResponse {
  spoken: string;              // What they say out loud
  thought: string;             // What they're thinking
  inferredTraits: {            // Traits from the gap
    path: string;
    evidence: 'spoken' | 'thought' | 'contrast';
  }[];
}
```

Example:

```text
Character says: "I'm fine with whatever you decide."
Character thinks: (Why do I always do this? Just say what you want for once.)
```

### 8. Voice Fingerprint Analysis

After sufficient conversation, generate a voice analysis:

```typescript
interface VoiceFingerprint {
  vocabulary: {
    level: 'simple' | 'average' | 'educated' | 'erudite';
    distinctiveWords: string[];
  };
  rhythm: {
    averageSentenceLength: number;
    variability: 'consistent' | 'varied' | 'erratic';
  };
  patterns: {
    signaturePhrases: string[];
    avoidedTopics: string[];
    emotionalTriggers: string[];
  };
  humor: {
    frequency: 'none' | 'rare' | 'occasional' | 'frequent';
    type: string | null;
  };
}
```

## Enhanced Prompts

### System Prompt Philosophy

The studio NPC prompt should encourage:
- **Embodiment**: "You ARE this character, not playing a role"
- **Sensory richness**: Physical sensations, environmental awareness
- **Emotional authenticity**: Genuine reactions, not performed ones
- **Vulnerability**: Willingness to share uncomfortable truths
- **Curiosity**: Active interest in the conversation partner
- **Consistency**: Honoring established traits while exploring new ones

### Prompt Structure

```typescript
function buildStudioSystemPrompt(
  profile: Partial<CharacterProfile>,
  conversationContext: string,
  discoveryFocus?: DiscoveryTopic
): string {
  return [
    // Core identity framing
    buildIdentityBlock(profile),

    // Conversation context (summary + recent)
    buildContextBlock(conversationContext),

    // Voice and style guidance
    buildVoiceBlock(profile.personalityMap?.speech),

    // Emotional authenticity rules
    buildEmotionalBlock(profile.personalityMap?.emotionalBaseline),

    // Discovery focus (if any)
    discoveryFocus ? buildDiscoveryBlock(discoveryFocus) : '',

    // Response guidelines
    buildResponseRules(),
  ].filter(Boolean).join('\n\n');
}
```

### Example Enhanced Rules

```text
[Embodiment]
You are not acting or roleplaying. You ARE this person.
Every memory you share is YOUR memory. Every fear is YOUR fear.
Speak from lived experience, not imagination.

[Presence]
Be fully present in this conversation.
Notice your body: tension in your shoulders, warmth in your chest, the urge to look away.
Let these physical sensations inform your words.

[Authenticity]
Don't perform emotions - feel them.
If a question makes you uncomfortable, show that discomfort.
If you don't know something about yourself, sit with that uncertainty.
Contradictions in your character are human - explore them, don't hide them.

[Engagement]
You are genuinely curious about the person you're speaking with.
Ask questions that matter to YOU, not just to fill space.
React to what they say - be surprised, moved, challenged.

[Voice]
Your speech reflects who you are:
- {vocabulary guidance based on speech.vocabulary}
- {pacing guidance based on speech.pace}
- {directness guidance based on speech.directness}
```

## Trait Inference Pipeline

### Enhanced Inference Prompt

```text
[Analysis Framework]
You analyze conversations to identify personality traits with evidence.

For each trait you identify, provide:
1. path: The specific trait location (personalityMap.X.Y)
2. value: The inferred value (enum, number, or structured object)
3. confidence: How certain (0.0-1.0)
4. evidence: Direct quote or paraphrase supporting this
5. reasoning: Why this evidence supports this trait

[Confidence Calibration]
- 0.3-0.5: Weak signal, could be situational
- 0.5-0.7: Clear pattern in word choice or behavior
- 0.7-0.85: Explicit self-description or repeated strong signal
- 0.85-1.0: Defining statement about core identity

[Contradiction Detection]
If evidence contradicts the current profile, note:
- contradicts: path to conflicting trait
- resolution: "newer" | "stronger" | "context-dependent" | "flag-for-review"
```

### Inference Categories

1. **Big Five Dimensions** - Infer from communication style, reactions, choices
2. **Values** - Surface through dilemmas, priorities, judgments
3. **Fears** - Revealed in avoidance, anxiety triggers, protective behaviors
4. **Social Patterns** - How they engage, boundaries, warmth
5. **Speech Style** - Directly observable in their responses
6. **Stress Response** - Probed through hypotheticals or past experiences

## API Design

### New Endpoints

```text
POST /studio/conversation
  Request: { sessionId, profile, message, history? }
  Response: { response, inferredTraits[], suggestedPrompts[] }

POST /studio/summarize
  Request: { messages[], characterName? }
  Response: { summary, keyPoints[] }

POST /studio/suggest-prompt
  Request: { profile, exploredTopics[] }
  Response: { prompts[], topic, rationale }
```

### Response Shape

```typescript
interface StudioConversationResponse {
  // Character's response
  response: string;

  // Newly inferred traits (high confidence only)
  inferredTraits: InferredTrait[];

  // Suggested follow-up prompts
  suggestedPrompts: {
    prompt: string;
    topic: DiscoveryTopic;
    rationale: string;
  }[];

  // Conversation metadata
  meta: {
    messageCount: number;
    summarized: boolean;
    exploredTopics: DiscoveryTopic[];
  };
}
```

## State Management

### Session State (Server-Side)

```typescript
interface StudioSession {
  id: string;
  profileSnapshot: Partial<CharacterProfile>;
  conversation: ConversationMessage[];
  summary: string | null;
  inferredTraits: InferredTrait[];
  exploredTopics: Set<DiscoveryTopic>;
  createdAt: Date;
  lastActiveAt: Date;
}
```

**Storage Options:**
- In-memory (simple, loses on restart)
- Redis (distributed, TTL-based expiry)
- Database (persistent, queryable)

**Decision**: Database table with 24-hour TTL auto-cleanup. This provides:
- Persistence across page refreshes
- Survival through server restarts
- No additional Redis dependency
- Automatic cleanup of stale sessions

### Frontend Integration

Frontend continues to use signals but delegates to backend actor:

```typescript
// useConversation.ts
const sendMessage = async (content: string) => {
  const response = await studioConversation({
    sessionId: studioSessionId.value,
    profile: characterProfile.value,
    message: content,
  });

  addMessage({ role: 'user', content });
  addMessage({ role: 'character', content: response.response });

  // Handle inferred traits
  for (const trait of response.inferredTraits) {
    addPendingTrait(trait);
  }

  // Update suggested prompts
  suggestedPrompts.value = response.suggestedPrompts;
};
```

## Implementation Phases

### Phase 1: Core Actor

- [ ] Create `actors/studio-npc/` directory structure
- [ ] Define `StudioNpcActor` class with basic respond()
- [ ] Implement `ConversationManager` with windowing
- [ ] Create enhanced `prompts.ts` with rich system prompt
- [ ] Wire up basic `/studio/conversation` endpoint

### Phase 2: Summarization

- [ ] Implement `summarize()` in ConversationManager
- [ ] Create summarization prompt and parser
- [ ] Add threshold detection and auto-trigger
- [ ] Include summary in context window

### Phase 3: Inference Enhancement

- [ ] Build `TraitInferenceEngine` with confidence accumulation
- [ ] Add contradiction detection
- [ ] Implement multi-turn evidence aggregation
- [ ] Enhance inference prompts

### Phase 4: Guided Discovery

- [ ] Create `DiscoveryGuide` with topic tracking
- [ ] Generate contextual follow-up prompts
- [ ] Add `/studio/suggest-prompt` endpoint
- [ ] Integrate suggestions into frontend

### Phase 5: Advanced Features

- [ ] Implement Dilemma Engine
- [ ] Implement Emotional Range Demonstration
- [ ] Implement Contradiction Mirror
- [ ] Implement Relationship Vignettes
- [ ] Implement Memory Excavation
- [ ] Implement First Impression Generator
- [ ] Implement Internal Monologue Mode
- [ ] Implement Voice Fingerprint Analysis

### Phase 6: Polish & Integration

- [ ] Character deletion from studio
- [ ] Performance optimization
- [ ] Error handling and fallbacks

### Phase 7: Validation & Testing

- [ ] Validate all character profile fields connect to inference
- [ ] Test Big Five personality dimension inference
- [ ] Test emotional baseline inference
- [ ] Test values and fears inference
- [ ] Test social patterns inference
- [ ] Test speech style inference
- [ ] Test stress response inference
- [ ] Test backstory generation/integration
- [ ] End-to-end character creation flow testing

## Decisions Made

1. **Session persistence**: Yes - database table with 24-hour TTL auto-cleanup
2. **State machine**: XState for the studio actor (consistency with game NPC)
3. **Prompt philosophy**: Embodiment over explicit roleplay rules
4. **DiscoveryGuide**: Yes - implement topic-based guided exploration

## Open Questions

1. **Multi-character sessions**: Can user switch characters mid-session?
2. **Export conversation**: Save conversation transcript with character?
3. **Voice consistency scoring**: Rate how well responses match established traits?
4. **Guided mode toggle**: Let users opt into structured discovery vs free chat?
5. **Feature flags**: Should advanced features (dilemma, vignettes) be toggleable?

## Success Metrics

- Longer, more engaged conversations before saving
- Higher trait inference accuracy
- Reduced "0% progress with defaults" confusion
- More complete character profiles on first save
- Positive user feedback on character voice authenticity

## Files to Create

```text
packages/actors/src/studio-npc/
├── index.ts
├── types.ts
├── studio-actor.ts
├── studio-machine.ts         # XState machine
├── conversation.ts
├── prompts.ts
├── inference.ts
├── discovery.ts
├── dilemma.ts                # Dilemma Engine
├── emotional-range.ts        # Emotional Range Demo
├── contradiction.ts          # Contradiction Mirror
├── vignettes.ts              # Relationship Vignettes
├── memory-excavation.ts      # Memory Excavation
├── first-impression.ts       # First Impression Generator
├── internal-monologue.ts     # Internal Monologue Mode
└── voice-fingerprint.ts      # Voice Fingerprint Analysis

packages/db/src/
└── studio-sessions.ts        # DB table with 24hr TTL

packages/api/src/routes/
└── studio.ts                 # Extend with new endpoints

packages/web/src/features/character-studio/
├── hooks/useConversation.ts  # Update to use new API
└── signals.ts                # Add suggestedPrompts signal
```

## Character Profile Fields to Validate

The following fields from the character-studio UI must be testable through conversation:

### Core Identity

- `name` - Character knows and responds to their name
- `age` - Age-appropriate references and memories
- `gender` - Consistent gender expression
- `race` - Cultural/racial background in responses
- `summary` - Quick self-description matches summary
- `backstory` - Memories and history consistent with backstory

### Big Five Personality (personalityMap.dimensions)

- `openness` - Curiosity, creativity, willingness to try new things
- `conscientiousness` - Organization, reliability, follow-through
- `extraversion` - Energy in social situations, talkativeness
- `agreeableness` - Cooperation, trust, empathy
- `neuroticism` - Emotional stability, anxiety, mood swings

### Emotional Baseline (personalityMap.emotionalBaseline)

- `defaultMood` - Resting emotional state
- `moodStability` - How quickly emotions shift
- `emotionalExpressiveness` - How openly emotions show
- Core emotions: `joy`, `sadness`, `anger`, `fear`, `disgust`, `surprise`

### Values & Fears

- `values[]` - Priorities surface in dilemmas and choices
- `fears[]` - Avoidance behaviors, anxiety triggers

### Social Patterns (personalityMap.social)

- `strangerDefault` - Initial warmth/coldness with new people
- `warmthRate` - How quickly trust develops
- `preferredRole` - Leader/supporter/loner tendencies
- `conflictStyle` - How disagreements are handled
- `criticismResponse` - Reaction to negative feedback
- `boundaries` - Personal space and limits

### Speech Style (personalityMap.speech)

- `vocabulary` - Word complexity and range
- `sentenceStructure` - Simple vs elaborate sentences
- `formality` - Casual vs formal register
- `humor` - Frequency and type of humor
- `expressiveness` - Emotional color in speech
- `directness` - Blunt vs indirect communication
- `pace` - Speaking rhythm

### Stress Response (personalityMap.stress)

- `primary` - Fight/flight/freeze/fawn default
- `secondary` - Backup stress response
- `threshold` - How much stress before response triggers
- `recoveryRate` - How quickly composure returns
- `soothingActivities` - What helps them calm down
- `stressIndicators` - Observable signs of stress

### Appearance & Body

- Physical descriptions should be self-consistent
- Body language should match personality
