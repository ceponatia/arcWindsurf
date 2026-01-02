import { useEffect, useRef } from 'react';

/**
 * Hook to auto-save state to localStorage after a delay.
 * @param key - LocalStorage key
 * @param value - Value to save
 * @param delay - Debounce delay in ms (default 1000)
 * @param enabled - Whether auto-save is enabled (default true)
 */
export function useAutoSave<T>(key: string, value: T, delay = 1000, enabled = true) {
  const timeoutRef = useRef<number | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Failed to auto-save to localStorage', e);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay, enabled]);
}

/**
 * Load a draft from localStorage.
 */
export function loadDraft<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (e) {
    console.error('Failed to load draft from localStorage', e);
    return null;
  }
}

/**
 * Clear a draft from localStorage.
 */
export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear draft from localStorage', e);
  }
}
