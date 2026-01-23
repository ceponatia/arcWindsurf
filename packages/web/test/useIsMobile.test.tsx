import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../src/hooks/useIsMobile.js';

describe('useIsMobile', () => {
  it('detects mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Desktop', configurable: true });

    const { result } = renderHook(() => useIsMobile(600));
    expect(result.current).toBe(true);

    act(() => {
      window.innerWidth = 800;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });
});
