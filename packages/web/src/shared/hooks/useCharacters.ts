import type { CharacterSummary, UseCharactersResult } from '../../types.js';
import { getCharacters } from '../api/client.js';
import { useFetchOnce } from './useFetchOnce.js';

export function useCharacters(): UseCharactersResult {
  return useFetchOnce<CharacterSummary[]>({
    fetcher: (signal) => getCharacters(signal),
    errorMessage: 'Failed to load characters',
  });
}
