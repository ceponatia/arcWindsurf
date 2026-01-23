import { useEffect, useRef } from 'react';

export interface ViewEnterRule<TViewMode extends string> {
  /** One or more views that should trigger a refresh when entered. */
  views: readonly TViewMode[];
  /** Refresh callback to run when the view is entered. */
  refresh: () => void;
}

/**
 * Runs one or more refresh callbacks when a view is entered.
 *
 * This standardizes "fetch fresh data on load" behavior across hash-routed views
 * without requiring each page/component to implement its own inline effects.
 */
export function useRefreshOnViewEnter<TViewMode extends string>(
  viewMode: TViewMode,
  rules: readonly ViewEnterRule<TViewMode>[]
): void {
  const previousViewModeRef = useRef<TViewMode | null>(null);

  useEffect(() => {
    const previous = previousViewModeRef.current;
    previousViewModeRef.current = viewMode;

    // Treat initial mount as entering the current view.
    if (previous === viewMode) return;

    for (const rule of rules) {
      if (rule.views.includes(viewMode)) {
        rule.refresh();
      }
    }
  }, [rules, viewMode]);
}
