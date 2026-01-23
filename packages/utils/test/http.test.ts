import { describe, it, expect } from 'vitest';
import { safeJson, safeText } from '../src/http/fetch.js';

describe('http fetch helpers', () => {
  it('returns text and fallback', async () => {
    const res = { text: async () => 'ok' };
    await expect(safeText(res)).resolves.toBe('ok');

    const bad = { text: async () => { throw new Error('fail'); } };
    await expect(safeText(bad)).resolves.toBe('<no body>');
  });

  it('returns json and null on error', async () => {
    const res = { json: async () => ({ ok: true }) };
    await expect(safeJson(res)).resolves.toEqual({ ok: true });

    const bad = { json: async () => { throw new Error('fail'); } };
    await expect(safeJson(bad)).resolves.toBeNull();
  });
});
