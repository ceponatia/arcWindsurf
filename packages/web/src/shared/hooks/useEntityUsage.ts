import { useState, useEffect, useCallback } from 'react';
import type { EntityUsageSummary } from '../api/client.js';
import { getCharacterUsage, getSettingUsage, getPersonaUsage } from '../api/client.js';

export type EntityType = 'character' | 'setting' | 'persona';

export interface UseEntityUsageOptions {
  /** Entity ID to fetch usage for */
  entityId: string | null;
  /** Type of entity */
  entityType: EntityType;
  /** Whether to automatically fetch on mount/change */
  autoFetch?: boolean;
}

export interface UseEntityUsageResult {
  /** Usage data */
  data: EntityUsageSummary | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Manually refresh the data */
  refresh: () => void;
}

/**
 * Hook for fetching entity usage data.
 * Shows which sessions reference a given entity (character, setting, persona).
 */
export function useEntityUsage({
  entityId,
  entityType,
  autoFetch = true,
}: UseEntityUsageOptions): UseEntityUsageResult {
  const [data, setData] = useState<EntityUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!entityId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: EntityUsageSummary;

      switch (entityType) {
        case 'character':
          result = await getCharacterUsage(entityId);
          break;
        case 'setting':
          result = await getSettingUsage(entityId);
          break;
        case 'persona':
          result = await getPersonaUsage(entityId);
          break;
        default:
          throw new Error('Unknown entity type');
      }

      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch usage data';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  const refresh = useCallback(() => {
    void fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (autoFetch && entityId) {
      void fetchUsage();
    }
  }, [autoFetch, entityId, fetchUsage]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
