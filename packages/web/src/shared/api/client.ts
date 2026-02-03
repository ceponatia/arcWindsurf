import { isAbortError } from '@minimal-rpg/utils';
import type {
  CharacterSummary,
  SettingSummary,
  PersonaSummary,
  ItemSummary,
  Message,
  Session,
  SessionSummary,
  RuntimeConfigResponse,
  TurnMetadata,
  NpcInstanceSummary,
} from '../../types.js';
import type {
  CharacterProfile,
  SettingProfile,
  PersonaProfile,
  ItemDefinition,
  TagResponse,
  CreateTagRequest,
  UpdateTagRequest,
  SessionUsageInfo,
  EntityUsageSummary,
} from '@minimal-rpg/schemas';
import { API_BASE_URL, MESSAGE_TIMEOUT_MS } from '../../config.js';
import { getAccessToken } from '../auth/accessToken.js';
import type { AuthLoginResponse, AuthMeResponse } from '../auth/types.js';

interface TurnEndpointResponse {
  message: string;
  events: unknown[];
  stateChanges?: unknown;
  metadata?: TurnMetadata;
  speaker?: { actorId: string; name?: string };
  success: boolean;
}

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

  const token = await getAccessToken();
  const incomingHeaders = rest.headers;
  const mergedHeaders: Record<string, string> = {};
  const setHeader = (key: string, value: string) => {
    Object.defineProperty(mergedHeaders, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };
  const hasHeader = (key: string): boolean => {
    const entry = Object.getOwnPropertyDescriptor(mergedHeaders, key);
    return typeof entry?.value === 'string';
  };

  if (incomingHeaders) {
    if (incomingHeaders instanceof Headers) {
      incomingHeaders.forEach((v, k) => {
        setHeader(k, v);
      });
    } else if (Array.isArray(incomingHeaders)) {
      for (const [k, v] of incomingHeaders) {
        setHeader(k, v);
      }
    } else {
      Object.assign(mergedHeaders, incomingHeaders);
    }
  }

  if (token && !hasHeader('Authorization') && !hasHeader('authorization')) {
    setHeader('Authorization', `Bearer ${token}`);
  }

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
    const res = await fetch(url, {
      ...rest,
      ...(Object.keys(mergedHeaders).length > 0 ? { headers: mergedHeaders } : {}),
      signal: controller.signal,
    });

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

// =============================================================================
// Auth API
// =============================================================================

export async function authLogin(params: {
  identifier: string;
  password: string;
}): Promise<AuthLoginResponse> {
  return http<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    timeoutMs: 15000,
  });
}

export async function authMe(signal?: AbortSignal): Promise<AuthMeResponse> {
  return http<AuthMeResponse>('/auth/me', signal ? { signal } : undefined);
}

export async function getRuntimeConfig(signal?: AbortSignal): Promise<RuntimeConfigResponse> {
  return http<RuntimeConfigResponse>('/config', signal ? { signal } : undefined);
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

export async function getSessionNpcs(
  sessionId: string,
  signal?: AbortSignal
): Promise<NpcInstanceSummary[]> {
  const res = await http<{ ok: boolean; npcs: NpcInstanceSummary[] }>(
    `/sessions/${encodeURIComponent(sessionId)}/npcs`,
    signal ? { signal } : undefined
  );
  return res.npcs ?? [];
}

export interface CreateSessionResponseShort {
  id: string;
  playerCharacterId: string;
  settingId: string;
  createdAt: string;
}

export async function createSession(
  characterId: string,
  settingId: string,
  tagIds?: string[],
  signal?: AbortSignal
): Promise<CreateSessionResponseShort> {
  return http<CreateSessionResponseShort>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, settingId, tagIds }),
    ...(signal && { signal }),
  });
}

/**
 * Request payload for creating a full session via /sessions/create-full
 */
export interface CreateFullSessionRequest {
  settingId: string;
  personaId?: string;
  startLocationId?: string;
  startTime?: {
    year?: number;
    month?: number;
    day?: number;
    hour: number;
    minute: number;
  };
  secondsPerTurn?: number;
  npcs: {
    characterId: string;
    role: string;
    tier: string;
    startLocationId?: string;
    label?: string;
  }[];
  relationships?: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
    affinitySeed?: {
      trust?: number;
      fondness?: number;
      fear?: number;
    };
  }[];
  tags?: {
    tagId: string;
    targetType: string;
    targetEntityId?: string | null;
  }[];
}

/**
 * Response from /sessions/create-full endpoint
 */
export interface CreateFullSessionResponse {
  id: string;
  settingId: string;
  playerCharacterId: string;
  personaId: string | null;
  startLocationId: string | null;
  secondsPerTurn: number;
  createdAt: string;
  npcs: {
    instanceId: string;
    templateId: string;
    role: string;
    tier: string;
    label: string | null;
    startLocationId: string | null;
  }[];
  tagBindings: {
    id: string;
    tagId: string;
    targetType: string;
    targetEntityId: string | null;
  }[];
  relationships: {
    fromActorId: string;
    toActorId: string;
    relationshipType: string;
  }[];
}

/**
 * Create a full session with all related entities in a single transaction.
 * Uses the /sessions/create-full endpoint.
 */
export async function createSessionFull(
  config: CreateFullSessionRequest,
  signal?: AbortSignal
): Promise<CreateFullSessionResponse> {
  return http<CreateFullSessionResponse>('/sessions/create-full', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    ...(signal && { signal }),
  });
}

// ============================================================================
// Workspace Drafts API
// ============================================================================

/**
 * A workspace draft stored on the server
 */
export interface WorkspaceDraft {
  id: string;
  userId: string;
  name: string | null;
  workspaceState: Record<string, unknown>;
  currentStep: string;
  validationState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * List workspace drafts for a user
 */
export async function listWorkspaceDrafts(
  userId = 'default',
  limit = 20
): Promise<WorkspaceDraft[]> {
  const result = await http<{ ok: true; drafts: WorkspaceDraft[] }>(
    `/workspace-drafts?user_id=${encodeURIComponent(userId)}&limit=${limit}`
  );
  return result.drafts;
}

/**
 * Get a single workspace draft by ID
 */
export async function getWorkspaceDraft(id: string): Promise<WorkspaceDraft | null> {
  try {
    const result = await http<{ ok: true; draft: WorkspaceDraft }>(
      `/workspace-drafts/${encodeURIComponent(id)}`
    );
    return result.draft;
  } catch (err) {
    // 404 returns null
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * Create a new workspace draft
 */
export async function createWorkspaceDraft(params: {
  userId?: string;
  name?: string;
  workspaceState?: Record<string, unknown>;
  currentStep?: string;
}): Promise<WorkspaceDraft> {
  const userId = params.userId ?? 'default';
  const result = await http<{ ok: true; draft: WorkspaceDraft }>(
    `/workspace-drafts?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        workspaceState: params.workspaceState,
        currentStep: params.currentStep,
      }),
    }
  );
  return result.draft;
}

/**
 * Update an existing workspace draft
 */
export async function updateWorkspaceDraft(
  id: string,
  updates: {
    name?: string | null;
    workspaceState?: Record<string, unknown>;
    currentStep?: string;
    validationState?: Record<string, unknown>;
  }
): Promise<WorkspaceDraft | null> {
  try {
    const result = await http<{ ok: true; draft: WorkspaceDraft }>(
      `/workspace-drafts/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    return result.draft;
  } catch (err) {
    // 404 returns null
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * Delete a workspace draft
 */
export async function deleteWorkspaceDraft(id: string): Promise<boolean> {
  try {
    await http<null>(`/workspace-drafts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    // 404 returns false
    if (err instanceof Error && err.message.includes('404')) {
      return false;
    }
    throw err;
  }
}

export async function sendMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal,
  options?: { npcId?: string | null }
): Promise<{ message: Message; events?: unknown[]; stateChanges?: unknown }> {
  const result = await http<TurnEndpointResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/turns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: content, npcId: options?.npcId ?? undefined }),
      timeoutMs: MESSAGE_TIMEOUT_MS,
      ...(signal && { signal }),
    }
  );

  const assistant: Message = {
    role: 'assistant',
    content: result.message,
    createdAt: new Date().toISOString(),
    ...(result.metadata ? { turnMetadata: result.metadata } : {}),
    ...(result.speaker
      ? {
        speaker: {
          id: result.speaker.actorId,
          name: result.speaker.name ?? result.speaker.actorId,
        },
      }
      : {}),
  };

  return {
    message: assistant,
    events: result.events,
    stateChanges: result.stateChanges,
  };
}

export async function updateMessage(
  sessionId: string,
  sequence: number,
  content: string,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}/messages/${sequence}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    ...(signal && { signal }),
  });
}

export async function deleteMessage(
  sessionId: string,
  sequence: number,
  signal?: AbortSignal
): Promise<void> {
  await http<void>(`/sessions/${encodeURIComponent(sessionId)}/messages/${sequence}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export interface SessionHeartbeatResponse {
  ok: true;
  sessionId: string;
  status: 'running' | 'resumed';
  lastHeartbeat: string;
}

/**
 * Send a session heartbeat to the API.
 */
export async function postSessionHeartbeat(
  sessionId: string,
  signal?: AbortSignal
): Promise<SessionHeartbeatResponse> {
  return http<SessionHeartbeatResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/heartbeat`,
    {
      method: 'POST',
      ...(signal && { signal }),
    }
  );
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

export interface ToolingFailureEventDto {
  type: 'tooling-failure';
  timestamp: string | null;
  payload: Record<string, unknown>;
  source?: string;
}

export interface ToolingFailureEntryDto {
  turnIdx: number;
  createdAt: string;
  playerInput: string;
  events: ToolingFailureEventDto[];
}

export interface ToolingFailuresResponseDto {
  ok: true;
  sessionId: string;
  limit: number;
  count: number;
  failures: ToolingFailureEntryDto[];
}

export async function getToolingFailures(
  sessionId: string,
  limit = 50,
  signal?: AbortSignal
): Promise<ToolingFailuresResponseDto> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return http<ToolingFailuresResponseDto>(
    `/admin/sessions/${encodeURIComponent(sessionId)}/tooling-failures?${qs.toString()}`,
    signal ? { signal } : undefined
  );
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

export async function getPersonas(signal?: AbortSignal): Promise<PersonaSummary[]> {
  return http<PersonaSummary[]>('/personas', signal ? { signal } : undefined);
}

export async function getPersona(personaId: string, signal?: AbortSignal): Promise<PersonaProfile> {
  return http<PersonaProfile>(
    `/personas/${encodeURIComponent(personaId)}`,
    signal ? { signal } : undefined
  );
}

export async function savePersona(
  profile: PersonaProfile,
  signal?: AbortSignal
): Promise<{ persona: PersonaSummary }> {
  return http<{ persona: PersonaSummary }>('/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}

export async function deletePersona(personaId: string, signal?: AbortSignal): Promise<void> {
  return http<void>(`/personas/${encodeURIComponent(personaId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

export async function getTags(signal?: AbortSignal): Promise<TagResponse[]> {
  const result = await http<{ tags: TagResponse[]; total: number }>(
    '/tags',
    signal ? { signal } : undefined
  );
  return result.tags;
}

export async function getTag(id: string, signal?: AbortSignal): Promise<TagResponse> {
  return http<TagResponse>(`/tags/${encodeURIComponent(id)}`, signal ? { signal } : undefined);
}

export async function createTag(
  data: CreateTagRequest,
  signal?: AbortSignal
): Promise<TagResponse> {
  return http<TagResponse>('/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...(signal && { signal }),
  });
}

export async function updateTag(
  id: string,
  data: UpdateTagRequest,
  signal?: AbortSignal
): Promise<TagResponse> {
  return http<TagResponse>(`/tags/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...(signal && { signal }),
  });
}

export async function deleteTag(id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/tags/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

// ============ ITEMS ============

export async function getItems(
  options?: { category?: string },
  signal?: AbortSignal
): Promise<ItemSummary[]> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  const query = params.toString();
  const path = query ? `/items?${query}` : '/items';
  return http<ItemSummary[]>(path, signal ? { signal } : undefined);
}

export async function getItem(id: string, signal?: AbortSignal): Promise<ItemDefinition> {
  return http<ItemDefinition>(`/items/${encodeURIComponent(id)}`, signal ? { signal } : undefined);
}

export async function saveItem(
  definition: ItemDefinition,
  signal?: AbortSignal
): Promise<{ item: ItemSummary }> {
  return http<{ item: ItemSummary }>('/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
    ...(signal && { signal }),
  });
}

export async function updateItem(
  id: string,
  definition: ItemDefinition,
  signal?: AbortSignal
): Promise<{ item: ItemSummary }> {
  return http<{ item: ItemSummary }>(`/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
    ...(signal && { signal }),
  });
}

export async function deleteItem(id: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}

// ============ ENTITY USAGE ============

/**
 * Get sessions that use a specific character template.
 */
export async function getCharacterUsage(
  characterId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/characters/${encodeURIComponent(characterId)}`,
    signal ? { signal } : undefined
  );
}

/**
 * Get sessions that use a specific setting template.
 */
export async function getSettingUsage(
  settingId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/settings/${encodeURIComponent(settingId)}`,
    signal ? { signal } : undefined
  );
}

/**
 * Get sessions that use a specific persona.
 */
export async function getPersonaUsage(
  personaId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/personas/${encodeURIComponent(personaId)}`,
    signal ? { signal } : undefined
  );
}

// =============================================================================
// User Preferences API
// =============================================================================

export type WorkspaceMode = 'wizard' | 'compact';

export interface UserPreferences {
  workspaceMode?: WorkspaceMode;
  [key: string]: unknown;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId = 'default'): Promise<UserPreferences> {
  const result = await http<{ ok: true; preferences: UserPreferences }>(
    `/user/preferences?user_id=${encodeURIComponent(userId)}`
  );
  return result.preferences;
}

/**
 * Update user preferences (merges with existing)
 */
export async function updateUserPreferences(
  preferences: Partial<UserPreferences>,
  userId = 'default'
): Promise<UserPreferences> {
  const result = await http<{ ok: true; preferences: UserPreferences }>(
    `/user/preferences?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    }
  );
  return result.preferences;
}

/**
 * Get workspace mode preference
 */
export async function getWorkspaceModePreference(userId = 'default'): Promise<WorkspaceMode> {
  const result = await http<{ ok: true; mode: WorkspaceMode }>(
    `/user/preferences/workspace-mode?user_id=${encodeURIComponent(userId)}`
  );
  return result.mode;
}

/**
 * Set workspace mode preference
 */
export async function setWorkspaceModePreference(
  mode: WorkspaceMode,
  userId = 'default'
): Promise<void> {
  await http<{ ok: true; mode: WorkspaceMode }>(
    `/user/preferences/workspace-mode?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }
  );
}
