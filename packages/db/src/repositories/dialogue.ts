/**
 * Dialogue tree repository helpers.
 */
import { pool } from '../utils/client.js';
import type { DbRow, QueryResult, UUID } from '../types.js';
import type { DialogueStateRecord, DialogueTreeRecord } from './types.js';

/**
 * Fetch all active dialogue trees for an NPC.
 */
export async function getDialogueTrees(npcId: string): Promise<DialogueTreeRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT
      id,
      npc_id AS "npcId",
      trigger_type AS "triggerType",
      trigger_data AS "triggerData",
      start_node_id AS "startNodeId",
      nodes,
      priority,
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
     FROM dialogue_trees
     WHERE npc_id = $1 AND is_active = true
     ORDER BY priority DESC`,
    [npcId]
  );

  return res.rows as unknown as DialogueTreeRecord[];
}

/**
 * Get or create dialogue state for a session/NPC pair.
 */
export async function getOrCreateDialogueState(
  sessionId: UUID,
  npcId: string,
  treeId: UUID,
  startNodeId?: string
): Promise<DialogueStateRecord> {
  const existing: QueryResult<DbRow> = await pool.query(
    `SELECT
      id,
      session_id AS "sessionId",
      npc_id AS "npcId",
      tree_id AS "treeId",
      current_node_id AS "currentNodeId",
      visited_nodes AS "visitedNodes",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
     FROM dialogue_state
     WHERE session_id = $1 AND npc_id = $2
     LIMIT 1`,
    [sessionId, npcId]
  );

  const resolvedStartNodeId = startNodeId ?? null;
  const visitedNodes = resolvedStartNodeId ? [resolvedStartNodeId] : [];

  const row = existing.rows[0];
  if (row) {
    const currentTreeId = typeof row['treeId'] === 'string' ? row['treeId'] : null;
    const rowId = typeof row['id'] === 'string' ? row['id'] : '';
    if (currentTreeId !== treeId) {
      const res: QueryResult<DbRow> = await pool.query(
        `UPDATE dialogue_state
         SET tree_id = $1, current_node_id = $2, visited_nodes = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING
           id,
           session_id AS "sessionId",
           npc_id AS "npcId",
           tree_id AS "treeId",
           current_node_id AS "currentNodeId",
           visited_nodes AS "visitedNodes",
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [treeId, resolvedStartNodeId, visitedNodes, rowId]
      );

      const updated = res.rows[0];
      if (!updated) throw new Error('failed to update dialogue state');
      return updated as unknown as DialogueStateRecord;
    }

    return row as unknown as DialogueStateRecord;
  }

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO dialogue_state (session_id, npc_id, tree_id, current_node_id, visited_nodes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id,
       session_id AS "sessionId",
       npc_id AS "npcId",
       tree_id AS "treeId",
       current_node_id AS "currentNodeId",
       visited_nodes AS "visitedNodes",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [sessionId, npcId, treeId, resolvedStartNodeId, visitedNodes]
  );

  const created = res.rows[0];
  if (!created) throw new Error('failed to create dialogue state');
  return created as unknown as DialogueStateRecord;
}

/**
 * Update dialogue state for a specific record.
 */
export async function updateDialogueState(
  state: Pick<DialogueStateRecord, 'id' | 'currentNodeId' | 'visitedNodes'>
): Promise<DialogueStateRecord> {
  const res: QueryResult<DbRow> = await pool.query(
    `UPDATE dialogue_state
     SET current_node_id = $1, visited_nodes = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING
       id,
       session_id AS "sessionId",
       npc_id AS "npcId",
       tree_id AS "treeId",
       current_node_id AS "currentNodeId",
       visited_nodes AS "visitedNodes",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [state.currentNodeId, state.visitedNodes, state.id]
  );

  const updated = res.rows[0];
  if (!updated) throw new Error('failed to update dialogue state');
  return updated as unknown as DialogueStateRecord;
}

/**
 * Clear dialogue state for a session/NPC pair.
 */
export async function clearDialogueState(sessionId: UUID, npcId: string): Promise<boolean> {
  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM dialogue_state WHERE session_id = $1 AND npc_id = $2 RETURNING id`,
    [sessionId, npcId]
  );

  return res.rows.length > 0;
}
