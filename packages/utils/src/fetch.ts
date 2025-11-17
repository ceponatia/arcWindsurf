export async function safeText(res: Pick<Response, 'text'>): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}

export async function safeJson<T = unknown>(res: Pick<Response, 'json'>): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
