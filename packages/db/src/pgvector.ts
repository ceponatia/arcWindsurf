// Local typed wrapper around 'pgvector/pg' which has no TypeScript types.
// Keeps the untyped import localized and provides a stable exported type.
import type { PgvectorRegisterType } from './types.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - 'pgvector/pg' ships without types; we wrap it here
import { registerType as _registerType } from 'pgvector/pg';

export const registerType: PgvectorRegisterType = _registerType as unknown as (pg: unknown) => void;
