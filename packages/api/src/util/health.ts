export async function checkOllama(baseUrl: string): Promise<{ ok: boolean; version?: string }> {
  const url = `${trimTrailingSlash(baseUrl)}/api/version`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { ok: false };
    }
    const data: unknown = await res.json().catch(() => null);
    return { ok: true, version: extractVersion(data) };
  } catch (error) {
    console.warn('Ollama health check failed', error);
    return { ok: false };
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function extractVersion(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { version } = data as { version?: unknown };
  return typeof version === 'string' ? version : undefined;
}
