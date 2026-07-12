import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { configUsesVisualizer, type VcPlaybackEffectsMirror } from '@shared/vcModeTypes';
import { getApp } from '../lib/bridge';
import Hls from 'hls.js';
import { SongPageWebview } from './SongPageWebview';
import { ListenerWelcome } from './ListenerWelcome';
import { ArtistInfoPanel } from './ArtistInfoPanel';
import { usePlaybackEffects } from '../audio/hooks/usePlaybackEffects';
import { useAnalyserPlaybackMirror } from '../audio/hooks/useAnalyserPlaybackMirror';
import {
  DEFAULT_EFFECTS_LAB_STATE,
  EffectsLabPanel,
  isEffectsLabAudible,
  type EffectsLabState,
} from '../audio/effectsLab';
import { getAudioGraphIfExists } from '../audio/graph/registry';
import { ToastStack } from './ToastStack';
import { useToasts } from './useToasts';
import { PlayerBar, type RepeatMode } from './PlayerBar';
import { VerticalResizeHandle } from './VerticalResizeHandle';
import { HorizontalResizeHandle } from './HorizontalResizeHandle';
import {
  ListenerSidebar,
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_WIDTH_KEY,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  LIBRARY_ADDED_COLUMN_MIN_WIDTH,
} from './ListenerSidebar';
import { SubscribeArtistModal } from './SubscribeArtistModal';
import { formatTime } from './formatTime';
import { useListenerPlayerSettings } from './useListenerPlayerSettings';
import { useListenerLyricsDisplaySettings } from './useListenerLyricsDisplaySettings';
import { useListenerSidebarLibraryLayout } from './useListenerSidebarLibraryLayout';
import { probeSongDurationSeconds, songNeedsDurationProbe } from './probeSongDuration';
import { sortPlaylistSongs, type SortColumn, type SortDirection } from './sortPlaylist';
import {
  applyCustomPlaylistOrder,
  buildCatalogOrderMap,
  buildCustomOrderMap,
  playlistKeyForArtistId,
  reorderPlaylistIds,
} from '@shared/listener/playlistOrder';
import {
  isSongSkipped,
  playlistKindForArtistId,
} from '@shared/listener/playlistKinds';
import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  playableQueueSongs,
  resolvePlayableSong,
} from '@shared/listener/playbackQueue';
import { usePlaylistDragReorder } from './usePlaylistDragReorder';
import { SortableColumnHeader } from './SortableColumnHeader';
import { SongLikeButton } from './SongLikeButton';
import { LikedSongsPanel } from './LikedSongsPanel';
import { SunoOnlyPanel } from './SunoOnlyPanel';
import { SunoDemoSongPage } from './SunoDemoSongPage';
import { shouldUseDirectAudioPlayback, loadDirectAudioPlayback } from './directAudioPlayback';
import { LikedSongIndicator } from './LikedSongIndicator';
import { PlaylistRowContextMenu } from './PlaylistRowContextMenu';
import { LibrarySidebarContextMenu } from './LibrarySidebarContextMenu';
import { LibraryPlaylistRemoveConfirm } from './LibraryPlaylistRemoveConfirm';
import { LibraryPlaylistRenameDialog } from './LibraryPlaylistRenameDialog';
import { SongToPlaylistModal } from './SongToPlaylistModal';
import { SharePlaylistModal } from './SharePlaylistModal';
import { CustomPlaylistPanel } from './CustomPlaylistPanel';
import { YoutubeSongPage } from './YoutubeSongPage';
import type { YoutubePlayerHandle } from './youtube/YoutubePlayer';
import { sidebarEntryType, isRenamableSidebarPlaylist, isSidebarPlaylistContextTarget } from './sidebarEntry';
import { SkippedSongMarker } from './SkippedSongMarker';
import { shareableSongLink } from './shareableSongPageUrl';
import { resolveSongAccess } from './resolveSongAccess';
import {
  buildLikedSongsArtistRow,
  isLikedSongsArtist,
  LIKED_SONGS_ARTIST_ID,
} from './likedSongs';
import {
  buildUserPlaylistArtistRow,
  isUserPlaylistArtistId,
  isUserPlaylistSongId,
  userPlaylistIdFromArtistId,
  userPlaylistArtistId,
  type PlaylistPickerRow,
} from '@shared/listener/userPlaylists';
import {
  buildSunoPlaylistArtistRow,
  isSunoDemoArtistId,
  isSunoDemoSong,
  isSunoDemoSongId,
  sunoPlaylistIdFromArtistId,
  SUNO_DEMO_FEATURE_ENABLED,
} from '@shared/demo/sunoDemoFeature';
import { isYoutubeSong } from '@shared/youtube/youtubeFeature';
import type { ArtistRow, SongRow } from '../types/app';
import { EmbeddedVisualizerHost } from '../visualizers/EmbeddedVisualizerHost';
import { VisualizerSettingsDialog } from '../visualizers/settings/ui/VisualizerSettingsDialog';
import { ButterchurnMirrorHost } from '../visualizers/butterchurn/adapter/ButterchurnMirrorHost';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { useVisualizerManager } from '../visualizers/useVisualizerManager';
import { listVisualizers, normalizeExperienceId } from '../visualizers/registry';
import { stepExperienceId } from '@shared/visualizers/experienceNavigation';
import { AudioDebugPanel } from '../audio/debug/AudioDebugPanel';
import { useAudioDebugReporter } from '../audio/debug/useAudioDebugReporter';
import { VcModeModal } from '../vc-mode/VcModeModal';
import { VcCloseConfirmModal } from '../vc-mode/VcCloseConfirmModal';
import { useVcModeManager } from '../vc-mode/useVcModeManager';
import { useSpecialPlayPause } from './useSpecialPlayPause';
import { useListenerPlaybackCommands } from './useListenerPlaybackCommands';
import '../styles/themes.css';
import '../styles/toast.css';
import '../styles/select.css';
import '../styles/visualizer.css';
import '../vc-mode/vcMode.css';
import '../vc-window/vc-window.css';
import '../styles/sunoDemo.css';

type MainContentView = 'welcome' | 'artist' | 'song';

const DEFAULT_CONTENT_HEIGHT = 360;
const MIN_CONTENT_HEIGHT = 160;
const MIN_PLAYLIST_HEIGHT = 160;
/** Handle element height plus vertical margins — keeps playlist visible when dragging. */
const RESIZE_HANDLE_SPACE = 24;

function maxContentHeight(column: HTMLElement | null): number {
  if (!column) return DEFAULT_CONTENT_HEIGHT;
  const available = column.clientHeight - MIN_PLAYLIST_HEIGHT - RESIZE_HANDLE_SPACE;
  return Math.max(MIN_CONTENT_HEIGHT, available);
}

function clampContentHeight(column: HTMLElement | null, height: number): number {
  return Math.min(maxContentHeight(column), Math.max(MIN_CONTENT_HEIGHT, height));
}

function songDurationLabel(song: SongRow, runtimeSeconds: number | undefined): string {
  if (song.unavailable === 1) return '';
  const seconds = song.duration_seconds ?? runtimeSeconds;
  return seconds != null && seconds > 0 ? formatTime(seconds) : '—';
}

/** Red circle X when a liked song has no reachable media. */
function UnavailableLengthMarker() {
  return (
    <span className="unavailable-length-marker" aria-label="Unavailable" title="Unavailable">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

export function ListenerMode({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [mainContentView, setMainContentView] = useState<MainContentView>('welcome');
  const [siteUrl, setSiteUrl] = useState('');
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [sunoDemoAddOpen, setSunoDemoAddOpen] = useState(false);
  const [youtubeAddOpen, setYoutubeAddOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [vcCloseConfirmOpen, setVcCloseConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, addToast, dismissToast } = useToasts();
  const { settings: playerSettings, toggleSeekLabel } = useListenerPlayerSettings();
  const { settings: lyricsDisplaySettings, setRemoveBrackets: setLyricsRemoveBrackets } =
    useListenerLyricsDisplaySettings();
  const sidebarLibrary = useListenerSidebarLibraryLayout(artists);
  const [busy, setBusy] = useState(false);

  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [previewSongId, setPreviewSongId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [pageLoadKey, setPageLoadKey] = useState(0);
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);

  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [volume, setVolume] = useState(0.85);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);
  const [bassBoost, setBassBoost] = useState(false);
  const [lofi, setLofi] = useState(false);
  const [effectsLab, setEffectsLab] = useState<EffectsLabState>(() => DEFAULT_EFFECTS_LAB_STATE);
  const [crossfades, setCrossfades] = useState(false);
  const [contentHeight, setContentHeight] = useState(DEFAULT_CONTENT_HEIGHT);
  const [runtimeDurations, setRuntimeDurations] = useState<Record<number, number>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  /** Duration values frozen at last explicit sort — avoids live reorder as probes finish. */
  const [sortDurationsSnapshot, setSortDurationsSnapshot] = useState<Record<number, number>>({});
  const [customOrderIds, setCustomOrderIds] = useState<number[] | null>(null);
  const [likedSongCount, setLikedSongCount] = useState(0);
  const [likedSongIds, setLikedSongIds] = useState<Set<number>>(() => new Set());
  const [currentSongLiked, setCurrentSongLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [playlistContextMenu, setPlaylistContextMenu] = useState<{
    song: SongRow;
    x: number;
    y: number;
  } | null>(null);
  const [librarySidebarContextMenu, setLibrarySidebarContextMenu] = useState<{
    artist: ArtistRow;
    x: number;
    y: number;
  } | null>(null);
  const [libraryPlaylistRemoveTarget, setLibraryPlaylistRemoveTarget] = useState<ArtistRow | null>(
    null,
  );
  const [libraryPlaylistRenameTarget, setLibraryPlaylistRenameTarget] = useState<ArtistRow | null>(
    null,
  );
  const [songToPlaylistModal, setSongToPlaylistModal] = useState<{
    song: SongRow;
    sourceArtistId: number;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  /** Muted HLS mirror for visualizer FFT — keeps main playback on native output for stream capture. */
  const analyserAudioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackGenerationRef = useRef(0);
  /** Ignore spurious `ended` while tearing down HLS / swapping tracks (double-advance). */
  const suppressPlaybackEndedRef = useRef(false);
  /** Serialize natural track-end auto-advance — stale `ended` must not call playSong twice. */
  const advancingFromEndedRef = useRef(false);
  const playingSongIdRef = useRef<number | null>(null);
  const pageAccessGenerationRef = useRef(0);
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const rowClickTimerRef = useRef<number | null>(null);
  const durationProbeRef = useRef<Set<number>>(new Set());
  const playSongRef = useRef<(song: SongRow) => Promise<void>>(async () => {});
  const youtubePlayerRef = useRef<YoutubePlayerHandle | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  /** Last row passed to playSong — visualizer must not depend on the selected playlist's song list. */
  const playingSongRowRef = useRef<SongRow | null>(null);
  /** Latest transport handlers for VC window IPC — avoids hook-order / TDZ issues. */
  const vcTransportHandlersRef = useRef({
    togglePlayPause: () => {},
    playPrevious: () => {},
    playNext: () => {},
    handleSeek: (_time: number) => {},
    playSong: async (_song: SongRow) => {},
    sortedSongs: [] as SongRow[],
    handleYoutubeEnded: () => {},
    handleYoutubeDuration: (_seconds: number) => {},
    applyYoutubeTiming: (_currentTime: number, _duration: number) => {},
  });

  const selectedArtist = artists.find((artist) => artist.id === selectedArtistId) ?? null;
  const customPlaylistPickerRows = useMemo((): PlaylistPickerRow[] => {
    return artists
      .map((artist) => {
        if (!isUserPlaylistArtistId(artist.id)) return null;
        const id = userPlaylistIdFromArtistId(artist.id);
        if (id == null) return null;
        return {
          id,
          artist_id: artist.id,
          name: artist.artist_name,
          song_count: artist.song_count ?? 0,
          kind: 'custom' as const,
        };
      })
      .filter((row): row is PlaylistPickerRow => row != null);
  }, [artists]);
  const playingSong = useMemo(() => {
    if (playingSongId == null) return null;
    const fromPlaylist = songs.find((song) => song.id === playingSongId);
    if (fromPlaylist) {
      playingSongRowRef.current = fromPlaylist;
      return fromPlaylist;
    }
    return playingSongRowRef.current?.id === playingSongId ? playingSongRowRef.current : null;
  }, [playingSongId, songs]);
  const previewSong = songs.find((song) => song.id === previewSongId) ?? playingSong;
  const isLikedPlaylist = isLikedSongsArtist(selectedArtistId);
  const isSunoPlaylist = isSunoDemoArtistId(selectedArtistId);
  const isCustomPlaylistSelected = isUserPlaylistArtistId(selectedArtistId);
  const playlistKind = playlistKindForArtistId(selectedArtistId);
  const showArtistColumn = isLikedPlaylist || isSunoPlaylist || isCustomPlaylistSelected;
  const activeSongPage = previewSong ?? playingSong;
  const showingSunoDemoPage = Boolean(activeSongPage && isSunoDemoSong(activeSongPage));
  const showingYoutubePage = Boolean(activeSongPage && isYoutubeSong(activeSongPage));
  const canToggleLike = previewSong != null && previewSong.id > 0;
  const playlistKey = useMemo(
    () => (selectedArtistId != null ? playlistKeyForArtistId(selectedArtistId) : null),
    [selectedArtistId],
  );
  const songIdsSignature = useMemo(() => songs.map((song) => song.id).join(','), [songs]);
  const hasCustomOrder = customOrderIds != null && customOrderIds.length > 0;

  const catalogOrderBySongId = useMemo(() => buildCatalogOrderMap(songs), [songs]);
  const customOrderBySongId = useMemo(
    () => (customOrderIds ? buildCustomOrderMap(customOrderIds) : new Map<number, number>()),
    [customOrderIds],
  );

  const sortedSongs = useMemo(() => {
    if (sortColumn === 'custom' && customOrderIds) {
      return applyCustomPlaylistOrder(songs, customOrderIds);
    }
    const column = sortColumn === 'custom' ? 'order' : sortColumn;
    return sortPlaylistSongs(songs, column, sortDirection, sortDurationsSnapshot);
  }, [customOrderIds, songs, sortColumn, sortDirection, sortDurationsSnapshot]);

  const sortedSongsRef = useRef(sortedSongs);
  sortedSongsRef.current = sortedSongs;

  playingSongIdRef.current = playingSongId;

  const visualizer = useVisualizerManager({
    analyserAudioRef,
    playingSong,
    isPlaying,
    currentTime,
    duration,
    pageUrl,
  });

  const butterchurnSettings = useExperienceSettings(visualizer.windowExperienceId, {
    settingsDialogOpen: visualizer.settingsDialogOpen,
  });

  const handleButterchurnMirrorFrame = useCallback(
    (dataUrl: string) => {
      visualizer.setCanvasMirrorFrame(dataUrl);
    },
    [visualizer],
  );

  const toggleBassBoost = useCallback(() => {
    setBassBoost((on) => {
      const next = !on;
      if (next) setLofi(false);
      return next;
    });
  }, []);

  const toggleLofi = useCallback(() => {
    setLofi((on) => {
      const next = !on;
      if (next) setBassBoost(false);
      return next;
    });
  }, []);

  const buildDurationSnapshot = useCallback(() => {
    const snapshot: Record<number, number> = {};
    for (const song of songs) {
      const seconds = song.duration_seconds ?? runtimeDurations[song.id];
      if (seconds != null && seconds > 0) snapshot[song.id] = seconds;
    }
    return snapshot;
  }, [runtimeDurations, songs]);

  const toggleSort = (column: SortColumn) => {
    setSortDurationsSnapshot(buildDurationSnapshot());

    // # = catalog order; * = saved personal order (handled separately).
    if (column === 'order' || column === 'custom') {
      setSortColumn(column);
      setSortDirection('asc');
      return;
    }

    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  const persistSongDuration = useCallback(async (songId: number, seconds: number) => {
    const rounded = Math.round(seconds);
    if (rounded <= 0) return;
    if (songId <= 0 && !isSunoDemoSongId(songId) && !isUserPlaylistSongId(songId)) return;

    setRuntimeDurations((prev) => ({ ...prev, [songId]: rounded }));
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId && (song.duration_seconds == null || song.duration_seconds <= 0)
          ? { ...song, duration_seconds: rounded }
          : song,
      ),
    );

    const app = getApp();
    if (!app) return;
    await app.listener.updateSongDuration(songId, rounded);
  }, []);

  const loadLibrary = useCallback(async () => {
    const app = getApp();
    if (!app) return;

    const [artistRows, likedCount, likedIds, sunoPlaylists, userPlaylists] = await Promise.all([
      app.listener.listArtists(),
      app.listener.countLikedSongs(),
      app.listener.listLikedSongIds(),
      SUNO_DEMO_FEATURE_ENABLED && app.listener.listSunoDemoPlaylists
        ? app.listener.listSunoDemoPlaylists().catch(() => [])
        : Promise.resolve([]),
      app.listener.listUserPlaylists ? app.listener.listUserPlaylists().catch(() => []) : Promise.resolve([]),
    ]);

    setLikedSongCount(likedCount);
    setLikedSongIds(new Set(likedIds));

    let displayArtists = artistRows;
    if (SUNO_DEMO_FEATURE_ENABLED && sunoPlaylists.length > 0) {
      const sunoRows = sunoPlaylists.map((playlist) => buildSunoPlaylistArtistRow(playlist));
      displayArtists = [...sunoRows, ...displayArtists];
    }
    if (userPlaylists.length > 0) {
      const customRows = userPlaylists.map((playlist) => buildUserPlaylistArtistRow(playlist));
      displayArtists = [...customRows, ...displayArtists];
    }
    if (likedCount > 0) {
      displayArtists = [buildLikedSongsArtistRow(likedCount), ...displayArtists];
    }
    setArtists(displayArtists);

    if (isUserPlaylistArtistId(selectedArtistId)) {
      setSongs(await app.listener.listSongs(selectedArtistId!));
      return;
    }

    if (isSunoDemoArtistId(selectedArtistId)) {
      if (SUNO_DEMO_FEATURE_ENABLED) {
        setSongs(await app.listener.listSongs(selectedArtistId));
      } else {
        setSongs([]);
        setSelectedArtistId(displayArtists[0]?.id ?? null);
      }
      return;
    }

    if (selectedArtistId === LIKED_SONGS_ARTIST_ID) {
      if (likedCount > 0) {
        setSongs(await app.listener.listSongs(LIKED_SONGS_ARTIST_ID));
      } else {
        setSongs([]);
        setSelectedArtistId(displayArtists[0]?.id ?? null);
      }
      return;
    }

    const songRows = selectedArtistId
      ? await app.listener.listSongs(selectedArtistId)
      : await app.listener.listSongs();

    setSongs(songRows);

    if (displayArtists.length && selectedArtistId === null) {
      setSelectedArtistId(displayArtists[0].id);
    }
  }, [selectedArtistId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setCoverModalOpen(false);
  }, [pageUrl]);

  useEffect(() => {
    const app = getApp();
    if (!app) return;
    void app.getSettings(SIDEBAR_COLLAPSED_KEY).then((value) => {
      if (typeof value === 'boolean') setSidebarCollapsed(value);
    });
    void app.getSettings(SIDEBAR_WIDTH_KEY).then((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value)));
      }
    });
  }, []);

  const clampSidebarWidth = useCallback(
    (width: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)),
    [],
  );

  const handleSidebarResizeDelta = useCallback(
    (deltaX: number) => {
      setSidebarWidth((current) => clampSidebarWidth(current + deltaX));
    },
    [clampSidebarWidth],
  );

  const handleSidebarResizeEnd = useCallback(() => {
    setSidebarResizing(false);
    setSidebarWidth((current) => {
      const clamped = clampSidebarWidth(current);
      void getApp()?.saveSettings(SIDEBAR_WIDTH_KEY, clamped);
      return clamped;
    });
  }, [clampSidebarWidth]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      void getApp()?.saveSettings(SIDEBAR_COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (selectedArtistId === null) return;
    const app = getApp();
    if (!app) return;

    if (isSunoDemoArtistId(selectedArtistId)) {
      void app.listener.listSongs(selectedArtistId).then(setSongs);
    } else if (isLikedSongsArtist(selectedArtistId)) {
      void app.listener.listSongs(LIKED_SONGS_ARTIST_ID).then(setSongs);
    } else {
      void app.listener.listSongs(selectedArtistId).then(setSongs);
    }

    setSortColumn('order');
    setSortDirection('asc');
    setSortDurationsSnapshot({});
  }, [selectedArtistId]);

  useEffect(() => {
    if (!playlistKey) return;
    const app = getApp();
    if (!app?.listener.getPlaylistOrderState) return;

    const ids = songs.map((song) => song.id);
    if (ids.length === 0) {
      setCustomOrderIds(null);
      return;
    }

    let cancelled = false;
    void app.listener.getPlaylistOrderState(playlistKey, ids).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      setCustomOrderIds(result.data.hasCustomOrder ? result.data.songIds : null);
    });

    return () => {
      cancelled = true;
    };
  }, [playlistKey, songIdsSignature, songs]);

  useEffect(() => {
    if (sortColumn === 'custom' && !hasCustomOrder) {
      setSortColumn('order');
    }
  }, [hasCustomOrder, sortColumn]);

  const handlePlaylistReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!playlistKey) return;
      const reordered = reorderPlaylistIds(
        sortedSongsRef.current.map((song) => song.id),
        fromIndex,
        toIndex,
      );
      setCustomOrderIds(reordered);
      setSortColumn('custom');
      setSortDirection('asc');
      const app = getApp();
      if (app?.listener.savePlaylistCustomOrder) {
        void app.listener.savePlaylistCustomOrder(playlistKey, reordered);
      }
    },
    [playlistKey],
  );

  const playlistDrag = usePlaylistDragReorder({
    rowCount: sortedSongs.length,
    onReorder: handlePlaylistReorder,
  });

  useEffect(() => {
    const app = getApp();
    if (!app || previewSongId == null || previewSongId <= 0) {
      setCurrentSongLiked(false);
      return;
    }

    void app.listener.isSongLiked(previewSongId).then(setCurrentSongLiked);
  }, [previewSongId]);

  useEffect(() => {
    if (!playlistContextMenu) return;

    const dismiss = () => setPlaylistContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [playlistContextMenu]);

  useEffect(() => {
    const column = mainColumnRef.current;
    if (!column) return;

    // Always start at the default split; clamp again if the window is resized.
    setContentHeight(clampContentHeight(column, DEFAULT_CONTENT_HEIGHT));

    const onColumnResize = () => {
      setContentHeight((height) => clampContentHeight(column, height));
    };

    const observer = new ResizeObserver(onColumnResize);
    observer.observe(column);
    return () => observer.disconnect();
  }, []);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const pickNextSongId = useCallback(
    (currentSongId: number): number | null =>
      pickNextPlayableSongId(sortedSongs, currentSongId, { shuffle, repeatMode }),
    [repeatMode, shuffle, sortedSongs],
  );

  const specialPlay = useSpecialPlayPause({
    onPlayNext: () => playNextRef.current(),
  });

  const handleYoutubeDuration = useCallback(
    (seconds: number) => {
      setDuration(seconds);
      if (playingSongId != null && seconds > 0) {
        void persistSongDuration(playingSongId, seconds);
      }
    },
    [persistSongDuration, playingSongId],
  );

  const handleYoutubeReady = useCallback(() => {
    if (playingSongIdRef.current != null) setIsPlaying(true);
  }, []);

  const handleYoutubeError = useCallback((message: string) => {
    setError(message);
  }, []);

  const vcPlaybackEffects = useMemo(
    (): VcPlaybackEffectsMirror => ({
      bassBoost,
      lofi,
      effectsLab: {
        enabled: effectsLab.enabled,
        effectId: effectsLab.effectId,
        outputTrimDb: effectsLab.outputTrimDb,
        abBypass: effectsLab.abBypass,
        workletEnhance: effectsLab.workletEnhance,
      },
    }),
    [
      bassBoost,
      effectsLab.abBypass,
      effectsLab.effectId,
      effectsLab.enabled,
      effectsLab.outputTrimDb,
      effectsLab.workletEnhance,
      lofi,
    ],
  );

  const vc = useVcModeManager({
    analyserAudioRef,
    playingSong,
    previewSong,
    sortedSongs,
    playingSongId,
    repeatMode,
    shuffle,
    artists,
    isPlaying,
    currentTime,
    duration,
    activePlaybackUrl,
    volume,
    playbackEffects: vcPlaybackEffects,
    specialPlayPause: specialPlay.specialPlayPause,
  });

  const vcYoutubeCaptureActive = useMemo(
    () =>
      vc.vcOpen &&
      configUsesVisualizer(vc.activeConfig) &&
      playingSong != null &&
      isYoutubeSong(playingSong),
    [vc.vcOpen, vc.activeConfig, playingSong],
  );

  const prevVcYoutubeCaptureRef = useRef(false);
  useEffect(() => {
    const active = vcYoutubeCaptureActive;
    const wasActive = prevVcYoutubeCaptureRef.current;
    prevVcYoutubeCaptureRef.current = active;
    if (
      !wasActive &&
      active &&
      playingSongId != null &&
      playingSong != null &&
      isYoutubeSong(playingSong)
    ) {
      setIsPlaying(true);
    }
  }, [vcYoutubeCaptureActive, playingSong, playingSongId]);

  const handleYoutubeEnded = useCallback(() => {
    if (advancingFromEndedRef.current) return;

    setIsPlaying(false);
    if (repeatMode === 'one') {
      if (vcYoutubeCaptureActive) {
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        youtubePlayerRef.current?.seek(0);
        youtubePlayerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    const currentSongId = playingSongIdRef.current;
    if (currentSongId == null) return;
    if (vc.vcOpen && specialPlay.beginPauseAfterSong(vc.activeConfig.specialPlayStyle)) {
      return;
    }

    advancingFromEndedRef.current = true;
    const nextSongId = pickNextSongId(currentSongId);
    if (nextSongId == null) {
      advancingFromEndedRef.current = false;
      return;
    }
    const nextSong = sortedSongsRef.current.find((song) => song.id === nextSongId);
    if (nextSong) void playSongRef.current(nextSong);
    advancingFromEndedRef.current = false;
  }, [
    pickNextSongId,
    repeatMode,
    specialPlay,
    vc.activeConfig.specialPlayStyle,
    vc.vcOpen,
    vcYoutubeCaptureActive,
  ]);

  const applyYoutubeTiming = useCallback((nextTime: number, nextDuration: number) => {
    if (!Number.isFinite(nextTime)) return;
    setCurrentTime(nextTime);
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
    }
  }, []);

  useListenerPlaybackCommands({
    mainAudioRef: audioRef,
    onPlayNextSong: specialPlay.playNextAfterPause,
    onVolumeDelta: (delta) => {
      setVolume((current) => Math.min(1, Math.max(0, current + delta)));
    },
    onVisualizerStep: (direction) => {
      const catalogIds = listVisualizers().map((plugin) => plugin.id);
      const nextId = stepExperienceId(
        catalogIds,
        visualizer.activeExperienceId,
        direction,
        normalizeExperienceId,
      );
      visualizer.selectExperience(nextId);
      if (vc.vcOpen) {
        getApp()?.vc?.syncActiveVisualizer?.(nextId);
      }
    },
  });

  useEffect(() => {
    if (!vc.vcOpen) return;
    const app = getApp();
    return app?.vc?.onActiveVisualizerReport?.((id) => {
      visualizer.selectExperience(id);
    });
  }, [vc.vcOpen, visualizer.selectExperience]);

  useEffect(() => {
    if (!vc.vcOpen) specialPlay.clearPause();
  }, [specialPlay.clearPause, vc.vcOpen]);

  const analyserMirrorEnabled =
    (visualizer.canVisualize && visualizer.activeSession !== 'none') ||
    (visualizer.windowOpen && visualizer.projectionMode === 'visualizer' && visualizer.canVisualize) ||
    vc.analyserEnabled ||
    bassBoost ||
    lofi ||
    effectsLab.enabled;

  useAudioDebugReporter({
    surface: 'main',
    mainAudioRef: audioRef,
    mirrorAudioRef: analyserAudioRef,
    analyser: visualizer.analyser,
    frequencyData: visualizer.frequencyData,
    isPlaying,
    embeddedActive: visualizer.embeddedActive,
    windowOpen: visualizer.windowOpen,
    projectionMode: visualizer.projectionMode,
    activeSession: visualizer.activeSession,
    analyserEnabled: visualizer.canVisualize && visualizer.activeSession !== 'none',
    mirrorEnabled: analyserMirrorEnabled,
    experienceId: visualizer.activeExperienceId,
  });

  useAnalyserPlaybackMirror({
    mainAudioRef: audioRef,
    analyserAudioRef,
    playbackUrl: activePlaybackUrl,
    enabled: analyserMirrorEnabled,
  });

  useEffect(() => {
    if (!vc.vcOpen) {
      setVcCloseConfirmOpen(false);
    }
  }, [vc.vcOpen]);

  usePlaybackEffects({
    mainAudioRef: audioRef,
    analyserAudioRef,
    volume,
    isPlaying,
    bassBoost,
    lofi,
    effectsLab,
    // VC window owns audible output — main stays timing-only while VC is open.
    vcMirrorPlaybackActive: vc.vcOpen,
  });

  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onTransport) return;

    const off = app.vc.onTransport((command) => {
      const handlers = vcTransportHandlersRef.current;
      if (command.type === 'playPause') {
        handlers.togglePlayPause();
        return;
      }
      if (command.type === 'prev') {
        handlers.playPrevious();
        return;
      }
      if (command.type === 'next') {
        handlers.playNext();
        return;
      }
      if (command.type === 'seek') {
        handlers.handleSeek(command.seconds);
        return;
      }
      if (command.type === 'playSong') {
        const target = handlers.sortedSongs.find((song) => song.id === command.songId);
        if (target) void handlers.playSong(target);
        return;
      }
      if (command.type === 'playNextSong') {
        specialPlay.playNextAfterPause();
        return;
      }
      if (command.type === 'youtubeEnded') {
        handlers.handleYoutubeEnded();
        return;
      }
      if (command.type === 'youtubeTiming') {
        handlers.applyYoutubeTiming(command.currentTime, command.duration);
        return;
      }
      if (command.type === 'youtubeDuration') {
        handlers.handleYoutubeDuration(command.seconds);
      }
    });

    return () => off();
  }, [specialPlay.playNextAfterPause, vc.vcOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // VC window owns audible playback while open — always duck main (FX path included).
    if (vc.vcOpen) {
      audio.volume = 0;
      return;
    }
    if (bassBoost || lofi || isEffectsLabAudible(effectsLab)) return;
    audio.volume = volume;
  }, [volume, bassBoost, lofi, effectsLab, vc.vcOpen]);

  const markSongAvailability = useCallback(
    async (song: SongRow, unavailable: boolean) => {
      const app = getApp();
      if (!app) return;

      const flag = unavailable ? 1 : 0;
      setSongs((prev) =>
        prev.map((row) => (row.id === song.id ? { ...row, unavailable: flag } : row)),
      );
      await app.listener.setLikedSongAvailability(song.id, unavailable);
    },
    [],
  );

  /** Lazy probe when traversing the Liked Songs playlist — re-checks on every visit. */
  const probeLikedSongAvailability = useCallback(
    async (song: SongRow) => {
      if (!isLikedSongsArtist(selectedArtistId)) return;

      const app = getApp();
      if (!app) return;

      const result = await app.listener.probeSongAvailability(song.page_url, song.playback_url);
      if (!result.ok || !result.data) return;

      await markSongAvailability(song, !result.data.ok);
    },
    [markSongAvailability, selectedArtistId],
  );
  const probeDurationForSong = useCallback(
    async (song: SongRow) => {
      // YouTube length is learned from the visible player on first play — not probed at intake.
      if (isYoutubeSong(song)) return;
      if (!songNeedsDurationProbe(song, runtimeDurations[song.id])) return;
      if (durationProbeRef.current.has(song.id)) return;

      durationProbeRef.current.add(song.id);
      const seconds = await probeSongDurationSeconds(song.playback_url);
      durationProbeRef.current.delete(song.id);

      if (seconds != null && seconds > 0) {
        await persistSongDuration(song.id, seconds);
      }
    },
    [persistSongDuration, runtimeDurations],
  );

  const showSongPage = useCallback(
    async (song: SongRow) => {
      const accessGeneration = ++pageAccessGenerationRef.current;
      setPreviewSongId(song.id);
      setMainContentView('song');
      setPageLoadError(null);

      const access = await resolveSongAccess(song, 'show_song_page');
      if (accessGeneration !== pageAccessGenerationRef.current) return;

      setPageLoadKey((key) => key + 1);
      setPageUrl(access.pageUrl);

      void probeDurationForSong(song);
      void probeLikedSongAvailability(song);
    },
    [probeDurationForSong, probeLikedSongAvailability],
  );

  const playSong = useCallback(
    async (song: SongRow) => {
      const playableSong = resolvePlayableSong(sortedSongsRef.current, song);
      if (!playableSong) return;
      if (playableSong.id !== song.id) {
        void playSongRef.current(playableSong);
        return;
      }

      const generation = ++playbackGenerationRef.current;
      const accessGeneration = ++pageAccessGenerationRef.current;

      setPlayingSongId(song.id);
      playingSongRowRef.current = song;
      // YouTube uses the embedded iframe player — no HLS mirror URL for VC.
      setActivePlaybackUrl(isYoutubeSong(song) ? null : (song.playback_url ?? null));
      setCurrentTime(0);
      setDuration(song.duration_seconds ?? 0);
      setIsPlaying(isYoutubeSong(song));
      setPreviewSongId(song.id);
      setMainContentView('song');
      setPageLoadError(null);
      setError(null);

      const access = await resolveSongAccess(song, 'play_song');
      if (accessGeneration !== pageAccessGenerationRef.current) return;

      setPageLoadKey((key) => key + 1);
      setPageUrl(access.pageUrl);

      void probeLikedSongAvailability(song);

      const audio = audioRef.current;
      if (!audio) return;

      if (isYoutubeSong(song)) {
        suppressPlaybackEndedRef.current = true;
        destroyHls();
        audio.pause();
        suppressPlaybackEndedRef.current = false;
        // audio.pause() must not leave isPlaying false after the async access gap above.
        setIsPlaying(true);
        return;
      }

      setIsPlaying(false);
      suppressPlaybackEndedRef.current = true;
      destroyHls();
      audio.pause();

      const playbackUrl = access.playbackUrl;
      setActivePlaybackUrl(playbackUrl);
      const markUnavailableIfLiked = () => {
        if (isLikedSongsArtist(selectedArtistId)) {
          void markSongAvailability(song, true);
        }
      };

      const startPlayback = () => {
        if (generation !== playbackGenerationRef.current) return;
        suppressPlaybackEndedRef.current = false;
        void audio.play().then(
          () => {
            if (generation === playbackGenerationRef.current) {
              setIsPlaying(true);
            }
          },
          (playError: Error) => {
            if (playError?.name === 'AbortError') return;
            if (generation !== playbackGenerationRef.current) return;
            setIsPlaying(false);
            setError('Playback was blocked or failed.');
            setActivePlaybackUrl(null);
            markUnavailableIfLiked();
          },
        );
      };

      const onAudioError = () => {
        if (generation !== playbackGenerationRef.current) return;
        suppressPlaybackEndedRef.current = false;
        setError('Could not load audio stream.');
        setIsPlaying(false);
        setActivePlaybackUrl(null);
        markUnavailableIfLiked();
      };

      if (shouldUseDirectAudioPlayback(playbackUrl, song.playback_scope)) {
        loadDirectAudioPlayback(audio, playbackUrl, {
          onReady: startPlayback,
          onError: onAudioError,
        });
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (generation !== playbackGenerationRef.current) return;
          startPlayback();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (generation !== playbackGenerationRef.current) return;
          if (data.fatal) {
            suppressPlaybackEndedRef.current = false;
            const detail = data.details ? `${data.type}: ${data.details}` : data.type;
            setError(`HLS error — ${detail}`);
            setIsPlaying(false);
            setActivePlaybackUrl(null);
            markUnavailableIfLiked();
          }
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = playbackUrl;
        audio.addEventListener(
          'loadedmetadata',
          () => {
            if (generation !== playbackGenerationRef.current) return;
            startPlayback();
          },
          { once: true },
        );
        audio.addEventListener('error', onAudioError, { once: true });
      } else {
        suppressPlaybackEndedRef.current = false;
        setError('HLS playback is not supported in this environment.');
      }
    },
    [markSongAvailability, probeLikedSongAvailability, selectedArtistId],
  );

  useEffect(() => {
    playSongRef.current = playSong;
  }, [playSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);

    const onDurationChange = () => {
      const nextDuration = audio.duration || 0;
      setDuration(nextDuration);
      if (playingSongId != null && nextDuration > 0) {
        void persistSongDuration(playingSongId, nextDuration);
      }
    };

    const onEnded = () => {
      if (suppressPlaybackEndedRef.current || advancingFromEndedRef.current) return;
      if (!audio.ended) return;

      setIsPlaying(false);
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        void audio.play();
        setIsPlaying(true);
        return;
      }

      const currentSongId = playingSongIdRef.current;
      if (currentSongId == null) return;
      if (
        vc.vcOpen &&
        specialPlay.beginPauseAfterSong(vc.activeConfig.specialPlayStyle)
      ) {
        return;
      }

      advancingFromEndedRef.current = true;
      const nextSongId = pickNextSongId(currentSongId);
      if (nextSongId == null) {
        advancingFromEndedRef.current = false;
        return;
      }
      const nextSong = sortedSongsRef.current.find((song) => song.id === nextSongId);
      if (nextSong) void playSongRef.current(nextSong);
      advancingFromEndedRef.current = false;
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      // playSong pauses the hidden <audio> for YouTube tracks — that must not clear isPlaying.
      const row = playingSongRowRef.current;
      if (row && isYoutubeSong(row) && playingSongIdRef.current === row.id) return;
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [persistSongDuration, pickNextSongId, playingSongId, repeatMode, specialPlay.beginPauseAfterSong, vc.activeConfig.specialPlayStyle, vc.vcOpen]);

  useEffect(() => {
    if (vcYoutubeCaptureActive) return;
    if (!showingYoutubePage || playingSongId == null || !isPlaying) return;

    const tick = () => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const nextTime = player.getCurrentTime();
      if (Number.isFinite(nextTime)) setCurrentTime(nextTime);
      const nextDuration = player.getDuration();
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        setDuration(nextDuration);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, playingSongId, showingYoutubePage, vcYoutubeCaptureActive]);

  useEffect(() => () => destroyHls(), []);

  useEffect(
    () => () => {
      if (rowClickTimerRef.current != null) {
        window.clearTimeout(rowClickTimerRef.current);
      }
    },
    [],
  );

  const handleSubscribe = async () => {
    setBusy(true);
    setError(null);

    const app = getApp();
    if (!app) return;

    const result = await app.listener.subscribe(siteUrl);
    setBusy(false);

    if (!result.ok || !result.data) {
      setError(result.error || 'Subscribe failed.');
      return;
    }

    setSiteUrl('');
    setSubscribeModalOpen(false);
    addToast(`Added ${result.data.artist.artist_name} (${result.data.songs.length} songs)`);
    if (result.data.siteRootWarning) {
      addToast(result.data.siteRootWarning);
    }

    setSelectedArtistId(result.data.artist.id);
    setMainContentView('artist');
    await loadLibrary();
  };

  const handleRefresh = async () => {
    if (
      selectedArtistId === null ||
      isLikedSongsArtist(selectedArtistId) ||
      isSunoDemoArtistId(selectedArtistId) ||
      isUserPlaylistArtistId(selectedArtistId)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const app = getApp();
    if (!app) return;

    const result = await app.listener.refreshArtist(selectedArtistId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error || 'Refresh failed.');
      return;
    }
    addToast('Artist refreshed.');
    await loadLibrary();
  };

  const handleRemove = async () => {
    if (
      selectedArtistId === null ||
      isLikedSongsArtist(selectedArtistId) ||
      isSunoDemoArtistId(selectedArtistId)
    ) {
      return;
    }
    setBusy(true);
    const app = getApp();
    if (!app) return;

    await app.listener.removeArtist(selectedArtistId);
    setSelectedArtistId(null);
    setMainContentView('welcome');
    setPageUrl(null);
    setPlayingSongId(null);
    playingSongRowRef.current = null;
    setPreviewSongId(null);
    setActivePlaybackUrl(null);
    destroyHls();
    audioRef.current?.pause();
    setBusy(false);
    await loadLibrary();
  };

  useEffect(() => {
    if (!SUNO_DEMO_FEATURE_ENABLED) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
        if (!isSunoDemoArtistId(selectedArtistId)) return;
        event.preventDefault();
        setMainContentView('artist');
        setSunoDemoAddOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedArtistId]);

  const handleSunoDemoAdded = useCallback(async () => {
    // Refresh sidebar count and the Suno playlist if it is already open — do not interrupt playback.
    await loadLibrary();
  }, [loadLibrary]);

  const handleYoutubeAdded = useCallback(
    async (result: {
      duplicate: boolean;
      intakeNotice?: string | null;
      song?: SongRow;
    }) => {
      const app = getApp();
      if (
        !result.duplicate &&
        result.song &&
        isUserPlaylistArtistId(selectedArtistId) &&
        app
      ) {
        setSongs((prev) => [result.song!, ...prev.filter((row) => row.id !== result.song!.id)]);
      }

      await loadLibrary();

      if (result.duplicate) {
        addToast('Song is already on that playlist.');
      } else {
        addToast('Added to playlist.');
      }
      if (result.intakeNotice) addToast(result.intakeNotice);
    },
    [addToast, loadLibrary, selectedArtistId],
  );

  const handleCreateSunoPlaylist = useCallback(async () => {
    const app = getApp();
    if (!app?.listener.createSunoDemoPlaylist) return;

    setBusy(true);
    setError(null);
    const result = await app.listener.createSunoDemoPlaylist();
    setBusy(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not create Suno playlist.');
      return;
    }

    await loadLibrary();
    setSelectedArtistId(result.data.artist_id);
    setMainContentView('artist');
  }, [loadLibrary]);

  const handleCreateCustomPlaylist = useCallback(async () => {
    const app = getApp();
    if (!app?.listener.createUserPlaylist) {
      setError('Restart the app to enable custom playlists.');
      return;
    }

    setBusy(true);
    setError(null);
    const result = await app.listener.createUserPlaylist();
    setBusy(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? 'Could not create custom playlist.');
      return;
    }

    await loadLibrary();
    setSelectedArtistId(result.data.artist_id);
    setMainContentView('artist');
  }, [loadLibrary]);

  const handleLibrarySidebarContextMenu = useCallback((artist: ArtistRow, event: React.MouseEvent) => {
    const type = sidebarEntryType(artist);
    if (!isSidebarPlaylistContextTarget(type)) return;
    event.preventDefault();
    setLibrarySidebarContextMenu({
      artist,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleRequestRenameLibraryPlaylist = useCallback(() => {
    if (!librarySidebarContextMenu) return;
    const type = sidebarEntryType(librarySidebarContextMenu.artist);
    if (!isRenamableSidebarPlaylist(type)) return;
    setLibraryPlaylistRenameTarget(librarySidebarContextMenu.artist);
    setLibrarySidebarContextMenu(null);
  }, [librarySidebarContextMenu]);

  const handleConfirmRenameLibraryPlaylist = useCallback(
    async (name: string) => {
      const target = libraryPlaylistRenameTarget;
      if (!target) return;

      const entryType = sidebarEntryType(target);
      const app = getApp();
      if (!app) return;

      setBusy(true);
      setError(null);
      try {
        let result;
        if (entryType === 'suno') {
          const playlistId = sunoPlaylistIdFromArtistId(target.id);
          if (!playlistId || !app.listener.renameSunoDemoPlaylist) {
            setError('Restart the app to enable playlist renaming.');
            return;
          }
          result = await app.listener.renameSunoDemoPlaylist(playlistId, name);
        } else if (entryType === 'custom') {
          const playlistId = userPlaylistIdFromArtistId(target.id);
          if (!playlistId || !app.listener.renameUserPlaylist) {
            setError('Restart the app to enable playlist renaming.');
            return;
          }
          result = await app.listener.renameUserPlaylist(playlistId, name);
        } else {
          return;
        }

        if (!result.ok || !result.data) {
          setError(result.error ?? 'Could not rename that playlist.');
          return;
        }

        setLibraryPlaylistRenameTarget(null);
        setArtists((prev) =>
          prev.map((row) =>
            row.id === target.id ? { ...row, artist_name: result.data!.name, song_count: result.data!.song_count } : row,
          ),
        );
        addToast(`Renamed to ${result.data.name}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'Could not rename that playlist.');
      } finally {
        setBusy(false);
      }
    },
    [addToast, libraryPlaylistRenameTarget],
  );

  const clearPlaybackForRemovedPlaylist = useCallback(
    (removedArtistId: number) => {
      const playingFromRemoved =
        playingSong?.artist_id === removedArtistId || previewSong?.artist_id === removedArtistId;

      if (playingFromRemoved) {
        destroyHls();
        audioRef.current?.pause();
        setIsPlaying(false);
        setActivePlaybackUrl(null);
        setCurrentTime(0);
        setDuration(0);
        setPlayingSongId(null);
        playingSongRowRef.current = null;
        setPreviewSongId(null);
        setPageUrl(null);
      }

      if (selectedArtistId === removedArtistId) {
        setSelectedArtistId(null);
        setMainContentView('welcome');
        setSongs([]);
      }
    },
    [playingSong?.artist_id, previewSong?.artist_id, selectedArtistId],
  );

  const handleRequestRemoveLibraryPlaylist = useCallback(() => {
    if (!librarySidebarContextMenu) return;
    setLibraryPlaylistRemoveTarget(librarySidebarContextMenu.artist);
    setLibrarySidebarContextMenu(null);
  }, [librarySidebarContextMenu]);

  const handleConfirmRemoveLibraryPlaylist = useCallback(async () => {
    const target = libraryPlaylistRemoveTarget;
    if (!target) return;

    const entryType = sidebarEntryType(target);
    if (entryType !== 'suno' && entryType !== 'custom') return;

    const app = getApp();
    if (!app) return;

    setBusy(true);
    setError(null);
    try {
      let result: { ok: boolean; data?: { name: string }; error?: string };
      if (entryType === 'suno') {
        const playlistId = sunoPlaylistIdFromArtistId(target.id);
        if (!playlistId || !app.listener.removeSunoDemoPlaylist) {
          setError('Restart the app to enable playlist removal.');
          return;
        }
        result = await app.listener.removeSunoDemoPlaylist(playlistId);
      } else {
        const playlistId = userPlaylistIdFromArtistId(target.id);
        if (!playlistId || !app.listener.removeUserPlaylist) {
          setError('Restart the app to enable playlist removal.');
          return;
        }
        result = await app.listener.removeUserPlaylist(playlistId);
      }

      if (!result.ok || !result.data) {
        setError(result.error ?? 'Could not remove that playlist.');
        return;
      }

      setLibraryPlaylistRemoveTarget(null);
      clearPlaybackForRemovedPlaylist(target.id);
      await loadLibrary();
      addToast(`Removed ${result.data.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || 'Could not remove that playlist.');
    } finally {
      setBusy(false);
    }
  }, [
    addToast,
    clearPlaybackForRemovedPlaylist,
    libraryPlaylistRemoveTarget,
    loadLibrary,
  ]);

  const selectedSunoPlaylistId = isSunoDemoArtistId(selectedArtistId)
    ? sunoPlaylistIdFromArtistId(selectedArtistId) ?? undefined
    : undefined;
  const selectedCustomPlaylistId = isUserPlaylistArtistId(selectedArtistId)
    ? userPlaylistIdFromArtistId(selectedArtistId) ?? undefined
    : undefined;

  const selectArtist = (artistId: number) => {
    setSelectedArtistId(artistId);
    setMainContentView('artist');
  };

  const togglePlayPause = () => {
    if (showingYoutubePage && playingSongId != null && activeSongPage?.id === playingSongId) {
      if (vcYoutubeCaptureActive) {
        setIsPlaying(!isPlaying);
        return;
      }
      if (isPlaying) {
        youtubePlayerRef.current?.pause();
        setIsPlaying(false);
      } else {
        youtubePlayerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const playPrevious = () => {
    if (playingSongId == null) return;
    const previousSongId = pickPreviousPlayableSongId(sortedSongs, playingSongId);
    if (previousSongId == null) return;
    const previousSong = sortedSongs.find((song) => song.id === previousSongId);
    if (previousSong) void playSong(previousSong);
  };

  const clearPlaybackForRemovedSong = useCallback(
    (songId: number) => {
      if (playingSongId !== songId && previewSongId !== songId) return;

      destroyHls();
      const audio = audioRef.current;
      audio?.pause();
      setIsPlaying(false);
      setActivePlaybackUrl(null);
      setCurrentTime(0);
      setDuration(0);

      if (playingSongId === songId) {
        const nextSongId = pickNextPlayableSongId(
          sortedSongsRef.current.filter((row) => row.id !== songId),
          songId,
          { shuffle, repeatMode },
        );
        if (nextSongId != null) {
          const nextSong = sortedSongsRef.current.find((row) => row.id === nextSongId);
          if (nextSong) {
            void playSongRef.current(nextSong);
            return;
          }
        }
        setPlayingSongId(null);
        playingSongRowRef.current = null;
      }

      if (previewSongId === songId) {
        setPreviewSongId(null);
        setPageUrl(null);
        setMainContentView('artist');
      }
    },
    [playingSongId, previewSongId, repeatMode, shuffle],
  );

  const handlePlaylistSongRemove = useCallback(
    async (song: SongRow) => {
      setPlaylistContextMenu(null);
      const kind = playlistKindForArtistId(selectedArtistId);
      const app = getApp();
      if (!app || !kind) return;

      if (kind === 'catalog') {
        const result = await app.listener.setCatalogSongSkipped(song.artist_id, song.external_id, true);
        if (!result.ok) {
          setError(result.error ?? 'Could not skip that song.');
          return;
        }
        setSongs((prev) =>
          prev.map((row) => (row.id === song.id ? { ...row, skipped: 1 } : row)),
        );
        return;
      }

      if (kind === 'personal') {
        const result = await app.listener.removeLikedSong({
          songId: song.id,
          likedId: song.liked_id ?? null,
        });
        if (!result.ok || !result.data) {
          setError(result.error ?? 'Could not remove that liked song.');
          return;
        }
        setLikedSongCount(result.data.count);
        setLikedSongIds((prev) => {
          const next = new Set(prev);
          if (song.id > 0) next.delete(song.id);
          return next;
        });
        setSongs((prev) => prev.filter((row) => row.id !== song.id));
        if (result.data.count === 0) {
          await loadLibrary();
        }
        clearPlaybackForRemovedSong(song.id);
        return;
      }

      if (kind === 'suno') {
        const result = await app.listener.removeSunoDemoSong(song.id);
        if (!result.ok || !result.data) {
          setError(result.error ?? 'Could not remove that Suno track.');
          return;
        }
        setSongs((prev) => prev.filter((row) => row.id !== song.id));
        clearPlaybackForRemovedSong(song.id);
        await loadLibrary();
        return;
      }

      if (kind === 'custom') {
        if (!app.listener.removeUserPlaylistSong) {
          setError('Restart the app to remove songs from custom playlists.');
          return;
        }
        const result = await app.listener.removeUserPlaylistSong(song.id);
        if (!result.ok) {
          setError(result.error ?? 'Could not remove that song.');
          return;
        }
        setSongs((prev) => prev.filter((row) => row.id !== song.id));
        clearPlaybackForRemovedSong(song.id);
        await loadLibrary();
      }
    },
    [clearPlaybackForRemovedSong, loadLibrary, selectedArtistId],
  );

  const handleOpenAddToPlaylist = useCallback(
    (song: SongRow) => {
      if (selectedArtistId == null) return;
      setPlaylistContextMenu(null);
      setSongToPlaylistModal({ song, sourceArtistId: selectedArtistId });
    },
    [selectedArtistId],
  );

  const handleSongToPlaylistAdd = useCallback(
    async (destPlaylistId: number) => {
      const modal = songToPlaylistModal;
      if (!modal) return;

      const app = getApp();
      if (!app?.listener.addSongToUserPlaylist) {
        setError('Restart the app to add songs to custom playlists.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const result = await app.listener.addSongToUserPlaylist(destPlaylistId, modal.song);
        if (!result.ok) {
          setError(result.error ?? 'Could not add song to playlist.');
          return;
        }

        setSongToPlaylistModal(null);
        if (result.data?.duplicate) {
          addToast('Song is already on that playlist.');
        } else {
          addToast('Added to playlist.');
        }

        const destArtistId = userPlaylistArtistId(destPlaylistId);
        if (selectedArtistId === destArtistId) {
          setSongs(await app.listener.listSongs(destArtistId));
        }
        await loadLibrary();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'Could not add song to playlist.');
      } finally {
        setBusy(false);
      }
    },
    [addToast, loadLibrary, selectedArtistId, songToPlaylistModal],
  );

  const handleSongToPlaylistMove = useCallback(
    async (destPlaylistId: number) => {
      const modal = songToPlaylistModal;
      if (!modal) return;

      const app = getApp();
      if (!app?.listener.moveSongToUserPlaylist) {
        setError('Restart the app to move songs between playlists.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const result = await app.listener.moveSongToUserPlaylist({
          sourceArtistId: modal.sourceArtistId,
          destPlaylistId,
          song: modal.song,
        });
        if (!result.ok) {
          setError(result.error ?? 'Could not move song.');
          return;
        }

        setSongToPlaylistModal(null);
        if (result.data?.duplicate) {
          addToast('Song is already on that playlist.');
        } else {
          addToast('Moved to playlist.');
        }

        const sourceArtistId = modal.sourceArtistId;
        const destArtistId = userPlaylistArtistId(destPlaylistId);

        if (isLikedSongsArtist(sourceArtistId)) {
          const [likedCount, likedIds] = await Promise.all([
            app.listener.countLikedSongs(),
            app.listener.listLikedSongIds(),
          ]);
          setLikedSongCount(likedCount);
          setLikedSongIds(new Set(likedIds));
        }

        if (selectedArtistId === sourceArtistId) {
          setSongs((prev) => prev.filter((row) => row.id !== modal.song.id));
          clearPlaybackForRemovedSong(modal.song.id);
        } else if (selectedArtistId === destArtistId) {
          setSongs(await app.listener.listSongs(destArtistId));
        }

        await loadLibrary();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'Could not move song.');
      } finally {
        setBusy(false);
      }
    },
    [addToast, clearPlaybackForRemovedSong, loadLibrary, selectedArtistId, songToPlaylistModal],
  );

  const handlePlaylistSongRestore = useCallback(
    async (song: SongRow) => {
      setPlaylistContextMenu(null);
      const app = getApp();
      if (!app?.listener.setCatalogSongSkipped) return;

      const result = await app.listener.setCatalogSongSkipped(song.artist_id, song.external_id, false);
      if (!result.ok) {
        setError(result.error ?? 'Could not restore that song.');
        return;
      }
      setSongs((prev) =>
        prev.map((row) => (row.id === song.id ? { ...row, skipped: 0 } : row)),
      );
    },
    [],
  );

  const handleRowContextMenu = (event: React.MouseEvent, song: SongRow) => {
    event.preventDefault();
    setPlaylistContextMenu({ song, x: event.clientX, y: event.clientY });
  };

  const handleCopySongPageLink = async (song: SongRow) => {
    setPlaylistContextMenu(null);
    const link = shareableSongLink(song);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setError('Could not copy link to clipboard.');
    }
  };

  const handleRowClick = (song: SongRow) => {
    if (rowClickTimerRef.current != null) {
      window.clearTimeout(rowClickTimerRef.current);
    }
    rowClickTimerRef.current = window.setTimeout(() => {
      rowClickTimerRef.current = null;
      showSongPage(song);
    }, 250);
  };

  const handleRowDoubleClick = (song: SongRow) => {
    if (rowClickTimerRef.current != null) {
      window.clearTimeout(rowClickTimerRef.current);
      rowClickTimerRef.current = null;
    }
    void playSong(song);
  };

  const handlePlaylistDoubleClick = useCallback(
    async (artistId: number) => {
      const app = getApp();
      if (!app) return;

      const samePlaylist = selectedArtistId === artistId;
      if (!samePlaylist) {
        setSelectedArtistId(artistId);
        setMainContentView('artist');
      }

      const songRows = samePlaylist ? songs : await app.listener.listSongs(artistId);
      if (!samePlaylist) {
        setSongs(songRows);
      }
      if (!songRows.length) return;

      // Same playlist: respect the table sort the user sees; new playlist: catalog order.
      let ordered: SongRow[];
      if (samePlaylist) {
        if (sortColumn === 'custom' && customOrderIds) {
          ordered = applyCustomPlaylistOrder(songRows, customOrderIds);
        } else {
          const column = sortColumn === 'custom' ? 'order' : sortColumn;
          ordered = sortPlaylistSongs(songRows, column, sortDirection, sortDurationsSnapshot);
        }
      } else {
        ordered = sortPlaylistSongs(songRows, 'order', 'asc', {});
      }

      const firstPlayable = playableQueueSongs(ordered)[0];
      if (!firstPlayable) return;

      sortedSongsRef.current = ordered;
      void playSong(firstPlayable);
    },
    [
      customOrderIds,
      playSong,
      selectedArtistId,
      songs,
      sortColumn,
      sortDirection,
      sortDurationsSnapshot,
    ],
  );

  const playNext = () => {
    if (playingSongId == null) return;
    const nextSongId = pickNextSongId(playingSongId);
    if (nextSongId == null) return;
    const nextSong = sortedSongs.find((song) => song.id === nextSongId);
    if (nextSong) void playSong(nextSong);
  };
  playNextRef.current = playNext;

  const cycleRepeat = () => {
    setRepeatMode((mode) => {
      if (mode === 'off') return 'all';
      if (mode === 'all') return 'one';
      return 'off';
    });
  };

  const handleSeek = (time: number) => {
    if (showingYoutubePage && playingSongId != null && activeSongPage?.id === playingSongId) {
      const clamped = duration > 0 ? Math.min(duration, Math.max(0, time)) : Math.max(0, time);
      if (vcYoutubeCaptureActive) {
        setCurrentTime(clamped);
        return;
      }
      youtubePlayerRef.current?.seek(clamped);
      setCurrentTime(clamped);
      return;
    }

    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    audio.currentTime = Math.min(duration, Math.max(0, time));
    setCurrentTime(audio.currentTime);
  };

  vcTransportHandlersRef.current = {
    togglePlayPause,
    playPrevious,
    playNext,
    handleSeek,
    playSong,
    sortedSongs,
    handleYoutubeEnded,
    handleYoutubeDuration,
    applyYoutubeTiming,
  };

  const handleContentResize = (deltaY: number) => {
    const column = mainColumnRef.current;
    setContentHeight((height) => clampContentHeight(column, height + deltaY));
  };

  const handleToggleLike = async () => {
    if (!canToggleLike || previewSong == null) return;

    const app = getApp();
    if (!app) return;

    setLikeBusy(true);
    const result = await app.listener.toggleLikeSong(previewSong.id);
    setLikeBusy(false);

    if (!result.ok || !result.data) {
      setError(result.error || 'Could not update Liked Songs.');
      return;
    }

    setCurrentSongLiked(result.data.liked);
    setLikedSongCount(result.data.count);
    setLikedSongIds((prev) => {
      const next = new Set(prev);
      if (result.data!.liked) next.add(previewSong.id);
      else next.delete(previewSong.id);
      return next;
    });

    addToast(result.data.liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');

    await loadLibrary();

    if (isLikedPlaylist && !result.data.liked) {
      setSongs((prev) => prev.filter((row) => row.id !== previewSong.id));
    }
  };

  const handlePageLoadError = useCallback(
    (message: string) => {
      setPageLoadError(message);
      if (previewSong && isLikedPlaylist) {
        void markSongAvailability(previewSong, true);
      }
    },
    [isLikedPlaylist, markSongAvailability, previewSong],
  );
  const handleProfileUpdated = useCallback((updated: ArtistRow) => {
    setArtists((prev) =>
      prev.map((row) =>
        row.id === updated.id
          ? {
              ...row,
              artist_name: updated.artist_name,
              artist_slug: updated.artist_slug ?? row.artist_slug,
              artist_bio: updated.artist_bio,
              artist_social_json: updated.artist_social_json,
              artist_photo_url: updated.artist_photo_url ?? row.artist_photo_url,
              build_version: updated.build_version ?? row.build_version,
            }
          : row,
      ),
    );
  }, []);

  const renderMainContent = () => {
    if (visualizer.embeddedActive && visualizer.canVisualize) {
      return (
        <EmbeddedVisualizerHost
          experienceId={visualizer.embeddedExperienceId}
          playingSong={playingSong}
          analyser={visualizer.analyser}
          butterchurnTap={visualizer.butterchurnTap}
          applyButterchurnAudioSettings={visualizer.applyButterchurnAudioSettings}
          audioContext={visualizer.audioContext}
          frequencyData={visualizer.frequencyData}
          timeDomainData={visualizer.timeDomainData}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          settingsDialogOpen={visualizer.settingsDialogOpen}
        />
      );
    }

    if (mainContentView === 'song' && showingSunoDemoPage && activeSongPage) {
      return (
        <SunoDemoSongPage
          song={activeSongPage}
          lyricsSettings={lyricsDisplaySettings}
          onRemoveBracketsChange={setLyricsRemoveBrackets}
        />
      );
    }

    if (mainContentView === 'song' && showingYoutubePage && activeSongPage) {
      return (
        <YoutubeSongPage
          key={activeSongPage.id}
          song={activeSongPage}
          playerRef={youtubePlayerRef}
          playbackGeneration={playbackGenerationRef.current}
          shouldPlay={playingSongId === activeSongPage.id && isPlaying && !vcYoutubeCaptureActive}
          captureInVc={vcYoutubeCaptureActive}
          onReady={handleYoutubeReady}
          onPlayingChange={setIsPlaying}
          onEnded={handleYoutubeEnded}
          onDuration={handleYoutubeDuration}
          onError={handleYoutubeError}
        />
      );
    }

    if (mainContentView === 'song' && pageUrl) {
      return (
        <>
          <SongPageWebview
            key={pageLoadKey}
            loadKey={pageLoadKey}
            url={pageUrl}
            songManifestUrl={activeSongPage?.song_manifest_url}
            lyricsSettings={lyricsDisplaySettings}
            onRemoveBracketsChange={setLyricsRemoveBrackets}
            onLoadError={handlePageLoadError}
            onCoverModalChange={setCoverModalOpen}
          />
          {pageLoadError ? <p className="error song-page-load-error">{pageLoadError}</p> : null}
        </>
      );
    }

    if (mainContentView === 'artist' && selectedArtist) {
      if (isLikedSongsArtist(selectedArtist.id)) {
        return <LikedSongsPanel songCount={likedSongCount} />;
      }

      if (isSunoDemoArtistId(selectedArtist.id)) {
        return (
          <SunoOnlyPanel
            playlistName={selectedArtist.artist_name}
            dateAdded={selectedArtist.created_at}
            songCount={selectedArtist.song_count ?? songs.length}
            addTrackOpen={sunoDemoAddOpen}
            busy={busy}
            playlistId={selectedSunoPlaylistId}
            onAddTrackOpenChange={setSunoDemoAddOpen}
            onTrackAdded={() => void handleSunoDemoAdded()}
            onSharePlaylist={() => setSharePlaylistOpen(true)}
          />
        );
      }

      if (isUserPlaylistArtistId(selectedArtist.id)) {
        return (
          <CustomPlaylistPanel
            playlistName={selectedArtist.artist_name}
            songCount={selectedArtist.song_count ?? songs.length}
            playlistId={selectedCustomPlaylistId}
            addYoutubeOpen={youtubeAddOpen}
            busy={busy}
            onAddYoutubeOpenChange={setYoutubeAddOpen}
            onYoutubeAdded={(result) => void handleYoutubeAdded(result)}
            onSharePlaylist={() => setSharePlaylistOpen(true)}
          />
        );
      }

      return (
        <ArtistInfoPanel
          key={selectedArtist.id}
          artist={selectedArtist}
          busy={busy}
          onRemove={() => void handleRemove()}
          onProfileUpdated={handleProfileUpdated}
        />
      );
    }

    return <ListenerWelcome />;
  };

  return (
    <div
      className={`listener-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}${sidebarResizing ? ' sidebar-resizing' : ''}${!sidebarCollapsed && sidebarWidth >= LIBRARY_ADDED_COLUMN_MIN_WIDTH ? ' sidebar-library-added-visible' : ''}`}
      style={
        sidebarCollapsed
          ? undefined
          : ({ '--listener-sidebar-width': `${sidebarWidth}px` } as React.CSSProperties)
      }
    >
      <ListenerSidebar
        artists={sidebarLibrary.displayArtists}
        orderNumberById={sidebarLibrary.orderNumberById}
        sortColumn={sidebarLibrary.sortColumn}
        sortDirection={sidebarLibrary.sortDirection}
        onSortColumn={sidebarLibrary.toggleSortColumn}
        onSidebarReorder={sidebarLibrary.reorderSidebarRows}
        onEnterReorderMode={sidebarLibrary.activateManualOrderSort}
        selectedArtistId={selectedArtistId}
        collapsed={sidebarCollapsed}
        busy={busy}
        onToggleCollapsed={toggleSidebarCollapsed}
        onOpenSettings={onOpenSettings}
        onSubscribe={() => setSubscribeModalOpen(true)}
        onAddSunoPlaylist={() => void handleCreateSunoPlaylist()}
        onAddCustomPlaylist={() => void handleCreateCustomPlaylist()}
        onRefresh={() => void handleRefresh()}
        onSelectArtist={selectArtist}
        onPlaylistDoubleClick={(artistId) => void handlePlaylistDoubleClick(artistId)}
        onRowContextMenu={handleLibrarySidebarContextMenu}
      />
      {!sidebarCollapsed ? (
        <HorizontalResizeHandle
          onResizeDelta={handleSidebarResizeDelta}
          onResizeStart={() => setSidebarResizing(true)}
          onResizeEnd={handleSidebarResizeEnd}
        />
      ) : null}

      <div className="listener-content">
        <section className="listener-controls panel">
          <PlayerBar
            disabled={!songs.length || playingSongId == null}
            isPlaying={isPlaying}
            nowPlayingTitle={playingSong?.title ?? ''}
            shuffle={shuffle}
            repeatMode={repeatMode}
            volume={volume}
            currentTime={currentTime}
            duration={duration}
            onToggleShuffle={() => setShuffle((value) => !value)}
            onPrevious={playPrevious}
            onTogglePlayPause={togglePlayPause}
            onNext={playNext}
            onCycleRepeat={cycleRepeat}
            onVolumeChange={setVolume}
            onSeek={handleSeek}
            embeddedVisualizerActive={visualizer.embeddedActive}
            canUseVisualizer={visualizer.canVisualize && !vc.vcOpen}
            onToggleEmbeddedVisualizer={visualizer.toggleEmbedded}
            onOpenVisualizerSettings={visualizer.openSettingsDialog}
            projectionOpen={visualizer.windowOpen}
            onToggleProjection={() => void visualizer.toggleProjection()}
            onVcClick={() => {
              if (vc.vcOpen) void vc.closeVcMode();
              else vc.openModal();
            }}
            onVcLiveClick={() => setVcCloseConfirmOpen(true)}
            vcLive={vc.vcOpen}
            vcDisabled={!songs.length}
            bassBoost={bassBoost}
            lofi={lofi}
            onToggleBassBoost={toggleBassBoost}
            onToggleLofi={toggleLofi}
            crossfades={crossfades}
            onToggleCrossfades={() => setCrossfades((on) => !on)}
            seekTimeDisplay={playerSettings.seekTimeDisplay}
            onToggleSeekTimeDisplay={toggleSeekLabel}
          />
          <audio ref={audioRef} preload="metadata" />
          <audio
            ref={analyserAudioRef}
            className="listener-analyser-audio"
            preload="metadata"
            aria-hidden="true"
          />
        </section>
        {error ? <p className="error listener-feedback">{error}</p> : null}

        <div className="listener-main" ref={mainColumnRef}>
          <section className="song-page-panel panel" style={{ height: contentHeight, flex: 'none' }}>
            <h2 className="sr-only">Listener content</h2>
            {mainContentView === 'song' && pageUrl && !showingSunoDemoPage && !coverModalOpen && !visualizer.embeddedActive ? (
              <SongLikeButton
                liked={currentSongLiked}
                disabled={!canToggleLike || likeBusy}
                onToggle={() => void handleToggleLike()}
              />
            ) : null}
            <div className="song-page-panel-body">{renderMainContent()}</div>
          </section>

          <VerticalResizeHandle onResizeDelta={handleContentResize} />

          <section className={`playlist-panel panel${isLikedPlaylist ? ' liked-playlist' : ''}${isSunoPlaylist ? ' suno-playlist' : ''}${isCustomPlaylistSelected ? ' custom-playlist' : ''}`}>
            <table className={`song-table${playlistDrag.isDragging ? ' is-dragging-playlist' : ''}`}>
            <thead>
              <tr>
                <SortableColumnHeader
                  label="#"
                  column="order"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="col-order"
                />
                <SortableColumnHeader
                  label="*"
                  column="custom"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                  disabled={!hasCustomOrder}
                  className="col-custom"
                />
                <SortableColumnHeader
                  label="Title"
                  column="title"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                {showArtistColumn ? (
                  <SortableColumnHeader
                    label="Artist"
                    column="artist"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="col-artist"
                  />
                ) : null}
                <SortableColumnHeader
                  label="Album"
                  column="album"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className={showArtistColumn ? 'col-album' : undefined}
                />
                <SortableColumnHeader
                  label="Year"
                  column="year"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortableColumnHeader
                  label="Length"
                  column="length"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="col-duration"
                />
              </tr>
            </thead>
            <tbody>
              {sortedSongs.map((song, index) => {
                const dragClassName = playlistDrag.rowDragClassName(song.id, index);
                return (
                <tr
                  key={song.id}
                  ref={(node) => playlistDrag.setRowRef(index, node)}
                  className={`song-row${song.id === playingSongId ? ' playing-row' : ''}${
                    song.id === previewSongId ? ' selected-row' : ''
                  }${song.unavailable === 1 ? ' unavailable-row' : ''}${
                    isSongSkipped(song) ? ' skipped-row' : ''
                  }${dragClassName ? ` ${dragClassName}` : ''}`}
                  onClick={() => handleRowClick(song)}
                  onDoubleClick={() => handleRowDoubleClick(song)}
                  onContextMenu={(event) => handleRowContextMenu(event, song)}
                >
                  <td className="col-order">
                    <span className="playlist-order-cell">
                      <button
                        type="button"
                        className="playlist-drag-handle"
                        aria-label={`Drag to reorder ${song.title}`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          playlistDrag.startDrag(song.id, index, event.pointerId);
                        }}
                      >
                        <span aria-hidden="true">⋮⋮</span>
                      </button>
                      {isSongSkipped(song) ? <SkippedSongMarker /> : null}
                      <span className="playlist-order-index">{catalogOrderBySongId.get(song.id) ?? '—'}</span>
                    </span>
                  </td>
                  <td className="col-custom">
                    <span className="playlist-custom-index">
                      {customOrderBySongId.get(song.id) ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className="song-title-cell">
                      {!isLikedPlaylist && song.id > 0 && likedSongIds.has(song.id) ? (
                        <LikedSongIndicator />
                      ) : null}
                      <span
                        className={
                          song.unavailable === 1 || isSongSkipped(song) ? 'unavailable-title' : undefined
                        }
                      >
                        {song.title}
                      </span>
                    </span>
                  </td>
                  {showArtistColumn ? <td className="col-artist">{song.artist_name || '—'}</td> : null}
                  <td className={showArtistColumn ? 'col-album' : undefined}>{song.album || '—'}</td>
                  <td>{song.year || '—'}</td>
                  <td className="col-duration">
                    {song.unavailable === 1 ? (
                      <UnavailableLengthMarker />
                    ) : (
                      songDurationLabel(song, runtimeDurations[song.id])
                    )}
                  </td>
                </tr>
                );
              })}
              {!songs.length ? (
                <tr>
                  <td colSpan={showArtistColumn ? 7 : 6} className="empty">
                    {isLikedPlaylist
                      ? 'No liked songs yet.'
                      : isSunoPlaylist
                        ? 'No Suno tracks yet. Open the playlist home and choose Add Suno Track.'
                        : 'No songs in library.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </section>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <SubscribeArtistModal
        open={subscribeModalOpen}
        busy={busy}
        siteUrl={siteUrl}
        onSiteUrlChange={setSiteUrl}
        onSubmit={() => void handleSubscribe()}
        onClose={() => {
          if (busy) return;
          setSubscribeModalOpen(false);
          setSiteUrl('');
        }}
      />

      {playlistContextMenu ? (
        <PlaylistRowContextMenu
          song={playlistContextMenu.song}
          playlistKind={playlistKind}
          playlistName={selectedArtist?.artist_name}
          x={playlistContextMenu.x}
          y={playlistContextMenu.y}
          onAddToPlaylist={handleOpenAddToPlaylist}
          onCopyLink={(song) => void handleCopySongPageLink(song)}
          onRemove={(song) => void handlePlaylistSongRemove(song)}
          onRestore={(song) => void handlePlaylistSongRestore(song)}
          onClose={() => setPlaylistContextMenu(null)}
        />
      ) : null}

      {librarySidebarContextMenu ? (
        <LibrarySidebarContextMenu
          playlistName={librarySidebarContextMenu.artist.artist_name}
          x={librarySidebarContextMenu.x}
          y={librarySidebarContextMenu.y}
          onRename={handleRequestRenameLibraryPlaylist}
          onRemove={handleRequestRemoveLibraryPlaylist}
          onClose={() => setLibrarySidebarContextMenu(null)}
        />
      ) : null}

      <LibraryPlaylistRenameDialog
        open={libraryPlaylistRenameTarget != null}
        playlistName={libraryPlaylistRenameTarget?.artist_name ?? ''}
        busy={busy}
        onConfirm={(name) => void handleConfirmRenameLibraryPlaylist(name)}
        onCancel={() => setLibraryPlaylistRenameTarget(null)}
      />

      <SharePlaylistModal
        open={sharePlaylistOpen}
        busy={busy}
        playlistName={selectedArtist?.artist_name ?? ''}
        createdAt={selectedArtist?.created_at ?? null}
        songs={songs}
        customOrderIds={customOrderIds}
        onClose={() => setSharePlaylistOpen(false)}
        onCopyError={(message) => setError(message)}
      />

      <SongToPlaylistModal
        open={songToPlaylistModal != null}
        busy={busy}
        song={songToPlaylistModal?.song ?? null}
        sourceArtistId={songToPlaylistModal?.sourceArtistId ?? null}
        playlists={customPlaylistPickerRows}
        onAdd={(destPlaylistId) => void handleSongToPlaylistAdd(destPlaylistId)}
        onMove={(destPlaylistId) => void handleSongToPlaylistMove(destPlaylistId)}
        onCancel={() => setSongToPlaylistModal(null)}
      />

      <LibraryPlaylistRemoveConfirm
        open={libraryPlaylistRemoveTarget != null}
        playlistName={libraryPlaylistRemoveTarget?.artist_name ?? ''}
        songCount={libraryPlaylistRemoveTarget?.song_count ?? 0}
        busy={busy}
        onConfirm={() => void handleConfirmRemoveLibraryPlaylist()}
        onCancel={() => setLibraryPlaylistRemoveTarget(null)}
      />

      <VcCloseConfirmModal
        open={vcCloseConfirmOpen}
        onConfirm={() => {
          setVcCloseConfirmOpen(false);
          void vc.closeVcMode();
        }}
        onCancel={() => setVcCloseConfirmOpen(false)}
      />

      <VcModeModal
        open={vc.modalOpen}
        onClose={vc.closeModal}
        previewState={vc.designerPreviewState}
        kudos={vc.kudos}
        onStart={(config) => {
          if (playingSongId == null) {
            setError('Play a song before starting VC Mode.');
            vc.closeModal();
            return;
          }
          visualizer.dismissVisualizer();
          void vc.startVcMode(config);
        }}
      />

      <VisualizerSettingsDialog
        open={visualizer.settingsDialogOpen}
        selectedExperienceId={visualizer.activeExperienceId}
        canLaunch={visualizer.canVisualize}
        onSelectExperience={visualizer.selectExperience}
        onClose={visualizer.closeSettingsDialog}
        onLaunch={visualizer.launchEmbedded}
      />

      {visualizer.butterchurnMirrorActive || vc.butterchurnVcMirrorActive ? (
        <ButterchurnMirrorHost
          experienceId={
            vc.butterchurnVcMirrorActive ? vc.vcVisualizerId : visualizer.windowExperienceId
          }
          audioContext={vc.butterchurnVcMirrorActive ? vc.audioContext : visualizer.audioContext}
          butterchurnTap={vc.butterchurnVcMirrorActive ? vc.butterchurnTap : visualizer.butterchurnTap}
          analyser={vc.butterchurnVcMirrorActive ? null : visualizer.analyser}
          applyButterchurnAudioSettings={
            vc.butterchurnVcMirrorActive
              ? vc.applyButterchurnAudioSettings
              : visualizer.applyButterchurnAudioSettings
          }
          settings={
            vc.butterchurnVcMirrorActive ? vc.vcVisualizerSettings : butterchurnSettings
          }
          enabled
          onFrame={
            vc.butterchurnVcMirrorActive ? vc.setCanvasMirrorFrame : handleButterchurnMirrorFrame
          }
        />
      ) : null}

      <AudioDebugPanel surface="main" />
      <EffectsLabPanel
        state={effectsLab}
        onChange={setEffectsLab}
        mainAudioRef={audioRef}
        mirrorAudioRef={analyserAudioRef}
        mainVolume={volume}
        mirrorAttached={Boolean(
          analyserAudioRef.current && getAudioGraphIfExists(analyserAudioRef.current),
        )}
        graphMode={
          analyserAudioRef.current
            ? getAudioGraphIfExists(analyserAudioRef.current)?.mode ?? 'none'
            : 'none'
        }
      />
    </div>
  );
}
