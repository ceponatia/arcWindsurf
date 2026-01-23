/**
 * JSON utilities.
 *
 * Node's JSON.stringify throws on BigInt values, but our DB layer uses bigint
 * for sequences/counters.
 */

/**
 * Stringify a value, converting any BigInt values to decimal strings.
 */
export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
}

/**
 * Recursively convert BigInt values into strings so they can be returned via c.json.
 */
export function jsonifyBigInts<T>(value: T): T {
  const convert = (v: unknown): unknown => {
    if (typeof v === 'bigint') return v.toString();
    if (v instanceof Date) return v.toISOString();

    if (Array.isArray(v)) {
      return v.map((item) => convert(item));
    }

    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(obj)) {
        out[k] = convert(child);
      }
      return out;
    }

    return v;
  };

  return convert(value) as T;
}
