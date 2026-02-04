import type { UserRole } from './user-types.js';

export interface AuthUser {
  identifier: string;
  role: UserRole;
  email?: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}
