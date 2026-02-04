import type { AuthUser } from '@minimal-rpg/schemas';

export type { AuthUser, UserRole } from '@minimal-rpg/schemas';

export interface AuthMeResponse {
  ok: true;
  user: AuthUser | null;
}

export interface AuthLoginResponse {
  ok: true;
  token: string;
  user: AuthUser;
}
