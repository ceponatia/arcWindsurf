# Affinity and Relationship Dynamics

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document outlines the design for an affinity and relationship system that tracks how NPCs feel about the player (and potentially each other), influencing their behavior, dialogue, and tolerance for various player actions.

## 1. Design Philosophy

### 1.1 Goals

The affinity system should:

- **Model realistic relationships** - NPCs should respond differently based on how well they know/like the player
- **Evolve over time** - Relationships should grow or decay based on interactions
- **Influence behavior** - Higher affinity unlocks new dialogue, actions, and tolerance
- **Be multidimensional** - "Liking" someone is more nuanced than a single number
- **Support NPC agency** - NPCs should have preferences about how they're treated
- **Integrate with personality** - Personality traits should affect affinity dynamics

### 1.2 Core Concept: Multi-Axis Affinity

Rather than a single "relationship score," we model multiple dimensions that combine to determine an NPC's disposition:

```typescript
export interface AffinityScores {
  /** How much they like/enjoy the player's company */
  fondness: number; // -100 to 100

  /** How much they trust the player */
  trust: number; // -100 to 100

  /** How much they respect the player */
  respect: number; // -100 to 100

  /** How comfortable they are around the player */
  comfort: number; // -100 to 100

  /** How romantically/physically attracted they are (if applicable) */
  attraction?: number; // -100 to 100

  /** How afraid of the player they are */
  fear: number; // 0 to 100
}
```

## 2. Affinity Dimensions

### 2.1 Fondness

How much the NPC enjoys spending time with the player.

| Score Range | Label    | Behavioral Indicators                     |
| ----------- | -------- | ----------------------------------------- |
| -100 to -60 | Hatred   | Actively avoids, hostile on sight         |
| -60 to -20  | Dislike  | Cold, curt, reluctant to engage           |
| -20 to 20   | Neutral  | Professional, polite but distant          |
| 20 to 60    | Friendly | Warm, seeks conversation, helpful         |
| 60 to 100   | Adoring  | Enthusiastic, prioritizes player, devoted |

**Increases from**: Shared interests, gifts, compliments, helping them, making them laugh
**Decreases from**: Insults, ignoring them, opposing their goals, harming friends

### 2.2 Trust

How much the NPC believes the player will act in good faith.

| Score Range | Label      | Behavioral Indicators                         |
| ----------- | ---------- | --------------------------------------------- |
| -100 to -60 | Suspicious | Assumes bad intentions, refuses to share info |
| -60 to -20  | Wary       | Cautious, verifies claims, withholds secrets  |
| -20 to 20   | Neutral    | Takes claims at face value, basic courtesy    |
| 20 to 60    | Trusting   | Shares personal info, relies on player        |
| 60 to 100   | Implicit   | Shares secrets, would vouch for player        |

**Increases from**: Keeping promises, honesty, protecting them, reliability over time
**Decreases from**: Lying, breaking promises, betrayal, associating with their enemies

### 2.3 Respect

How much the NPC admires or values the player's abilities, status, or character.

| Score Range | Label       | Behavioral Indicators                            |
| ----------- | ----------- | ------------------------------------------------ |
| -100 to -60 | Contempt    | Dismissive, mocking, sees player as beneath them |
| -60 to -20  | Unimpressed | Skeptical of claims, expects failure             |
| -20 to 20   | Neutral     | No strong opinion on player's competence         |
| 20 to 60    | Impressed   | Acknowledges skill, seeks advice                 |
| 60 to 100   | Reverent    | Defers to player, sees them as exceptional       |

**Increases from**: Demonstrating competence, keeping composure, ethical behavior, status
**Decreases from**: Failure, cowardice, cruelty, embarrassing behavior

### 2.4 Comfort

How relaxed and at ease the NPC feels around the player.

| Score Range | Label    | Behavioral Indicators                       |
| ----------- | -------- | ------------------------------------------- |
| -100 to -60 | Anxious  | Nervous, avoids eye contact, wants to leave |
| -60 to -20  | Uneasy   | Stiff, formal, guarded body language        |
| -20 to 20   | Neutral  | Standard social behavior                    |
| 20 to 60    | Relaxed  | Open posture, casual speech, shares openly  |
| 60 to 100   | Intimate | Completely at ease, vulnerable, authentic   |

**Increases from**: Time spent together, shared experiences, respecting boundaries
**Decreases from**: Pressure, invasion of space, unpredictable behavior, intensity

### 2.5 Attraction (Optional)

Romantic or physical interest in the player. Only tracked for NPCs where romance is applicable.

| Score Range | Label        | Behavioral Indicators                               |
| ----------- | ------------ | --------------------------------------------------- |
| -100 to -60 | Repulsed     | Finds player actively unappealing                   |
| -60 to -20  | Uninterested | No romantic feelings, clearly platonic              |
| -20 to 20   | Neutral      | Neither attracted nor unattracted                   |
| 20 to 60    | Interested   | Flirtatious, seeks proximity, curious               |
| 60 to 100   | Smitten      | Obvious attraction, prioritizes player romantically |

**Increases from**: Flirtation, physical appearance (if matches preferences), romantic gestures
**Decreases from**: Rejection, gross behavior, incompatibility

### 2.6 Fear

How afraid or intimidated the NPC is by the player.

| Score Range | Label      | Behavioral Indicators                      |
| ----------- | ---------- | ------------------------------------------ |
| 0 to 20     | Unafraid   | Normal behavior, no intimidation           |
| 20 to 40    | Wary       | Cautious, avoids confrontation             |
| 40 to 60    | Nervous    | Visible discomfort, appeasing behavior     |
| 60 to 80    | Frightened | Trembling, trying to escape, compliant     |
| 80 to 100   | Terrified  | Paralyzed, irrational, complete submission |

**Increases from**: Threats, violence, displays of power, unpredictable danger
**Decreases from**: Kindness, time without threat, protection from others

## 3. Composite Disposition

### 3.1 Calculating Disposition

The NPC's overall disposition toward the player is derived from affinity scores:

```typescript
export type DispositionLevel =
  | 'hostile'
  | 'unfriendly'
  | 'neutral'
  | 'friendly'
  | 'close'
  | 'devoted';

export interface Disposition {
  level: DispositionLevel;
  modifiers: DispositionModifier[];
  overallScore: number; // -100 to 100
}

export interface DispositionModifier {
  source: string; // e.g., 'high-fear', 'low-trust'
  effect: string; // e.g., 'compliant but resentful'
}

/**
 * Calculate overall disposition from affinity scores.
 */
export function calculateDisposition(affinity: AffinityScores): Disposition {
  // Weighted average (fondness and trust are most important)
  const weights = {
    fondness: 0.35,
    trust: 0.3,
    respect: 0.15,
    comfort: 0.15,
    attraction: 0.05, // Only if present
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = affinity[key as keyof typeof weights];
    if (score !== undefined) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Determine level
  let level: DispositionLevel;
  if (overallScore < -60) level = 'hostile';
  else if (overallScore < -20) level = 'unfriendly';
  else if (overallScore < 20) level = 'neutral';
  else if (overallScore < 50) level = 'friendly';
  else if (overallScore < 80) level = 'close';
  else level = 'devoted';

  // Apply modifiers
  const modifiers: DispositionModifier[] = [];

  // High fear overrides positive disposition
  if (affinity.fear > 60) {
    modifiers.push({
      source: 'high-fear',
      effect: 'compliant but not genuine',
    });
  }

  // Low trust makes them guarded
  if (affinity.trust < -20 && affinity.fondness > 20) {
    modifiers.push({
      source: 'trust-deficit',
      effect: 'likes player but remains guarded',
    });
  }

  // High attraction with low fondness
  if ((affinity.attraction ?? 0) > 40 && affinity.fondness < 20) {
    modifiers.push({
      source: 'conflicted-attraction',
      effect: 'attracted but emotionally distant',
    });
  }

  return { level, modifiers, overallScore };
}
```

### 3.2 Disposition Effects

| Disposition | Available Actions       | Dialogue Style          | Tolerance |
| ----------- | ----------------------- | ----------------------- | --------- |
| Hostile     | None without conflict   | Threatening, dismissive | Very low  |
| Unfriendly  | Basic transactions      | Curt, reluctant         | Low       |
| Neutral     | Standard interactions   | Polite, professional    | Moderate  |
| Friendly    | Favors, personal topics | Warm, engaged           | High      |
| Close       | Secrets, support        | Intimate, vulnerable    | Very high |
| Devoted     | Anything asked          | Adoring, prioritizing   | Extreme   |

## 4. Affinity Changes

### 4.1 Interaction Effects

Player actions modify affinity based on categories:

```typescript
export interface AffinityEffect {
  /** Which dimension is affected */
  dimension: keyof AffinityScores;

  /** Base change amount */
  baseChange: number;

  /** Personality-based modifier keys */
  personalityModifiers?: PersonalityAffinityModifier[];

  /** Conditions that amplify or reduce the effect */
  conditions?: AffinityCondition[];
}

export interface PersonalityAffinityModifier {
  /** Personality trait or facet */
  trait: string;

  /** Multiplier when trait is high */
  highMultiplier: number;

  /** Multiplier when trait is low */
  lowMultiplier: number;
}

export interface AffinityCondition {
  type: 'current-affinity' | 'context' | 'frequency';
  params: Record<string, unknown>;
  multiplier: number;
}
```

### 4.2 Common Action Effects

```typescript
export const AFFINITY_EFFECTS: Record<string, AffinityEffect[]> = {
  // Positive actions
  'give-gift': [
    { dimension: 'fondness', baseChange: 5 },
    { dimension: 'trust', baseChange: 2 },
  ],
  'give-gift-thoughtful': [
    { dimension: 'fondness', baseChange: 15 },
    { dimension: 'trust', baseChange: 5 },
    { dimension: 'attraction', baseChange: 3 },
  ],
  'compliment-sincere': [
    { dimension: 'fondness', baseChange: 3 },
    { dimension: 'comfort', baseChange: 2 },
  ],
  'compliment-excessive': [
    { dimension: 'fondness', baseChange: 1 },
    { dimension: 'trust', baseChange: -2 }, // Suspicious
    { dimension: 'comfort', baseChange: -3 },
  ],
  'help-requested': [
    { dimension: 'fondness', baseChange: 5 },
    { dimension: 'trust', baseChange: 8 },
    { dimension: 'respect', baseChange: 3 },
  ],
  'help-unasked': [
    { dimension: 'fondness', baseChange: 8 },
    { dimension: 'trust', baseChange: 5 },
  ],
  'keep-promise': [
    { dimension: 'trust', baseChange: 10 },
    { dimension: 'respect', baseChange: 5 },
  ],
  'share-personal-info': [
    { dimension: 'comfort', baseChange: 5 },
    { dimension: 'trust', baseChange: 3 },
  ],
  'listen-attentively': [
    { dimension: 'fondness', baseChange: 3 },
    { dimension: 'comfort', baseChange: 5 },
  ],
  'defend-reputation': [
    { dimension: 'fondness', baseChange: 10 },
    { dimension: 'trust', baseChange: 8 },
    { dimension: 'respect', baseChange: 5 },
  ],

  // Negative actions
  insult: [
    { dimension: 'fondness', baseChange: -10 },
    { dimension: 'respect', baseChange: -5 },
    { dimension: 'comfort', baseChange: -5 },
  ],
  'lie-caught': [
    { dimension: 'trust', baseChange: -20 },
    { dimension: 'respect', baseChange: -10 },
  ],
  'break-promise': [
    { dimension: 'trust', baseChange: -25 },
    { dimension: 'respect', baseChange: -10 },
    { dimension: 'fondness', baseChange: -5 },
  ],
  ignore: [
    { dimension: 'fondness', baseChange: -3 },
    { dimension: 'comfort', baseChange: -2 },
  ],
  threaten: [
    { dimension: 'fear', baseChange: 20 },
    { dimension: 'trust', baseChange: -15 },
    { dimension: 'fondness', baseChange: -10 },
  ],
  'harm-physically': [
    { dimension: 'fear', baseChange: 40 },
    { dimension: 'trust', baseChange: -30 },
    { dimension: 'fondness', baseChange: -25 },
  ],
  'embarrass-publicly': [
    { dimension: 'fondness', baseChange: -15 },
    { dimension: 'trust', baseChange: -10 },
    { dimension: 'comfort', baseChange: -20 },
  ],

  // Romantic actions
  'flirt-welcome': [
    { dimension: 'attraction', baseChange: 5 },
    { dimension: 'fondness', baseChange: 2 },
    { dimension: 'comfort', baseChange: 2 },
  ],
  'flirt-unwelcome': [
    { dimension: 'attraction', baseChange: -5 },
    { dimension: 'comfort', baseChange: -10 },
    { dimension: 'respect', baseChange: -5 },
  ],
  'romantic-gesture': [
    { dimension: 'attraction', baseChange: 10 },
    { dimension: 'fondness', baseChange: 8 },
  ],
};
```

### 4.3 Personality-Modulated Effects

NPCs react differently based on their personality:

```typescript
/**
 * Apply personality modifiers to affinity change.
 */
export function applyPersonalityModifiers(
  effect: AffinityEffect,
  personality: PersonalityMap
): number {
  let change = effect.baseChange;

  if (!effect.personalityModifiers) return change;

  for (const mod of effect.personalityModifiers) {
    const traitValue = getTraitValue(personality, mod.trait);
    if (traitValue === undefined) continue;

    // Apply multiplier based on trait level
    if (traitValue > 0.6) {
      change *= mod.highMultiplier;
    } else if (traitValue < 0.4) {
      change *= mod.lowMultiplier;
    }
  }

  return Math.round(change);
}

// Example: Compliments
const COMPLIMENT_EFFECTS: AffinityEffect = {
  dimension: 'fondness',
  baseChange: 5,
  personalityModifiers: [
    {
      trait: 'modesty',
      highMultiplier: 0.5, // Modest NPCs are uncomfortable with praise
      lowMultiplier: 1.5, // Immodest NPCs love compliments
    },
    {
      trait: 'trust',
      highMultiplier: 1.2, // Trusting NPCs take compliments at face value
      lowMultiplier: 0.7, // Suspicious NPCs wonder about motives
    },
  ],
};
```

### 4.4 Diminishing Returns

Repeated actions have diminishing effects:

```typescript
export interface ActionHistory {
  actionType: string;
  count: number;
  lastOccurred: GameTime;
}

/**
 * Apply diminishing returns for repeated actions.
 */
export function calculateDiminishingReturns(
  baseChange: number,
  history: ActionHistory,
  config: DiminishingReturnsConfig
): number {
  const { decayFactor, minimumEffect, resetAfterHours } = config;

  // Check if enough time has passed to reset
  const hoursSinceFirst = calculateHoursBetween(history.lastOccurred, currentTime);
  if (hoursSinceFirst > resetAfterHours) {
    return baseChange; // Full effect
  }

  // Apply exponential decay based on count
  const multiplier = Math.max(minimumEffect, Math.pow(decayFactor, history.count - 1));
  return Math.round(baseChange * multiplier);
}

const DEFAULT_DIMINISHING_CONFIG: DiminishingReturnsConfig = {
  decayFactor: 0.7, // Each repeat is 70% as effective
  minimumEffect: 0.1, // Never less than 10% of base
  resetAfterHours: 24, // Reset after a day
};

// Example: First compliment = +5 fondness
// Second compliment (same day) = +3.5 fondness
// Third compliment = +2.5 fondness
// Fourth compliment = +1.7 fondness
// ...
```

## 5. Affinity Thresholds and Unlocks

### 5.1 Behavior Unlocks

Different affinity levels unlock NPC behaviors:

```typescript
export interface AffinityUnlock {
  /** What is unlocked */
  type: UnlockType;

  /** Required minimum scores */
  requirements: Partial<AffinityScores>;

  /** Things that block this unlock */
  blockers?: Partial<AffinityScores>;

  /** Description of the unlock */
  description: string;
}

export type UnlockType =
  | 'dialogue-topic'
  | 'action'
  | 'favor'
  | 'secret'
  | 'location-access'
  | 'romance-option'
  | 'special-interaction';

export const STANDARD_UNLOCKS: AffinityUnlock[] = [
  // Dialogue unlocks
  {
    type: 'dialogue-topic',
    requirements: { fondness: 20 },
    description: 'Willing to discuss personal opinions',
  },
  {
    type: 'dialogue-topic',
    requirements: { trust: 40 },
    description: 'Shares concerns and worries',
  },
  {
    type: 'secret',
    requirements: { trust: 60, fondness: 40 },
    description: 'Reveals a personal secret',
  },

  // Action unlocks
  {
    type: 'favor',
    requirements: { fondness: 30 },
    description: 'Will do small favors',
  },
  {
    type: 'favor',
    requirements: { fondness: 50, trust: 40 },
    description: 'Will take risks to help',
  },

  // Romance unlocks
  {
    type: 'romance-option',
    requirements: { attraction: 30, comfort: 20 },
    description: 'Receptive to light flirtation',
  },
  {
    type: 'romance-option',
    requirements: { attraction: 50, fondness: 40, trust: 30 },
    description: 'Open to romantic relationship',
  },

  // Fear-based unlocks
  {
    type: 'action',
    requirements: { fear: 40 },
    blockers: { trust: 20 }, // Must not trust player
    description: 'Can be intimidated into compliance',
  },
];
```

### 5.2 Tolerance Thresholds

Affinity affects how much the NPC will tolerate:

```typescript
export interface ToleranceProfile {
  /** How many insults before they get upset */
  insultThreshold: number;

  /** How long they'll listen to repetitive topics */
  boringTopicMinutes: number;

  /** How much flattery before they get suspicious */
  flatteryThreshold: number;

  /** How much prying before they shut down */
  pryingThreshold: number;

  /** How many rejections before they stop trying */
  rejectionThreshold: number;
}

/**
 * Calculate tolerance based on affinity.
 */
export function calculateTolerance(
  affinity: AffinityScores,
  personality: PersonalityMap
): ToleranceProfile {
  const baseTolerance = {
    insultThreshold: 1,
    boringTopicMinutes: 5,
    flatteryThreshold: 3,
    pryingThreshold: 2,
    rejectionThreshold: 2,
  };

  // Higher fondness = more tolerance
  const fondnessMultiplier = 1 + affinity.fondness / 100;

  // Higher trust = more tolerance for prying
  const trustMultiplier = 1 + affinity.trust / 100;

  // Personality modifiers
  const patienceMultiplier = (personality.dimensions?.agreeableness ?? 0.5) + 0.5;

  return {
    insultThreshold: Math.max(
      1,
      Math.floor(baseTolerance.insultThreshold * fondnessMultiplier * patienceMultiplier)
    ),
    boringTopicMinutes: Math.floor(baseTolerance.boringTopicMinutes * fondnessMultiplier),
    flatteryThreshold: Math.floor(baseTolerance.flatteryThreshold * (2 - trustMultiplier)),
    pryingThreshold: Math.floor(baseTolerance.pryingThreshold * trustMultiplier),
    rejectionThreshold: Math.floor(baseTolerance.rejectionThreshold * fondnessMultiplier),
  };
}
```

## 6. Affinity Decay and Growth

### 6.1 Natural Decay

Affinity scores drift toward neutral over time without interaction:

```typescript
export interface AffinityDecayConfig {
  /** How much scores drift toward 0 per day */
  dailyDecayRate: number;

  /** Minimum score before decay stops */
  decayFloor: number;

  /** Maximum score before decay starts */
  decayCeiling: number;

  /** Dimensions that decay faster/slower */
  dimensionMultipliers: Partial<Record<keyof AffinityScores, number>>;
}

const DEFAULT_DECAY_CONFIG: AffinityDecayConfig = {
  dailyDecayRate: 2,
  decayFloor: -20, // Scores between -20 and 20 don't decay
  decayCeiling: 20,
  dimensionMultipliers: {
    fondness: 1.0, // Normal decay
    trust: 0.5, // Trust decays slowly
    respect: 0.3, // Respect is sticky
    comfort: 1.5, // Comfort decays quickly without contact
    attraction: 0.8, // Attraction fades moderately
    fear: 1.2, // Fear fades with time
  },
};

/**
 * Apply daily decay to affinity scores.
 */
export function applyAffinityDecay(
  affinity: AffinityScores,
  daysSinceLastInteraction: number,
  config: AffinityDecayConfig = DEFAULT_DECAY_CONFIG
): AffinityScores {
  const result = { ...affinity };

  for (const [key, value] of Object.entries(affinity)) {
    if (key === 'fear') {
      // Fear decays toward 0
      if (value > 0) {
        const decay =
          config.dailyDecayRate *
          (config.dimensionMultipliers.fear ?? 1) *
          daysSinceLastInteraction;
        result.fear = Math.max(0, value - decay);
      }
      continue;
    }

    // Skip if in neutral zone
    if (value >= config.decayFloor && value <= config.decayCeiling) continue;

    const multiplier = config.dimensionMultipliers[key as keyof AffinityScores] ?? 1;
    const decay = config.dailyDecayRate * multiplier * daysSinceLastInteraction;

    if (value > config.decayCeiling) {
      result[key as keyof AffinityScores] = Math.max(config.decayCeiling, value - decay);
    } else if (value < config.decayFloor) {
      result[key as keyof AffinityScores] = Math.min(config.decayFloor, value + decay);
    }
  }

  return result;
}
```

### 6.2 Milestone Events

Certain events create permanent affinity shifts:

```typescript
export interface AffinityMilestone {
  id: string;
  name: string;
  description: string;
  effects: Partial<AffinityScores>;
  permanent: boolean; // If true, won't decay below this
}

const MILESTONE_EXAMPLES: AffinityMilestone[] = [
  {
    id: 'saved-life',
    name: 'Life Saver',
    description: 'Player saved this NPC from death',
    effects: { trust: 40, fondness: 30, respect: 20 },
    permanent: true,
  },
  {
    id: 'betrayed',
    name: 'Betrayed',
    description: 'Player betrayed this NPC in a significant way',
    effects: { trust: -50, fondness: -30, respect: -20 },
    permanent: true,
  },
  {
    id: 'first-kiss',
    name: 'First Kiss',
    description: 'Shared a romantic first kiss',
    effects: { attraction: 20, fondness: 15, comfort: 10 },
    permanent: true,
  },
];
```

## 7. Schema Integration

### 7.1 Affinity State in Character Instance

Affinity is stored per NPC instance in the session:

```typescript
// In character_instances.profile_json or a dedicated field

export interface CharacterInstanceAffinity {
  /** Current affinity scores */
  scores: AffinityScores;

  /** When affinity was last updated */
  lastUpdated: string; // ISO timestamp

  /** Action history for diminishing returns */
  actionHistory: ActionHistory[];

  /** Achieved milestones */
  milestones: string[];

  /** Relationship level/label (cached from disposition) */
  relationshipLevel: DispositionLevel;
}
```

### 7.2 Database Schema

```sql
-- Option A: Store in profile_json (current pattern)
-- Affinity lives at profile_json.affinity

-- Option B: Dedicated table for querying
CREATE TABLE IF NOT EXISTS session_npc_affinity (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL, -- References character_instances.id
  fondness INTEGER NOT NULL DEFAULT 0,
  trust INTEGER NOT NULL DEFAULT 0,
  respect INTEGER NOT NULL DEFAULT 0,
  comfort INTEGER NOT NULL DEFAULT 0,
  attraction INTEGER,
  fear INTEGER NOT NULL DEFAULT 0,
  action_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones TEXT[] NOT NULL DEFAULT '{}',
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_session_npc_affinity_session
  ON session_npc_affinity(session_id);
```

## 8. Integration with NPC Agent

### 8.1 Affinity Context in Prompts

The NPC agent receives affinity context to inform responses:

```typescript
export interface AffinityContext {
  /** Current relationship level */
  relationship: DispositionLevel;

  /** Key affinity insights for prompting */
  insights: string[];

  /** What the NPC is willing to do */
  availableActions: string[];

  /** What topics are open */
  availableTopics: string[];

  /** Current tolerance levels */
  tolerance: ToleranceProfile;
}

/**
 * Build affinity context for prompt injection.
 */
export function buildAffinityContext(
  affinity: AffinityScores,
  personality: PersonalityMap
): AffinityContext {
  const disposition = calculateDisposition(affinity);
  const tolerance = calculateTolerance(affinity, personality);
  const unlocks = getAvailableUnlocks(affinity);

  const insights: string[] = [];

  // Generate human-readable insights
  if (affinity.fondness > 50) {
    insights.push("Genuinely enjoys the player's company");
  } else if (affinity.fondness < -30) {
    insights.push('Dislikes the player');
  }

  if (affinity.trust > 40) {
    insights.push('Trusts the player with sensitive information');
  } else if (affinity.trust < -20) {
    insights.push("Suspicious of the player's motives");
  }

  if (affinity.fear > 40) {
    insights.push('Afraid of the player, will be compliant but resentful');
  }

  return {
    relationship: disposition.level,
    insights,
    availableActions: unlocks.filter((u) => u.type === 'action').map((u) => u.description),
    availableTopics: unlocks.filter((u) => u.type === 'dialogue-topic').map((u) => u.description),
    tolerance,
  };
}
```

### 8.2 Prompt Injection Example

```text
RELATIONSHIP WITH PLAYER:
Level: Friendly
Insights:
- Genuinely enjoys the player's company
- Willing to share personal opinions
Tolerance:
- Will tolerate up to 2 insults before getting upset
- Will listen to same topic for ~10 minutes before changing subject
```

## 9. Open Questions

1. **NPC-NPC Affinity**: Should NPCs have affinity scores with each other? How does that affect group dynamics?

2. **Faction Affinity**: Should there be group/faction-level affinity that affects all members?

3. **Affinity Visibility**: Should players see exact scores, vague indicators, or figure it out from behavior?

4. **Memory of Affinity Changes**: Should NPCs reference why they feel a certain way ("Remember when you helped me...")?

5. **Affinity Transfer**: If an NPC likes you, do their friends start with higher affinity?

6. **Cultural Modifiers**: Should different cultures/settings have different affinity dynamics?

7. **Affinity Manipulation**: Should there be skills or items that affect affinity (charm spells, etc.)?

8. **Recovery from Betrayal**: How hard should it be to recover from major negative events?

## 10. Next Steps

1. Add `AffinityScoresSchema` to `@minimal-rpg/schemas`
2. Extend character instance state with affinity tracking
3. Implement affinity effects in the NPC agent
4. Add affinity context to turn state
5. Create affinity decay job/trigger
6. Build UI for viewing relationship status (if visible to player)

## 11. Related Documents

- [20-personality-schema-brainstorm.md](20-personality-schema-brainstorm.md) - Personality system
- [18-multi-npc-sessions-and-state.md](18-multi-npc-sessions-and-state.md) - Multi-NPC sessions
- [26-time-system.md](26-time-system.md) - Time system (for decay calculations)
- [29-time-triggered-behaviors.md](29-time-triggered-behaviors.md) - Time-aware behaviors that use affinity
