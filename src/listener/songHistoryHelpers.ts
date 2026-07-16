import type { ArtistRow, SongRow } from '../types/app';
import type { OnDeckTrack } from '@shared/playback/detours/state';
import {
  normalizeSongHistoryEntry,
  type SongHistoryEntry,
  type SongHistoryPlaybackType,
  type SongHistoryStartInput,
} from '@shared/listener/songHistory';
import { getVcSurfaceDesignPickerState } from '../vc-mode/vcSurfaceDesignStore';

export type PlayHistoryContext = {
  playlistId: number | null;
  playlistName: string | null;
  playbackType: SongHistoryPlaybackType;
  interruptedPrevious?: boolean;
};

export type PlaySongHistoryOptions = {
  detour?: boolean;
  role?: 'primary' | 'on-deck' | 'play-now';
  historyContext?: PlayHistoryContext;
};

export function resolveVcHistoryLabel(vcOpen: boolean): string | null {
  if (!vcOpen) return null;
  const picker = getVcSurfaceDesignPickerState();
  if (!picker) return 'Yes';
  const active = picker.designs.find((design) => design.id === picker.activeDesignId);
  return active?.name?.trim() || 'Yes';
}

export function resolvePlayHistoryContext(
  song: SongRow,
  options: PlaySongHistoryOptions,
  deps: {
    selectedArtistId: number | null;
    artists: readonly ArtistRow[];
    onDeckMeta: OnDeckTrack | null;
    primaryPlaylistId: number | null;
  },
): PlayHistoryContext {
  if (options.historyContext) return options.historyContext;

  if (options.detour && options.role === 'on-deck' && deps.onDeckMeta) {
    return {
      playlistId: deps.onDeckMeta.artistId,
      playlistName: deps.onDeckMeta.playlistName,
      playbackType: 'on-deck',
    };
  }

  if (options.detour && options.role === 'play-now') {
    const playlistId = deps.selectedArtistId ?? song.artist_id ?? null;
    return {
      playlistId,
      playlistName: playlistNameForArtistId(playlistId, deps.artists),
      playbackType: 'play-now',
      interruptedPrevious: true,
    };
  }

  const playlistId = deps.primaryPlaylistId ?? deps.selectedArtistId;
  return {
    playlistId: playlistId ?? null,
    playlistName: playlistNameForArtistId(playlistId ?? null, deps.artists),
    playbackType: 'normal',
  };
}

function playlistNameForArtistId(
  playlistId: number | null,
  artists: readonly ArtistRow[],
): string | null {
  if (playlistId == null) return 'Direct Play';
  return artists.find((artist) => artist.id === playlistId)?.artist_name ?? 'Playlist';
}

export function buildSongHistoryStartInput(
  song: SongRow,
  context: PlayHistoryContext,
  deps: {
    vcOpen: boolean;
    durationSeconds: number;
  },
): SongHistoryStartInput {
  return {
    songId: song.id,
    songTitle: song.title,
    artistName: song.artist_name,
    playlistId: context.playlistId,
    playlistName: context.playlistName,
    playbackType: context.playbackType,
    interruptedPrevious: context.interruptedPrevious,
    vcMode: deps.vcOpen,
    vcModeLabel: resolveVcHistoryLabel(deps.vcOpen),
    durationSeconds:
      deps.durationSeconds > 0
        ? deps.durationSeconds
        : song.duration_seconds ?? null,
  };
}

export function normalizeSongHistoryRows(rows: unknown): SongHistoryEntry[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => normalizeSongHistoryEntry(row))
    .filter((row): row is SongHistoryEntry => row != null);
}
