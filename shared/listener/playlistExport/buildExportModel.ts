import { formatPlaylistCreatedDate } from '../formatPlaylistCreatedDate';
import { formatTime } from '../formatTime';
import { shareableSongLink } from '../shareableSongLink';

import { orderSongsForPlaylistExport } from './orderForExport';
import type { PlaylistExportModel, PlaylistExportSongInput } from './types';

export const DEFAULT_PLAYLIST_EXPORT_INTRODUCTION = `Hi,

Here's a playlist I thought you might enjoy.`;

export const PLAYLIST_EXPORT_ATTRIBUTION = 'This playlist was created with Song Pages';

const UNKNOWN_TRACK_TITLE = 'Unknown Track Name';
const UNKNOWN_ARTIST_NAME = 'Name Unknown';

type BuildPlaylistExportModelInput = {
  playlistName: string;
  introduction?: string;
  createdAt: string | null | undefined;
  songs: PlaylistExportSongInput[];
  customOrderIds?: number[] | null;
};

/** Gather neutral export data — renderers format this for clipboard output. */
export function buildPlaylistExportModel(input: BuildPlaylistExportModelInput): PlaylistExportModel {
  const ordered = orderSongsForPlaylistExport(input.songs, input.customOrderIds);
  const created = formatPlaylistCreatedDate(input.createdAt);

  return {
    playlistName: input.playlistName.trim() || 'Untitled Playlist',
    introduction: input.introduction?.trim() ?? DEFAULT_PLAYLIST_EXPORT_INTRODUCTION,
    createdDateLabel: created ? `Created ${created}` : null,
    trackCount: ordered.length,
    tracks: ordered.map((song) => ({
      title: song.title?.trim() || UNKNOWN_TRACK_TITLE,
      artistName: song.artist_name?.trim() || UNKNOWN_ARTIST_NAME,
      album: song.album?.trim() || null,
      year: song.year?.trim() || null,
      length:
        song.duration_seconds != null && song.duration_seconds > 0
          ? formatTime(song.duration_seconds)
          : null,
      url: (() => {
        try {
          const link = shareableSongLink(song);
          return link.trim() || null;
        } catch {
          return null;
        }
      })(),
    })),
    attribution: PLAYLIST_EXPORT_ATTRIBUTION,
  };
}
