import type { SettingSummary, UseSettingsResult } from '../../types.js';
import { getSettings } from '../api/client.js';
import { useFetchOnce } from './useFetchOnce.js';

export function useSettings(): UseSettingsResult {
  return useFetchOnce<SettingSummary[]>({
    fetcher: (signal) => getSettings(signal),
    errorMessage: 'Failed to load settings',
  });
}
