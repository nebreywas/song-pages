import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VISUALIZER_NAME_REVEAL_MS } from '@shared/vcMode/visualizerSettings';
import type { VcHotkeyAction } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { getExperienceCreditTitle } from '../visualizers/credits/resolveCredits';

type UseVisualizerNameRevealArgs = {
  /** When true, reveal automatically when the active visualizer changes. */
  autoReveal: boolean;
  /** Active visualizer experience id. */
  visualizerId: string | null | undefined;
};

/**
 * Timed bottom-bar reveal for the active visualizer name.
 * Auto-shows on visualizer activity when enabled; always honors the
 * `showVisualizerName` VC hotkey / command.
 */
export function useVisualizerNameReveal({ autoReveal, visualizerId }: UseVisualizerNameRevealArgs) {
  const [visibleUntil, setVisibleUntil] = useState(0);
  const prevIdRef = useRef<string | null>(null);

  const reveal = useCallback(() => {
    setVisibleUntil(Date.now() + VISUALIZER_NAME_REVEAL_MS);
  }, []);

  // Auto-reveal when a new visualizer becomes active (setting on).
  // While auto-reveal is off we clear the previous-id marker so turning the
  // setting on (or opening VC with it already on) still shows the name once.
  useEffect(() => {
    const id = typeof visualizerId === 'string' && visualizerId.trim() ? visualizerId : null;

    if (!autoReveal || !id) {
      if (!autoReveal) prevIdRef.current = null;
      return;
    }

    const prev = prevIdRef.current;
    prevIdRef.current = id;
    if (prev !== id) {
      reveal();
    }
  }, [autoReveal, visualizerId, reveal]);

  // Manual reveal from keybindings / controller via vc:hotkey.
  useEffect(() => {
    const app = getApp();
    const off = app?.vc?.onHotkey?.(({ action }: { action: VcHotkeyAction }) => {
      if (action === 'showVisualizerName') {
        reveal();
      }
    });
    return () => off?.();
  }, [reveal]);

  // Hide when the reveal window expires (and re-arm if reveal() is called again).
  useEffect(() => {
    if (visibleUntil <= 0) return;
    const remaining = visibleUntil - Date.now();
    if (remaining <= 0) {
      setVisibleUntil(0);
      return;
    }
    const timer = window.setTimeout(() => setVisibleUntil(0), remaining);
    return () => window.clearTimeout(timer);
  }, [visibleUntil]);

  const name = useMemo(() => {
    if (!visualizerId) return '';
    return getExperienceCreditTitle(visualizerId);
  }, [visualizerId]);

  return {
    visible: visibleUntil > Date.now() && Boolean(name),
    name,
    reveal,
  };
}
