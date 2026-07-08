import type { ArtistRow } from '../types/app';
import { isLikedSongsArtist } from './likedSongs';
import { isSunoDemoArtistId } from '@shared/demo/sunoDemoFeature';
import { isUserPlaylistArtistId } from '@shared/listener/userPlaylists';

/** Sidebar library entry classification shown in the Type column. */
export type SidebarEntryType = 'artist' | 'playlist' | 'suno' | 'custom';

export function sidebarEntryType(artist: ArtistRow): SidebarEntryType {
  if (isLikedSongsArtist(artist.id)) return 'playlist';
  if (isUserPlaylistArtistId(artist.id)) return 'custom';
  if (isSunoDemoArtistId(artist.id)) return 'suno';
  return 'artist';
}

export function sidebarEntryTypeLabel(type: SidebarEntryType): string {
  switch (type) {
    case 'artist':
      return 'Artist';
    case 'playlist':
      return 'Playlist';
    case 'suno':
      return 'Suno';
    case 'custom':
      return 'Custom';
  }
}

/** Suno and custom playlists can be deleted from the sidebar. */
export function isRemovableSidebarPlaylist(type: SidebarEntryType): boolean {
  return type === 'suno' || type === 'custom';
}

/** Suno and custom playlists can be renamed from the sidebar. */
export function isRenamableSidebarPlaylist(type: SidebarEntryType): boolean {
  return type === 'suno' || type === 'custom';
}

/** Sidebar rows that support the playlist context menu (not artists or Liked Songs). */
export function isSidebarPlaylistContextTarget(type: SidebarEntryType): boolean {
  return isRemovableSidebarPlaylist(type);
}
