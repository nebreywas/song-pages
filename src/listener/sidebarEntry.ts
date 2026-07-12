import type { ArtistRow } from '../types/app';
import { isLikedSongsArtist } from './likedSongs';
import { isUserPlaylistArtistId } from '@shared/listener/userPlaylists';

/** Sidebar library entry classification shown in the Type column. */
export type SidebarEntryType = 'artist' | 'liked' | 'playlist';

export function sidebarEntryType(artist: ArtistRow): SidebarEntryType {
  if (isLikedSongsArtist(artist.id)) return 'liked';
  if (isUserPlaylistArtistId(artist.id)) return 'playlist';
  return 'artist';
}

export function sidebarEntryTypeLabel(type: SidebarEntryType): string {
  return sidebarEntryTypeLabelLong(type);
}

export function sidebarEntryTypeLabelLong(type: SidebarEntryType): string {
  switch (type) {
    case 'artist':
      return 'Artist Pages';
    case 'liked':
      return '';
    case 'playlist':
      return 'Playlist';
  }
}

export function sidebarEntryTypeLabelShort(type: SidebarEntryType): string {
  switch (type) {
    case 'artist':
      return 'AP';
    case 'liked':
      return '';
    case 'playlist':
      return 'PL';
  }
}

/** Accessible row label for sidebar library entries. */
export function sidebarLibraryRowLabel(
  artistName: string,
  type: SidebarEntryType,
  songCount: number,
): string {
  const typeLabel = sidebarEntryTypeLabelLong(type);
  if (!typeLabel) {
    return `${artistName} · ${songCount}`;
  }
  return `${artistName} · ${typeLabel} · ${songCount}`;
}

/** User playlists can be deleted from the sidebar. */
export function isRemovableSidebarPlaylist(type: SidebarEntryType): boolean {
  return type === 'playlist';
}

export function isRenamableSidebarPlaylist(type: SidebarEntryType): boolean {
  return type === 'playlist';
}

/** Sidebar rows that support the playlist context menu (not artists or Liked Songs). */
export function isSidebarPlaylistContextTarget(type: SidebarEntryType): boolean {
  return isRemovableSidebarPlaylist(type);
}

/** Liked Songs, Suno, and custom playlists — not subscribed artist catalogs. */
export function isSidebarPlaylistEntry(type: SidebarEntryType): boolean {
  return type !== 'artist';
}
