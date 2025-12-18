const TOKEN_STORAGE_KEY = 'minirpg_auth_token';

export function getAuthToken(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY);
    return v && v.trim().length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    globalThis.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  try {
    globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}
