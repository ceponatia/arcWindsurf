export interface DevNewsPost {
  /** Stable identifier used as React key. */
  id: string;
  /** Post title shown as the headline. */
  title: string;
  /** ISO-8601 date-time string (e.g. 2025-12-20T00:00:00Z). */
  publishedAt: string;
  /** Optional short description shown under the title. */
  summary?: string;
  /**
   * Main post body authored as Markdown.
   *
   * Use a single string for multi-paragraph Markdown (recommended), or an array
   * of strings which will be joined with blank lines.
   */
  body: string | string[];
  /** Optional topic tags. */
  tags?: string[];
}
