import { useEffect, useRef, useState } from 'react';

import type { VisualizerStreamFrame } from '@shared/visualizerMessages';
import type { VcHotkeyAction, VcOverlayId, VcStatePayload } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { FFT_SIZE } from '../visualizers/audioGraph';

export const VC_CELL_CLICK_COOLDOWN_MS = 800;

const CENTER_OVERLAYS: VcOverlayId[] = ['cover', 'host', 'songInfo', 'upcoming'];

export type VcWindowContext = {
  state: VcStatePayload | null;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
  activeOverlay: VcOverlayId | null;
  praiseToken: number;
  /** Bright red area/float outlines — toggled by ⌘⌥D / Ctrl+Alt+D. */
  debugOutlines: boolean;
};

export function useVcWindowState(): VcWindowContext {
  const [state, setState] = useState<VcStatePayload | null>(null);
  const [frequencyData, setFrequencyData] = useState(() => new Uint8Array(FFT_SIZE / 2));
  const [frame, setFrame] = useState(0);
  const [canvasFrame, setCanvasFrame] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<VcOverlayId | null>(null);
  const [praiseToken, setPraiseToken] = useState(0);
  const [debugOutlines, setDebugOutlines] = useState(false);
  const praiseBusyRef = useRef(false);

  useEffect(() => {
    const app = getApp();
    if (!app?.vc) return;

    const offState = app.vc.onState((payload) => setState(payload));
    const offFrame = app.vc.onFrame((message: VisualizerStreamFrame) => {
      const bins =
        message.frequency instanceof Uint8Array
          ? message.frequency
          : new Uint8Array(message.frequency);
      setFrequencyData((prev) => {
        const next = prev.length === bins.length ? prev : new Uint8Array(bins.length);
        next.set(bins);
        return next;
      });
      setFrame(Date.now());
      setCanvasFrame(message.canvasFrame ?? null);
    });

    const offHotkey = app.vc.onHotkey(({ action }: { action: VcHotkeyAction }) => {
      if (action === 'praise') {
        if (praiseBusyRef.current) return;
        praiseBusyRef.current = true;
        setPraiseToken((value) => value + 1);
        window.setTimeout(() => {
          praiseBusyRef.current = false;
        }, 3200);
        return;
      }

      if (action === 'debugOutlines') {
        setDebugOutlines((value) => !value);
        return;
      }

      const overlayMap: Partial<Record<VcHotkeyAction, VcOverlayId>> = {
        cover: 'cover',
        host: 'host',
        next: 'next',
        remaining: 'remaining',
        songInfo: 'songInfo',
        upcoming: 'upcoming',
      };
      const overlay = overlayMap[action];
      if (!overlay) return;

      setActiveOverlay((current) => {
        if (current === overlay) return null;
        if (CENTER_OVERLAYS.includes(overlay)) return overlay;
        return overlay;
      });
    });

    return () => {
      offState();
      offFrame();
      offHotkey();
    };
  }, []);

  return { state, frequencyData, frame, canvasFrame, activeOverlay, praiseToken, debugOutlines };
}

export function useCellClickCooldown(): () => boolean {
  const lastClickRef = useRef(0);
  return () => {
    const now = Date.now();
    if (now - lastClickRef.current < VC_CELL_CLICK_COOLDOWN_MS) return false;
    lastClickRef.current = now;
    return true;
  };
}
