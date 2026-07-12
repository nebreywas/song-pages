export const PLAYLIST_COLUMN_LAYOUT_KEY = 'ui.listenerPlaylistColumns';

/** Fixed gutter between data columns — holds the drag handle. */
export const PLAYLIST_GRID_RESIZE_GUTTER_PX = 6;

/** Source column appears via CSS container query at this panel width. */
export const PLAYLIST_SOURCE_VISIBLE_MIN_PX = 560;

export type PlaylistColumnId =
  | 'order'
  | 'custom'
  | 'title'
  | 'artist'
  | 'album'
  | 'year'
  | 'source'
  | 'duration';

export type PlaylistLayoutProfile = 'catalog' | 'virtual' | 'virtualWithSource';

/** Fraction of total table width — all active columns sum to 1. */
export type PlaylistColumnRatios = Record<PlaylistColumnId, number>;

export type PlaylistColumnLayoutSettings = {
  catalog: Partial<PlaylistColumnRatios> | null;
  virtual: Partial<PlaylistColumnRatios> | null;
  virtualWithSource: Partial<PlaylistColumnRatios> | null;
};

export const DEFAULT_PLAYLIST_COLUMN_LAYOUT: PlaylistColumnLayoutSettings = {
  catalog: null,
  virtual: null,
  virtualWithSource: null,
};

/** Minimum pixel widths while resizing. */
export const MIN_PLAYLIST_COLUMN_PX: Record<PlaylistColumnId, number> = {
  order: 40,
  custom: 24,
  title: 72,
  artist: 64,
  album: 48,
  year: 36,
  source: 34,
  duration: 52,
};

/** Published defaults — derived from 960px reference table using rem + 70/15/15 title split. */
export const DEFAULT_COLUMN_RATIOS: Record<PlaylistLayoutProfile, PlaylistColumnRatios> = {
  catalog: {
    order: 0.0558,
    custom: 0.04,
    title: 0.584,
    artist: 0,
    album: 0.195,
    year: 0.0542,
    source: 0,
    duration: 0.0708,
  },
  virtual: {
    order: 0.0558,
    custom: 0.04,
    title: 0.5454,
    artist: 0.1169,
    album: 0.1169,
    year: 0.0542,
    source: 0,
    duration: 0.0708,
  },
  virtualWithSource: {
    order: 0.0558,
    custom: 0.04,
    title: 0.4492,
    artist: 0.0963,
    album: 0.0963,
    year: 0.0542,
    source: 0.1375,
    duration: 0.0708,
  },
};

export function playlistLayoutProfile(
  hasArtist: boolean,
  hasSourceCol: boolean,
  panelWidth: number,
): PlaylistLayoutProfile {
  if (!hasArtist) return 'catalog';
  if (hasSourceCol && panelWidth >= PLAYLIST_SOURCE_VISIBLE_MIN_PX) {
    return 'virtualWithSource';
  }
  return 'virtual';
}

export function playlistColumnOrder(profile: PlaylistLayoutProfile): PlaylistColumnId[] {
  switch (profile) {
    case 'catalog':
      return ['order', 'custom', 'title', 'album', 'year', 'duration'];
    case 'virtual':
      return ['order', 'custom', 'title', 'artist', 'album', 'year', 'duration'];
    case 'virtualWithSource':
      return ['order', 'custom', 'title', 'artist', 'album', 'year', 'source', 'duration'];
  }
}

function isFiniteRatio(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function normalizePlaylistColumnRatios(
  ratios: Partial<PlaylistColumnRatios>,
  profile: PlaylistLayoutProfile,
): PlaylistColumnRatios {
  const defaults = DEFAULT_COLUMN_RATIOS[profile];
  const order = playlistColumnOrder(profile);
  const picked: Partial<PlaylistColumnRatios> = {};

  for (const id of order) {
    const candidate = ratios[id];
    picked[id] = isFiniteRatio(candidate) ? candidate : defaults[id];
  }

  const sum = order.reduce((total, id) => total + (picked[id] ?? 0), 0);
  if (sum <= 0) return { ...defaults };

  const normalized = { ...defaults };
  for (const id of order) {
    normalized[id] = (picked[id] ?? 0) / sum;
  }
  return normalized;
}

export function resolvePlaylistColumnRatios(
  settings: PlaylistColumnLayoutSettings | null | undefined,
  profile: PlaylistLayoutProfile,
): PlaylistColumnRatios {
  const saved = settings?.[profile];
  if (saved) return normalizePlaylistColumnRatios(saved, profile);
  // Wide custom playlists add Source — reuse virtual ratios until the user resizes that layout.
  if (profile === 'virtualWithSource' && settings?.virtual) {
    return normalizePlaylistColumnRatios(settings.virtual, profile);
  }
  return { ...DEFAULT_COLUMN_RATIOS[profile] };
}

export function ratiosToColumnWidths(
  tableWidth: number,
  ratios: PlaylistColumnRatios,
  profile: PlaylistLayoutProfile,
): Record<PlaylistColumnId, number> {
  const order = playlistColumnOrder(profile);
  const normalized = normalizePlaylistColumnRatios(ratios, profile);
  const widths = { ...DEFAULT_COLUMN_RATIOS[profile] };

  let assigned = 0;
  for (let index = 0; index < order.length; index += 1) {
    const id = order[index]!;
    if (index === order.length - 1) {
      widths[id] = Math.max(MIN_PLAYLIST_COLUMN_PX[id], tableWidth - assigned);
    } else {
      const width = Math.round(tableWidth * normalized[id]);
      widths[id] = width;
      assigned += width;
    }
  }

  return widths;
}

/** Nudge the last column so pixel widths exactly fill the data area. */
export function syncColumnWidthsToPanel(
  widths: Record<string, number>,
  dataAreaWidth: number,
  profile: PlaylistLayoutProfile,
): Record<string, number> {
  const order = playlistColumnOrder(profile);
  const next: Record<string, number> = {};

  for (const id of order) {
    next[id] = widths[id] ?? MIN_PLAYLIST_COLUMN_PX[id];
  }

  if (dataAreaWidth <= 0) return next;

  const sum = order.reduce((total, id) => total + next[id]!, 0);
  const lastId = order[order.length - 1]!;
  const adjusted = next[lastId]! + (dataAreaWidth - sum);
  next[lastId] = Math.max(MIN_PLAYLIST_COLUMN_PX[lastId], adjusted);

  return next;
}

/** Sum of data column widths plus resize gutters. */
export function playlistGridTotalWidth(
  order: readonly PlaylistColumnId[],
  widths: Record<PlaylistColumnId, number>,
): number {
  const dataSum = order.reduce((total, id) => total + (widths[id] ?? 0), 0);
  return dataSum + Math.max(0, order.length - 1) * PLAYLIST_GRID_RESIZE_GUTTER_PX;
}

/**
 * Keep the grid inside the panel. Title flexes via CSS 1fr; shrink fixed columns when needed.
 * Duration is shrunk last so Length stays visible.
 */
export function fitColumnWidthsToPanel(
  widths: Record<string, number>,
  panelWidth: number,
  profile: PlaylistLayoutProfile,
): Record<string, number> {
  const order = playlistColumnOrder(profile);
  const dataArea = playlistDataAreaWidth(panelWidth, order.length);
  const next: Record<string, number> = {};

  for (const id of order) {
    next[id] = Math.max(MIN_PLAYLIST_COLUMN_PX[id], widths[id] ?? MIN_PLAYLIST_COLUMN_PX[id]);
  }

  const fixedIds = order.filter((id) => id !== 'title');
  const fixedSum = () => fixedIds.reduce((total, id) => total + next[id]!, 0);

  if (fixedSum() <= dataArea) {
    next.title = Math.max(MIN_PLAYLIST_COLUMN_PX.title, dataArea - fixedSum());
    return next;
  }

  let overflow = fixedSum() - dataArea;
  const shrinkOrder: PlaylistColumnId[] = [
    'album',
    'artist',
    'source',
    'year',
    'order',
    'custom',
    'duration',
  ];

  for (const id of shrinkOrder) {
    if (!fixedIds.includes(id)) continue;
    const room = next[id]! - MIN_PLAYLIST_COLUMN_PX[id];
    if (room <= 0) continue;
    const take = Math.min(room, overflow);
    next[id]! -= take;
    overflow -= take;
    if (overflow <= 0) break;
  }

  next.title = MIN_PLAYLIST_COLUMN_PX.title;
  return next;
}

/** Scale persisted pixel widths when the panel grows or shrinks (after a user resize). */
export function scaleColumnWidthsToPanel(
  widths: Record<string, number>,
  panelWidth: number,
  profile: PlaylistLayoutProfile,
): Record<string, number> {
  const order = playlistColumnOrder(profile);
  const dataWidth = playlistDataAreaWidth(panelWidth, order.length);
  const sum = order.reduce((total, id) => total + (widths[id] ?? 0), 0);
  if (dataWidth <= 0 || sum <= 0) {
    return syncColumnWidthsToPanel(widths, dataWidth, profile);
  }

  const scale = dataWidth / sum;
  const next: Record<string, number> = {};
  for (const id of order) {
    next[id] = Math.max(MIN_PLAYLIST_COLUMN_PX[id], Math.round((widths[id] ?? 0) * scale));
  }
  return fitColumnWidthsToPanel(next, panelWidth, profile);
}

export function activeWidthsToRatios(
  widths: Record<PlaylistColumnId, number>,
  profile: PlaylistLayoutProfile,
): PlaylistColumnRatios {
  const order = playlistColumnOrder(profile);
  const sum = order.reduce((total, id) => total + (widths[id] ?? 0), 0);
  if (sum <= 0) return { ...DEFAULT_COLUMN_RATIOS[profile] };

  const ratios = { ...DEFAULT_COLUMN_RATIOS[profile] };
  for (const id of order) {
    ratios[id] = (widths[id] ?? 0) / sum;
  }
  return ratios;
}

/** Migrate legacy settings that only stored title/artist/album flex ratios. */
function migrateLegacyFlexRatios(
  legacy: { title: number; artist?: number; album: number },
  hasArtist: boolean,
): Partial<PlaylistColumnRatios> | null {
  if (!isFiniteRatio(legacy.title) || !isFiniteRatio(legacy.album)) return null;
  if (hasArtist && !isFiniteRatio(legacy.artist)) return null;

  const defaults = hasArtist ? DEFAULT_COLUMN_RATIOS.virtual : DEFAULT_COLUMN_RATIOS.catalog;
  const flexSum = legacy.title + legacy.album + (legacy.artist ?? 0);
  if (flexSum <= 0) return null;

  const fixedSum =
    defaults.order + defaults.custom + defaults.year + defaults.duration + (defaults.source ?? 0);
  const flexShare = Math.max(0, 1 - fixedSum);

  return {
    order: defaults.order,
    custom: defaults.custom,
    title: (legacy.title / flexSum) * flexShare,
    artist: hasArtist ? ((legacy.artist ?? 0) / flexSum) * flexShare : 0,
    album: (legacy.album / flexSum) * flexShare,
    year: defaults.year,
    source: defaults.source,
    duration: defaults.duration,
  };
}

export function normalizePlaylistColumnLayoutSettings(value: unknown): PlaylistColumnLayoutSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PLAYLIST_COLUMN_LAYOUT };
  }

  const raw = value as Record<string, unknown>;

  if ('catalog' in raw || 'virtual' in raw || 'virtualWithSource' in raw) {
    return {
      catalog:
        raw.catalog && typeof raw.catalog === 'object'
          ? normalizePlaylistColumnRatios(raw.catalog as Partial<PlaylistColumnRatios>, 'catalog')
          : null,
      virtual:
        raw.virtual && typeof raw.virtual === 'object'
          ? normalizePlaylistColumnRatios(raw.virtual as Partial<PlaylistColumnRatios>, 'virtual')
          : null,
      virtualWithSource:
        raw.virtualWithSource && typeof raw.virtualWithSource === 'object'
          ? normalizePlaylistColumnRatios(
              raw.virtualWithSource as Partial<PlaylistColumnRatios>,
              'virtualWithSource',
            )
          : null,
    };
  }

  // Legacy ui.listenerPlaylistColumns shape: { withArtist, noArtist }
  const legacyWithArtist = raw.withArtist;
  const legacyNoArtist = raw.noArtist;

  return {
    catalog:
      legacyNoArtist && typeof legacyNoArtist === 'object'
        ? normalizePlaylistColumnRatios(
            migrateLegacyFlexRatios(legacyNoArtist as { title: number; album: number }, false) ??
              (legacyNoArtist as Partial<PlaylistColumnRatios>),
            'catalog',
          )
        : null,
    virtual:
      legacyWithArtist && typeof legacyWithArtist === 'object'
        ? normalizePlaylistColumnRatios(
            migrateLegacyFlexRatios(
              legacyWithArtist as { title: number; artist?: number; album: number },
              true,
            ) ?? (legacyWithArtist as Partial<PlaylistColumnRatios>),
            'virtual',
          )
        : null,
    virtualWithSource: null,
  };
}

export function columnWidthsToSizingState(
  widths: Record<PlaylistColumnId, number>,
  profile: PlaylistLayoutProfile,
): Record<string, number> {
  const sizing: Record<string, number> = {};
  for (const id of playlistColumnOrder(profile)) {
    sizing[id] = widths[id] ?? MIN_PLAYLIST_COLUMN_PX[id];
  }
  return sizing;
}

export function columnSizingStateToWidths(
  sizing: Record<string, number>,
  profile: PlaylistLayoutProfile,
): Record<PlaylistColumnId, number> {
  const widths = { ...MIN_PLAYLIST_COLUMN_PX };
  for (const id of playlistColumnOrder(profile)) {
    const value = sizing[id];
    widths[id] =
      typeof value === 'number' && Number.isFinite(value) && value > 0
        ? value
        : MIN_PLAYLIST_COLUMN_PX[id];
  }
  return widths;
}

/** Panel width minus resize gutters — used for ratio → px column sizing. */
export function playlistDataAreaWidth(panelWidth: number, columnCount: number): number {
  const gutterTotal = Math.max(0, columnCount - 1) * PLAYLIST_GRID_RESIZE_GUTTER_PX;
  return Math.max(0, panelWidth - gutterTotal);
}

/** CSS grid-template-columns — Title uses 1fr so it absorbs slack; Length stays pinned at the end. */
export function playlistGridTemplateColumns(
  order: readonly PlaylistColumnId[],
  widths: Record<PlaylistColumnId, number>,
): string {
  return order
    .map((id, index) => {
      const gutter = index < order.length - 1 ? ` ${PLAYLIST_GRID_RESIZE_GUTTER_PX}px` : '';
      if (id === 'title') {
        return `minmax(${MIN_PLAYLIST_COLUMN_PX.title}px, 1fr)${gutter}`;
      }
      const px = Math.max(MIN_PLAYLIST_COLUMN_PX[id], widths[id] ?? MIN_PLAYLIST_COLUMN_PX[id]);
      // Duration must fit the "Length" header label inside the track.
      if (id === 'duration') {
        return `minmax(${MIN_PLAYLIST_COLUMN_PX.duration}px, ${px}px)${gutter}`;
      }
      return `${px}px${gutter}`;
    })
    .join(' ');
}

/** CSS variables for fixed columns — TanStack-style single upfront sizing pass. */
export function playlistGridCssVariables(
  order: readonly PlaylistColumnId[],
  widths: Record<PlaylistColumnId, number>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const id of order) {
    if (id === 'title') continue;
    vars[`--playlist-col-${id}`] = `${Math.max(
      MIN_PLAYLIST_COLUMN_PX[id],
      widths[id] ?? MIN_PLAYLIST_COLUMN_PX[id],
    )}px`;
  }
  return vars;
}

export type PlaylistGridSlot =
  | { kind: 'column'; id: PlaylistColumnId }
  | { kind: 'gutter'; left: PlaylistColumnId; right: PlaylistColumnId };

/** Header/body slot order: data column, gutter, data column, … */
export function playlistGridSlots(order: readonly PlaylistColumnId[]): PlaylistGridSlot[] {
  const slots: PlaylistGridSlot[] = [];
  for (let index = 0; index < order.length; index += 1) {
    const id = order[index]!;
    slots.push({ kind: 'column', id });
    const right = order[index + 1];
    if (right) slots.push({ kind: 'gutter', left: id, right });
  }
  return slots;
}

export function playlistColumnResizeLabel(left: PlaylistColumnId, right: PlaylistColumnId): string {
  const labels: Record<PlaylistColumnId, string> = {
    order: '#',
    custom: 'custom order',
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 'Year',
    source: 'Source',
    duration: 'Length',
  };
  return `Resize ${labels[left]} and ${labels[right]} columns`;
}
