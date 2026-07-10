/**
 * Pointer + keyboard interaction for fullscreen VC layout mode.
 * Mirrors designer canvas behavior — move floats, resize floats, drag dividers, arrow nudge.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { applyDividerDrag, computeSurfaceLayout } from '@shared/vcSurface/geometry';
import {
  arrowKeyToDirection,
  directionDelta,
  dividerDeltaForDirection,
  findDividerKeyForAreaNudge,
  nudgeDivider,
  nudgeFloat,
  onePixelNorm,
} from '@shared/vcSurface/designerKeyboard';
import { applyFloatPointerDrag, resizeFloat } from '@shared/vcSurface/floats';
import type { VcModeConfig } from '@shared/vcModeTypes';

import { clientToNorm } from '../vc-mode/designer/designerPointer';

export type VcLayoutSelection =
  | { kind: 'area'; areaNumber: number }
  | { kind: 'float'; id: string }
  | null;

type DragState =
  | { type: 'divider'; key: string; pointerId: number }
  | {
      type: 'float-move';
      id: string;
      offsetX: number;
      offsetY: number;
      pointerId: number;
      startRotationDeg: number;
      startNormY: number;
    }
  | { type: 'float-resize'; id: string; pointerId: number }
  | null;

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true;
  return target.isContentEditable;
}

type UseVcLayoutInteractionOptions = {
  config: VcModeConfig;
  enabled: boolean;
  onChangeSurface: (patch: Partial<VcModeConfig['surface']>) => void;
};

export function useVcLayoutInteraction({
  config,
  enabled,
  onChangeSurface,
}: UseVcLayoutInteractionOptions) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  const onChangeSurfaceRef = useRef(onChangeSurface);
  const [selection, setSelection] = useState<VcLayoutSelection>(null);
  const [drag, setDrag] = useState<DragState>(null);

  configRef.current = config;
  onChangeSurfaceRef.current = onChangeSurface;

  const endDrag = useCallback(() => {
    setDrag(null);
  }, []);

  // Clear selection when layout mode exits.
  useEffect(() => {
    if (!enabled) {
      setSelection(null);
      setDrag(null);
    }
  }, [enabled]);

  // Window-level pointer listeners — keep drags alive when the cursor leaves a region.
  useEffect(() => {
    if (!enabled || !drag) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;

      const surface = surfaceRef.current;
      if (!surface) return;
      const current = configRef.current;
      const norm = clientToNorm(event, surface);

      if (drag.type === 'divider') {
        const currentLayout = computeSurfaceLayout(
          current.surface.templateId,
          current.surface.dividers,
        );
        const handle = currentLayout.dividers.find((d) => d.key === drag.key);
        const pointer = handle?.axis === 'vertical' ? norm.x : norm.y;
        onChangeSurfaceRef.current({
          dividers: applyDividerDrag(
            current.surface.templateId,
            current.surface.dividers,
            drag.key,
            pointer,
          ),
        });
        return;
      }

      if (drag.type === 'float-move') {
        const float = current.surface.floats.find((f) => f.id === drag.id);
        if (!float) return;
        const next = applyFloatPointerDrag(float, norm, drag, event.shiftKey);
        onChangeSurfaceRef.current({
          floats: current.surface.floats.map((f) => (f.id === drag.id ? next : f)),
        });
        return;
      }

      if (drag.type === 'float-resize') {
        const float = current.surface.floats.find((f) => f.id === drag.id);
        if (!float) return;
        const next = resizeFloat(float, norm.x - float.x, norm.y - float.y);
        onChangeSurfaceRef.current({
          floats: current.surface.floats.map((f) => (f.id === drag.id ? next : f)),
        });
      }
    };

    const onEnd = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [drag, enabled, endDrag]);

  const handleArrowNudge = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || !selection || drag || isEditableKeyTarget(event.target)) return;

      const direction = arrowKeyToDirection(event.key);
      if (!direction) return;

      const surface = surfaceRef.current;
      if (!surface) return;

      const rect = surface.getBoundingClientRect();
      const pixel = onePixelNorm({ widthPx: rect.width, heightPx: rect.height });
      const edgeEpsilon = Math.max(pixel.x, pixel.y, 0.0005);
      const current = configRef.current;

      if (selection.kind === 'float') {
        const float = current.surface.floats.find((f) => f.id === selection.id);
        if (!float) return;

        event.preventDefault();
        const delta = directionDelta(direction, pixel);
        const next = nudgeFloat(float, delta.x, delta.y);
        onChangeSurfaceRef.current({
          floats: current.surface.floats.map((f) => (f.id === selection.id ? next : f)),
        });
        return;
      }

      const layout = computeSurfaceLayout(current.surface.templateId, current.surface.dividers);
      const dividerKey = findDividerKeyForAreaNudge(
        layout,
        selection.areaNumber,
        direction,
        edgeEpsilon,
      );
      if (!dividerKey) return;

      event.preventDefault();
      const dividerDelta = dividerDeltaForDirection(direction, pixel);
      const dividers = nudgeDivider(
        current.surface.templateId,
        current.surface.dividers,
        dividerKey,
        dividerDelta,
      );
      onChangeSurfaceRef.current({ dividers });
    },
    [drag, enabled, selection],
  );

  useEffect(() => {
    if (!enabled || !selection) return;
    frameRef.current?.focus({ preventScroll: true });
  }, [enabled, selection]);

  const beginPointerDrag = useCallback((event: React.PointerEvent, nextDrag: DragState) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(nextDrag);
  }, []);

  return {
    surfaceRef,
    frameRef,
    selection,
    setSelection,
    drag,
    beginPointerDrag,
    cancelDrag: endDrag,
    handleArrowNudge,
  };
}
