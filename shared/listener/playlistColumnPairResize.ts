import {
  MIN_PLAYLIST_COLUMN_PX,
  playlistColumnOrder,
  type PlaylistColumnId,
  type PlaylistLayoutProfile,
} from './playlistColumnLayout';

/** Clamp a left/right column pair so neither drops below its minimum width. */
export function clampPlaylistColumnPair(
  left: number,
  right: number,
  leftId: PlaylistColumnId,
  rightId: PlaylistColumnId,
): [number, number] {
  const minLeft = MIN_PLAYLIST_COLUMN_PX[leftId];
  const minRight = MIN_PLAYLIST_COLUMN_PX[rightId];

  let nextLeft = left;
  let nextRight = right;

  if (nextLeft < minLeft) {
    nextRight -= minLeft - nextLeft;
    nextLeft = minLeft;
  }
  if (nextRight < minRight) {
    nextLeft -= minRight - nextRight;
    nextRight = minRight;
  }

  return [Math.max(minLeft, nextLeft), Math.max(minRight, nextRight)];
}

function sizingWidth(
  sizing: Record<string, number>,
  id: PlaylistColumnId,
): number {
  const value = sizing[id];
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : MIN_PLAYLIST_COLUMN_PX[id];
}

/**
 * Apply a resize delta to the dragged column and its right neighbor only.
 * TanStack scales every column proportionally — we ignore that and trade width pairwise.
 */
export function applyPairResizeToSizing(
  previous: Record<string, number>,
  resizingColumnId: PlaylistColumnId,
  delta: number,
  profile: PlaylistLayoutProfile,
): Record<string, number> {
  const order = playlistColumnOrder(profile);
  const next: Record<string, number> = {};

  for (const id of order) {
    next[id] = sizingWidth(previous, id);
  }

  if (!order.includes(resizingColumnId) || delta === 0) return next;

  const rightId = order[order.indexOf(resizingColumnId) + 1];
  if (!rightId) return next;

  const [leftWidth, rightWidth] = clampPlaylistColumnPair(
    next[resizingColumnId]! + delta,
    next[rightId]! - delta,
    resizingColumnId,
    rightId,
  );

  next[resizingColumnId] = leftWidth;
  next[rightId] = rightWidth;
  return next;
}

/** Live widths while dragging — applies pair clamp to the active resize handle. */
export function resolvePreviewColumnWidths(
  sizing: Record<string, number>,
  profile: PlaylistLayoutProfile,
  resizingColumnId: string | false,
  startSize: number | undefined,
  deltaOffset: number | undefined,
): Record<string, number> {
  const order = playlistColumnOrder(profile);
  const widths: Record<string, number> = {};

  for (const id of order) {
    widths[id] = sizingWidth(sizing, id);
  }

  if (!resizingColumnId || deltaOffset == null) return widths;

  const leftId = resizingColumnId as PlaylistColumnId;
  if (!order.includes(leftId)) return widths;

  const rightId = order[order.indexOf(leftId) + 1];
  if (!rightId) return widths;

  const startLeft = startSize ?? widths[leftId]!;
  const startRight = widths[rightId]!;
  const [leftWidth, rightWidth] = clampPlaylistColumnPair(
    startLeft + deltaOffset,
    startRight - deltaOffset,
    leftId,
    rightId,
  );

  widths[leftId] = leftWidth;
  widths[rightId] = rightWidth;
  return widths;
}
