// Shared types for the characters domain package.

export type CharacterId = string;
export type SessionId = string;

export interface DomainError extends Error {
  code?: string;
  retryable?: boolean;
}

export interface Timestamped {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PaginatedRequest {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}
