/**
 * NPC Schedule Defaults and Templates
 *
 * Common schedule templates for typical NPC archetypes.
 * Templates use placeholder location IDs prefixed with $ that must be
 * resolved when creating an NPC's actual schedule.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */
import type { NpcActivity } from '../state/npc-location.js';
import type { NpcSchedule, ScheduleSlot, ScheduleTemplate } from './types.js';
import { createActivity, fixedDestination, slotTime } from './utils.js';

// =============================================================================
// Common Activities
// =============================================================================

/** Activity presets for common NPC behaviors */
export const COMMON_ACTIVITIES = {
  sleeping: createActivity('sleeping', 'Sleeping peacefully', 'absorbed'),
  waking: createActivity('idle', 'Just waking up', 'idle'),
  eating: createActivity('eating', 'Having a meal', 'casual'),
  working: createActivity('working', 'Working diligently', 'focused'),
  relaxing: createActivity('relaxing', 'Taking it easy', 'casual'),
  socializing: createActivity('socializing', 'Chatting with others', 'casual'),
  drinking: createActivity('drinking', 'Enjoying a drink', 'casual'),
  guarding: createActivity('guarding', 'Standing watch', 'focused'),
  patrolling: createActivity('patrolling', 'Walking patrol route', 'casual'),
  praying: createActivity('praying', 'In quiet prayer', 'focused'),
  studying: createActivity('studying', 'Reading or studying', 'focused'),
  crafting: createActivity('crafting', 'Working on a project', 'focused'),
  shopping: createActivity('shopping', 'Browsing or buying', 'casual'),
  traveling: createActivity('traveling', 'On the move', 'casual'),
} as const satisfies Record<string, NpcActivity>;

// =============================================================================
// Schedule Templates
// =============================================================================

/**
 * Shopkeeper template - opens shop during business hours.
 * Placeholders: workLocation, homeLocation
 */
export const SHOPKEEPER_TEMPLATE: ScheduleTemplate = {
  id: 'template-shopkeeper',
  name: 'Shopkeeper',
  description: 'Standard shopkeeper schedule with regular business hours',
  requiredPlaceholders: ['workLocation', 'homeLocation'],
  slots: [
    {
      id: 'shop-morning',
      startTime: slotTime(8, 0),
      endTime: slotTime(12, 0),
      destination: fixedDestination('$workLocation'),
      activity: COMMON_ACTIVITIES.working,
    },
    {
      id: 'shop-lunch',
      startTime: slotTime(12, 0),
      endTime: slotTime(13, 0),
      destination: fixedDestination('$homeLocation'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'shop-afternoon',
      startTime: slotTime(13, 0),
      endTime: slotTime(18, 0),
      destination: fixedDestination('$workLocation'),
      activity: COMMON_ACTIVITIES.working,
    },
    {
      id: 'shop-evening',
      startTime: slotTime(18, 0),
      endTime: slotTime(21, 0),
      destination: fixedDestination('$homeLocation'),
      activity: COMMON_ACTIVITIES.relaxing,
    },
    {
      id: 'shop-sleep',
      startTime: slotTime(21, 0),
      endTime: slotTime(8, 0),
      destination: fixedDestination('$homeLocation'),
      activity: COMMON_ACTIVITIES.sleeping,
    },
  ],
  defaultSlot: {
    destination: fixedDestination('$homeLocation'),
    activity: COMMON_ACTIVITIES.relaxing,
  },
};

/**
 * Guard template - alternating shifts with patrol routes.
 * Placeholders: guardPost, barracks, patrolRoute
 */
export const GUARD_TEMPLATE: ScheduleTemplate = {
  id: 'template-guard',
  name: 'Guard',
  description: 'Guard schedule with day shift and patrol duties',
  requiredPlaceholders: ['guardPost', 'barracks'],
  slots: [
    {
      id: 'guard-morning-duty',
      startTime: slotTime(6, 0),
      endTime: slotTime(12, 0),
      destination: fixedDestination('$guardPost'),
      activity: COMMON_ACTIVITIES.guarding,
    },
    {
      id: 'guard-lunch',
      startTime: slotTime(12, 0),
      endTime: slotTime(13, 0),
      destination: fixedDestination('$barracks'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'guard-afternoon-duty',
      startTime: slotTime(13, 0),
      endTime: slotTime(18, 0),
      destination: fixedDestination('$guardPost'),
      activity: COMMON_ACTIVITIES.guarding,
    },
    {
      id: 'guard-evening',
      startTime: slotTime(18, 0),
      endTime: slotTime(22, 0),
      destination: fixedDestination('$barracks'),
      activity: COMMON_ACTIVITIES.relaxing,
    },
    {
      id: 'guard-sleep',
      startTime: slotTime(22, 0),
      endTime: slotTime(6, 0),
      destination: fixedDestination('$barracks'),
      activity: COMMON_ACTIVITIES.sleeping,
    },
  ],
  defaultSlot: {
    destination: fixedDestination('$barracks'),
    activity: COMMON_ACTIVITIES.relaxing,
  },
};

/**
 * Tavern keeper template - long hours serving customers.
 * Placeholders: tavern, homeLocation
 */
export const TAVERN_KEEPER_TEMPLATE: ScheduleTemplate = {
  id: 'template-tavern-keeper',
  name: 'Tavern Keeper',
  description: 'Tavern keeper with extended evening hours',
  requiredPlaceholders: ['tavern', 'homeLocation'],
  slots: [
    {
      id: 'tavern-morning',
      startTime: slotTime(10, 0),
      endTime: slotTime(14, 0),
      destination: fixedDestination('$tavern'),
      activity: COMMON_ACTIVITIES.working,
    },
    {
      id: 'tavern-break',
      startTime: slotTime(14, 0),
      endTime: slotTime(16, 0),
      destination: fixedDestination('$homeLocation'),
      activity: COMMON_ACTIVITIES.relaxing,
    },
    {
      id: 'tavern-evening',
      startTime: slotTime(16, 0),
      endTime: slotTime(24, 0),
      destination: fixedDestination('$tavern'),
      activity: COMMON_ACTIVITIES.working,
    },
    {
      id: 'tavern-late',
      startTime: slotTime(0, 0),
      endTime: slotTime(2, 0),
      destination: fixedDestination('$tavern'),
      activity: COMMON_ACTIVITIES.working,
    },
    {
      id: 'tavern-sleep',
      startTime: slotTime(2, 0),
      endTime: slotTime(10, 0),
      destination: fixedDestination('$homeLocation'),
      activity: COMMON_ACTIVITIES.sleeping,
    },
  ],
  defaultSlot: {
    destination: fixedDestination('$tavern'),
    activity: COMMON_ACTIVITIES.working,
  },
};

/**
 * Noble template - leisurely schedule with social activities.
 * Placeholders: manor, garden, socialVenue
 */
export const NOBLE_TEMPLATE: ScheduleTemplate = {
  id: 'template-noble',
  name: 'Noble',
  description: 'Leisurely noble schedule with social engagements',
  requiredPlaceholders: ['manor', 'socialVenue'],
  slots: [
    {
      id: 'noble-wake',
      startTime: slotTime(9, 0),
      endTime: slotTime(10, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.waking,
    },
    {
      id: 'noble-breakfast',
      startTime: slotTime(10, 0),
      endTime: slotTime(11, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'noble-study',
      startTime: slotTime(11, 0),
      endTime: slotTime(13, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.studying,
    },
    {
      id: 'noble-lunch',
      startTime: slotTime(13, 0),
      endTime: slotTime(14, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'noble-social',
      startTime: slotTime(15, 0),
      endTime: slotTime(18, 0),
      destination: fixedDestination('$socialVenue'),
      activity: COMMON_ACTIVITIES.socializing,
    },
    {
      id: 'noble-dinner',
      startTime: slotTime(19, 0),
      endTime: slotTime(21, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'noble-evening',
      startTime: slotTime(21, 0),
      endTime: slotTime(23, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.relaxing,
    },
    {
      id: 'noble-sleep',
      startTime: slotTime(23, 0),
      endTime: slotTime(9, 0),
      destination: fixedDestination('$manor'),
      activity: COMMON_ACTIVITIES.sleeping,
    },
  ],
  defaultSlot: {
    destination: fixedDestination('$manor'),
    activity: COMMON_ACTIVITIES.relaxing,
  },
};

/**
 * Wanderer/traveler template - moves between locations.
 * Placeholders: inn, market, temple
 */
export const WANDERER_TEMPLATE: ScheduleTemplate = {
  id: 'template-wanderer',
  name: 'Wanderer',
  description: 'Traveler visiting various locations throughout the day',
  requiredPlaceholders: ['inn', 'market'],
  slots: [
    {
      id: 'wanderer-sleep',
      startTime: slotTime(22, 0),
      endTime: slotTime(7, 0),
      destination: fixedDestination('$inn'),
      activity: COMMON_ACTIVITIES.sleeping,
    },
    {
      id: 'wanderer-morning',
      startTime: slotTime(7, 0),
      endTime: slotTime(9, 0),
      destination: fixedDestination('$inn'),
      activity: COMMON_ACTIVITIES.eating,
    },
    {
      id: 'wanderer-market',
      startTime: slotTime(9, 0),
      endTime: slotTime(14, 0),
      destination: fixedDestination('$market'),
      activity: COMMON_ACTIVITIES.shopping,
    },
    {
      id: 'wanderer-afternoon',
      startTime: slotTime(14, 0),
      endTime: slotTime(18, 0),
      destination: {
        type: 'choice',
        options: [
          {
            weight: 7, // Most likely
            destination: fixedDestination('$market'),
            activity: COMMON_ACTIVITIES.socializing,
          },
          {
            weight: 5,
            destination: fixedDestination('$inn'),
            activity: COMMON_ACTIVITIES.relaxing,
          },
        ],
        fallback: fixedDestination('$inn'),
      },
      activity: COMMON_ACTIVITIES.relaxing,
    },
    {
      id: 'wanderer-evening',
      startTime: slotTime(18, 0),
      endTime: slotTime(22, 0),
      destination: fixedDestination('$inn'),
      activity: COMMON_ACTIVITIES.drinking,
    },
  ],
  defaultSlot: {
    destination: fixedDestination('$inn'),
    activity: COMMON_ACTIVITIES.relaxing,
  },
};

// =============================================================================
// Template Registry
// =============================================================================

/** All built-in schedule templates */
export const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  SHOPKEEPER_TEMPLATE,
  GUARD_TEMPLATE,
  TAVERN_KEEPER_TEMPLATE,
  NOBLE_TEMPLATE,
  WANDERER_TEMPLATE,
];

/**
 * Creates a template map for quick lookup.
 */
export function createTemplateMap(
  templates: readonly ScheduleTemplate[] = SCHEDULE_TEMPLATES
): Map<string, ScheduleTemplate> {
  return new Map(templates.map((t) => [t.id, t]));
}

/** Default template map with all built-in templates */
export const DEFAULT_TEMPLATE_MAP = createTemplateMap();

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a simple schedule with a single default location.
 * Useful for minor NPCs who don't need complex schedules.
 *
 * @param id - Schedule identifier
 * @param name - Human-readable name
 * @param locationId - Default location
 * @param activity - Default activity
 * @returns Simple schedule
 */
export function createSimpleSchedule(
  id: string,
  name: string,
  locationId: string,
  activity: NpcActivity = COMMON_ACTIVITIES.relaxing
): NpcSchedule {
  return {
    id,
    name,
    slots: [],
    defaultSlot: {
      destination: fixedDestination(locationId),
      activity,
    },
  };
}

/**
 * Creates a home-and-work schedule with standard hours.
 *
 * @param id - Schedule identifier
 * @param name - Human-readable name
 * @param homeLocation - Home location ID
 * @param workLocation - Work location ID
 * @param workActivity - Activity while working
 * @returns Schedule with home/work split
 */
export function createHomeWorkSchedule(
  id: string,
  name: string,
  homeLocation: string,
  workLocation: string,
  workActivity: NpcActivity = COMMON_ACTIVITIES.working
): NpcSchedule {
  return {
    id,
    name,
    slots: [
      {
        id: `${id}-work`,
        startTime: slotTime(8, 0),
        endTime: slotTime(18, 0),
        destination: fixedDestination(workLocation),
        activity: workActivity,
      },
      {
        id: `${id}-home-evening`,
        startTime: slotTime(18, 0),
        endTime: slotTime(22, 0),
        destination: fixedDestination(homeLocation),
        activity: COMMON_ACTIVITIES.relaxing,
      },
      {
        id: `${id}-sleep`,
        startTime: slotTime(22, 0),
        endTime: slotTime(8, 0),
        destination: fixedDestination(homeLocation),
        activity: COMMON_ACTIVITIES.sleeping,
      },
    ],
    defaultSlot: {
      destination: fixedDestination(homeLocation),
      activity: COMMON_ACTIVITIES.relaxing,
    },
  };
}

/**
 * Creates a schedule slot with common defaults.
 */
export function createSlot(
  id: string,
  startHour: number,
  endHour: number,
  locationId: string,
  activity: NpcActivity,
  options?: {
    startMinute?: number;
    endMinute?: number;
    subLocationId?: string;
    priority?: number;
    activeDays?: number[];
  }
): ScheduleSlot {
  return {
    id,
    startTime: slotTime(startHour, options?.startMinute ?? 0),
    endTime: slotTime(endHour, options?.endMinute ?? 0),
    destination: fixedDestination(locationId, options?.subLocationId),
    activity,
    priority: options?.priority,
    activeDays: options?.activeDays,
  };
}
