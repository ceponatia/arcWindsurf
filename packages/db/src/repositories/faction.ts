import { and, or, sql, eq } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { actorFactionReputation, factionRelationships } from '../schema/faction.js';

function clampRelationship(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

function getReputationLevel(value: number): string {
  if (value <= -80) return 'hated';
  if (value <= -40) return 'unfriendly';
  if (value <= 40) return 'neutral';
  if (value <= 80) return 'friendly';
  return 'honored';
}

/**
 * Get relationship between two factions (bidirectional).
 */
export async function getFactionRelationship(
  factionAId: string,
  factionBId: string
): Promise<number> {
  const [row] = await db
    .select({ relationship: factionRelationships.relationship })
    .from(factionRelationships)
    .where(
      or(
        and(
          eq(factionRelationships.factionAId, factionAId),
          eq(factionRelationships.factionBId, factionBId)
        ),
        and(
          eq(factionRelationships.factionAId, factionBId),
          eq(factionRelationships.factionBId, factionAId)
        )
      )
    )
    .limit(1);

  return row?.relationship ?? 0;
}

/**
 * Set relationship between two factions.
 */
export async function setFactionRelationship(
  factionAId: string,
  factionBId: string,
  relationship: number,
  relationshipType?: string
): Promise<void> {
  const [a, b] = [factionAId, factionBId].sort() as [string, string];
  const clamped = clampRelationship(relationship);

  await db
    .insert(factionRelationships)
    .values([
      {
        factionAId: a,
        factionBId: b,
        relationship: clamped,
        relationshipType,
      },
    ])
    .onConflictDoUpdate({
      target: [factionRelationships.factionAId, factionRelationships.factionBId],
      set: {
        relationship: clamped,
        relationshipType,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get actor's reputation with a faction.
 */
export async function getActorReputation(
  sessionId: string,
  actorId: string,
  factionId: string
): Promise<number> {
  const [row] = await db
    .select({ reputation: actorFactionReputation.reputation })
    .from(actorFactionReputation)
    .where(
      and(
        eq(actorFactionReputation.sessionId, sessionId),
        eq(actorFactionReputation.actorId, actorId),
        eq(actorFactionReputation.factionId, factionId)
      )
    )
    .limit(1);

  return row?.reputation ?? 0;
}

/**
 * Update actor's reputation with a faction (additive).
 */
export async function updateActorReputation(
  sessionId: string,
  actorId: string,
  factionId: string,
  delta: number
): Promise<number> {
  const clampedDelta = clampRelationship(delta);

  const result = await db
    .insert(actorFactionReputation)
    .values([
      {
        sessionId,
        actorId,
        factionId,
        reputation: clampedDelta,
        reputationLevel: getReputationLevel(clampedDelta),
      },
    ])
    .onConflictDoUpdate({
      target: [
        actorFactionReputation.sessionId,
        actorFactionReputation.actorId,
        actorFactionReputation.factionId,
      ],
      set: {
        reputation: sql`GREATEST(-100, LEAST(100, ${actorFactionReputation.reputation} + ${clampedDelta}))`,
        reputationLevel: sql`CASE
          WHEN ${actorFactionReputation.reputation} + ${clampedDelta} <= -80 THEN 'hated'
          WHEN ${actorFactionReputation.reputation} + ${clampedDelta} <= -40 THEN 'unfriendly'
          WHEN ${actorFactionReputation.reputation} + ${clampedDelta} <= 40 THEN 'neutral'
          WHEN ${actorFactionReputation.reputation} + ${clampedDelta} <= 80 THEN 'friendly'
          ELSE 'honored'
        END`,
        updatedAt: new Date(),
      },
    })
    .returning({ reputation: actorFactionReputation.reputation });

  return result[0]?.reputation ?? 0;
}
