import { useEffect, useState } from 'react';

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

    const loadTemplates = async (): Promise<void> => {
      try {
        const response = await fetch('/api/sensory/templates');
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  return { templates, isLoading, error };
}
