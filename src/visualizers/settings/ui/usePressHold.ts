import { useCallback, useRef } from 'react';

const HOLD_MS = 450;
const MOVE_THRESHOLD_PX = 10;

type UsePressHoldOptions = {
  onTap: () => void;
  onHold: () => void;
  disabled?: boolean;
};

/** Tap fires immediately; hold opens settings without delaying the tap decision. */
export function usePressHold({ onTap, onHold, disabled = false }: UsePressHoldOptions) {
  const holdTimerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const holdTriggeredRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const pointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;

      holdTriggeredRef.current = false;
      startPointRef.current = { x: event.clientX, y: event.clientY };
      clearHoldTimer();

      holdTimerRef.current = window.setTimeout(() => {
        holdTriggeredRef.current = true;
        onHold();
      }, HOLD_MS);
    },
    [clearHoldTimer, disabled, onHold],
  );

  const pointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!startPointRef.current || disabled) return;

      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
        clearHoldTimer();
      }
    },
    [clearHoldTimer, disabled],
  );

  const pointerUp = useCallback(() => {
    if (disabled) return;

    clearHoldTimer();
    if (!holdTriggeredRef.current) {
      onTap();
    }
    startPointRef.current = null;
  }, [clearHoldTimer, disabled, onTap]);

  const pointerCancel = useCallback(() => {
    clearHoldTimer();
    startPointRef.current = null;
    holdTriggeredRef.current = false;
  }, [clearHoldTimer]);

  const contextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      event.preventDefault();
      onHold();
    },
    [disabled, onHold],
  );

  return {
    onPointerDown: pointerDown,
    onPointerMove: pointerMove,
    onPointerUp: pointerUp,
    onPointerCancel: pointerCancel,
    onContextMenu: contextMenu,
  };
}
