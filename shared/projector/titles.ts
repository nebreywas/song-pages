/**
 * Canonical names for the secondary presentation window.
 * VC Mode keeps its own BrowserWindow; the visualizer window hosts Song Page / Visualizer / Video.
 */

export type ProjectorContentKind = 'song-page' | 'vc-mode' | 'visualizer' | 'video';

export const PROJECTOR_WINDOW_TITLES: Record<ProjectorContentKind, string> = {
  'song-page': 'Projector: Song Page',
  'vc-mode': 'Projector: VC Mode',
  visualizer: 'Projector: Visualizer',
  video: 'Projector: Video',
};

export function projectorTitleForKind(kind: ProjectorContentKind): string {
  return PROJECTOR_WINDOW_TITLES[kind];
}

/** Map IPC projection mode → window title kind (VC Mode uses the VC window). */
export function projectorKindFromProjectionMode(
  mode: 'page' | 'visualizer' | 'video' | null | undefined,
): ProjectorContentKind {
  if (mode === 'visualizer') return 'visualizer';
  if (mode === 'video') return 'video';
  return 'song-page';
}
