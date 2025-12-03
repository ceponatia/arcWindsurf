import { randomUUID } from 'node:crypto';
import { pool } from './client.js';
import type { DbRow, PromptTagRow, QueryResult, SessionTagInstanceRow, UUID } from './types.js';

// Ensure typed UUID generator
type RandomUUID = () => UUID;
const genUUID: RandomUUID = randomUUID as unknown as RandomUUID;

export async function listPromptTags(owner = 'admin'): Promise<PromptTagRow[]> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM prompt_tags WHERE owner = $1 ORDER BY name ASC',
    [owner]
  );
  return res.rows as PromptTagRow[];
}

export async function getPromptTag(id: UUID, owner = 'admin'): Promise<PromptTagRow | undefined> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM prompt_tags WHERE id = $1 AND owner = $2',
    [id, owner]
  );
  return res.rows[0] as PromptTagRow | undefined;
}

export async function createPromptTag(
  owner: string,
  name: string,
  shortDescription: string,
  promptText: string
): Promise<PromptTagRow> {
  const id = genUUID();
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO prompt_tags (id, owner, name, short_description, prompt_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, owner, name, shortDescription, promptText]
  );
  return res.rows[0] as PromptTagRow;
}

export async function updatePromptTag(
  id: UUID,
  owner: string,
  updates: { name?: string; shortDescription?: string; promptText?: string }
): Promise<PromptTagRow | undefined> {
  const fields: string[] = [];
  const values: unknown[] = [id, owner];
  let idx = 3;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.shortDescription !== undefined) {
    fields.push(`short_description = $${idx++}`);
    values.push(updates.shortDescription);
  }
  if (updates.promptText !== undefined) {
    fields.push(`prompt_text = $${idx++}`);
    values.push(updates.promptText);
  }

  if (fields.length === 0) return getPromptTag(id, owner);

  fields.push(`updated_at = now()`);

  const res: QueryResult<DbRow> = await pool.query(
    `UPDATE prompt_tags SET ${fields.join(', ')} WHERE id = $1 AND owner = $2 RETURNING *`,
    values
  );
  return (res.rows[0] as PromptTagRow) || undefined;
}

export async function deletePromptTag(id: UUID, owner: string): Promise<boolean> {
  const res = await pool.query('DELETE FROM prompt_tags WHERE id = $1 AND owner = $2', [id, owner]);
  return (res.rowCount ?? 0) > 0;
}

export async function createSessionTagInstances(
  sessionId: UUID,
  tags: PromptTagRow[]
): Promise<void> {
  if (tags.length === 0) return;

  for (const tag of tags) {
    await pool.query(
      `INSERT INTO session_tag_instances (id, session_id, tag_id, name, short_description, prompt_text)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [genUUID(), sessionId, tag.id, tag.name, tag.short_description, tag.prompt_text]
    );
  }
}

export async function getSessionTagInstances(sessionId: UUID): Promise<SessionTagInstanceRow[]> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_tag_instances WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  );
  return res.rows as SessionTagInstanceRow[];
}
