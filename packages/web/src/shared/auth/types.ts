export type UserRole = 'user' | 'admin';

export interface AuthUser {
  identifier: string;
  role: UserRole;
}

export interface AuthMeResponse {
  ok: true;
  user: AuthUser | null;
}

export interface AuthLoginResponse {
  ok: true;
  token: string;
  user: AuthUser;
}
