import { generateId } from '@minimal-rpg/utils';
import { pool } from '../utils/client.js';
import type {
  DbRow,
  OwnerEmail,
  PromptTagRow,
  QueryResult,
  SessionTagBindingRow,
  UUID,
} from '../types.js';
import type { ListTagsOptions, CreateTagInput, UpdateTagInput, CreateBindingInput } from './types.js';

/**
 * Increment version based on changelog presence.
 * Only increments if changelog is provided.
 * Version format: X.Y.Z (single digit per segment, rolls over at 9)
 */
function incrementVersion(currentVersion: string, hasChangelog: boolean): string {
  if (!hasChangelog) return currentVersion;

  const parts = currentVersion.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.1'; // Reset to valid version if malformed
  }

  let major = parts[0] ?? 1;
  let minor = parts[1] ?? 0;
  let patch = parts[2] ?? 0;

  patch += 1;

  if (patch > 9) {
    patch = 0;
    minor += 1;
  }
  if (minor > 9) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

// ============================================================================
// Prompt Tags (Global Definitions)
// ============================================================================

/**
 * List prompt tags with optional filtering.
 * Public tags are visible to all; private tags require owner match.
 */
export async function listPromptTags(options: ListTagsOptions = {}): Promise<PromptTagRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // Access control: show public/unlisted OR owned by caller
  if (options.owner) {
    conditions.push(`(visibility IN ('public', 'unlisted') OR owner = $${idx++})`);
    values.push(options.owner);
  } else {
    conditions.push(`visibility IN ('public', 'unlisted')`);
  }

  if (options.category) {
    conditions.push(`category = $${idx++}`);
    values.push(options.category);
  }

  if (options.activationMode) {
    conditions.push(`activation_mode = $${idx++}`);
    values.push(options.activationMode);
  }

  if (options.isBuiltIn !== undefined) {
    conditions.push(`is_built_in = $${idx++}`);
    values.push(options.isBuiltIn);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await pool.query<PromptTagRow>(
    `SELECT * FROM prompt_tags ${whereClause} ORDER BY category, name ASC`,
    values
  );
  return res.rows;
}

/**
 * Get a single prompt tag by ID.
 * Checks visibility permissions.
 */
export async function getPromptTag(id: UUID, owner?: string): Promise<PromptTagRow | undefined> {
  let query: string;
  let values: unknown[];

  if (owner) {
    // Show if public/unlisted OR owned by caller
    query = `SELECT * FROM prompt_tags WHERE id = $1 AND (visibility IN ('public', 'unlisted') OR owner = $2)`;
    values = [id, owner];
  } else {
    // Without owner, only show public/unlisted
    query = `SELECT * FROM prompt_tags WHERE id = $1 AND visibility IN ('public', 'unlisted')`;
    values = [id];
  }

  const res = await pool.query<PromptTagRow>(query, values);
  return res.rows[0];
}

/**
 * Create a new prompt tag with enhanced fields.
 */
export async function createPromptTag(input: CreateTagInput): Promise<PromptTagRow> {
  const id = generateId();
  const res = await pool.query<PromptTagRow>(
    `INSERT INTO prompt_tags (
      id, owner, visibility, name, short_description, category, prompt_text,
      activation_mode, target_type, triggers, priority, composition_mode,
      conflicts_with, requires, is_built_in
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      id,
      input.owner ?? 'admin',
      input.visibility ?? 'public',
      input.name,
      input.shortDescription ?? null,
      input.category ?? 'style',
      input.promptText,
      input.activationMode ?? 'always',
      input.targetType ?? 'session',
      JSON.stringify(input.triggers ?? []),
      input.priority ?? 'normal',
      input.compositionMode ?? 'append',
      input.conflictsWith ?? null,
      input.requires ?? null,
      input.isBuiltIn ?? false,
    ]
  );
  const created = res.rows[0];
  if (!created) throw new Error('Failed to create prompt tag');
  return created;
}

/**
 * Update an existing prompt tag.
 * Only the owner can update their own tags.
 * Version increments if changelog is provided.
 */
export async function updatePromptTag(
  id: UUID,
  owner: string,
  updates: UpdateTagInput
): Promise<PromptTagRow | undefined> {
  // First get current tag to check ownership and get current version
  const current = await pool.query<PromptTagRow>(
    'SELECT * FROM prompt_tags WHERE id = $1 AND owner = $2',
    [id, owner]
  );
  if (current.rows.length === 0) return undefined;
  const currentTag = current.rows[0];
  if (!currentTag) return undefined;

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
  if (updates.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(updates.category);
  }
  if (updates.promptText !== undefined) {
    fields.push(`prompt_text = $${idx++}`);
    values.push(updates.promptText);
  }
  if (updates.activationMode !== undefined) {
    fields.push(`activation_mode = $${idx++}`);
    values.push(updates.activationMode);
  }
  if (updates.targetType !== undefined) {
    fields.push(`target_type = $${idx++}`);
    values.push(updates.targetType);
  }
  if (updates.triggers !== undefined) {
    fields.push(`triggers = $${idx++}`);
    values.push(JSON.stringify(updates.triggers));
  }
  if (updates.priority !== undefined) {
    fields.push(`priority = $${idx++}`);
    values.push(updates.priority);
  }
  if (updates.compositionMode !== undefined) {
    fields.push(`composition_mode = $${idx++}`);
    values.push(updates.compositionMode);
  }
  if (updates.conflictsWith !== undefined) {
    fields.push(`conflicts_with = $${idx++}`);
    values.push(updates.conflictsWith);
  }
  if (updates.requires !== undefined) {
    fields.push(`requires = $${idx++}`);
    values.push(updates.requires);
  }
  if (updates.visibility !== undefined) {
    fields.push(`visibility = $${idx++}`);
    values.push(updates.visibility);
  }

  // Handle versioning: only increment if changelog is provided
  if (updates.changelog) {
    const newVersion = incrementVersion(currentTag.version, true);
    fields.push(`version = $${idx++}`);
    values.push(newVersion);
    fields.push(`changelog = $${idx++}`);
    values.push(updates.changelog);
  }

  if (fields.length === 0) return currentTag;

  fields.push(`updated_at = now()`);

  const res = await pool.query<PromptTagRow>(
    `UPDATE prompt_tags SET ${fields.join(', ')} WHERE id = $1 AND owner = $2 RETURNING *`,
    values
  );
  return res.rows[0];
}

/**
 * Delete a prompt tag.
 * Only the owner can delete their own tags.
 * Built-in tags cannot be deleted.
 */
export async function deletePromptTag(id: UUID, owner: string): Promise<boolean> {
  const res = await pool.query(
    'DELETE FROM prompt_tags WHERE id = $1 AND owner = $2 AND is_built_in = FALSE',
    [id, owner]
  );
  return (res.rowCount ?? 0) > 0;
}

// ============================================================================
// Session Tag Bindings (Junction Table)
// ============================================================================

/**
 * Bind a tag to a session, optionally targeting a specific entity.
 */
export async function createSessionTagBinding(
  ownerEmail: OwnerEmail,
  input: CreateBindingInput
): Promise<SessionTagBindingRow> {
  const id = generateId();
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO session_tag_bindings (id, owner_email, session_id, tag_id, target_type, target_entity_id, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (session_id, tag_id, target_entity_id) DO UPDATE SET enabled = EXCLUDED.enabled
       WHERE session_tag_bindings.owner_email = EXCLUDED.owner_email
     RETURNING *`,
    [
      id,
      ownerEmail,
      input.sessionId,
      input.tagId,
      input.targetType ?? 'session',
      input.targetEntityId ?? null,
      input.enabled ?? true,
    ]
  );
  return res.rows[0] as SessionTagBindingRow;
}

/**
 * Get all tag bindings for a session.
 */
export async function getSessionTagBindings(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<SessionTagBindingRow[]> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_tag_bindings WHERE owner_email = $1 AND session_id = $2 ORDER BY created_at ASC',
    [ownerEmail, sessionId]
  );
  return res.rows as SessionTagBindingRow[];
}

/**
 * Get tag bindings with full tag data for a session.
 * Joins bindings with prompt_tags for complete tag information.
 */
export async function getSessionTagsWithDefinitions(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  options: { enabledOnly?: boolean; targetType?: string; targetEntityId?: string } = {}
): Promise<(SessionTagBindingRow & { tag: PromptTagRow })[]> {
  const conditions = ['b.owner_email = $1', 'b.session_id = $2'];
  const values: unknown[] = [ownerEmail, sessionId];
  let idx = 3;

  if (options.enabledOnly !== false) {
    conditions.push('b.enabled = TRUE');
  }

  if (options.targetType) {
    conditions.push(`b.target_type = $${idx++}`);
    values.push(options.targetType);
  }

  if (options.targetEntityId) {
    conditions.push(`(b.target_entity_id = $${idx++} OR b.target_entity_id IS NULL)`);
    values.push(options.targetEntityId);
  }

  const res: QueryResult<DbRow> = await pool.query(
    `SELECT b.*, row_to_json(t.*) as tag
     FROM session_tag_bindings b
     JOIN prompt_tags t ON b.tag_id = t.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.priority, t.category, t.name`,
    values
  );

  return res.rows as (SessionTagBindingRow & { tag: PromptTagRow })[];
}

/**
 * Toggle a tag binding's enabled state.
 */
export async function toggleSessionTagBinding(
  ownerEmail: OwnerEmail,
  bindingId: UUID,
  enabled: boolean
): Promise<SessionTagBindingRow | undefined> {
  const res: QueryResult<DbRow> = await pool.query(
    'UPDATE session_tag_bindings SET enabled = $3 WHERE owner_email = $1 AND id = $2 RETURNING *',
    [ownerEmail, bindingId, enabled]
  );
  return res.rows[0] as SessionTagBindingRow | undefined;
}

/**
 * Remove a tag binding from a session.
 */
export async function deleteSessionTagBinding(
  ownerEmail: OwnerEmail,
  bindingId: UUID
): Promise<boolean> {
  const res = await pool.query(
    'DELETE FROM session_tag_bindings WHERE owner_email = $1 AND id = $2',
    [ownerEmail, bindingId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Remove all tag bindings for a session.
 */
export async function clearSessionTagBindings(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res = await pool.query(
    'DELETE FROM session_tag_bindings WHERE owner_email = $1 AND session_id = $2',
    [ownerEmail, sessionId]
  );
  return res.rowCount ?? 0;
}
