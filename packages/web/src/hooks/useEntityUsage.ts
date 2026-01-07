import { useState, useCallback, useEffect } from 'react';
import {
  getCharacterUsage,
  getSettingUsage,
  getPersonaUsage,
  type EntityUsageSummary,
} from '../shared/api/client.js';

export type EntityType = 'character' | 'setting' | 'persona' | 'location';

export function useEntityUsage(entityId: string | null | undefined, entityType: EntityType) {
  const [usage, setUsage] = useState<EntityUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!entityId) {
      setUsage(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: EntityUsageSummary;
      switch (entityType) {
        case 'character':
          data = await getCharacterUsage(entityId);
          break;
        case 'setting':
          data = await getSettingUsage(entityId);
          break;
        case 'persona':
          data = await getPersonaUsage(entityId);
          break;
        default:
          throw new Error(`Usage tracking not implemented for ${entityType}`);
      }
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { usage, loading, error, refresh };
}
