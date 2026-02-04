import { customType } from 'drizzle-orm/pg-core';

// Custom type for pgvector
export const vector = customType<{ data: number[] }>({
  dataType(config) {
    const dimensions = (config as { dimensions?: number })?.dimensions ?? 1536;
    return `vector(${dimensions})`;
  },
});
