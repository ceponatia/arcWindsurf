import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../../config.js';

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  suggestedFor?: { races?: string[]; occupations?: string[] };
  affectedRegions: string[];
}

interface TemplatesResponse {
  ok: boolean;
  templates: TemplateMetadata[];
}

export function useSensoryTemplates(): {
  templates: TemplateMetadata[];
  isLoading: boolean;
  error: string | null;
} {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const pollIntervalMs = 15000;

    const loadTemplates = async (showLoading: boolean): Promise<void> => {
      if (showLoading && isMounted) {
        setIsLoading(true);
      }
      try {
        const url = new URL('/api/sensory/templates', API_BASE_URL);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load templates (${response.status})`);
        }
        const data = (await response.json()) as TemplatesResponse;
        if (isMounted) {
          setTemplates(data.templates ?? []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load templates';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted && showLoading) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplates(true);
    const intervalId = window.setInterval(() => {
      void loadTemplates(false);
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return { templates, isLoading, error };
}
