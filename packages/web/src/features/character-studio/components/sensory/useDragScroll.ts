import { useCallback, useMemo, useRef, useState } from 'react';

interface DragScrollOptions {
  /** Pixels of movement before a click is considered a drag. */
  dragThresholdPx?: number;
}

/**
 * Enables mouse-drag and touch-swipe scrolling on an overflow container.
 * Uses Pointer Events so it works for mouse and touch.
 */
export function useDragScroll(options?: DragScrollOptions): {
  ref: React.RefObject<HTMLDivElement | null>;
  containerProps: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
  isDragging: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragThresholdPx = options?.dragThresholdPx ?? 6;

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const state = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
    didDrag: boolean;
    suppressClick: boolean;
    didCapture: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    didDrag: false,
    suppressClick: false,
    didCapture: false,
  });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button for mouse; touch/pen should still work.
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const el = ref.current;
    if (!el) return;

    state.current.pointerId = e.pointerId;
    state.current.startX = e.clientX;
    state.current.startY = e.clientY;
    state.current.startScrollLeft = el.scrollLeft;
    state.current.didDrag = false;
    state.current.suppressClick = false;
    state.current.didCapture = false;

    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      if (state.current.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.current.startX;
      const dy = e.clientY - state.current.startY;
      if (!state.current.didDrag && Math.abs(dx) >= dragThresholdPx) {
        // Only treat as a drag if horizontal intent is stronger than vertical.
        if (Math.abs(dx) > Math.abs(dy)) {
          state.current.didDrag = true;
          state.current.suppressClick = true;
        }
      }

      if (state.current.didDrag && !state.current.didCapture) {
        state.current.didCapture = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Ignore; some elements/browsers may throw.
        }
      }

      if (state.current.didDrag) {
        // Prevent text selection and reduce accidental clicks while dragging.
        e.preventDefault();
        el.scrollLeft = state.current.startScrollLeft - dx;
      }
    },
    [dragThresholdPx]
  );

  const endDrag = useCallback((pointerId: number) => {
    if (state.current.pointerId !== pointerId) return;
    state.current.pointerId = null;
    state.current.didDrag = false;
    state.current.didCapture = false;
    setIsDragging(false);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // If the user dragged, suppress the click that would otherwise toggle cards.
    if (state.current.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      // Reset after suppressing one click.
      state.current.suppressClick = false;
    }
  }, []);

  const containerProps = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    }),
    [onClickCapture, onPointerCancel, onPointerDown, onPointerMove, onPointerUp]
  );

  return { ref, containerProps, isDragging };
}
