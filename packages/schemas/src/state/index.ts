/**
 * State schemas for session-level state management.
 *
 * These schemas define transient state that lives within a session
 * (as opposed to persistent state stored in the database).
 */

// Proximity state for tracking player-NPC physical/sensory relationships
export * from './proximity.js';

// NPC location state for tracking where NPCs are and what they're doing
export * from './npc-location.js';

// Location occupancy for tracking who is at a location
export * from './occupancy.js';

// NPC awareness for tracking how NPCs perceive the player
export * from './awareness.js';

// Eavesdropping for NPC-NPC conversations the player can overhear
export * from './eavesdrop.js';

// NPC availability for tracking whether NPCs can be interacted with
export * from './availability.js';
