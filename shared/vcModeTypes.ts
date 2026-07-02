/** VC Mode — listening party visual mixer types (shared main ↔ VC window). */

export type VcGridStyle = 'full' | 'quarters' | 'halves-vertical' | 'main-plus-2';

export type VcCellContent = '' | 'visualizer' | 'cover' | 'lyrics' | 'about' | 'artist' | 'host';

export type VcCycleTime = 'click' | 10 | 15 | 20 | 30 | 45 | 60;

export type VcCellAssignment = {
  slotA: VcCellContent;
  slotB: VcCellContent;
  /** Required when both slots are set; null when blank or single slot only. */
  cycleTime: VcCycleTime | null;
};

export type VcModeConfig = {
  gridStyle: VcGridStyle;
  cells: VcCellAssignment[];
  visualizerId: string;
  hostGraphicPath: string | null;
};

export type VcPlaybackState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

export type VcSongPayload = {
  id: number;
  title: string;
  artist: string;
  year: string | null;
  caption: string | null;
  coverUrl: string | null;
  about: string;
  lyrics: string;
  artistId: number;
};

export type VcUpcomingSong = {
  id: number;
  title: string;
  artist: string;
  durationSeconds: number | null;
};

export type VcOverlayId = 'cover' | 'host' | 'next' | 'songInfo' | 'upcoming' | 'remaining';

export type VcStatePayload = {
  config: VcModeConfig;
  playback: VcPlaybackState;
  currentSong: VcSongPayload | null;
  nextSong: { title: string; artist: string } | null;
  upcoming: VcUpcomingSong[];
  hostGraphicUrl: string | null;
  artistName: string | null;
  artistBio: string | null;
  artistPhotoUrl: string | null;
};

export type VcHotkeyAction = 'cover' | 'host' | 'next' | 'praise' | 'remaining' | 'songInfo' | 'upcoming';

export const VC_SETTINGS_KEY = 'vc.lastConfig';

export const VC_CONTENT_LABELS: Record<VcCellContent, string> = {
  '': '(blank)',
  visualizer: 'Visualizer',
  cover: 'Cover',
  lyrics: 'Lyrics',
  about: 'About song',
  artist: 'Artist',
  host: 'VC Host graphic',
};

export const VC_CYCLE_OPTIONS: Array<{ value: VcCycleTime; label: string }> = [
  { value: 'click', label: 'Click' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
];

export function cellCountForGrid(style: VcGridStyle): number {
  switch (style) {
    case 'full':
      return 1;
    case 'halves-vertical':
      return 2;
    case 'main-plus-2':
      return 3;
    case 'quarters':
      return 4;
    default:
      return 1;
  }
}

export function defaultCellsForGrid(style: VcGridStyle): VcCellAssignment[] {
  return Array.from({ length: cellCountForGrid(style) }, () => ({
    slotA: '',
    slotB: '',
    cycleTime: null,
  }));
}

export function normalizeVcConfig(config: VcModeConfig): VcModeConfig {
  const count = cellCountForGrid(config.gridStyle);
  const cells = config.cells.slice(0, count);
  while (cells.length < count) {
    cells.push({ slotA: '', slotB: '', cycleTime: null });
  }
  return { ...config, cells };
}

/** Only one grid cell may use the visualizer content type. */
export function assignVisualizerToCell(
  cells: VcCellAssignment[],
  cellIndex: number,
  slot: 'slotA' | 'slotB',
): VcCellAssignment[] {
  return cells.map((cell, index) => {
    const next = { ...cell };
    if (index !== cellIndex) {
      if (next.slotA === 'visualizer') next.slotA = '';
      if (next.slotB === 'visualizer') next.slotB = '';
    }
    return next;
  });
}

export function resolveCellCycleTime(cell: VcCellAssignment): VcCycleTime | null {
  const hasA = cell.slotA !== '';
  const hasB = cell.slotB !== '';
  if (!hasA && !hasB) return null;
  if (hasA !== hasB) return null;
  return cell.cycleTime;
}
