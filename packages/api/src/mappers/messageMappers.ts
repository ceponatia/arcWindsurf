import type { MapMessageResponse, DbMessage } from '../types.js';

export const mapMessageResponse: MapMessageResponse = (m: DbMessage) => ({
  role: m.role,
  content: m.content,
  createdAt: m.createdAt,
});
