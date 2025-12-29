import type { TagResponse } from '@minimal-rpg/schemas';
import type { TagSummary, UseTagsResult } from '../../types.js';
import { getTags } from '../api/client.js';
import { useFetchOnce } from './useFetchOnce.js';

export function useTags(): UseTagsResult {
  return useFetchOnce<TagSummary[], TagResponse[]>({
    fetcher: (signal) => getTags(signal),
    mapData: (json) =>
      json.map((t) => ({
        id: t.id,
        name: t.name,
        shortDescription: t.shortDescription ?? null,
        promptText: t.promptText,
        targetType: t.targetType ?? 'session',
      })),
    errorMessage: 'Failed to load tags',
  });
}
