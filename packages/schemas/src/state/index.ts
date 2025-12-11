/**
 * State schemas for session-level state management.
 *
 * These schemas define transient state that lives within a session
 * (as opposed to persistent state stored in the database).
 */

// Proximity state for tracking player-NPC physical/sensory relationships
export * from './proximity.js';
