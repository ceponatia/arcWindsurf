import type { CreateTagRequest, UpdateTagRequest, TagResponse } from '@minimal-rpg/schemas';
import {
  getTag as apiGetTag,
  getTags as apiGetTags,
  createTag as apiCreateTag,
  updateTag as apiUpdateTag,
  deleteTag as apiDeleteTag,
} from '../../shared/api/client.js';

export type { TagResponse };

export interface TagListResponse {
  tags: TagResponse[];
  total: number;
}

export interface TagQueryOptions {
  category?: string;
  activationMode?: 'always' | 'conditional';
  visibility?: 'private' | 'public' | 'unlisted';
  isBuiltIn?: boolean;
}

/**
 * Load a single tag by ID.
 */
export function loadTag(id: string, signal?: AbortSignal): Promise<TagResponse> {
  return apiGetTag(id, signal);
}

/**
 * Load all tags with optional filtering.
 * Note: The current API returns an array, but we wrap it for consistency.
 */
export async function loadTags(
  options?: TagQueryOptions,
  signal?: AbortSignal
): Promise<TagListResponse> {
  // TODO: Pass options to API when backend supports query params
  const tags = await apiGetTags(signal);

  // Client-side filtering until backend supports it
  let filtered = tags;
  if (options?.category) {
    filtered = filtered.filter((t) => t.category === options.category);
  }
  if (options?.activationMode) {
    filtered = filtered.filter((t) => t.activationMode === options.activationMode);
  }
  if (options?.visibility) {
    filtered = filtered.filter((t) => t.visibility === options.visibility);
  }
  if (options?.isBuiltIn !== undefined) {
    filtered = filtered.filter((t) => t.isBuiltIn === options.isBuiltIn);
  }

  return { tags: filtered, total: filtered.length };
}

/**
 * Create a new tag.
 */
export function persistTag(data: CreateTagRequest, signal?: AbortSignal): Promise<TagResponse> {
  return apiCreateTag(data, signal);
}

/**
 * Update an existing tag.
 */
export function updateTag(
  id: string,
  data: UpdateTagRequest,
  signal?: AbortSignal
): Promise<TagResponse> {
  return apiUpdateTag(id, data, signal);
}

/**
 * Delete a tag.
 */
export function removeTag(id: string, signal?: AbortSignal): Promise<void> {
  return apiDeleteTag(id, signal);
}
