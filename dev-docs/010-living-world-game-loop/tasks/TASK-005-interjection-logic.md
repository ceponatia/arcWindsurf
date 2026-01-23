# TASK-005: Add Proximity Interjection Logic

**Priority**: P0
**Estimate**: 3 hours
**Depends On**: TASK-004 (AmbientCollector)
**Category**: Living World Game Loop

---

## Objective

Implement intelligent filtering logic that determines when NPCs in proximity should interject into a conversation vs. remain as ambient background.

## Problem Statement

When the player is talking to NPC-A, and NPC-B is nearby:

- **Should interject**: The conversation topic is directly relevant to NPC-B (mentions them, their expertise, etc.)
- **Should NOT interject**: NPC-B is busy with their own activity, or the conversation is private/irrelevant

The system needs to make this determination intelligently to create a living world without overwhelming the player.

## Files to Create

- `packages/api/src/services/interjection-scorer.ts`
- `packages/api/src/services/interjection-scorer.test.ts`

## Interface Design

```typescript
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';

/**
 * Information about an NPC that might interject.
 */
export interface InterjectionCandidate {
  npcId: string;
  name: string;
  profile: CharacterProfile;
  tier: 'major' | 'minor' | 'background' | 'transient';
  currentActivity: {
    type: string;
    description: string;
    engagement: 'idle' | 'casual' | 'focused' | 'absorbed';
  };
  /** When this NPC last spoke (null if never) */
  lastSpokeAt: Date | null;
  /** Distance from player (if available) */
  distance?: number;
}

/**
 * Context about the current conversation.
 */
export interface ConversationContext {
  /** Recent dialogue (last N messages) */
  recentDialogue: { speaker: string; content: string }[];
  /** Current topic (if determinable) */
  topic?: string;
  /** NPCs mentioned in conversation */
  mentionedNpcs: string[];
  /** Locations mentioned */
  mentionedLocations: string[];
  /** Is this a private/intimate conversation? */
  isPrivate: boolean;
}

/**
 * Result of scoring an interjection candidate.
 */
export interface InterjectionScore {
  npcId: string;
  /** 0-1 relevance score */
  relevanceScore: number;
  /** Whether they should interject */
  shouldInterject: boolean;
  /** Suggested interjection content (if shouldInterject) */
  suggestedContent?: string;
  /** Reason for decision */
  reason: string;
}

/**
 * Scores and filters NPC interjection candidates.
 */
export class InterjectionScorer {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Score candidates and determine who should interject.
   */
  async scoreInterjections(
    candidates: InterjectionCandidate[],
    context: ConversationContext
  ): Promise<InterjectionScore[]>;
}
```

## Implementation Steps

### 1. Rule-Based Pre-Filtering

Before using LLM, apply fast heuristic rules:

```typescript
private preFilter(
  candidates: InterjectionCandidate[],
  context: ConversationContext
): InterjectionCandidate[] {
  const now = Date.now();
  const COOLDOWN_MS = 30_000; // 30 second cooldown after speaking

  return candidates.filter((candidate) => {
    // Transient NPCs never interject
    if (candidate.tier === 'transient') return false;

    // Background NPCs rarely interject
    if (candidate.tier === 'background') return false;

    // Absorbed in activity - won't notice conversation
    if (candidate.currentActivity.engagement === 'absorbed') return false;

    // Cooldown check
    if (candidate.lastSpokeAt) {
      const timeSinceSpoke = now - candidate.lastSpokeAt.getTime();
      if (timeSinceSpoke < COOLDOWN_MS) return false;
    }

    // Private conversation - skip unless mentioned
    if (context.isPrivate && !context.mentionedNpcs.includes(candidate.npcId)) {
      return false;
    }

    return true;
  });
}
```

### 2. Relevance Scoring with LLM

For remaining candidates, use LLM to assess relevance:

```typescript
const INTERJECTION_SCORING_PROMPT = `You are analyzing whether an NPC should interject into a conversation.

Given:
1. The NPC's personality and background
2. The current conversation topic
3. What they're currently doing

Determine:
- relevanceScore (0-1): How relevant is this conversation to them?
- shouldInterject (boolean): Should they speak up?
- reason: Brief explanation

Factors that increase interjection likelihood:
- They are mentioned by name
- The topic relates to their expertise/profession
- The topic relates to their personal history
- They have strong opinions on the subject
- Someone is spreading misinformation they'd correct

Factors that decrease interjection likelihood:
- They are focused on something else
- The conversation is clearly private
- They wouldn't care about the topic
- Interjecting would be socially inappropriate

Respond in JSON format.`;
```

### 3. Score Calculation

```typescript
async scoreInterjections(
  candidates: InterjectionCandidate[],
  context: ConversationContext
): Promise<InterjectionScore[]> {
  // Pre-filter
  const filtered = this.preFilter(candidates, context);

  if (filtered.length === 0) {
    return candidates.map((c) => ({
      npcId: c.npcId,
      relevanceScore: 0,
      shouldInterject: false,
      reason: 'Filtered by heuristics',
    }));
  }

  // Score each candidate
  const scores: InterjectionScore[] = [];

  for (const candidate of filtered) {
    const score = await this.scoreSingleCandidate(candidate, context);
    scores.push(score);
  }

  // Add back filtered candidates with zero scores
  for (const candidate of candidates) {
    if (!filtered.includes(candidate)) {
      scores.push({
        npcId: candidate.npcId,
        relevanceScore: 0,
        shouldInterject: false,
        reason: 'Filtered by heuristics',
      });
    }
  }

  return scores;
}

private async scoreSingleCandidate(
  candidate: InterjectionCandidate,
  context: ConversationContext
): Promise<InterjectionScore> {
  const recentDialogueText = context.recentDialogue
    .map((d) => `${d.speaker}: ${d.content}`)
    .join('\n');

  const npcDescription = this.summarizeNpc(candidate);

  const response = await this.llmProvider.chat({
    messages: [
      { role: 'system', content: INTERJECTION_SCORING_PROMPT },
      {
        role: 'user',
        content: `NPC: ${npcDescription}

Current activity: ${candidate.currentActivity.description} (${candidate.currentActivity.engagement})

Recent conversation:
${recentDialogueText}

Mentioned NPCs: ${context.mentionedNpcs.join(', ') || 'none'}
Topic: ${context.topic || 'unclear'}
Private conversation: ${context.isPrivate}

Should this NPC interject?`,
      },
    ],
    responseFormat: { type: 'json_object' },
    maxTokens: 200,
  });

  const parsed = JSON.parse(response.content);

  return {
    npcId: candidate.npcId,
    relevanceScore: parsed.relevanceScore ?? 0,
    shouldInterject: this.shouldInterject(candidate, parsed.relevanceScore ?? 0),
    suggestedContent: parsed.suggestedContent,
    reason: parsed.reason ?? 'No reason provided',
  };
}
```

### 4. Threshold Calculation

```typescript
private shouldInterject(
  candidate: InterjectionCandidate,
  relevanceScore: number
): boolean {
  // Base threshold depends on tier
  const baseThreshold: Record<string, number> = {
    major: 0.5,
    minor: 0.7,
    background: 0.9, // Very high threshold
    transient: 1.0, // Never interjects
  };

  const threshold = baseThreshold[candidate.tier] ?? 0.8;

  // Engagement penalty
  const engagementPenalty: Record<string, number> = {
    idle: 0,
    casual: 0.05,
    focused: 0.15,
    absorbed: 0.5,
  };

  const penalty = engagementPenalty[candidate.currentActivity.engagement] ?? 0;

  return relevanceScore > (threshold + penalty);
}
```

### 5. Batch Optimization

For efficiency, batch LLM calls when multiple candidates:

```typescript
private async scoreBatch(
  candidates: InterjectionCandidate[],
  context: ConversationContext
): Promise<InterjectionScore[]> {
  // If only 1-2 candidates, score individually
  if (candidates.length <= 2) {
    return Promise.all(
      candidates.map((c) => this.scoreSingleCandidate(c, context))
    );
  }

  // Batch into single LLM call
  const npcSummaries = candidates
    .map((c, i) => `${i + 1}. ${c.name}: ${this.summarizeNpc(c)}`)
    .join('\n');

  // Single batched prompt...
  // Parse response and map to individual scores
}
```

## Integration with TurnOrchestrator

In `TurnOrchestrator`:

```typescript
// After generating focused NPC response, check for interjections
const interjectionScorer = new InterjectionScorer(this.llmProvider);

const candidates = await this.getInterjectionCandidates(sessionId, locationId, focusedNpcId);
const scores = await interjectionScorer.scoreInterjections(candidates, conversationContext);

const interjectors = scores.filter((s) => s.shouldInterject);

// Generate interjection content for each
for (const interjector of interjectors) {
  const content = await this.generateInterjection(interjector, conversationContext);
  interjections.push({ npcId: interjector.npcId, content });
}
```

## Acceptance Criteria

- [ ] `InterjectionScorer` class created
- [ ] Pre-filtering rules exclude inappropriate candidates
- [ ] LLM scoring for relevance assessment
- [ ] Threshold calculation considers tier and engagement
- [ ] Batch optimization for multiple candidates
- [ ] Integration point with TurnOrchestrator documented
- [ ] Unit tests cover filtering, scoring, and threshold logic

## Testing

```typescript
describe('InterjectionScorer', () => {
  it('should filter out transient NPCs', async () => {
    const scores = await scorer.scoreInterjections(
      [{ ...baseCandidate, tier: 'transient' }],
      baseContext
    );

    expect(scores[0].shouldInterject).toBe(false);
    expect(scores[0].reason).toContain('heuristics');
  });

  it('should boost relevance when NPC is mentioned', async () => {
    const mentionedContext = {
      ...baseContext,
      mentionedNpcs: ['npc-1'],
    };

    const scores = await scorer.scoreInterjections(
      [{ ...baseCandidate, npcId: 'npc-1' }],
      mentionedContext
    );

    expect(scores[0].relevanceScore).toBeGreaterThan(0.5);
  });

  it('should respect engagement penalties', async () => {
    const absorbedNpc = { ...baseCandidate, currentActivity: { engagement: 'absorbed' } };
    const idleNpc = { ...baseCandidate, currentActivity: { engagement: 'idle' } };

    const [absorbedScore, idleScore] = await scorer.scoreInterjections(
      [absorbedNpc, idleNpc],
      baseContext
    );

    // Same relevance, but absorbed has higher threshold
    expect(absorbedScore.shouldInterject).toBe(false);
  });
});
```

## Notes

- LLM calls add latency - consider caching relevance scores for stable conversations
- May want to limit to 1-2 interjections per turn to avoid chaos
- Future: Add relationship-based modifiers (friends more likely to interject)
