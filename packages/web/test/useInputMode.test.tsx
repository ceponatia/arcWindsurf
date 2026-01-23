import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInputMode } from '../src/hooks/useInputMode.js';

describe('useInputMode', () => {
  it('cycles modes and inserts markers', () => {
    const { result } = renderHook(() => useInputMode());
    expect(result.current.mode).toBe('speech');

    act(() => {
      result.current.cycleMode();
    });
    expect(result.current.mode).toBe('thought');

    const inserted = result.current.insertModeMarkers('hello', 5);
    expect(inserted.newText).toBe('hello~~');

    expect(result.current.cleanupEmptyMarkers('test ~~')).toBe('test');
  });
});
