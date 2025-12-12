# Time-Triggered Behaviors

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document outlines the design for time-aware NPC behaviors during player interactions. These are reactions and behavioral changes that occur based on conversation duration, repetitive topics, time of day, and other temporal factors.

## 1. Design Philosophy

### 1.1 Goals

Time-triggered behaviors should:

- **Add realism** - NPCs shouldn't be infinitely patient or available
- **Create natural conversation flow** - Long conversations should evolve or end
- **Reward variety** - Players who vary their approach get better responses
- **Enable NPC agency** - NPCs can change topics, leave, or express impatience
- **Integrate with affinity** - High affinity = more patience and tolerance
- **Be configurable per NPC** - Different personalities have different triggers

### 1.2 Core Concept: Behavioral Triggers

NPCs have internal "meters" that fill based on conversation dynamics. When thresholds are crossed, behavioral triggers fire:

```typescript
export interface BehaviorTrigger {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** What causes this trigger to accumulate */
  accumulator: TriggerAccumulator;

  /** Threshold at which the trigger fires */
  threshold: number;

  /** What happens when triggered */
  response: TriggerResponse;

  /** Does the trigger reset after firing? */
  resetOnFire: boolean;

  /** Cooldown before it can fire again (in turns) */
  cooldownTurns: number;
}
```

## 2. Trigger Accumulators

### 2.1 Accumulator Types

```typescript
export type TriggerAccumulator =
  | { type: 'turn-count' }
  | { type: 'elapsed-minutes' }
  | { type: 'topic-repetition'; topicId: string }
  | { type: 'sentiment-streak'; sentiment: 'positive' | 'negative' | 'neutral' }
  | { type: 'action-count'; actionType: string }
  | { type: 'silence-duration' } // Player not responding
  | { type: 'flattery-count' }
  | { type: 'prying-count' }
  | { type: 'insult-count' }
  | { type: 'rejection-count' }
  | { type: 'topic-change-count' };

export interface AccumulatorState {
  /** Current value */
  value: number;

  /** When accumulation started */
  startedAt: GameTime;

  /** Last turn this was updated */
  lastUpdatedTurn: number;

  /** Is this currently on cooldown? */
  cooldownUntilTurn?: number;
}
```

### 2.2 Accumulator Behaviors

| Accumulator          | Increments When                     | Typical Threshold |
| -------------------- | ----------------------------------- | ----------------- |
| `turn-count`         | Each turn passes                    | 20-50 turns       |
| `elapsed-minutes`    | Game time advances                  | 10-30 minutes     |
| `topic-repetition`   | Same topic discussed                | 3-5 repetitions   |
| `sentiment-streak`   | Consecutive same-sentiment turns    | 5-10 turns        |
| `action-count`       | Specific action type occurs         | 3-5 occurrences   |
| `silence-duration`   | Player doesn't respond (if tracked) | 3-5 minutes       |
| `flattery-count`     | Compliments/flattery detected       | 5-10 instances    |
| `prying-count`       | Personal questions asked            | 3-5 questions     |
| `insult-count`       | Insults/rudeness detected           | 1-3 instances     |
| `rejection-count`    | NPC offers rejected                 | 2-4 rejections    |
| `topic-change-count` | Conversation topic switches         | 5-10 changes      |

## 3. Trigger Responses

### 3.1 Response Types

```typescript
export type TriggerResponse =
  | { type: 'dialogue'; template: string; sentiment?: string }
  | { type: 'action'; actionId: string }
  | { type: 'mood-shift'; moodChange: MoodChange }
  | { type: 'topic-change'; newTopic?: string }
  | { type: 'leave'; reason: string }
  | { type: 'affinity-change'; effects: AffinityEffect[] }
  | { type: 'flag-set'; flagId: string; value: unknown }
  | { type: 'composite'; responses: TriggerResponse[] };

export interface MoodChange {
  /** Which emotional dimension changes */
  dimension: 'energy' | 'valence' | 'engagement';

  /** Direction of change */
  direction: 'increase' | 'decrease';

  /** Magnitude (1-5) */
  magnitude: number;
}
```

### 3.2 Response Templates

Dialogue templates support variable injection:

```typescript
const RESPONSE_TEMPLATES = {
  // Boredom responses
  'bored-topic-change': [
    'Anyway... have you heard about {random_topic}?',
    'Speaking of which... *changes subject* So, {random_topic}?',
    "I've been meaning to ask you about something else entirely.",
  ],

  'bored-hint': [
    "*stifles a yawn* We've been talking about this for a while...",
    'Mmhmm... *eyes wander around the room*',
    "That's... interesting. Again.",
  ],

  // Impatience responses
  'impatient-mild': [
    'Is there something specific you needed?',
    "I don't mean to rush, but...",
    '*glances at the time* Was there anything else?',
  ],

  'impatient-strong': [
    'Look, I really need to get going.',
    "I've got other things to attend to.",
    '*sighs* Can we wrap this up?',
  ],

  // Suspicion responses (excessive flattery)
  'suspicious-flattery': [
    "*narrows eyes* You're laying it on a bit thick, aren't you?",
    'Okay, what do you actually want?',
    'All this flattery... you must want something.',
  ],

  // Discomfort responses (prying)
  'uncomfortable-prying': [
    "I'd rather not talk about that.",
    "*shifts uncomfortably* That's... personal.",
    'Why do you want to know all this?',
  ],

  // Departure responses
  'leaving-neutral': [
    "Well, it's been nice talking, but I should go.",
    'I need to get back to what I was doing.',
    "I'll see you around.",
  ],

  'leaving-annoyed': [
    "*stands abruptly* I think we're done here.",
    "I've had enough of this conversation.",
    '*walks away without another word*',
  ],

  'leaving-scheduled': [
    'Oh, I just realized the time. I need to be somewhere.',
    "Sorry, I have an appointment I can't miss.",
    "I have to go - I'm expected elsewhere.",
  ],
};
```

## 4. Common Trigger Patterns

### 4.1 Boredom Pattern

When conversations drag on without variety:

```typescript
const BOREDOM_TRIGGERS: BehaviorTrigger[] = [
  {
    id: 'same-topic-boredom',
    name: 'Topic Repetition Boredom',
    accumulator: { type: 'topic-repetition', topicId: 'any' },
    threshold: 4, // 4 turns on same topic
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'bored-hint' },
        {
          type: 'mood-shift',
          moodChange: { dimension: 'engagement', direction: 'decrease', magnitude: 2 },
        },
      ],
    },
    resetOnFire: true,
    cooldownTurns: 3,
  },
  {
    id: 'prolonged-boredom',
    name: 'Prolonged Conversation Boredom',
    accumulator: { type: 'elapsed-minutes' },
    threshold: 20, // 20 game minutes
    response: { type: 'topic-change' },
    resetOnFire: true,
    cooldownTurns: 10,
  },
  {
    id: 'extreme-boredom',
    name: 'Extreme Boredom - Leave',
    accumulator: { type: 'elapsed-minutes' },
    threshold: 30, // 30 game minutes
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'leaving-neutral' },
        { type: 'leave', reason: 'boredom' },
      ],
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
];
```

### 4.2 Suspicion Pattern

When players are excessively flattering:

```typescript
const SUSPICION_TRIGGERS: BehaviorTrigger[] = [
  {
    id: 'mild-suspicion',
    name: 'Getting Suspicious',
    accumulator: { type: 'flattery-count' },
    threshold: 5,
    response: {
      type: 'composite',
      responses: [
        {
          type: 'mood-shift',
          moodChange: { dimension: 'valence', direction: 'decrease', magnitude: 1 },
        },
        { type: 'affinity-change', effects: [{ dimension: 'trust', baseChange: -3 }] },
      ],
    },
    resetOnFire: true,
    cooldownTurns: 5,
  },
  {
    id: 'overt-suspicion',
    name: 'Openly Suspicious',
    accumulator: { type: 'flattery-count' },
    threshold: 8,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'suspicious-flattery' },
        { type: 'affinity-change', effects: [{ dimension: 'trust', baseChange: -10 }] },
      ],
    },
    resetOnFire: true,
    cooldownTurns: 10,
  },
];
```

### 4.3 Discomfort Pattern

When players pry too much:

```typescript
const DISCOMFORT_TRIGGERS: BehaviorTrigger[] = [
  {
    id: 'mild-discomfort',
    name: 'Starting to Feel Uncomfortable',
    accumulator: { type: 'prying-count' },
    threshold: 3,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'uncomfortable-prying' },
        {
          type: 'mood-shift',
          moodChange: { dimension: 'engagement', direction: 'decrease', magnitude: 1 },
        },
      ],
    },
    resetOnFire: true,
    cooldownTurns: 3,
  },
  {
    id: 'shutting-down',
    name: 'Shutting Down',
    accumulator: { type: 'prying-count' },
    threshold: 5,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'uncomfortable-prying' },
        { type: 'topic-change' },
        { type: 'affinity-change', effects: [{ dimension: 'comfort', baseChange: -15 }] },
      ],
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
];
```

### 4.4 Impatience Pattern

When NPCs have places to be:

```typescript
const IMPATIENCE_TRIGGERS: BehaviorTrigger[] = [
  {
    id: 'schedule-awareness',
    name: 'Checking the Time',
    accumulator: { type: 'elapsed-minutes' },
    threshold: 15,
    response: {
      type: 'dialogue',
      template: 'impatient-mild',
    },
    resetOnFire: true,
    cooldownTurns: 10,
  },
  {
    id: 'schedule-departure',
    name: 'Needs to Leave for Schedule',
    accumulator: { type: 'elapsed-minutes' },
    threshold: 25,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'leaving-scheduled' },
        { type: 'leave', reason: 'schedule' },
      ],
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
];
```

## 5. Affinity Modulation

### 5.1 Threshold Scaling

Affinity affects trigger thresholds:

```typescript
/**
 * Scale a trigger threshold based on affinity.
 * Higher affinity = higher threshold = more patience.
 */
export function scaleThresholdByAffinity(
  baseThreshold: number,
  affinity: AffinityScores,
  triggerType: string
): number {
  const disposition = calculateDisposition(affinity);

  // Base multiplier from disposition
  const dispositionMultipliers: Record<DispositionLevel, number> = {
    hostile: 0.5, // Half as patient
    unfriendly: 0.75,
    neutral: 1.0,
    friendly: 1.5,
    close: 2.0, // Twice as patient
    devoted: 3.0, // Three times as patient
  };

  let multiplier = dispositionMultipliers[disposition.level];

  // Specific affinity dimension bonuses
  switch (triggerType) {
    case 'flattery-count':
      // Trust reduces suspicion of flattery
      multiplier *= 1 + affinity.trust / 200;
      break;
    case 'prying-count':
      // Comfort increases tolerance for prying
      multiplier *= 1 + affinity.comfort / 150;
      break;
    case 'elapsed-minutes':
      // Fondness increases conversation tolerance
      multiplier *= 1 + affinity.fondness / 200;
      break;
    case 'insult-count':
      // Fondness provides insult buffer
      multiplier *= 1 + affinity.fondness / 100;
      break;
  }

  return Math.round(baseThreshold * multiplier);
}
```

### 5.2 Response Modulation

Affinity also affects how triggers respond:

```typescript
/**
 * Modulate trigger response based on affinity.
 */
export function modulateResponse(
  response: TriggerResponse,
  affinity: AffinityScores
): TriggerResponse {
  const disposition = calculateDisposition(affinity);

  // Soften responses for higher affinity
  if (disposition.level === 'close' || disposition.level === 'devoted') {
    switch (response.type) {
      case 'dialogue':
        // Use softer templates
        if (response.template.includes('annoyed')) {
          return { ...response, template: response.template.replace('annoyed', 'mild') };
        }
        break;
      case 'leave':
        // High affinity NPCs are less likely to actually leave
        if (Math.random() > 0.3) {
          return { type: 'topic-change' }; // Stay but change subject
        }
        break;
      case 'affinity-change':
        // Reduce negative affinity impacts for close relationships
        return {
          ...response,
          effects: response.effects.map((e) => ({
            ...e,
            baseChange: e.baseChange < 0 ? e.baseChange * 0.5 : e.baseChange,
          })),
        };
    }
  }

  // Intensify responses for hostile/unfriendly
  if (disposition.level === 'hostile' || disposition.level === 'unfriendly') {
    switch (response.type) {
      case 'dialogue':
        // Use harsher templates
        if (response.template.includes('mild')) {
          return { ...response, template: response.template.replace('mild', 'annoyed') };
        }
        break;
      case 'affinity-change':
        // Amplify negative affinity impacts
        return {
          ...response,
          effects: response.effects.map((e) => ({
            ...e,
            baseChange: e.baseChange < 0 ? e.baseChange * 1.5 : e.baseChange,
          })),
        };
    }
  }

  return response;
}
```

## 6. Personality-Based Triggers

### 6.1 Personality Trigger Profiles

Different personalities have different trigger configurations:

```typescript
export interface PersonalityTriggerProfile {
  /** Multipliers for accumulator speeds */
  accumulatorMultipliers: Partial<Record<TriggerAccumulator['type'], number>>;

  /** Threshold adjustments */
  thresholdAdjustments: Partial<Record<string, number>>;

  /** Additional triggers for this personality type */
  additionalTriggers: BehaviorTrigger[];

  /** Triggers to disable */
  disabledTriggers: string[];
}

const PERSONALITY_TRIGGER_PROFILES: Record<string, PersonalityTriggerProfile> = {
  // High extraversion = more patient with long conversations
  'extraversion:high': {
    accumulatorMultipliers: {
      'elapsed-minutes': 0.7, // Slower boredom accumulation
      'topic-repetition': 0.8,
    },
    thresholdAdjustments: {},
    additionalTriggers: [],
    disabledTriggers: [],
  },

  // Low extraversion = less patient with long conversations
  'extraversion:low': {
    accumulatorMultipliers: {
      'elapsed-minutes': 1.5, // Faster boredom accumulation
      'topic-repetition': 1.3,
    },
    thresholdAdjustments: {},
    additionalTriggers: [
      {
        id: 'introvert-overwhelm',
        name: 'Introvert Social Exhaustion',
        accumulator: { type: 'turn-count' },
        threshold: 15,
        response: {
          type: 'composite',
          responses: [
            { type: 'dialogue', template: 'impatient-mild' },
            {
              type: 'mood-shift',
              moodChange: { dimension: 'energy', direction: 'decrease', magnitude: 2 },
            },
          ],
        },
        resetOnFire: true,
        cooldownTurns: 5,
      },
    ],
    disabledTriggers: [],
  },

  // High trust = slower suspicion accumulation
  'trust:high': {
    accumulatorMultipliers: {
      'flattery-count': 0.5, // Takes twice as much flattery to get suspicious
    },
    thresholdAdjustments: {
      'mild-suspicion': 3, // +3 to threshold
      'overt-suspicion': 5,
    },
    additionalTriggers: [],
    disabledTriggers: [],
  },

  // Low trust = faster suspicion
  'trust:low': {
    accumulatorMultipliers: {
      'flattery-count': 1.5,
      'prying-count': 1.3,
    },
    thresholdAdjustments: {
      'mild-suspicion': -2,
      'overt-suspicion': -3,
    },
    additionalTriggers: [
      {
        id: 'paranoid-check',
        name: 'Paranoid Question',
        accumulator: { type: 'turn-count' },
        threshold: 8,
        response: {
          type: 'dialogue',
          template: 'suspicious-question',
        },
        resetOnFire: true,
        cooldownTurns: 10,
      },
    ],
    disabledTriggers: [],
  },

  // High neuroticism = more reactive to negative stimuli
  'neuroticism:high': {
    accumulatorMultipliers: {
      'insult-count': 2.0, // Insults hit twice as hard
      'rejection-count': 1.5,
    },
    thresholdAdjustments: {},
    additionalTriggers: [
      {
        id: 'anxious-overthink',
        name: 'Anxious Overthinking',
        accumulator: { type: 'silence-duration' },
        threshold: 2,
        response: {
          type: 'dialogue',
          template: 'anxious-fill-silence',
        },
        resetOnFire: true,
        cooldownTurns: 3,
      },
    ],
    disabledTriggers: [],
  },

  // Low neuroticism = more resilient
  'neuroticism:low': {
    accumulatorMultipliers: {
      'insult-count': 0.5,
      'rejection-count': 0.7,
    },
    thresholdAdjustments: {},
    additionalTriggers: [],
    disabledTriggers: ['anxious-overthink'],
  },
};
```

## 7. Time-of-Day Triggers

### 7.1 Period-Based Modifiers

NPCs behave differently at different times of day:

```typescript
export interface TimeOfDayModifier {
  /** Which period this applies to */
  period: string;

  /** Multipliers for accumulators during this period */
  accumulatorMultipliers: Partial<Record<TriggerAccumulator['type'], number>>;

  /** Additional triggers active during this period */
  periodTriggers: BehaviorTrigger[];

  /** Mood baseline adjustment */
  moodAdjustment?: MoodChange;
}

const TIME_OF_DAY_MODIFIERS: TimeOfDayModifier[] = [
  {
    period: 'morning',
    accumulatorMultipliers: {
      'elapsed-minutes': 0.8, // More patient in the morning (usually)
    },
    periodTriggers: [],
    moodAdjustment: { dimension: 'energy', direction: 'increase', magnitude: 1 },
  },
  {
    period: 'night',
    accumulatorMultipliers: {
      'elapsed-minutes': 1.3, // Less patient at night
      'topic-repetition': 1.2,
    },
    periodTriggers: [
      {
        id: 'tired-yawn',
        name: 'Tired Yawning',
        accumulator: { type: 'elapsed-minutes' },
        threshold: 10,
        response: {
          type: 'dialogue',
          template: 'tired-hint',
        },
        resetOnFire: true,
        cooldownTurns: 5,
      },
    ],
    moodAdjustment: { dimension: 'energy', direction: 'decrease', magnitude: 2 },
  },
  {
    period: 'dawn',
    accumulatorMultipliers: {},
    periodTriggers: [],
    moodAdjustment: { dimension: 'valence', direction: 'increase', magnitude: 1 },
  },
];
```

### 7.2 Schedule Awareness

NPCs become more impatient when they need to leave for their schedule:

```typescript
/**
 * Check if NPC has an upcoming schedule event.
 */
export function checkScheduleUrgency(
  npc: NpcInstance,
  currentTime: GameTime
): ScheduleUrgency | null {
  const schedule = loadSchedule(npc.scheduleId);
  const nextSlot = getSlotAfter(schedule, currentTime);

  if (!nextSlot) return null;

  const minutesUntilNext = calculateMinutesBetween(
    currentTime,
    slotStartToGameTime(nextSlot, currentTime.day)
  );

  if (minutesUntilNext <= 5) {
    return { level: 'urgent', minutesRemaining: minutesUntilNext };
  } else if (minutesUntilNext <= 15) {
    return { level: 'soon', minutesRemaining: minutesUntilNext };
  } else if (minutesUntilNext <= 30) {
    return { level: 'aware', minutesRemaining: minutesUntilNext };
  }

  return null;
}

export interface ScheduleUrgency {
  level: 'aware' | 'soon' | 'urgent';
  minutesRemaining: number;
}

const SCHEDULE_URGENCY_TRIGGERS: Record<ScheduleUrgency['level'], BehaviorTrigger> = {
  aware: {
    id: 'schedule-aware',
    name: 'Aware of Upcoming Commitment',
    accumulator: { type: 'turn-count' },
    threshold: 1, // Immediate
    response: {
      type: 'flag-set',
      flagId: 'schedule-pressure',
      value: 1,
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
  soon: {
    id: 'schedule-soon',
    name: 'Commitment Coming Soon',
    accumulator: { type: 'turn-count' },
    threshold: 1,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'impatient-mild' },
        { type: 'flag-set', flagId: 'schedule-pressure', value: 2 },
      ],
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
  urgent: {
    id: 'schedule-urgent',
    name: 'Must Leave Now',
    accumulator: { type: 'turn-count' },
    threshold: 1,
    response: {
      type: 'composite',
      responses: [
        { type: 'dialogue', template: 'leaving-scheduled' },
        { type: 'leave', reason: 'schedule' },
      ],
    },
    resetOnFire: false,
    cooldownTurns: 0,
  },
};
```

## 8. Trigger Evaluation Flow

### 8.1 Turn Processing

At each turn, triggers are evaluated:

```typescript
export interface TriggerEvaluationResult {
  /** Triggers that fired this turn */
  firedTriggers: FiredTrigger[];

  /** Updated accumulator states */
  updatedAccumulators: Map<string, AccumulatorState>;

  /** Dialogue to inject */
  dialogueInjections: string[];

  /** Actions to take */
  actions: TriggerResponse[];
}

export interface FiredTrigger {
  triggerId: string;
  response: TriggerResponse;
  accumulatorValue: number;
}

/**
 * Evaluate all triggers for an NPC at the current turn.
 */
export function evaluateTriggers(
  npc: NpcInstance,
  turnContext: TurnStateContext,
  conversationState: ConversationState
): TriggerEvaluationResult {
  const triggers = getActiveTriggersForNpc(npc);
  const accumulators = loadAccumulatorStates(npc.id);
  const affinity = loadAffinity(npc.id);

  const firedTriggers: FiredTrigger[] = [];
  const dialogueInjections: string[] = [];
  const actions: TriggerResponse[] = [];

  for (const trigger of triggers) {
    // Skip if on cooldown
    if (isOnCooldown(trigger.id, accumulators, turnContext.turnNumber)) {
      continue;
    }

    // Get or create accumulator state
    const accState = accumulators.get(trigger.id) ?? createAccumulatorState();

    // Update accumulator based on this turn
    const newValue = updateAccumulator(
      accState,
      trigger.accumulator,
      conversationState,
      turnContext
    );

    // Scale threshold by affinity
    const scaledThreshold = scaleThresholdByAffinity(
      trigger.threshold,
      affinity,
      trigger.accumulator.type
    );

    // Check if threshold crossed
    if (newValue >= scaledThreshold) {
      // Modulate response by affinity
      const modulatedResponse = modulateResponse(trigger.response, affinity);

      firedTriggers.push({
        triggerId: trigger.id,
        response: modulatedResponse,
        accumulatorValue: newValue,
      });

      // Collect dialogue and actions
      collectResponses(modulatedResponse, dialogueInjections, actions);

      // Reset or mark cooldown
      if (trigger.resetOnFire) {
        accumulators.set(trigger.id, createAccumulatorState());
      }
      if (trigger.cooldownTurns > 0) {
        accumulators.get(trigger.id)!.cooldownUntilTurn =
          turnContext.turnNumber + trigger.cooldownTurns;
      }
    } else {
      // Update accumulator state
      accumulators.set(trigger.id, { ...accState, value: newValue });
    }
  }

  return {
    firedTriggers,
    updatedAccumulators: accumulators,
    dialogueInjections,
    actions,
  };
}
```

### 8.2 Conversation State Tracking

Track conversation dynamics for accumulator updates:

```typescript
export interface ConversationState {
  /** Current conversation topic */
  currentTopic: string;

  /** How many turns on current topic */
  turnsOnTopic: number;

  /** Recent sentiments (last N turns) */
  recentSentiments: Array<'positive' | 'negative' | 'neutral'>;

  /** Count of various action types this conversation */
  actionCounts: Map<string, number>;

  /** Total turns in this conversation */
  totalTurns: number;

  /** When conversation started (game time) */
  startedAt: GameTime;
}

/**
 * Update conversation state based on the current turn.
 */
export function updateConversationState(
  state: ConversationState,
  turnAnalysis: TurnAnalysis,
  currentTime: GameTime
): ConversationState {
  const newState = { ...state };

  // Update topic tracking
  if (turnAnalysis.topic !== state.currentTopic) {
    newState.currentTopic = turnAnalysis.topic;
    newState.turnsOnTopic = 1;
  } else {
    newState.turnsOnTopic++;
  }

  // Update sentiment tracking (keep last 10)
  newState.recentSentiments = [...state.recentSentiments.slice(-9), turnAnalysis.sentiment];

  // Update action counts
  for (const action of turnAnalysis.detectedActions) {
    const current = state.actionCounts.get(action) ?? 0;
    newState.actionCounts.set(action, current + 1);
  }

  // Update turn count
  newState.totalTurns++;

  return newState;
}

export interface TurnAnalysis {
  /** Detected topic of this turn */
  topic: string;

  /** Sentiment of this turn */
  sentiment: 'positive' | 'negative' | 'neutral';

  /** Actions detected in player input */
  detectedActions: string[];
}
```

## 9. Integration with NPC Agent

### 9.1 Trigger Context in Prompts

When triggers fire, inject context for the NPC agent:

```typescript
export interface TriggerContext {
  /** Triggers that fired this turn */
  activeResponses: string[];

  /** Dialogue the NPC should incorporate */
  suggestedDialogue: string[];

  /** Mood adjustments to apply */
  moodShifts: MoodChange[];

  /** Whether the NPC should leave after responding */
  shouldLeave: boolean;

  /** Reason for leaving if applicable */
  leaveReason?: string;
}

/**
 * Build prompt context from trigger evaluation.
 */
export function buildTriggerPromptContext(result: TriggerEvaluationResult): string {
  const lines: string[] = [];

  if (result.dialogueInjections.length > 0) {
    lines.push('BEHAVIOR NOTES:');
    for (const dialogue of result.dialogueInjections) {
      lines.push(`- Consider expressing: "${dialogue}"`);
    }
  }

  const moodShifts = result.actions.filter(
    (a): a is Extract<TriggerResponse, { type: 'mood-shift' }> => a.type === 'mood-shift'
  );

  if (moodShifts.length > 0) {
    lines.push('MOOD ADJUSTMENTS:');
    for (const shift of moodShifts) {
      lines.push(`- ${shift.moodChange.dimension} ${shift.moodChange.direction}s`);
    }
  }

  const leaveAction = result.actions.find(
    (a): a is Extract<TriggerResponse, { type: 'leave' }> => a.type === 'leave'
  );
  if (leaveAction) {
    lines.push(`NPC SHOULD LEAVE: ${leaveAction.reason}`);
    lines.push('End the conversation and have the NPC depart.');
  }

  return lines.join('\n');
}
```

## 10. Schema Integration

### 10.1 NPC Trigger Configuration

Add trigger configuration to character profiles:

```typescript
// In packages/schemas/src/character/characterProfile.ts

export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  // ... existing fields

  /** Custom trigger configuration */
  triggerConfig: z
    .object({
      /** Override default triggers */
      triggerOverrides: z.array(BehaviorTriggerSchema).optional(),

      /** Disable specific default triggers */
      disabledTriggers: z.array(z.string()).optional(),

      /** Global threshold multiplier (0.5 = half thresholds, 2.0 = double) */
      thresholdMultiplier: z.number().min(0.1).max(5).default(1),

      /** Global accumulator speed multiplier */
      accumulatorMultiplier: z.number().min(0.1).max(5).default(1),
    })
    .optional(),
});
```

### 10.2 Session Trigger State

Track trigger state per conversation:

```typescript
export interface SessionTriggerState {
  /** Accumulator states by trigger ID */
  accumulators: Record<string, AccumulatorState>;

  /** Triggers currently on cooldown */
  cooldowns: Record<string, number>; // triggerId -> turn number when cooldown ends

  /** Conversation state */
  conversation: ConversationState;
}
```

## 11. Open Questions

1. **LLM-Detected Actions**: How reliably can we detect actions like "flattery" or "prying" from natural language?

2. **Trigger Visibility**: Should players have any indication that triggers are accumulating?

3. **Override During Important Moments**: Should story-critical NPCs be immune to leaving triggers?

4. **Player Counter-Actions**: Can players do things to reset accumulators (apologize, change topic)?

5. **Group Conversations**: How do triggers work when multiple NPCs are present?

6. **Interruptibility**: If an NPC is about to leave, can the player say something to make them stay?

7. **Trigger Persistence**: Do accumulator states persist across multiple conversations on the same day?

8. **Dramatic Timing**: Should triggers be delayed to avoid interrupting important narrative moments?

## 12. Next Steps

1. Add `BehaviorTriggerSchema` to `@minimal-rpg/schemas`
2. Implement trigger evaluation in the turn flow
3. Add conversation state tracking
4. Create action detection heuristics (or LLM-based detection)
5. Integrate trigger context into NPC agent prompts
6. Test with various personality configurations

## 13. Related Documents

- [26-time-system.md](26-time-system.md) - Time system
- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - NPC schedules
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - Affinity system
- [20-personality-schema-brainstorm.md](20-personality-schema-brainstorm.md) - Personality system
