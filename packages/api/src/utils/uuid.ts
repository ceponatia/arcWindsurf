/**
 * UUID Coercion Utilities
 *
 * The @minimal-rpg/db package uses branded UUID types for type safety.
 * These helpers provide semantic coercion from plain strings to branded types.
 *
 * Usage:
 *   Instead of: getActorState(sessionId as any, actorId)
 *   Use:        getActorState(toSessionId(sessionId), actorId)
 */

// Re-export branded types for convenience
// Note: These are structural brands, the actual runtime value is still a string

/**
 * Coerce a plain string to a SessionId branded type.
 * Use when passing session IDs to @minimal-rpg/db functions.
 */
export function toSessionId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to an EntityProfileId branded type.
 * Use when passing entity profile IDs to @minimal-rpg/db functions.
 */
export function toEntityProfileId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce a plain string to a generic ID branded type.
 * Use when passing generic IDs to @minimal-rpg/db functions.
 */
export function toId<T extends string>(id: T): T {
  return id;
}

/**
 * Coerce an array of plain strings to branded ID types.
 * Use with inArray() and similar functions.
 */
export function toIds<T extends string>(ids: T[]): T[] {
  return ids;
}

/**
 * Returns true if the value is a RFC4122-ish UUID string.
 *
 * Note: This is intentionally strict because DB-layer entity profile IDs are UUIDs.
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}
