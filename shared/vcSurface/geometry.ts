/**
 * Resolve template + divider percentages into absolute area rectangles (0–1 surface space).
 */

import { VC_MIN_BASE_AREA } from './constants';
import {
  defaultDividersForTemplate,
  getTemplate,
  type VcSplitNode,
  type VcTemplateId,
} from './templates';

export type VcRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VcAreaRect = VcRect & { areaNumber: number };

export type VcDividerHandle = {
  key: string;
  axis: 'horizontal' | 'vertical';
  /** Position of the divider line in surface space (0–1). */
  position: number;
  /** Bounds of the parent region this divider splits. */
  region: VcRect;
  /** Minimum and maximum legal positions for this divider. */
  min: number;
  max: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp divider values so each segment along a multi-split is at least VC_MIN_BASE_AREA.
 * Positions are cumulative along the parent axis.
 */
export function clampDividerPositions(
  positions: number[],
  minSize: number = VC_MIN_BASE_AREA,
): number[] {
  const count = positions.length;
  if (count === 0) return [];

  const segments = count + 1;
  const minTotal = minSize * segments;
  if (minTotal >= 1) {
    // Degenerate: distribute evenly.
    return Array.from({ length: count }, (_, i) => (i + 1) / segments);
  }

  const result = positions.map((p) => clamp(p, 0, 1));
  result.sort((a, b) => a - b);

  // Enforce minimum gaps from edges and between dividers.
  for (let i = 0; i < count; i += 1) {
    const minPos = minSize * (i + 1);
    const maxPos = 1 - minSize * (count - i);
    result[i] = clamp(result[i], minPos, maxPos);
  }

  // Second pass: ensure adjacent gaps.
  for (let i = 1; i < count; i += 1) {
    if (result[i] - result[i - 1] < minSize) {
      result[i] = result[i - 1] + minSize;
    }
  }
  for (let i = count - 2; i >= 0; i -= 1) {
    if (result[i + 1] - result[i] < minSize) {
      result[i] = result[i + 1] - minSize;
    }
  }

  return result.map((p) => clamp(p, minSize, 1 - minSize));
}

/** Merge stored dividers with template defaults, clamping invalid values. */
export function resolveDividers(
  templateId: VcTemplateId | string,
  stored: Record<string, number> | undefined,
): Record<string, number> {
  const defaults = defaultDividersForTemplate(templateId);
  const template = getTemplate(templateId);
  const merged: Record<string, number> = { ...defaults };

  if (stored) {
    for (const [key, value] of Object.entries(stored)) {
      if (key in defaults && typeof value === 'number' && Number.isFinite(value)) {
        merged[key] = value;
      }
    }
  }

  // Re-clamp each split group using the tree structure.
  const walk = (node: VcSplitNode) => {
    if (node.type === 'area') return;
    const positions = node.dividerKeys.map((key, i) => merged[key] ?? node.defaults[i] ?? 0.5);
    const clamped = clampDividerPositions(positions);
    node.dividerKeys.forEach((key, i) => {
      merged[key] = clamped[i];
    });
    node.children.forEach(walk);
  };
  walk(template.root);

  return merged;
}

function layoutNode(
  node: VcSplitNode,
  region: VcRect,
  dividers: Record<string, number>,
  areas: VcAreaRect[],
  handles: VcDividerHandle[],
): void {
  if (node.type === 'area') {
    areas.push({ areaNumber: node.areaNumber, ...region });
    return;
  }

  const positions = clampDividerPositions(
    node.dividerKeys.map((key, i) => dividers[key] ?? node.defaults[i] ?? 0.5),
  );

  // Write clamped values back so shared keys stay consistent within this pass.
  node.dividerKeys.forEach((key, i) => {
    dividers[key] = positions[i];
  });

  const edges = [0, ...positions, 1];
  const isVertical = node.axis === 'vertical';

  for (let i = 0; i < node.children.length; i += 1) {
    const start = edges[i];
    const end = edges[i + 1];
    const childRegion: VcRect = isVertical
      ? {
          x: region.x + start * region.width,
          y: region.y,
          width: (end - start) * region.width,
          height: region.height,
        }
      : {
          x: region.x,
          y: region.y + start * region.height,
          width: region.width,
          height: (end - start) * region.height,
        };
    layoutNode(node.children[i], childRegion, dividers, areas, handles);
  }

  // One handle per divider key in this split (dedupe shared keys later).
  for (let i = 0; i < node.dividerKeys.length; i += 1) {
    const key = node.dividerKeys[i];
    const pos = positions[i];
    const minSize = VC_MIN_BASE_AREA;
    const min = minSize * (i + 1);
    const max = 1 - minSize * (node.dividerKeys.length - i);

    // Absolute position on the surface for the divider line.
    const absolute = isVertical
      ? region.x + pos * region.width
      : region.y + pos * region.height;

    handles.push({
      key,
      axis: node.axis,
      position: absolute,
      region,
      min: isVertical ? region.x + min * region.width : region.y + min * region.height,
      max: isVertical ? region.x + max * region.width : region.y + max * region.height,
    });
  }
}

export type VcSurfaceLayout = {
  areas: VcAreaRect[];
  /** Unique divider handles (shared keys appear once, using first occurrence region). */
  dividers: VcDividerHandle[];
  resolvedDividers: Record<string, number>;
};

/** Compute area rectangles and divider handles for a template + divider map. */
export function computeSurfaceLayout(
  templateId: VcTemplateId | string,
  storedDividers?: Record<string, number>,
): VcSurfaceLayout {
  const template = getTemplate(templateId);
  const resolvedDividers = resolveDividers(templateId, storedDividers);
  const areas: VcAreaRect[] = [];
  const handles: VcDividerHandle[] = [];

  layoutNode(
    template.root,
    { x: 0, y: 0, width: 1, height: 1 },
    resolvedDividers,
    areas,
    handles,
  );

  // Prefer first handle per key (shared dividers in Quad).
  const seen = new Set<string>();
  const uniqueHandles: VcDividerHandle[] = [];
  for (const handle of handles) {
    if (seen.has(handle.key)) continue;
    seen.add(handle.key);
    uniqueHandles.push(handle);
  }

  areas.sort((a, b) => a.areaNumber - b.areaNumber);

  return { areas, dividers: uniqueHandles, resolvedDividers };
}

/**
 * Convert a drag on a divider handle into an updated divider map.
 * `pointerNorm` is the pointer position along the divider axis in surface space (0–1).
 */
export function applyDividerDrag(
  templateId: VcTemplateId | string,
  dividers: Record<string, number>,
  key: string,
  pointerNorm: number,
): Record<string, number> {
  const layout = computeSurfaceLayout(templateId, dividers);
  const handle = layout.dividers.find((d) => d.key === key);
  if (!handle) return layout.resolvedDividers;

  const { region, axis } = handle;
  const local =
    axis === 'vertical'
      ? (pointerNorm - region.x) / Math.max(region.width, 1e-6)
      : (pointerNorm - region.y) / Math.max(region.height, 1e-6);

  const template = getTemplate(templateId);
  // Find the split that owns this key and clamp within that group.
  let next = { ...layout.resolvedDividers, [key]: clamp(local, 0, 1) };

  const walk = (node: VcSplitNode) => {
    if (node.type === 'area') return;
    if (node.dividerKeys.includes(key)) {
      const positions = node.dividerKeys.map((k, i) => next[k] ?? node.defaults[i] ?? 0.5);
      const clamped = clampDividerPositions(positions);
      node.dividerKeys.forEach((k, i) => {
        next[k] = clamped[i];
      });
      return;
    }
    node.children.forEach(walk);
  };
  walk(template.root);

  return resolveDividers(templateId, next);
}
