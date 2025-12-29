import type { ItemSummary } from '../../types.js';
import { getItems } from '../api/client.js';
import { useFetchOnce, type UseFetchOnceResult } from './useFetchOnce.js';

export type UseItemsResult = UseFetchOnceResult<ItemSummary[]>;

export function useItems(): UseItemsResult {
  return useFetchOnce<ItemSummary[]>({
    fetcher: (signal) => getItems(undefined, signal),
    errorMessage: 'Failed to load items',
  });
}
