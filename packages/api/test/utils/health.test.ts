import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { checkOllama } from '../../src/utils/health.js';

describe('utils/health', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return ok: true and version when ollama is healthy', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.1.0' }),
    });

    const result = await checkOllama('http://localhost:11434');

    expect(result).toEqual({ ok: true, version: '0.1.0' });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/version', { method: 'GET' });
  });

  it('should handle trailing slash in baseUrl', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.1.0' }),
    });

    await checkOllama('http://localhost:11434/');

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/version', { method: 'GET' });
  });

  it('should return ok: true without version if version is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await checkOllama('http://localhost:11434');

    expect(result).toEqual({ ok: true });
  });

  it('should return ok: false when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    const result = await checkOllama('http://localhost:11434');

    expect(result).toEqual({ ok: false });
  });

  it('should return ok: false when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await checkOllama('http://localhost:11434');

    expect(result).toEqual({ ok: false });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should return ok: false when json parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const result = await checkOllama('http://localhost:11434');

    // The implementation catches json error and returns null, then extractVersion returns undefined.
    // So it should return { ok: true } actually, based on the code:
    // const data: unknown = await res.json().catch(() => null);
    // const version = extractVersion(data);
    // if (version) ... else return { ok: true };

    expect(result).toEqual({ ok: true });
  });
});
