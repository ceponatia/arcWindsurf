import type { DbMessage } from '../db/types.js';
import type { MapMessageResponse } from '../services/types.js';

export const mapMessageResponse: MapMessageResponse = (m: DbMessage) => ({
  role: m.role,
  content: m.content,
  createdAt: m.createdAt,
});
