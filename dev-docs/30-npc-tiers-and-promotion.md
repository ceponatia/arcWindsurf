# NPC Tiers and Promotion

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document defines the NPC tier system that differentiates major story characters from background flavor. It covers tier definitions, promotion mechanics, and the "player interest" scoring system.

Split from [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md).

## 1. Tier Definitions

NPCs are classified into tiers based on their narrative importance:

```typescript
export type NpcTier = 'major' | 'minor' | 'background' | 'transient';

export interface NpcTierConfig {
  tier: NpcTier;

  /** How much character data is required/generated */
  profileDepth: 'full' | 'partial' | 'minimal' | 'generated';

  /** Whether this NPC has a persistent schedule */
  hasSchedule: boolean;

  /** Whether state changes are persisted between sessions */
  persistState: boolean;

  /** Can this NPC be promoted to a higher tier? */
  promotable: boolean;

  /** Simulation priority (affects update frequency) */
  simulationPriority: number;
}

export const NPC_TIER_DEFAULTS: Record<NpcTier, NpcTierConfig> = {
  major: {
    tier: 'major',
    profileDepth: 'full',
    hasSchedule: true,
    persistState: true,
    promotable: false, // Already at top
    simulationPriority: 10,
  },
  minor: {
    tier: 'minor',
    profileDepth: 'partial',
    hasSchedule: true, // Simpler schedules
    persistState: true,
    promotable: true, // Can become major if player shows interest
    simulationPriority: 5,
  },
  background: {
    tier: 'background',
    profileDepth: 'minimal',
    hasSchedule: false, // Just "appears at location X"
    persistState: false, // Regenerated each session
    promotable: true,
    simulationPriority: 1,
  },
  transient: {
    tier: 'transient',
    profileDepth: 'generated',
    hasSchedule: false,
    persistState: false,
    promotable: true, // Could become background or minor
    simulationPriority: 0, // Only simulated when directly encountered
  },
};
```

## 2. Tier Comparison

| Tier       | Examples                                 | Profile                              | Schedule                         | Persistence               |
| ---------- | ---------------------------------------- | ------------------------------------ | -------------------------------- | ------------------------- |
| Major      | Love interest, party member, nemesis     | Full CharacterProfile                | Detailed daily/weekly            | Always persisted          |
| Minor      | Shopkeeper, regular bartender, classmate | Name, appearance, key traits         | Location-based ("works at shop") | Session-persisted         |
| Background | Random cafe patron, street vendor        | Name, 1-2 traits, appearance snippet | None (spawns at location)        | Not persisted             |
| Transient  | Monsters, one-off encounters, passersby  | Generated from schema/template       | None                             | Discarded after encounter |

### 2.1 Tier-Specific Behaviors

**Major NPCs**:

- Full character profile with personality, backstory, relationships
- Detailed schedules with probabilistic choices
- Eager simulation (updated every turn)
- Affinity tracking across all dimensions
- Can be woken up when sleeping, with in-character reactions
- NPC-NPC interactions simulated when co-located

**Minor NPCs**:

- Partial profile: name, appearance, key personality traits
- Simple location-based schedules ("works at shop 9-5")
- Lazy simulation (updated on period/location change)
- Basic affinity tracking (fondness only, or simplified)
- Unavailable when sleeping unless in player's location
- No NPC-NPC interaction simulation

**Background NPCs**:

- Minimal profile: name, 1-2 adjectives, brief appearance
- No schedule - spawns at assigned location
- Very lazy simulation (only on location change)
- No affinity tracking (until promoted)
- Simply unavailable outside their spawn location
- No interaction simulation

**Transient NPCs**:

- Generated on-the-fly from templates
- No persistence - forgotten after encounter ends
- No simulation at all
- No affinity (ephemeral interaction)
- Monsters, passersby, one-off vendors

## 3. Player Interest Score

Rather than explicit "starring" of NPCs, promotion is driven by immersive player behavior.

> **PM Notes**: I'm not sure that's useful. I think the promotion should be immersive. Since players are going to interact with the game by prompting, they could choose to pay a lot of attention to a certain npc. If a player chooses to speak to a minor npc for many turns (like over 20), the system may weigh the pros and cons of promoting to minor and then again to major if the player still shows interest. maybe player interest can be a score. So if the player interacts with the minor npc a lot at once, but not enough to promote, the score will go through a bleeding off period where it'll slowly reduce per turn until the player engages with them again. The bleed rate would reduce the higher the score is so a player who puts a lot of time investment into an npc won't lose all that effort in a handful of turns.

### 3.1 Interest Score Model

```typescript
export interface PlayerInterestScore {
  npcId: string;

  /** Current interest score (0-100+) */
  score: number;

  /** Total interactions ever (for diminishing bleed) */
  totalInteractions: number;

  /** Turns since last interaction */
  turnsSinceInteraction: number;

  /** Peak score ever reached (affects bleed rate) */
  peakScore: number;
}

export interface InterestConfig {
  /** Points gained per interaction turn */
  pointsPerInteraction: number;

  /** Bonus points for meaningful interactions */
  meaningfulInteractionBonus: number;

  /** Base bleed rate per turn (percentage) */
  baseBleedRate: number;

  /** Minimum bleed rate (for high-investment NPCs) */
  minBleedRate: number;

  /** Thresholds for promotion */
  promotionThresholds: {
    transientToBackground: number;
    backgroundToMinor: number;
    minorToMajor: number;
  };
}

const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  pointsPerInteraction: 3,
  meaningfulInteractionBonus: 5, // Named, asked questions, shared info
  baseBleedRate: 0.05, // 5% per turn
  minBleedRate: 0.005, // 0.5% minimum for high-investment
  promotionThresholds: {
    transientToBackground: 10, // ~3-4 interactions
    backgroundToMinor: 30, // ~10 interactions
    minorToMajor: 100, // ~30+ meaningful interactions
  },
};
```

### 3.2 Interest Score Calculation

```typescript
/**
 * Update interest score after each turn.
 */
export function updateInterestScore(
  current: PlayerInterestScore,
  interaction: InteractionEvent | null,
  config: InterestConfig
): PlayerInterestScore {
  let newScore = current.score;
  let turnsSince = current.turnsSinceInteraction;

  if (interaction) {
    // Interaction occurred - add points
    newScore += config.pointsPerInteraction;

    if (interaction.meaningful) {
      newScore += config.meaningfulInteractionBonus;
    }

    turnsSince = 0;
  } else {
    // No interaction - apply bleed
    const bleedRate = calculateBleedRate(current, config);
    newScore = Math.max(0, newScore * (1 - bleedRate));
    turnsSince++;
  }

  return {
    npcId: current.npcId,
    score: newScore,
    totalInteractions: current.totalInteractions + (interaction ? 1 : 0),
    turnsSinceInteraction: turnsSince,
    peakScore: Math.max(current.peakScore, newScore),
  };
}

/**
 * Calculate bleed rate based on investment level.
 * Higher peak scores = slower bleed.
 */
function calculateBleedRate(interest: PlayerInterestScore, config: InterestConfig): number {
  // Bleed rate decreases logarithmically with peak score
  // Peak 0 -> baseBleedRate, Peak 100+ -> minBleedRate
  const investmentFactor = Math.min(1, Math.log10(interest.peakScore + 1) / 2);
  const bleedRange = config.baseBleedRate - config.minBleedRate;

  return config.baseBleedRate - bleedRange * investmentFactor;
}

/**
 * What counts as a "meaningful" interaction?
 */
export interface InteractionEvent {
  type: 'dialogue' | 'action' | 'observation';

  /** Did the player address this NPC by name? */
  namedNpc: boolean;

  /** Did the player ask questions or request information? */
  askedQuestions: boolean;

  /** Did affinity change as a result? */
  affinityChanged: boolean;

  /** Was there physical contact or proximity change? */
  proximityEngagement: boolean;

  meaningful: boolean; // Computed from above
}

function isMeaningfulInteraction(event: InteractionEvent): boolean {
  return (
    event.namedNpc || event.askedQuestions || event.affinityChanged || event.proximityEngagement
  );
}
```

### 3.3 Bleed Rate Examples

| Peak Score | Bleed Rate | Time to Lose 50% (no interaction) |
| ---------- | ---------- | --------------------------------- |
| 0-10       | 5.0%       | ~14 turns                         |
| 20-30      | 3.5%       | ~20 turns                         |
| 50-70      | 2.0%       | ~35 turns                         |
| 100+       | 0.5%       | ~140 turns                        |

This means a player who invests heavily in an NPC (100+ score from 30+ meaningful interactions) can go ~140 turns without interacting before losing half their investment.

## 4. Promotion Mechanics

### 4.1 Automatic Promotion

```typescript
/**
 * Check if an NPC should be promoted based on interest score.
 */
export function checkPromotion(
  npc: { id: string; tier: NpcTier },
  interest: PlayerInterestScore,
  config: InterestConfig
): NpcTier | null {
  const thresholds = config.promotionThresholds;

  switch (npc.tier) {
    case 'transient':
      if (interest.score >= thresholds.transientToBackground) {
        return 'background';
      }
      break;
    case 'background':
      if (interest.score >= thresholds.backgroundToMinor) {
        return 'minor';
      }
      break;
    case 'minor':
      if (interest.score >= thresholds.minorToMajor) {
        return 'major';
      }
      break;
    case 'major':
      // Already at top tier
      break;
  }

  return null; // No promotion
}
```

### 4.2 Promotion Process

When an NPC is promoted, we need to expand their profile:

```typescript
export interface PromotionResult {
  npcId: string;
  fromTier: NpcTier;
  toTier: NpcTier;

  /** Fields that need to be generated/expanded */
  profileExpansion: ProfileExpansionTask;

  /** New schedule to assign (for minor+) */
  scheduleAssignment?: ScheduleAssignment;
}

export interface ProfileExpansionTask {
  /** Generate these fields via LLM */
  fieldsToGenerate: string[];

  /** Context to provide to generator */
  existingData: Partial<CharacterProfile>;

  /** Interactions that informed who this character is */
  interactionHistory: string[];
}
```

**Transient → Background**:

- Persist the generated name and appearance
- Store basic interaction memory
- No schedule needed

**Background → Minor**:

- Generate personality traits from interaction history
- Assign a simple schedule (or template)
- Start tracking affinity
- Generate a brief backstory

**Minor → Major**:

- Generate full personality profile
- Create detailed schedule with choices
- Full affinity tracking
- Generate rich backstory, relationships, goals
- Enable eager simulation

### 4.3 LLM-Assisted Profile Expansion

When promoting, the LLM can generate missing profile data based on how the player has interacted:

```typescript
const promotionPrompt = `
Based on the following interactions between the player and this NPC, expand their character profile.

Existing data:
- Name: ${npc.name}
- Appearance: ${npc.appearance}
- Location first met: ${npc.firstMetLocation}

Recent interactions (summarized):
${interactionSummary}

Player seemed interested in:
${inferredInterests}

Generate the following fields in a way consistent with the interactions:
- Personality traits (Big Five approximation)
- Brief backstory (2-3 sentences)
- Current goals/motivations
- Speech patterns or quirks observed
`;
```

## 5. Demotion and Simulation Priority

> **PM Notes**: I don't think we need demotion because in the end characters are just database entries so there's no harm in keeping them around. The type of 'demotion' I'd consider useful is if the player doesn't interact with them much anymore, their background routine processing becomes lazy or even on-demand instead of eager.

### 5.1 Simulation Priority Decay

Rather than demoting tier, we adjust simulation priority based on recency:

```typescript
export interface SimulationPriority {
  npcId: string;
  basePriority: number; // From tier
  currentPriority: number; // Adjusted by recency
  lastInteractionTurn: number;
}

/**
 * Adjust simulation priority based on how recently the player interacted.
 */
export function adjustSimulationPriority(npc: SimulationPriority, currentTurn: number): number {
  const turnsSince = currentTurn - npc.lastInteractionTurn;

  // Priority decays over time but never below tier minimum
  const decayFactor = Math.max(0.1, 1 - turnsSince / 1000);
  const tierMinimum = getTierMinimumPriority(npc.basePriority);

  return Math.max(tierMinimum, npc.basePriority * decayFactor);
}

function getTierMinimumPriority(basePriority: number): number {
  // Major NPCs never go below 3, minor never below 1
  if (basePriority >= 10) return 3; // Major
  if (basePriority >= 5) return 1; // Minor
  return 0; // Background/Transient
}
```

### 5.2 Simulation Strategy by Priority

| Priority Range | Strategy  | Update Frequency           |
| -------------- | --------- | -------------------------- |
| 8-10           | Eager     | Every turn                 |
| 5-7            | Active    | Every period change        |
| 2-4            | Lazy      | On location change         |
| 0-1            | On-Demand | Only when directly queried |

A major NPC the player hasn't interacted with in 500 turns might drop from priority 10 to priority 4, moving from "eager" to "lazy" simulation, but they remain a major NPC with full profile and capabilities.

## 6. Transient NPC Profiles

> **PM Notes**: Let's work on fleshing out a schema in a different document as this one is quite long already.

For now, the minimal transient profile:

```typescript
export interface TransientNpcProfile {
  /** Generated or template-based name */
  name: string;

  /** Species/race if applicable */
  species?: string;

  /** 1-3 descriptive adjectives */
  adjectives: string[];

  /** Brief appearance snippet */
  appearanceSnippet: string;

  /** Template this was generated from */
  templateId?: string;

  /** Location where encountered */
  encounteredAt: string;

  /** Turn number when encountered */
  encounteredTurn: number;
}

// Example generated transient:
const exampleTransient: TransientNpcProfile = {
  name: 'Mira',
  adjectives: ['tired', 'friendly'],
  appearanceSnippet: 'A woman in her 30s with flour-dusted apron',
  encounteredAt: 'bakery',
  encounteredTurn: 142,
};
```

A separate document will define:

- Full transient profile schemas for different NPC types (human, monster, creature)
- Template system for generating transients
- How transients are spawned at locations
- Monster stat blocks vs. flavor NPC profiles

## 7. Open Questions

1. **Promotion Notification**: Should the player be informed when an NPC is promoted? Or keep it invisible?

2. **Retroactive Profile Generation**: When promoting, how much of the interaction history should inform the generated profile? All of it, or just highlights?

3. **Cross-Session Interest**: Does interest score persist across sessions, or reset? (Probably persist for minor+, reset for background/transient)

4. **Party Members**: Are party members always major, or can they be minor NPCs that travel with the player?

5. **Antagonist Promotion**: If the player repeatedly encounters a transient enemy, should they be promoted to a recurring villain?

## 8. Related Documents

- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - Schedule system
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - Relationship tracking
- [31-npc-simulation-and-performance.md](31-npc-simulation-and-performance.md) - Simulation strategies
- TBD: Transient NPC generation schemas
