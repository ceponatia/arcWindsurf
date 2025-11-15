import type {
  CharacterSummary,
  SettingSummary,
  Message,
  Session,
  SessionSummary,
} from '../types.js';
import { API_BASE_URL, MESSAGE_TIMEOUT_MS } from '../config.js';
export interface DbColumn {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  isList: boolean;
}
export interface DbTableOverview {
  name: string;
  columns: DbColumn[];
  rowCount: number;
  sample: Record<string, unknown>[];
}
export interface DbOverview {
  tables: DbTableOverview[];
}

function getBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, '');
}

type HttpOptions = RequestInit & { parseAsText?: boolean; timeoutMs?: number };

async function http<T>(path: string, init?: HttpOptions): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const { signal, timeoutMs = 10000, parseAsText, ...rest } = init ?? {};
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    // No Content
    if (res.status === 204) {
      return undefined as T;
    }
    if (parseAsText) {
      return (await res.text()) as T;
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new Error('Failed to parse JSON response');
    }
  } catch (err) {
    const isAbortErr = err instanceof Error && err.name === 'AbortError';
    if (timedOut && isAbortErr) {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export async function getCharacters(signal?: AbortSignal): Promise<CharacterSummary[]> {
  return http<CharacterSummary[]>('/characters', { signal });
}

export async function getSettings(signal?: AbortSignal): Promise<SettingSummary[]> {
  return http<SettingSummary[]>('/settings', { signal });
}

export async function getSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  return http<SessionSummary[]>('/sessions', { signal });
}

export async function createSession(
  characterId: string,
  settingId: string,
  signal?: AbortSignal,
): Promise<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>> {
  return http<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, settingId }),
    signal,
  });
}

export async function sendMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal,
): Promise<{ message: Message }> {
  return http<{ message: Message }>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
    timeoutMs: MESSAGE_TIMEOUT_MS,
  });
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
  return http<Session>(`/sessions/${encodeURIComponent(sessionId)}`, { signal });
}

export const Api = {
  getBaseUrl,
  getCharacters,
  getSettings,
  getSessions,
  createSession,
  sendMessage,
  getSession,
};

export default Api;

export async function getDbOverview(signal?: AbortSignal): Promise<DbOverview> {
  return http<DbOverview>('/admin/db/overview', { signal });
}

export async function deleteDbRow(model: string, id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/admin/db/${encodeURIComponent(model)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
    // Allow small timeout to avoid hanging UI if server rejects
    timeoutMs: 15000,
  });
}
