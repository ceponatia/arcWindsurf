import type { Message } from '@minimal-rpg/db/node';
import type { MapMessageResponse } from '../types.js';

export const mapMessageResponse: MapMessageResponse = (m: Message) => ({
  role: m.role,
  content: m.content,
  createdAt: m.createdAt,
});
