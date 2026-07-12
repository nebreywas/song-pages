import type { PlaylistColumnId } from '@shared/listener/playlistColumnLayout';

/** CSS class for a playlist column id (duration uses col-duration). */
export function playlistColumnClassName(id: PlaylistColumnId): string {
  return id === 'duration' ? 'col-duration' : `col-${id}`;
}
