import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useFetchOnce } from './useFetchOnce.js';

describe('useFetchOnce', () => {
  it('fetches data once and retries on demand', async () => {
    const fetcher = vi.fn<[AbortSignal], Promise<string>>().mockResolvedValue('value');
    const { result } = renderHook(() =>
      useFetchOnce<string>({
        fetcher,
        errorMessage: 'failed',
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('value');
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);

    fetcher.mockResolvedValueOnce('next');
    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.data).toBe('next'));
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retains previous data and surfaces errors when fetch fails', async () => {
    const fetcher = vi
      .fn<[AbortSignal], Promise<string>>()
      .mockResolvedValueOnce('initial')
      .mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() =>
      useFetchOnce<string>({
        fetcher,
        errorMessage: 'fallback',
      })
    );

    await waitFor(() => expect(result.current.data).toBe('initial'));
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('initial');
    expect(result.current.error).toBe('boom');
  });
});
