import { db as rawDb } from '@minimal-rpg/db/node';
import type { PrismaClientLike } from './types.js';

export const db = rawDb as unknown as PrismaClientLike;
