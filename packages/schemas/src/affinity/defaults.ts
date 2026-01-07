/**
 * Affinity Default Values and Effect Definitions
 *
 * Standard configurations and action effect tables.
 *
 * @see dev-docs/28-affinity-and-relationship-dynamics.md
 */
import type {
  RelationshipScores,
  AffinityEffectsMap,
  DiminishingReturnsConfig,
  AffinityDecayConfig,
  AffinityUnlock,
  AffinityMilestone,
  DispositionWeights,
  ToleranceProfile,
} from './types.js';

// =============================================================================
// Default Affinity Scores
// =============================================================================

/**
 * Default affinity scores for a new NPC-player relationship.
 */
export const DEFAULT_AFFINITY_SCORES: RelationshipScores = {
  fondness: 0,
  trust: 0,
  respect: 0,
  comfort: 0,
  attraction: 0,
  fear: 0,
};

/**
 * Default affinity scores with attraction enabled.
 * @deprecated Use DEFAULT_AFFINITY_SCORES instead (attraction is now always present)
 */
export const DEFAULT_AFFINITY_SCORES_WITH_ATTRACTION: RelationshipScores = {
  ...DEFAULT_AFFINITY_SCORES,
};

// =============================================================================
// Disposition Weights
// =============================================================================

/**
 * Default weights for calculating overall disposition.
 * Fondness and trust are weighted most heavily.
 */
export const DEFAULT_DISPOSITION_WEIGHTS: DispositionWeights = {
  fondness: 0.35,
  trust: 0.3,
  respect: 0.15,
  comfort: 0.15,
  attraction: 0.05,
};

// =============================================================================
// Affinity Action Effects
// =============================================================================

/**
 * Standard affinity effects for common player actions.
 */
export const AFFINITY_EFFECTS: AffinityEffectsMap = {
  // ==========================================================================
  // Positive Actions
  // ==========================================================================

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

  'save-life': [
    { dimension: 'trust', baseChange: 40 },
    { dimension: 'fondness', baseChange: 30 },
    { dimension: 'respect', baseChange: 20 },
  ],

  'respect-boundaries': [
    { dimension: 'comfort', baseChange: 5 },
    { dimension: 'trust', baseChange: 3 },
  ],

  // ==========================================================================
  // Negative Actions
  // ==========================================================================

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

  betray: [
    { dimension: 'trust', baseChange: -50 },
    { dimension: 'fondness', baseChange: -30 },
    { dimension: 'respect', baseChange: -20 },
  ],

  'invade-privacy': [
    { dimension: 'comfort', baseChange: -15 },
    { dimension: 'trust', baseChange: -10 },
  ],

  'dismiss-feelings': [
    { dimension: 'fondness', baseChange: -8 },
    { dimension: 'comfort', baseChange: -10 },
  ],

  // ==========================================================================
  // Romantic Actions
  // ==========================================================================

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

  'first-kiss': [
    { dimension: 'attraction', baseChange: 20 },
    { dimension: 'fondness', baseChange: 15 },
    { dimension: 'comfort', baseChange: 10 },
  ],

  rejection: [
    { dimension: 'fondness', baseChange: -5 },
    { dimension: 'comfort', baseChange: -10 },
  ],

  // ==========================================================================
  // Neutral/Mixed Actions
  // ==========================================================================

  'spend-time-together': [
    { dimension: 'comfort', baseChange: 3 },
    { dimension: 'fondness', baseChange: 1 },
  ],

  'share-meal': [
    { dimension: 'comfort', baseChange: 5 },
    { dimension: 'fondness', baseChange: 3 },
  ],

  'disagree-politely': [
    { dimension: 'respect', baseChange: 2 },
    { dimension: 'fondness', baseChange: -1 },
  ],

  'challenge-beliefs': [
    { dimension: 'respect', baseChange: 3 },
    { dimension: 'comfort', baseChange: -5 },
  ],
};

// =============================================================================
// Diminishing Returns Configuration
// =============================================================================

/**
 * Default configuration for diminishing returns on repeated actions.
 */
export const DEFAULT_DIMINISHING_RETURNS_CONFIG: DiminishingReturnsConfig = {
  decayFactor: 0.7, // Each repeat is 70% as effective
  minimumEffect: 0.1, // Never less than 10% of base
  resetAfterHours: 24, // Reset after a day
};

// =============================================================================
// Affinity Decay Configuration
// =============================================================================

/**
 * Default configuration for natural affinity decay over time.
 */
export const DEFAULT_AFFINITY_DECAY_CONFIG: AffinityDecayConfig = {
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

// =============================================================================
// Standard Unlocks
// =============================================================================

/**
 * Standard affinity unlocks available to all NPCs.
 */
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
    type: 'dialogue-topic',
    requirements: { comfort: 50 },
    description: 'Opens up about vulnerabilities',
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
  {
    type: 'location-access',
    requirements: { trust: 50 },
    description: 'Allows access to private spaces',
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
  {
    type: 'romance-option',
    requirements: { attraction: 70, fondness: 60, trust: 50, comfort: 50 },
    description: 'Ready for intimate relationship',
  },

  // Fear-based unlocks
  {
    type: 'action',
    requirements: { fear: 40 },
    blockers: { trust: 20 }, // Must not trust player
    description: 'Can be intimidated into compliance',
  },
  {
    type: 'action',
    requirements: { fear: 60 },
    description: 'Will comply out of terror',
  },

  // Special interactions
  {
    type: 'special-interaction',
    requirements: { fondness: 70, trust: 60 },
    description: 'Will confide deepest fears',
  },
  {
    type: 'special-interaction',
    requirements: { respect: 60, trust: 50 },
    description: 'Will follow leadership',
  },
];

// =============================================================================
// Example Milestones
// =============================================================================

/**
 * Example milestone events for reference.
 */
export const MILESTONE_EXAMPLES: AffinityMilestone[] = [
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
  {
    id: 'shared-trauma',
    name: 'Shared Trauma',
    description: 'Survived a traumatic experience together',
    effects: { trust: 25, comfort: 20, fondness: 15 },
    permanent: true,
  },
  {
    id: 'public-humiliation',
    name: 'Publicly Humiliated',
    description: 'Player humiliated this NPC in public',
    effects: { fondness: -40, respect: -30, trust: -25 },
    permanent: true,
  },
  {
    id: 'kept-major-secret',
    name: 'Trusted Confidant',
    description: 'Player kept an important secret',
    effects: { trust: 30, fondness: 15 },
    permanent: true,
  },
];

// =============================================================================
// Default Tolerance
// =============================================================================

/**
 * Base tolerance values before affinity modifiers.
 */
export const BASE_TOLERANCE: ToleranceProfile = {
  insultThreshold: 1,
  boringTopicMinutes: 5,
  flatteryThreshold: 3,
  pryingThreshold: 2,
  rejectionThreshold: 2,
};

// =============================================================================
// Affinity Score Thresholds
// =============================================================================

/**
 * Score thresholds for affinity labels.
 * Used to determine descriptive labels for each dimension.
 */
export const AFFINITY_THRESHOLDS = {
  fondness: {
    hatred: [-100, -60],
    dislike: [-60, -20],
    neutral: [-20, 20],
    friendly: [20, 60],
    adoring: [60, 100],
  },
  trust: {
    suspicious: [-100, -60],
    wary: [-60, -20],
    neutral: [-20, 20],
    trusting: [20, 60],
    implicit: [60, 100],
  },
  respect: {
    contempt: [-100, -60],
    unimpressed: [-60, -20],
    neutral: [-20, 20],
    impressed: [20, 60],
    reverent: [60, 100],
  },
  comfort: {
    anxious: [-100, -60],
    uneasy: [-60, -20],
    neutral: [-20, 20],
    relaxed: [20, 60],
    intimate: [60, 100],
  },
  attraction: {
    repulsed: [-100, -60],
    uninterested: [-60, -20],
    neutral: [-20, 20],
    interested: [20, 60],
    smitten: [60, 100],
  },
  fear: {
    unafraid: [0, 20],
    wary: [20, 40],
    nervous: [40, 60],
    frightened: [60, 80],
    terrified: [80, 100],
  },
} as const;

// =============================================================================
// Disposition Thresholds
// =============================================================================

/**
 * Score thresholds for disposition levels.
 */
export const DISPOSITION_THRESHOLDS = {
  hostile: -60,
  unfriendly: -20,
  neutral: 20,
  friendly: 50,
  close: 80,
  // Above 80 = devoted
} as const;
