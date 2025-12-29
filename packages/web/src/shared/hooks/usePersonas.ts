import type { PersonaSummary } from '../../types.js';
import { getPersonas } from '../api/client.js';
import { useFetchOnce, type UseFetchOnceResult } from './useFetchOnce.js';

export type UsePersonasResult = UseFetchOnceResult<PersonaSummary[]>;

export function usePersonas(): UsePersonasResult {
  return useFetchOnce<PersonaSummary[]>({
    fetcher: (signal) => getPersonas(signal),
    errorMessage: 'Failed to load personas',
  });
}
