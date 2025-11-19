// Local shared types for DB utilities and filesystem helpers used by scripts
// Keep these minimal and focused on what we actually call.

export interface PgPoolLike {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
}

export interface FsPromisesLike {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
}

export interface PathLike {
  resolve: (...segments: string[]) => string;
  dirname: (p: string) => string;
  join: (...segments: string[]) => string;
}

export type SqlFile = string;
export type SqlText = string;

// DB row/params helpers used across prisma.ts
export type DbRow = Record<string, unknown>;
export type DbRows<T = DbRow> = T[];
export type SqlParams = unknown[];
export interface QueryResult<T> {
  rows: T[];
  rowCount?: number;
}

export interface PgClientLike {
  query: (text: string, params?: SqlParams) => Promise<QueryResult<DbRow>>;
  release: () => void;
}

export interface PgPoolStrict {
  connect: () => Promise<PgClientLike>;
  query: (text: string, params?: SqlParams) => Promise<QueryResult<DbRow>>;
  end: () => Promise<void>;
}

// UUID helpers for generators like node:crypto.randomUUID
export type UUID = string;
export type RandomUUID = () => UUID;

// pgvector integration helper signature
export type PgvectorRegisterType = (pg: unknown) => void;

// Minimal camelized entities returned from prisma-like helpers
export interface MessageEntity {
  idx: number;
  role: string;
  content: string;
  createdAt?: Date;
}

export interface UserSessionEntity {
  id: string;
  characterId: string;
  settingId: string;
  createdAt?: Date;
  messages?: MessageEntity[];
}
