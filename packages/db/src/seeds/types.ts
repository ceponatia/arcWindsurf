/**
 * Built-in tag definitions for the initial tag library.
 * These tags are marked as isBuiltIn=true and owner='system'.
 */
export interface BuiltInTag {
  name: string;
  shortDescription: string;
  category: 'style' | 'mechanic' | 'content' | 'world' | 'behavior' | 'trigger' | 'meta';
  promptText: string;
}

export type BuiltInTagSeedMode = 'insert' | 'upsert';

export interface SeedBuiltInTagsOptions {
  /**
   * - `insert` (default): insert missing tags; never overwrite existing rows.
   * - `upsert`: update the built-in tag fields on conflict.
   */
  mode?: BuiltInTagSeedMode;
}
