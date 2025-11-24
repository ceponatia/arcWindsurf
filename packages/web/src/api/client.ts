import { isAbortError } from '@minimal-rpg/utils';
import type {
  CharacterSummary,
  SettingSummary,
  Message,
  Session,
  SessionSummary,
} from '../types.js';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
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
  rowCount?: number;
  sample?: Record<string, unknown>[];
}

export interface DbRelationOverview {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface DbOverview {
  tables: DbTableOverview[];
  relations: DbRelationOverview[];
}

interface HttpOptions extends RequestInit {
  signal?: AbortSignal;
  timeoutMs?: number;
  parseAsText?: boolean;
}

async function http<T>(path: string, init?: HttpOptions): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { signal, timeoutMs = 10000, parseAsText, ...rest } = init ?? {};

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort);
    }
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
      // Try to surface server-provided error details
      try {
        const maybeJson: unknown = await res.clone().json();
        const msg =
          maybeJson && typeof maybeJson === 'object' && 'error' in maybeJson
            ? String((maybeJson as { error?: unknown }).error)
            : undefined;
        if (msg) throw new Error(`HTTP ${res.status}: ${msg}`);
      } catch (jsonErr) {
        // Ignore JSON parse errors and fall back to text parsing below.
        void jsonErr;
      }

      try {
        const text = await res.text();
        if (text) throw new Error(`HTTP ${res.status}: ${text}`);
      } catch (textErr) {
        // Ignore text parsing errors; we'll throw a generic HTTP error below.
        void textErr;
      }

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
    const isAbortErr = isAbortError(err);
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
  return http<CharacterSummary[]>('/characters', signal ? { signal } : undefined);
}

export async function getSettings(signal?: AbortSignal): Promise<SettingSummary[]> {
  return http<SettingSummary[]>('/settings', signal ? { signal } : undefined);
}

export async function getSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  return http<SessionSummary[]>('/sessions', signal ? { signal } : undefined);
}

export async function getSession(sessionId: string, signal?: AbortSignal): Promise<Session> {
  return http<Session>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    signal ? { signal } : undefined
  );
}

export async function createSession(
  characterId: string,
  settingId: string,
  signal?: AbortSignal
): Promise<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>> {
  return http<Pick<Session, 'id' | 'characterId' | 'settingId' | 'createdAt'>>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, settingId }),
    ...(signal && { signal }),
  });
}

export async function sendMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal
): Promise<{ message: Message }> {
  return http<{ message: Message }>(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    timeoutMs: MESSAGE_TIMEOUT_MS,
    ...(signal && { signal }),
  });
}

export async function updateMessage(
  sessionId: string,
  idx: number,
  content: string,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}/messages/${idx}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    ...(signal && { signal }),
  });
}

export async function getSessionMessages(
  sessionId: string,
  signal?: AbortSignal
): Promise<Message[]> {
  return http<Message[]>(
    `/sessions/${encodeURIComponent(sessionId)}/messages`,
    signal ? { signal } : undefined
  );
}

export async function renameSession(
  sessionId: string,
  title: string,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
    ...(signal && { signal }),
  });
}

export async function deleteSession(sessionId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function deleteCharacter(characterId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/characters/${encodeURIComponent(characterId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function deleteSetting(settingId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/settings/${encodeURIComponent(settingId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function getDbOverview(signal?: AbortSignal): Promise<DbOverview> {
  return http<DbOverview>('/admin/db/overview', signal ? { signal } : undefined);
}

export async function deleteDbRow(model: string, id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/admin/db/${encodeURIComponent(model)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
    timeoutMs: 15000,
  });
}

export async function getCharacter(
  characterId: string,
  signal?: AbortSignal
): Promise<CharacterProfile> {
  return http<CharacterProfile>(
    `/characters/${encodeURIComponent(characterId)}`,
    signal ? { signal } : undefined
  );
}

export async function getSetting(settingId: string, signal?: AbortSignal): Promise<SettingProfile> {
  return http<SettingProfile>(
    `/settings/${encodeURIComponent(settingId)}`,
    signal ? { signal } : undefined
  );
}

export async function saveCharacter(
  profile: CharacterProfile,
  signal?: AbortSignal
): Promise<{ character: CharacterSummary }> {
  return http<{ character: CharacterSummary }>('/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}

export async function saveSetting(
  profile: SettingProfile,
  signal?: AbortSignal
): Promise<{ setting: SettingSummary }> {
  return http<{ setting: SettingSummary }>('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}
