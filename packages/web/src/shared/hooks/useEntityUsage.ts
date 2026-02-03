import { useState, useEffect, useCallback } from 'react';
import type { EntityUsageSummary } from '../api/client.js';
import { getCharacterUsage, getSettingUsage, getPersonaUsage } from '../api/client.js';

export type EntityType = 'character' | 'setting' | 'persona' | 'location';

export interface UseEntityUsageOptions {
  /** Entity ID to fetch usage for */
  entityId: string | null | undefined;
  /** Type of entity */
  entityType: EntityType;
  /** Whether to automatically fetch on mount/change */
  autoFetch?: boolean;
}

export interface UseEntityUsageResult {
  /** Usage data (aliased as both 'data' and 'usage' for compatibility) */
  data: EntityUsageSummary | null;
  /** @deprecated Use 'data' instead */
  usage: EntityUsageSummary | null;
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
 *
 * Supports two call signatures:
 * - useEntityUsage({ entityId, entityType, autoFetch? }) - options object
 * - useEntityUsage(entityId, entityType) - positional arguments (legacy)
 */
export function useEntityUsage(
  optionsOrEntityId: UseEntityUsageOptions | string | null | undefined,
  entityTypeArg?: EntityType
): UseEntityUsageResult {
  // Normalize arguments to options object
  const options: UseEntityUsageOptions =
    typeof optionsOrEntityId === 'object' && optionsOrEntityId !== null && 'entityType' in optionsOrEntityId
      ? optionsOrEntityId
      : {
          entityId: optionsOrEntityId as string | null | undefined,
          entityType: entityTypeArg!,
          autoFetch: true,
        };

  const { entityId, entityType, autoFetch = true } = options;
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
        case 'location':
          throw new Error('Usage tracking not implemented for location');
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
    usage: data, // Alias for backward compatibility
    loading,
    error,
    refresh,
  };
}
