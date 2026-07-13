import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { configUsesVisualizer, type VcModeConfig, type VcPlaybackEffectsMirror } from '@shared/vcModeTypes';
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
  deactivateEffectsOnPanelClose,
  effectsLabStore,
  isEffectsLabAudible,
  type EffectsLabState,
} from '../audio/effectsLab';
import { ToastStack } from './ToastStack';
import { useToasts } from './useToasts';
import { PlayerBar, type RepeatMode } from './PlayerBar';
import type { PlayerOnDeckInfo } from './PlayerOnDeckIndicator';
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
import { useListenerPlayerSettings } from './useListenerPlayerSettings';
import { usePlaylistLengthSettings } from './usePlaylistLengthSettings';
import { persistPlaylistSongSkipped } from './playlistSongSkip';
import { isSongLongerThanMinutes } from '@shared/listener/songDuration';
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
  playlistKindForArtistId,
} from '@shared/listener/playlistKinds';
import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  playableQueueSongs,
  resolvePlayableSong,
} from '@shared/listener/playbackQueue';
import {
  buildLastPlaybackState,
  LISTENER_LAST_PLAYBACK_KEY,
  normalizeListenerLastPlayback,
  type ListenerLastPlaybackState,
} from '@shared/listener/lastPlayback';
import { pickCueSongInPlaylist } from '@shared/listener/startupCue';
import {
  clearDetourState,
  createEmptyDetourState,
  markSongConsumed,
  resolveTrackEndAdvance,
  setPrimaryContext,
  type PlaybackRole,
} from '@shared/listener/playbackDetours';
import { isSongSkipped, isSongUnavailable } from '@shared/listener/playlistKinds';
import { isVcPlayLockBlocking, isVcPlayLockBlockingSongRemoval, shouldReleasePlayLockOnNaturalAdvance } from '@shared/vcMode/playLock';
import { loadOrderedPlaylistSongs, pickNextPrimarySongId } from './playbackDetourHelpers';
import { OnDeckReplaceDialog } from './OnDeckReplaceDialog';
import { ClearSongHistoryDialog } from './ClearSongHistoryDialog';
import {
  buildSongHistoryStartInput,
  normalizeSongHistoryRows,
  resolvePlayHistoryContext,
  type PlaySongHistoryOptions,
} from './songHistoryHelpers';
import {
  normalizeSongHistoryEntry,
  type SongHistoryEntry,
} from '@shared/listener/songHistory';
import type { OnDeckTrack } from '@shared/listener/playbackDetours';
import { usePlaylistDragReorder } from './usePlaylistDragReorder';
import { PlaylistTable } from './PlaylistTable';
import { usePlaylistColumnWidths } from './usePlaylistColumnWidths';
import { SongLikeButton } from './SongLikeButton';
import { LikedSongsPanel } from './LikedSongsPanel';
import { SunoDemoSongPage } from './SunoDemoSongPage';
import { shouldUseDirectAudioPlayback, loadDirectAudioPlayback } from './directAudioPlayback';
import { PlaylistRowContextMenu } from './PlaylistRowContextMenu';
import { LibrarySidebarContextMenu } from './LibrarySidebarContextMenu';
import { LibraryPlaylistRemoveConfirm } from './LibraryPlaylistRemoveConfirm';
import { LibraryPlaylistInfoDialog } from './LibraryPlaylistInfoDialog';
import { SongToPlaylistModal } from './SongToPlaylistModal';
import { SharePlaylistModal } from './SharePlaylistModal';
import { CustomPlaylistPanel } from './CustomPlaylistPanel';
import type { ExternalSongAddResult } from './AddNewSongPopover';
import { FlowSongPage } from './FlowSongPage';
import { YoutubeSongPage } from './YoutubeSongPage';
import { SoundcloudSongPage } from './SoundcloudSongPage';
import type { YoutubePlayerHandle } from './youtube/YoutubePlayer';
import type { SoundcloudPlayerHandle } from './soundcloud/SoundcloudPlayer';
import { sidebarEntryType, isRenamableSidebarPlaylist, isSidebarPlaylistContextTarget } from './sidebarEntry';
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
  isSunoDemoSong,
  isSunoDemoSongId,
} from '@shared/demo/sunoDemoFeature';
import { isYoutubeSong } from '@shared/youtube/youtubeFeature';
import { isSoundcloudSong } from '@shared/soundcloud/soundcloudFeature';
import { isFlowSong } from '@shared/flow/flowFeature';
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

function isWidgetTransportSong(song: {
  playback_scope?: string | null;
  page_url?: string | null;
}): boolean {
  return isYoutubeSong(song) || isSoundcloudSong(song);
}

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

export function ListenerMode({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [mainContentView, setMainContentView] = useState<MainContentView>('welcome');
  const [siteUrl, setSiteUrl] = useState('');
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const [vcCloseConfirmOpen, setVcCloseConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, addToast, dismissToast } = useToasts();
  const { settings: playerSettings, toggleSeekLabel } = useListenerPlayerSettings();
  const { settings: playlistLengthSettings } = usePlaylistLengthSettings();
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
  const [effectsLab, setEffectsLab] = useState<EffectsLabState>(() => ({
    ...DEFAULT_EFFECTS_LAB_STATE,
    panelVisible: effectsLabStore.isPanelVisible(),
  }));
  const [crossfades, setCrossfades] = useState(false);
  const [chromeMinified, setChromeMinified] = useState(false);
  const [contentHeight, setContentHeight] = useState(DEFAULT_CONTENT_HEIGHT);
  const [runtimeDurations, setRuntimeDurations] = useState<Record<number, number>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  /** Duration values frozen at last explicit sort — avoids live reorder as probes finish. */
  const [sortDurationsSnapshot, setSortDurationsSnapshot] = useState<Record<number, number>>({});
  const [customOrderIds, setCustomOrderIds] = useState<number[] | null>(null);
  const [likedSongCount, setLikedSongCount] = useState(0);
  const [likedSongIds, setLikedSongIds] = useState<Set<number>>(() => new Set());
  /** Long-song auto-skips during VC — session overlay only, cleared when VC Mode ends. */
  const [vcSessionSkippedIds, setVcSessionSkippedIds] = useState<Set<number>>(() => new Set());
  const [savedLastPlayback, setSavedLastPlayback] = useState<ListenerLastPlaybackState | null>(null);
  const [lastPlaybackSettingsLoaded, setLastPlaybackSettingsLoaded] = useState(false);
  const [initialLibraryLoadDone, setInitialLibraryLoadDone] = useState(false);
  const skipInitialPlaylistSelectRef = useRef(true);
  const startupCueDoneRef = useRef(false);
  const skipNextPlaylistReloadRef = useRef(false);
  const detoursRef = useRef(createEmptyDetourState());
  const interruptReturnSongRef = useRef<SongRow | null>(null);
  const onDeckSongRef = useRef<SongRow | null>(null);
  const pendingPlaybackSeekRef = useRef<number | null>(null);
  const handleTrackNaturalEndRef = useRef<() => void>(() => {});
  const handleDetourPlaybackFailureRef = useRef<() => Promise<void>>(async () => {});
  const [currentSongLiked, setCurrentSongLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [playlistContextMenu, setPlaylistContextMenu] = useState<{
    song: SongRow;
    sourceArtistId: number;
    sourcePlaylistName: string;
    x: number;
    y: number;
  } | null>(null);
  const [onDeckReplacePrompt, setOnDeckReplacePrompt] = useState<{
    incomingSong: SongRow;
    incomingArtistId: number;
    incomingPlaylistName: string;
    existingSongTitle: string;
    existingPlaylistName: string;
  } | null>(null);
  const [onDeckInfo, setOnDeckInfo] = useState<PlayerOnDeckInfo | null>(null);
  const [songHistoryOpen, setSongHistoryOpen] = useState(false);
  const [songHistoryEntries, setSongHistoryEntries] = useState<SongHistoryEntry[]>([]);
  const [songHistoryLoading, setSongHistoryLoading] = useState(false);
  const [clearSongHistoryOpen, setClearSongHistoryOpen] = useState(false);
  const [scrollToSongId, setScrollToSongId] = useState<number | null>(null);
  const activeHistoryEntryIdRef = useRef<number | null>(null);
  const songHistoryOpenRef = useRef(false);
  const pendingHistoryNavigationRef = useRef<{ song: SongRow; playlistId: number } | null>(null);
  const [librarySidebarContextMenu, setLibrarySidebarContextMenu] = useState<{
    artist: ArtistRow;
    x: number;
    y: number;
  } | null>(null);
  const [libraryPlaylistRemoveTarget, setLibraryPlaylistRemoveTarget] = useState<ArtistRow | null>(
    null,
  );
  const [libraryPlaylistInfoTarget, setLibraryPlaylistInfoTarget] = useState<ArtistRow | null>(
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
  const listenerLayoutRef = useRef<HTMLDivElement>(null);
  const listenerControlsRef = useRef<HTMLElement>(null);
  const playlistPanelRef = useRef<HTMLElement>(null);
  const rowClickTimerRef = useRef<number | null>(null);
  const durationProbeRef = useRef<Set<number>>(new Set());
  const playSongRef = useRef<(song: SongRow, options?: PlaySongOptions) => Promise<void>>(async () => {});
  const youtubePlayerRef = useRef<YoutubePlayerHandle | null>(null);
  const soundcloudPlayerRef = useRef<SoundcloudPlayerHandle | null>(null);
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
    handleSoundcloudEnded: () => {},
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
  const audioEffectsOffline = Boolean(
    isPlaying && playingSong != null && isWidgetTransportSong(playingSong),
  );
  const previewSong = songs.find((song) => song.id === previewSongId) ?? playingSong;
  const isLikedPlaylist = isLikedSongsArtist(selectedArtistId);
  const isCustomPlaylistSelected = isUserPlaylistArtistId(selectedArtistId);
  const playlistKind = playlistKindForArtistId(selectedArtistId);
  const showArtistColumn = isLikedPlaylist || isCustomPlaylistSelected;
  const showSourceColumn = isCustomPlaylistSelected;
  const playlistColumns = usePlaylistColumnWidths(playlistPanelRef, {
    hasArtist: showArtistColumn,
    hasSourceCol: showSourceColumn,
  });
  const { columnOrder, columnWidths, isResizing, profile: playlistTableProfile, resizeBetween } =
    playlistColumns;
  const activeSongPage = previewSong ?? playingSong;
  /** Transport row follows the cued preview or the active playback track. */
  const queueAnchorSongId = playingSongId ?? previewSongId;
  const transportDuration =
    playingSongId != null && duration > 0
      ? duration
      : activeSongPage
        ? activeSongPage.duration_seconds ?? runtimeDurations[activeSongPage.id] ?? 0
        : 0;
  const showingSunoDemoPage = Boolean(activeSongPage && isSunoDemoSong(activeSongPage));
  const showingYoutubePage = Boolean(activeSongPage && isYoutubeSong(activeSongPage));
  const showingSoundcloudPage = Boolean(activeSongPage && isSoundcloudSong(activeSongPage));
  const showingFlowPage = Boolean(activeSongPage && isFlowSong(activeSongPage));
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

  const setEffectsLabSynced = useCallback(
    (updater: EffectsLabState | ((prev: EffectsLabState) => EffectsLabState)) => {
      setEffectsLab((prev) => {
        let next = typeof updater === 'function' ? updater(prev) : updater;
        next = deactivateEffectsOnPanelClose(prev, next);
        if (next.panelVisible !== prev.panelVisible) {
          effectsLabStore.setPanelVisible(next.panelVisible);
        }
        if (next.effectId === 'tape' && next.enabled) {
          return { ...next, workletEnhance: true };
        }
        return next;
      });
    },
    [],
  );

  const toggleAudioEffects = useCallback(() => {
    setEffectsLabSynced((prev) => ({ ...prev, panelVisible: !prev.panelVisible }));
  }, [setEffectsLabSynced]);

  useEffect(() => {
    const syncFromStore = () => {
      const visible = effectsLabStore.isPanelVisible();
      setEffectsLab((prev) => {
        if (prev.panelVisible === visible) return prev;
        return deactivateEffectsOnPanelClose(prev, { ...prev, panelVisible: visible });
      });
    };
    window.addEventListener('songpages-effects-lab-changed', syncFromStore);
    return () => window.removeEventListener('songpages-effects-lab-changed', syncFromStore);
  }, []);

  const buildDurationSnapshot = useCallback(() => {
    const snapshot: Record<number, number> = {};
    for (const song of songs) {
      const seconds = song.duration_seconds ?? runtimeDurations[song.id];
      if (seconds != null && seconds > 0) snapshot[song.id] = seconds;
    }
    return snapshot;
  }, [runtimeDurations, songs]);

  const toggleSort = useCallback(
    (column: SortColumn) => {
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
    },
    [buildDurationSnapshot, sortColumn],
  );

  const loadLibrary = useCallback(async () => {
    const app = getApp();
    if (!app) return;

    const [artistRows, likedCount, likedIds, userPlaylists] = await Promise.all([
      app.listener.listArtists(),
      app.listener.countLikedSongs(),
      app.listener.listLikedSongIds(),
      app.listener.listUserPlaylists ? app.listener.listUserPlaylists().catch(() => []) : Promise.resolve([]),
    ]);

    setLikedSongCount(likedCount);
    setLikedSongIds(new Set(likedIds));

    let displayArtists = artistRows;
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

    if (
      displayArtists.length &&
      selectedArtistId === null &&
      !skipInitialPlaylistSelectRef.current
    ) {
      setSelectedArtistId(displayArtists[0].id);
    }

    if (!initialLibraryLoadDone) {
      setInitialLibraryLoadDone(true);
    }
  }, [initialLibraryLoadDone, selectedArtistId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    const app = getApp();
    const off = app?.listener?.onSubmissionPlaylistUpdated?.((playlistId) => {
      const artistId = userPlaylistArtistId(playlistId);
      if (selectedArtistId === artistId) {
        void app.listener.listSongs(artistId).then(setSongs);
      }
      void loadLibrary();
    });
    return () => off?.();
  }, [loadLibrary, selectedArtistId]);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setLastPlaybackSettingsLoaded(true);
      return;
    }

    let cancelled = false;
    void app.getSettings(LISTENER_LAST_PLAYBACK_KEY).then((value) => {
      if (cancelled) return;
      setSavedLastPlayback(normalizeListenerLastPlayback(value));
      setLastPlaybackSettingsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (skipNextPlaylistReloadRef.current) {
      skipNextPlaylistReloadRef.current = false;
      return;
    }
    const app = getApp();
    if (!app) return;

    if (isLikedSongsArtist(selectedArtistId)) {
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
    async (fromIndex: number, toIndex: number) => {
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
      if (!app?.listener.savePlaylistCustomOrder) return;
      const result = await app.listener.savePlaylistCustomOrder(playlistKey, reordered);
      if (!result.ok) {
        setError(result.error ?? 'Could not save playlist order.');
        return;
      }
      if (playlistKey.startsWith('user:')) {
        await loadLibrary();
      }
    },
    [loadLibrary, playlistKey],
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

  // Shrink / restore the Electron window to fit the control bar in minified mode.
  useLayoutEffect(() => {
    const app = getApp();
    if (!app?.listener?.setChromeMinified) return;

    if (!chromeMinified) {
      void app.listener.setChromeMinified({ minified: false });
      return;
    }

    const layoutEl = listenerLayoutRef.current;
    const controlsEl = listenerControlsRef.current;
    if (!layoutEl || !controlsEl) return;

    const layoutStyle = getComputedStyle(layoutEl);
    const padX = parseFloat(layoutStyle.paddingLeft) + parseFloat(layoutStyle.paddingRight);
    const padY = parseFloat(layoutStyle.paddingTop) + parseFloat(layoutStyle.paddingBottom);
    const controls = controlsEl.getBoundingClientRect();

    void app.listener.setChromeMinified({
      minified: true,
      contentWidth: Math.ceil(controls.width + padX),
      contentHeight: Math.ceil(controls.height + padY),
    });
  }, [chromeMinified]);

  useEffect(() => {
    return () => {
      const app = getApp();
      void app?.listener?.setChromeMinified({ minified: false });
    };
  }, []);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const pickNextSongId = useCallback(
    (currentSongId: number): number | null =>
      pickNextPlayableSongId(sortedSongs, currentSongId, {
        shuffle,
        repeatMode,
        sessionSkippedIds: vcSessionSkippedIds,
      }),
    [repeatMode, shuffle, sortedSongs, vcSessionSkippedIds],
  );

  const specialPlay = useSpecialPlayPause({
    onPlayNext: () => playNextRef.current(),
  });

  const handleYoutubeReady = useCallback(() => {
    if (playingSongIdRef.current != null) setIsPlaying(true);
    const pendingSeek = pendingPlaybackSeekRef.current;
    if (pendingSeek != null && pendingSeek > 0) {
      youtubePlayerRef.current?.seek(pendingSeek);
      setCurrentTime(pendingSeek);
      pendingPlaybackSeekRef.current = null;
    }
  }, []);

  const handleYoutubeError = useCallback((message: string) => {
    setError(message);
  }, []);

  const vcPlaybackEffects = useMemo(
    (): VcPlaybackEffectsMirror => ({
      bassBoost: isEffectsLabAudible(effectsLab) && effectsLab.effectId === 'bass-boost',
      lofi: isEffectsLabAudible(effectsLab) && effectsLab.effectId === 'lo-fi',
      effectsLab: {
        enabled: effectsLab.enabled,
        effectId: effectsLab.effectId,
        outputTrimDb: effectsLab.outputTrimDb,
        abBypass: effectsLab.abBypass,
        workletEnhance: effectsLab.workletEnhance,
      },
    }),
    [
      effectsLab,
      effectsLab.abBypass,
      effectsLab.effectId,
      effectsLab.enabled,
      effectsLab.outputTrimDb,
      effectsLab.workletEnhance,
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
    sessionSkippedIds: vcSessionSkippedIds,
  });

  const isPlayLockActive = vc.vcOpen && vc.playLockEnabled;
  const playLockRef = useRef(false);
  playLockRef.current = isPlayLockActive;

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

    if (vc.vcOpen && vc.activeConfig.autoSkipLongSongsEnabled) {
      const song = songs.find((row) => row.id === songId);
      if (
        song &&
        !isSongSkipped(song) &&
        !vcSessionSkippedIds.has(songId) &&
        isSongLongerThanMinutes(song, vc.activeConfig.autoSkipLongSongsMinutes, {
          ...runtimeDurations,
          [songId]: rounded,
        })
      ) {
        setVcSessionSkippedIds((current) => {
          const next = new Set(current);
          next.add(songId);
          return next;
        });
        addToast('Long track auto-skipped for VC.');
      }
    }
  }, [
    addToast,
    runtimeDurations,
    songs,
    vc.activeConfig,
    vc.vcOpen,
    vcSessionSkippedIds,
  ]);

  const handleYoutubeDuration = useCallback(
    (seconds: number) => {
      setDuration(seconds);
      if (playingSongId != null && seconds > 0) {
        void persistSongDuration(playingSongId, seconds);
      }
    },
    [persistSongDuration, playingSongId],
  );

  const wasVcOpenRef = useRef(false);
  useEffect(() => {
    if (wasVcOpenRef.current && !vc.vcOpen) {
      setVcSessionSkippedIds(new Set());
    }
    wasVcOpenRef.current = vc.vcOpen;
  }, [vc.vcOpen]);

  const vcYoutubeCaptureActive = useMemo(
    () =>
      vc.vcOpen &&
      configUsesVisualizer(vc.activeConfig) &&
      playingSong != null &&
      isYoutubeSong(playingSong),
    [vc.vcOpen, vc.activeConfig, playingSong],
  );

  const vcSoundcloudCaptureActive = useMemo(
    () =>
      vc.vcOpen &&
      configUsesVisualizer(vc.activeConfig) &&
      playingSong != null &&
      isSoundcloudSong(playingSong),
    [vc.vcOpen, vc.activeConfig, playingSong],
  );

  const vcWidgetCaptureActive = vcYoutubeCaptureActive || vcSoundcloudCaptureActive;

  const prevVcWidgetCaptureRef = useRef(false);
  useEffect(() => {
    const active = vcWidgetCaptureActive;
    const wasActive = prevVcWidgetCaptureRef.current;
    prevVcWidgetCaptureRef.current = active;
    if (!wasActive && active && playingSongId != null && playingSong != null && isWidgetTransportSong(playingSong)) {
      setIsPlaying(true);
    }
  }, [vcWidgetCaptureActive, playingSong, playingSongId]);

  const handleYoutubeEnded = useCallback(() => {
    if (advancingFromEndedRef.current) return;
    if (repeatMode === 'one' && detoursRef.current.activeRole === 'primary' && !detoursRef.current.onDeck) {
      setIsPlaying(false);
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
    handleTrackNaturalEndRef.current();
  }, [repeatMode, vcYoutubeCaptureActive]);

  const handleSoundcloudEnded = useCallback(() => {
    if (advancingFromEndedRef.current) return;
    if (repeatMode === 'one' && detoursRef.current.activeRole === 'primary' && !detoursRef.current.onDeck) {
      setIsPlaying(false);
      if (vcSoundcloudCaptureActive) {
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        soundcloudPlayerRef.current?.seek(0);
        soundcloudPlayerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }
    handleTrackNaturalEndRef.current();
  }, [repeatMode, vcSoundcloudCaptureActive]);

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
    isPlayLockBlocking: () => playLockRef.current,
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
    isEffectsLabAudible(effectsLab);

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
    bassBoost: false,
    lofi: false,
    effectsLab,
    // VC window owns audible output — main stays timing-only while VC is open.
    vcMirrorPlaybackActive: vc.vcOpen,
  });

  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onTransport) return;

    const off = app.vc.onTransport((command) => {
      const handlers = vcTransportHandlersRef.current;
      const playLockOn = playLockRef.current;
      const lockContext = { playingSongId: playingSongIdRef.current };

      if (command.type === 'playPause') {
        handlers.togglePlayPause();
        return;
      }
      if (command.type === 'prev') {
        if (isVcPlayLockBlocking(playLockOn, 'prev', lockContext)) return;
        handlers.playPrevious();
        return;
      }
      if (command.type === 'next') {
        if (isVcPlayLockBlocking(playLockOn, 'next', lockContext)) return;
        handlers.playNext();
        return;
      }
      if (command.type === 'seek') {
        handlers.handleSeek(command.seconds);
        return;
      }
      if (command.type === 'playSong') {
        if (
          isVcPlayLockBlocking(playLockOn, 'change-song', {
            ...lockContext,
            targetSongId: command.songId,
          })
        ) {
          return;
        }
        const target = handlers.sortedSongs.find((song) => song.id === command.songId);
        if (target) void handlers.playSong(target);
        return;
      }
      if (command.type === 'playNextSong') {
        if (isVcPlayLockBlocking(playLockOn, 'play-next-song', lockContext)) return;
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
        return;
      }
      if (command.type === 'soundcloudEnded') {
        handlers.handleSoundcloudEnded();
        return;
      }
      if (command.type === 'soundcloudTiming') {
        handlers.applyYoutubeTiming(command.currentTime, command.duration);
        return;
      }
      if (command.type === 'soundcloudDuration') {
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
    if (isEffectsLabAudible(effectsLab)) return;
    audio.volume = volume;
  }, [volume, effectsLab, vc.vcOpen]);

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
      // YouTube and SoundCloud use embedded widget players — length comes from the widget on first play.
      if (isWidgetTransportSong(song)) return;
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

  type PlaySongOptions = PlaySongHistoryOptions & {
    startAt?: number;
    detour?: boolean;
    role?: PlaybackRole;
    /** When true, VC Play Lock may block this playback change. */
    userInitiated?: boolean;
  };

  const getPlaybackPositionSeconds = useCallback((): number => {
    if (showingYoutubePage && playingSongId != null) {
      const time = youtubePlayerRef.current?.getCurrentTime();
      if (Number.isFinite(time)) return time as number;
    }
    if (showingSoundcloudPage && playingSongId != null) {
      const time = soundcloudPlayerRef.current?.getCurrentTime();
      if (Number.isFinite(time)) return time as number;
    }
    return audioRef.current?.currentTime ?? currentTime;
  }, [currentTime, playingSongId, showingSoundcloudPage, showingYoutubePage]);

  const finalizeActiveHistoryEntry = useCallback(
    async (patch: {
      completed?: boolean;
      playbackSeconds?: number;
      durationSeconds?: number | null;
      interrupted?: boolean;
    }) => {
      const entryId = activeHistoryEntryIdRef.current;
      if (entryId == null) return;

      const app = getApp();
      if (!app?.listener?.updateSongHistoryEntry) return;

      await app.listener.updateSongHistoryEntry(entryId, patch);
      activeHistoryEntryIdRef.current = null;

      if (songHistoryOpenRef.current) {
        void loadSongHistoryRef.current();
      }
    },
    [],
  );

  const loadSongHistory = useCallback(async () => {
    const app = getApp();
    if (!app?.listener?.listSongHistory) return;

    setSongHistoryLoading(true);
    try {
      const rows = await app.listener.listSongHistory();
      setSongHistoryEntries(normalizeSongHistoryRows(rows));
    } finally {
      setSongHistoryLoading(false);
    }
  }, []);

  const loadSongHistoryRef = useRef(loadSongHistory);
  loadSongHistoryRef.current = loadSongHistory;

  useEffect(() => {
    songHistoryOpenRef.current = songHistoryOpen;
    if (songHistoryOpen) void loadSongHistory();
  }, [loadSongHistory, songHistoryOpen]);

  const beginPlaybackHistory = useCallback(
    async (song: SongRow, options: PlaySongOptions, onDeckMeta: OnDeckTrack | null) => {
      const app = getApp();
      if (!app?.listener?.recordSongHistoryStart) return;

      const playedSeconds = getPlaybackPositionSeconds();
      const activeDuration =
        duration > 0 ? duration : playingSongRowRef.current?.duration_seconds ?? null;

      await finalizeActiveHistoryEntry({
        interrupted: true,
        completed: false,
        playbackSeconds: playedSeconds,
        durationSeconds: activeDuration,
      });

      const context = resolvePlayHistoryContext(song, options, {
        selectedArtistId,
        artists,
        onDeckMeta,
        primaryPlaylistId: detoursRef.current.primary?.artistId ?? null,
      });

      const input = buildSongHistoryStartInput(song, context, {
        vcOpen: vc.vcOpen,
        durationSeconds: song.duration_seconds ?? duration,
      });

      const result = await app.listener.recordSongHistoryStart(input);
      if (result?.ok && result.data) {
        const entry = normalizeSongHistoryEntry(result.data);
        activeHistoryEntryIdRef.current = entry?.id ?? null;
      }

      if (songHistoryOpenRef.current) {
        void loadSongHistoryRef.current();
      }
    },
    [artists, duration, finalizeActiveHistoryEntry, getPlaybackPositionSeconds, selectedArtistId, vc.vcOpen],
  );

  const resolveHistorySong = useCallback(
    async (entry: SongHistoryEntry): Promise<{ song: SongRow; playlistId: number } | null> => {
      const app = getApp();
      if (!app || entry.playlistId == null) return null;

      const playlistExists = artists.some((artist) => artist.id === entry.playlistId);
      if (!playlistExists) return null;

      const songRows = await app.listener.listSongs(entry.playlistId);
      const song = songRows.find((row) => row.id === entry.songId);
      if (!song) return null;

      return { song, playlistId: entry.playlistId };
    },
    [artists],
  );

  const playSong = useCallback(
    async (song: SongRow, options: PlaySongOptions = {}) => {
      const { startAt = 0, detour = false, role = 'primary', userInitiated = false } = options;
      const historyOnDeck =
        detour && role === 'on-deck' ? detoursRef.current.onDeck : null;

      if (userInitiated && playLockRef.current) {
        if (detour) {
          if (
            role === 'play-now' &&
            isVcPlayLockBlocking(true, 'play-now', { playingSongId })
          ) {
            return;
          }
          if (
            role === 'on-deck' &&
            isVcPlayLockBlocking(true, 'on-deck', { playingSongId })
          ) {
            return;
          }
        } else if (
          isVcPlayLockBlocking(true, 'change-song', {
            playingSongId,
            targetSongId: song.id,
          })
        ) {
          return;
        }
      }

      if (!detour) {
        clearDetourState(detoursRef.current);
        interruptReturnSongRef.current = null;
        onDeckSongRef.current = null;
        setOnDeckInfo(null);
        if (selectedArtistId != null) {
          setPrimaryContext(detoursRef.current, selectedArtistId, song.id);
        }

        const playableSong = resolvePlayableSong(sortedSongsRef.current, song, {
          sessionSkippedIds: vcSessionSkippedIds,
        });
        if (!playableSong) return;
        if (playableSong.id !== song.id) {
          void playSongRef.current(playableSong, { ...options, userInitiated });
          return;
        }
      } else {
        if (
          isSongUnavailable(song) ||
          isSongSkipped(song) ||
          vcSessionSkippedIds.has(song.id)
        ) {
          void handleDetourPlaybackFailureRef.current();
          return;
        }
        if (role === 'on-deck') {
          markSongConsumed(detoursRef.current, song.id);
          detoursRef.current.onDeck = null;
          onDeckSongRef.current = null;
          setOnDeckInfo(null);
        }
        detoursRef.current.activeRole = role;
      }

      void beginPlaybackHistory(song, options, historyOnDeck);

      const generation = ++playbackGenerationRef.current;
      const accessGeneration = ++pageAccessGenerationRef.current;

      setPlayingSongId(song.id);
      playingSongRowRef.current = song;
      setActivePlaybackUrl(isWidgetTransportSong(song) ? null : (song.playback_url ?? null));
      setCurrentTime(startAt > 0 ? startAt : 0);
      setDuration(song.duration_seconds ?? 0);
      setIsPlaying(isWidgetTransportSong(song));
      setPreviewSongId(song.id);
      setMainContentView('song');
      setPageLoadError(null);
      setError(null);

      if (!detour && selectedArtistId != null) {
        void getApp()?.saveSettings(
          LISTENER_LAST_PLAYBACK_KEY,
          buildLastPlaybackState(selectedArtistId, song.id),
        );
      }

      const access = await resolveSongAccess(song, 'play_song');
      if (accessGeneration !== pageAccessGenerationRef.current) return;

      setPageLoadKey((key) => key + 1);
      setPageUrl(access.pageUrl);

      void probeLikedSongAvailability(song);

      const audio = audioRef.current;
      if (!audio) return;

      const handlePlaybackFailure = () => {
        if (detour) {
          void handleDetourPlaybackFailureRef.current();
        }
      };

      if (isWidgetTransportSong(song)) {
        suppressPlaybackEndedRef.current = true;
        destroyHls();
        audio.pause();
        suppressPlaybackEndedRef.current = false;
        pendingPlaybackSeekRef.current = startAt > 0 ? startAt : null;
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
        if (startAt > 0) {
          audio.currentTime = startAt;
          setCurrentTime(startAt);
        }
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
            handlePlaybackFailure();
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
        handlePlaybackFailure();
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
            handlePlaybackFailure();
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
        handlePlaybackFailure();
      }
    },
    [beginPlaybackHistory, markSongAvailability, probeLikedSongAvailability, selectedArtistId, vcSessionSkippedIds],
  );

  const primaryQueueOptions = useCallback(
    (): { shuffle: boolean; repeatMode: RepeatMode; sessionSkippedIds: Set<number> } => ({
      shuffle,
      repeatMode,
      sessionSkippedIds: vcSessionSkippedIds,
    }),
    [repeatMode, shuffle, vcSessionSkippedIds],
  );

  const ensurePrimaryPlaybackContext = useCallback(() => {
    if (detoursRef.current.primary || selectedArtistId == null || playingSongId == null) return;
    setPrimaryContext(detoursRef.current, selectedArtistId, playingSongId);
  }, [playingSongId, selectedArtistId]);

  const playPrimarySongById = useCallback(
    async (songId: number, options: PlaySongOptions = {}) => {
      const primary = detoursRef.current.primary;
      if (!primary) return;

      let ordered =
        primary.artistId === selectedArtistId
          ? sortedSongsRef.current
          : await loadOrderedPlaylistSongs(primary.artistId);
      let song = ordered.find((row) => row.id === songId) ?? null;
      if (!song) {
        ordered = await loadOrderedPlaylistSongs(primary.artistId);
        song = ordered.find((row) => row.id === songId) ?? null;
      }
      if (!song) return;
      await playSong(song, {
        ...options,
        detour: options.detour ?? true,
        role: options.role ?? 'primary',
      });
    },
    [playSong, selectedArtistId],
  );

  const advancePrimaryPlaylist = useCallback(
    async (anchorSongId: number, consumedSongIds: readonly number[]) => {
      const primary = detoursRef.current.primary;
      if (!primary) return;

      const ordered =
        primary.artistId === selectedArtistId
          ? sortedSongsRef.current
          : await loadOrderedPlaylistSongs(primary.artistId);
      const nextSongId = pickNextPrimarySongId(
        ordered,
        anchorSongId,
        primaryQueueOptions(),
        consumedSongIds,
      );
      if (nextSongId == null) return;
      const nextSong = ordered.find((row) => row.id === nextSongId);
      if (!nextSong) return;
      detoursRef.current.activeRole = 'primary';
      if (detoursRef.current.primary) {
        detoursRef.current.primary.anchorSongId = nextSong.id;
      }
      const restartCurrent =
        nextSong.id === playingSongIdRef.current && primaryQueueOptions().repeatMode === 'one';
      await playSong(nextSong, {
        detour: true,
        role: 'primary',
        startAt: restartCurrent ? 0 : undefined,
      });
    },
    [playSong, primaryQueueOptions, selectedArtistId],
  );

  const handleDetourPlaybackFailure = useCallback(async () => {
    const role = detoursRef.current.activeRole;
    if (role === 'play-now') {
      const resumeSong = interruptReturnSongRef.current;
      const interrupt = detoursRef.current.interrupt;
      detoursRef.current.interrupt = null;
      detoursRef.current.activeRole = 'primary';
      if (resumeSong && interrupt) {
        await playSong(resumeSong, {
          startAt: interrupt.returnPositionSeconds,
          detour: true,
          role: 'primary',
        });
      }
      return;
    }

    if (role === 'on-deck') {
      detoursRef.current.activeRole = 'primary';
      const primary = detoursRef.current.primary;
      if (!primary) return;
      await advancePrimaryPlaylist(primary.anchorSongId, primary.consumedSongIds);
    }
  }, [advancePrimaryPlaylist, playSong]);

  /** Start the queued On Deck track — used when the current song ends or the user hits Next. */
  const playQueuedOnDeckIfAny = useCallback(async (fromUser = false): Promise<boolean> => {
    if (fromUser && playLockRef.current) return false;

    const deckTrack = detoursRef.current.onDeck;
    if (!deckTrack) return false;

    const deckSong = onDeckSongRef.current;
    detoursRef.current.onDeck = null;
    onDeckSongRef.current = null;
    setOnDeckInfo(null);

    if (!deckSong || deckSong.id !== deckTrack.songId) {
      const primary = detoursRef.current.primary;
      const currentSongId = playingSongIdRef.current;
      if (primary && currentSongId != null) {
        await advancePrimaryPlaylist(currentSongId, primary.consumedSongIds);
      }
      return false;
    }

    await playSong(deckSong, { detour: true, role: 'on-deck' });
    return true;
  }, [advancePrimaryPlaylist, playSong]);

  const dismissOnDeck = useCallback(() => {
    detoursRef.current.onDeck = null;
    onDeckSongRef.current = null;
    setOnDeckInfo(null);
  }, []);

  const handleTrackNaturalEnd = useCallback(async () => {
    if (advancingFromEndedRef.current) return;

    const currentSongId = playingSongIdRef.current;
    if (currentSongId == null) return;

    if (vc.vcOpen && specialPlay.beginPauseAfterSong(vc.activeConfig.specialPlayStyle)) {
      return;
    }

    advancingFromEndedRef.current = true;
    try {
      const action = resolveTrackEndAdvance({
        state: detoursRef.current,
        repeatMode,
        currentSongId,
      });

      setIsPlaying(false);

      const finalizeCompletedHistory = async () => {
        const activeDuration =
          duration > 0 ? duration : playingSongRowRef.current?.duration_seconds ?? null;
        const seconds =
          activeDuration != null && activeDuration > 0
            ? activeDuration
            : getPlaybackPositionSeconds();
        await finalizeActiveHistoryEntry({
          completed: true,
          interrupted: false,
          playbackSeconds: seconds,
          durationSeconds: activeDuration,
        });
      };

      switch (action.type) {
        case 'repeat-current': {
          const audio = audioRef.current;
          const row = playingSongRowRef.current;
          if (row && isWidgetTransportSong(row)) {
            if (vcYoutubeCaptureActive || vcSoundcloudCaptureActive) {
              setCurrentTime(0);
              setIsPlaying(true);
            } else if (isYoutubeSong(row)) {
              youtubePlayerRef.current?.seek(0);
              youtubePlayerRef.current?.play();
              setIsPlaying(true);
            } else {
              soundcloudPlayerRef.current?.seek(0);
              soundcloudPlayerRef.current?.play();
              setIsPlaying(true);
            }
          } else if (audio) {
            audio.currentTime = 0;
            void audio.play();
            setIsPlaying(true);
          }
          break;
        }
        case 'play-on-deck': {
          await finalizeCompletedHistory();
          await playQueuedOnDeckIfAny();
          break;
        }
        case 'resume-interrupt': {
          await finalizeCompletedHistory();
          const resumeSong = interruptReturnSongRef.current;
          const interrupt = detoursRef.current.interrupt;
          detoursRef.current.interrupt = null;
          detoursRef.current.activeRole = 'primary';
          if (resumeSong && interrupt) {
            await playSong(resumeSong, {
              startAt: interrupt.returnPositionSeconds,
              detour: true,
              role: 'primary',
            });
          }
          break;
        }
        case 'repeat-primary-anchor': {
          await finalizeCompletedHistory();
          detoursRef.current.activeRole = 'primary';
          await playPrimarySongById(action.songId);
          break;
        }
        case 'advance-primary': {
          await finalizeCompletedHistory();
          detoursRef.current.activeRole = 'primary';
          await advancePrimaryPlaylist(action.anchorSongId, action.consumedSongIds);
          break;
        }
        case 'stop':
          await finalizeCompletedHistory();
          break;
      }

      if (shouldReleasePlayLockOnNaturalAdvance(action.type)) {
        vc.releasePlayLockIfScheduled();
      }
    } finally {
      advancingFromEndedRef.current = false;
    }
  }, [
    advancePrimaryPlaylist,
    duration,
    finalizeActiveHistoryEntry,
    getPlaybackPositionSeconds,
    handleDetourPlaybackFailure,
    playPrimarySongById,
    playQueuedOnDeckIfAny,
    playSong,
    repeatMode,
    specialPlay,
    vc.activeConfig.specialPlayStyle,
    vc.releasePlayLockIfScheduled,
    vc.vcOpen,
    vcSoundcloudCaptureActive,
    vcYoutubeCaptureActive,
  ]);

  useEffect(() => {
    handleDetourPlaybackFailureRef.current = handleDetourPlaybackFailure;
  }, [handleDetourPlaybackFailure]);

  useEffect(() => {
    handleTrackNaturalEndRef.current = () => {
      void handleTrackNaturalEnd();
    };
  }, [handleTrackNaturalEnd]);

  const queueOnDeck = useCallback(
    (song: SongRow, artistId: number, playlistName: string) => {
      ensurePrimaryPlaybackContext();
      onDeckSongRef.current = song;
      detoursRef.current.onDeck = {
        songId: song.id,
        artistId,
        songTitle: song.title,
        playlistName,
      };
      setOnDeckInfo({
        songTitle: song.title,
        artistName: song.artist_name ?? '',
        playlistName,
      });
    },
    [ensurePrimaryPlaybackContext],
  );

  const handlePlayNowFromContext = useCallback(
    async (song: SongRow) => {
      if (playingSongId == null || !playingSong) return;
      if (isVcPlayLockBlocking(playLockRef.current, 'play-now', { playingSongId })) return;
      const menu = playlistContextMenu;
      setPlaylistContextMenu(null);
      setOnDeckReplacePrompt(null);
      ensurePrimaryPlaybackContext();

      const primary = detoursRef.current.primary;
      if (primary) {
        primary.anchorSongId = playingSongId;
      }

      interruptReturnSongRef.current = playingSong;
      detoursRef.current.interrupt = {
        returnSongId: playingSong.id,
        returnArtistId: primary?.artistId ?? selectedArtistId ?? playingSong.artist_id,
        returnPositionSeconds: getPlaybackPositionSeconds(),
      };
      detoursRef.current.activeRole = 'play-now';
      await playSong(song, {
        detour: true,
        role: 'play-now',
        userInitiated: true,
        historyContext: menu
          ? {
              playlistId: menu.sourceArtistId,
              playlistName: menu.sourcePlaylistName,
              playbackType: 'play-now',
              interruptedPrevious: true,
            }
          : undefined,
      });
    },
    [
      ensurePrimaryPlaybackContext,
      getPlaybackPositionSeconds,
      playSong,
      playingSong,
      playingSongId,
      playlistContextMenu,
      selectedArtistId,
    ],
  );

  const handlePutOnDeckFromContext = useCallback(
    (song: SongRow, artistId: number, playlistName: string) => {
      if (playingSongId == null) return;
      if (isVcPlayLockBlocking(playLockRef.current, 'on-deck', { playingSongId })) return;
      setPlaylistContextMenu(null);
      ensurePrimaryPlaybackContext();

      const existing = detoursRef.current.onDeck;
      if (existing && existing.songId !== song.id) {
        setOnDeckReplacePrompt({
          incomingSong: song,
          incomingArtistId: artistId,
          incomingPlaylistName: playlistName,
          existingSongTitle: existing.songTitle,
          existingPlaylistName: existing.playlistName,
        });
        return;
      }

      queueOnDeck(song, artistId, playlistName);
    },
    [ensurePrimaryPlaybackContext, playingSongId, queueOnDeck],
  );

  const handleSongHistoryAddToPlaylist = useCallback(
    async (entry: SongHistoryEntry) => {
      const resolved = await resolveHistorySong(entry);
      if (!resolved) {
        addToast('This song is no longer available in your library.');
        return;
      }
      setSongToPlaylistModal({ song: resolved.song, sourceArtistId: resolved.playlistId });
    },
    [addToast, resolveHistorySong],
  );

  const handleSongHistoryPutOnDeck = useCallback(
    async (entry: SongHistoryEntry) => {
      const resolved = await resolveHistorySong(entry);
      if (!resolved) {
        addToast('This song is no longer available in your library.');
        return;
      }
      if (playingSongId == null) {
        addToast('Start playback before queuing a song on deck.');
        return;
      }
      handlePutOnDeckFromContext(
        resolved.song,
        resolved.playlistId,
        entry.playlistName ?? 'Playlist',
      );
    },
    [addToast, handlePutOnDeckFromContext, playingSongId, resolveHistorySong],
  );

  const handleSongHistoryPlayNow = useCallback(
    async (entry: SongHistoryEntry) => {
      const resolved = await resolveHistorySong(entry);
      if (!resolved) {
        addToast('This song is no longer available in your library.');
        return;
      }
      if (playingSongId == null || !playingSong) {
        await playSong(resolved.song, { userInitiated: true });
        return;
      }

      if (isVcPlayLockBlocking(playLockRef.current, 'play-now', { playingSongId })) return;
      ensurePrimaryPlaybackContext();
      const primary = detoursRef.current.primary;
      if (primary) {
        primary.anchorSongId = playingSongId;
      }

      interruptReturnSongRef.current = playingSong;
      detoursRef.current.interrupt = {
        returnSongId: playingSong.id,
        returnArtistId: primary?.artistId ?? selectedArtistId ?? playingSong.artist_id,
        returnPositionSeconds: getPlaybackPositionSeconds(),
      };
      detoursRef.current.activeRole = 'play-now';
      await playSong(resolved.song, {
        detour: true,
        role: 'play-now',
        userInitiated: true,
        historyContext: {
          playlistId: resolved.playlistId,
          playlistName: entry.playlistName,
          playbackType: 'play-now',
          interruptedPrevious: true,
        },
      });
    },
    [
      addToast,
      ensurePrimaryPlaybackContext,
      getPlaybackPositionSeconds,
      playSong,
      playingSong,
      playingSongId,
      resolveHistorySong,
      selectedArtistId,
    ],
  );

  const handleSongHistoryGoToSong = useCallback(
    async (entry: SongHistoryEntry) => {
      const resolved = await resolveHistorySong(entry);
      if (!resolved) {
        addToast('This song is no longer available in your library.');
        return;
      }

      if (selectedArtistId !== resolved.playlistId) {
        pendingHistoryNavigationRef.current = resolved;
        skipNextPlaylistReloadRef.current = false;
        setSelectedArtistId(resolved.playlistId);
        setMainContentView('artist');
        setSongHistoryOpen(false);
        return;
      }

      await showSongPage(resolved.song);
      setScrollToSongId(resolved.song.id);
      setSongHistoryOpen(false);
    },
    [addToast, resolveHistorySong, selectedArtistId, showSongPage],
  );

  const handleConfirmClearSongHistory = useCallback(async () => {
    const app = getApp();
    if (!app?.listener?.clearSongHistory) return;
    await app.listener.clearSongHistory();
    setSongHistoryEntries([]);
    setClearSongHistoryOpen(false);
  }, []);

  useEffect(() => {
    const pending = pendingHistoryNavigationRef.current;
    if (!pending || selectedArtistId !== pending.playlistId) return;

    const song = sortedSongs.find((row) => row.id === pending.song.id);
    if (!song) return;

    pendingHistoryNavigationRef.current = null;
    void showSongPage(song);
    setScrollToSongId(song.id);
  }, [selectedArtistId, showSongPage, sortedSongs]);

  useEffect(() => {
    if (!lastPlaybackSettingsLoaded || !sidebarLibrary.loaded || !initialLibraryLoadDone) return;
    if (startupCueDoneRef.current) return;
    startupCueDoneRef.current = true;

    void (async () => {
      const app = getApp();
      const sidebarArtists = sidebarLibrary.displayArtists;
      let cueApplied = false;

      const cuePlaylist = async (
        artistId: number,
        preferredSongId?: number,
      ): Promise<boolean> => {
        if (!app) return false;

        const songRows = await app.listener.listSongs(artistId);
        if (!songRows.length) return false;

        const playlistKey = playlistKeyForArtistId(artistId);
        const orderState = app.listener.getPlaylistOrderState
          ? await app.listener.getPlaylistOrderState(
              playlistKey,
              songRows.map((song) => song.id),
            )
          : null;
        const customOrderIds =
          orderState?.ok && orderState.data?.hasCustomOrder ? orderState.data.songIds : null;

        const song = pickCueSongInPlaylist(songRows, {
          preferredSongId,
          customOrderIds,
        });
        if (!song) return false;

        skipNextPlaylistReloadRef.current = true;
        setSelectedArtistId(artistId);
        setSongs(songRows);
        setCustomOrderIds(customOrderIds);
        setSortColumn(customOrderIds ? 'custom' : 'order');
        setSortDirection('asc');
        setSortDurationsSnapshot({});
        await showSongPage(song);
        return true;
      };

      if (savedLastPlayback) {
        const playlistStillExists = sidebarArtists.some(
          (artist) => artist.id === savedLastPlayback.artistId,
        );
        if (playlistStillExists) {
          cueApplied = await cuePlaylist(
            savedLastPlayback.artistId,
            savedLastPlayback.songId,
          );
        }

        if (!cueApplied && likedSongCount > 0) {
          cueApplied = await cuePlaylist(LIKED_SONGS_ARTIST_ID);
        }

        if (!cueApplied) {
          for (const artist of sidebarArtists) {
            if (isLikedSongsArtist(artist.id)) continue;
            cueApplied = await cuePlaylist(artist.id);
            if (cueApplied) break;
          }
        }
      }

      skipInitialPlaylistSelectRef.current = false;
      if (!cueApplied && sidebarArtists[0]) {
        setSelectedArtistId(sidebarArtists[0].id);
      }
    })();
  }, [
    initialLibraryLoadDone,
    lastPlaybackSettingsLoaded,
    likedSongCount,
    savedLastPlayback,
    showSongPage,
    sidebarLibrary.displayArtists,
    sidebarLibrary.loaded,
  ]);

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
      if (
        repeatMode === 'one' &&
        detoursRef.current.activeRole === 'primary' &&
        !detoursRef.current.onDeck
      ) {
        audio.currentTime = 0;
        void audio.play();
        setIsPlaying(true);
        return;
      }

      handleTrackNaturalEndRef.current();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      // playSong pauses the hidden <audio> for widget transport tracks — that must not clear isPlaying.
      const row = playingSongRowRef.current;
      if (row && isWidgetTransportSong(row) && playingSongIdRef.current === row.id) return;
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
  }, [persistSongDuration, playingSongId, repeatMode]);

  useEffect(() => {
    if (vcWidgetCaptureActive) return;
    if ((!showingYoutubePage && !showingSoundcloudPage) || playingSongId == null || !isPlaying) return;

    const tick = () => {
      const player = showingYoutubePage
        ? youtubePlayerRef.current
        : soundcloudPlayerRef.current;
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
  }, [isPlaying, playingSongId, showingSoundcloudPage, showingYoutubePage, vcWidgetCaptureActive]);

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
    if (selectedArtistId === null || isLikedSongsArtist(selectedArtistId)) {
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

  const applyVcAutoSkipToCurrentPlaylist = useCallback(
    (config: VcModeConfig) => {
      if (!config.autoSkipLongSongsEnabled) return;

      const minutes = config.autoSkipLongSongsMinutes;
      const candidates = songs.filter(
        (song) =>
          !isSongSkipped(song) &&
          !vcSessionSkippedIds.has(song.id) &&
          isSongLongerThanMinutes(song, minutes, runtimeDurations),
      );
      if (!candidates.length) return;

      setVcSessionSkippedIds((prev) => {
        const next = new Set(prev);
        for (const song of candidates) next.add(song.id);
        return next;
      });
      addToast(
        `Skipped ${candidates.length} long ${candidates.length === 1 ? 'track' : 'tracks'} for this VC session.`,
      );
    },
    [addToast, runtimeDurations, songs, vcSessionSkippedIds],
  );

  const maybeAutoSkipSongForVc = useCallback(
    (song: SongRow) => {
      if (!vc.vcOpen || !vc.activeConfig.autoSkipLongSongsEnabled) return false;
      if (isSongSkipped(song) || vcSessionSkippedIds.has(song.id)) return false;
      if (
        !isSongLongerThanMinutes(song, vc.activeConfig.autoSkipLongSongsMinutes, runtimeDurations)
      ) {
        return false;
      }

      setVcSessionSkippedIds((prev) => {
        const next = new Set(prev);
        next.add(song.id);
        return next;
      });
      addToast('Long track auto-skipped for VC.');
      return true;
    },
    [addToast, runtimeDurations, vc.activeConfig, vc.vcOpen, vcSessionSkippedIds],
  );

  const handleExternalSongAdded = useCallback(
    async (result: ExternalSongAddResult) => {
      if (
        !result.duplicate &&
        result.song &&
        isUserPlaylistArtistId(selectedArtistId)
      ) {
        setSongs((prev) => [result.song!, ...prev.filter((row) => row.id !== result.song!.id)]);
      }

      await loadLibrary();

      if (!result.duplicate && result.song && isUserPlaylistArtistId(selectedArtistId)) {
        maybeAutoSkipSongForVc(result.song);
      }

      if (result.duplicate) {
        addToast('Song is already on that playlist.');
      } else {
        addToast('Added to playlist.');
      }
      if (result.intakeNotice) addToast(result.intakeNotice);
    },
    [addToast, loadLibrary, maybeAutoSkipSongForVc, selectedArtistId],
  );

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

  const openPlaylistInfoForArtist = useCallback((artist: ArtistRow) => {
    const type = sidebarEntryType(artist);
    if (!isRenamableSidebarPlaylist(type)) return;
    setLibraryPlaylistInfoTarget(artist);
  }, []);

  const handleRequestPlaylistInfo = useCallback(() => {
    if (!librarySidebarContextMenu) return;
    openPlaylistInfoForArtist(librarySidebarContextMenu.artist);
    setLibrarySidebarContextMenu(null);
  }, [librarySidebarContextMenu, openPlaylistInfoForArtist]);

  const handleConfirmPlaylistInfo = useCallback(
    async ({ name, about }: { name: string; about: string }) => {
      const target = libraryPlaylistInfoTarget;
      if (!target) return;

      const entryType = sidebarEntryType(target);
      const app = getApp();
      if (!app) return;

      setBusy(true);
      setError(null);
      try {
        let result;
        if (entryType === 'playlist') {
          const playlistId = userPlaylistIdFromArtistId(target.id);
          if (!playlistId || !app.listener.updateUserPlaylist) {
            setError('Restart the app to enable playlist editing.');
            return;
          }
          result = await app.listener.updateUserPlaylist(playlistId, { name, about });
        } else {
          return;
        }

        if (!result.ok || !result.data) {
          setError(result.error ?? 'Could not update that playlist.');
          return;
        }

        const aboutText = result.data.about?.trim() || null;
        setLibraryPlaylistInfoTarget(null);
        setArtists((prev) =>
          prev.map((row) =>
            row.id === target.id
              ? {
                  ...row,
                  artist_name: result.data!.name,
                  artist_bio: aboutText,
                  updated_at: result.data!.updated_at ?? result.data!.created_at,
                  song_count: result.data!.song_count,
                }
              : row,
          ),
        );
        addToast('Playlist updated.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'Could not update that playlist.');
      } finally {
        setBusy(false);
      }
    },
    [addToast, libraryPlaylistInfoTarget],
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

  const handleRequestRemoveLibraryPlaylist = useCallback((artist: ArtistRow) => {
    setLibraryPlaylistRemoveTarget(artist);
    setLibrarySidebarContextMenu(null);
  }, []);

  const handleConfirmRemoveLibraryPlaylist = useCallback(async () => {
    const target = libraryPlaylistRemoveTarget;
    if (!target) return;

    const entryType = sidebarEntryType(target);
    if (entryType !== 'playlist') return;

    const app = getApp();
    if (!app) return;

    setBusy(true);
    setError(null);
    try {
      const playlistId = userPlaylistIdFromArtistId(target.id);
      if (!playlistId || !app.listener.removeUserPlaylist) {
        setError('Restart the app to enable playlist removal.');
        return;
      }

      const submissionId =
        vc.vcOpen && vc.activeConfig.defaultSubmissionPlaylistId != null
          ? vc.activeConfig.defaultSubmissionPlaylistId
          : null;
      if (submissionId != null && playlistId === submissionId) {
        setError('Cannot delete the submission playlist while VC Mode is active.');
        setLibraryPlaylistRemoveTarget(null);
        return;
      }

      const result = await app.listener.removeUserPlaylist(playlistId);

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
    vc.activeConfig.defaultSubmissionPlaylistId,
    vc.vcOpen,
  ]);

  const selectedCustomPlaylistId = isUserPlaylistArtistId(selectedArtistId)
    ? userPlaylistIdFromArtistId(selectedArtistId) ?? undefined
    : undefined;

  const selectArtist = (artistId: number) => {
    setSelectedArtistId(artistId);
    setMainContentView('artist');
  };

  const togglePlayPause = () => {
    if (playingSongId == null && previewSong) {
      if (
        isVcPlayLockBlocking(playLockRef.current, 'start-idle-playback', { playingSongId })
      ) {
        return;
      }
      void playSong(previewSong, { userInitiated: true });
      return;
    }

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

    if (showingSoundcloudPage && playingSongId != null && activeSongPage?.id === playingSongId) {
      if (vcSoundcloudCaptureActive) {
        setIsPlaying(!isPlaying);
        return;
      }
      if (isPlaying) {
        soundcloudPlayerRef.current?.pause();
        setIsPlaying(false);
      } else {
        soundcloudPlayerRef.current?.play();
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
    if (isVcPlayLockBlocking(playLockRef.current, 'prev', { playingSongId })) return;

    const role = detoursRef.current.activeRole;
    if (role === 'play-now' || role === 'on-deck') {
      const current = playingSongRowRef.current;
      if (current) void playSong(current, { detour: true, role, startAt: 0 });
      return;
    }

    if (role === 'primary' && detoursRef.current.onDeck) {
      dismissOnDeck();
    }

    if (queueAnchorSongId == null) return;
    const previousSongId = pickPreviousPlayableSongId(sortedSongs, queueAnchorSongId, {
      sessionSkippedIds: vcSessionSkippedIds,
      repeatMode,
    });
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
          { shuffle, repeatMode, sessionSkippedIds: vcSessionSkippedIds },
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
    [playingSongId, previewSongId, repeatMode, shuffle, vcSessionSkippedIds],
  );

  const handlePlaylistSongRemove = useCallback(
    async (song: SongRow) => {
      setPlaylistContextMenu(null);
      if (isVcPlayLockBlockingSongRemoval(playLockRef.current, playingSongId, song.id)) {
        setError('Cannot remove the currently playing song while Play Lock is on.');
        return;
      }
      const kind = playlistKindForArtistId(selectedArtistId);
      const app = getApp();
      if (!app || !kind) return;

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
    [clearPlaybackForRemovedSong, loadLibrary, playingSongId, selectedArtistId],
  );

  const handlePlaylistSongSkip = useCallback(
    async (song: SongRow) => {
      setPlaylistContextMenu(null);
      const kind = playlistKindForArtistId(selectedArtistId);
      if (!kind) return;

      const result = await persistPlaylistSongSkipped(song, kind, true);
      if (!result.ok) {
        setError(result.error ?? 'Could not skip that song.');
        return;
      }

      setVcSessionSkippedIds((prev) => {
        if (!prev.has(song.id)) return prev;
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      setSongs((prev) =>
        prev.map((row) => (row.id === song.id ? { ...row, skipped: 1 } : row)),
      );
    },
    [selectedArtistId],
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

        if (
          result.data?.song &&
          !result.data.duplicate &&
          selectedArtistId === destArtistId
        ) {
          await maybeAutoSkipSongForVc(result.data.song);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message || 'Could not add song to playlist.');
      } finally {
        setBusy(false);
      }
    },
    [addToast, loadLibrary, maybeAutoSkipSongForVc, selectedArtistId, songToPlaylistModal],
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
        addToast('Moved to playlist.');

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

      if (vcSessionSkippedIds.has(song.id) && !isSongSkipped(song)) {
        setVcSessionSkippedIds((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
        return;
      }

      const kind = playlistKindForArtistId(selectedArtistId);
      if (!kind) return;

      const result = await persistPlaylistSongSkipped(song, kind, false);
      if (!result.ok) {
        setError(result.error ?? 'Could not restore that song.');
        return;
      }

      setVcSessionSkippedIds((prev) => {
        if (!prev.has(song.id)) return prev;
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      setSongs((prev) =>
        prev.map((row) => (row.id === song.id ? { ...row, skipped: 0 } : row)),
      );
    },
    [selectedArtistId, vcSessionSkippedIds],
  );

  const handleRowContextMenu = (event: React.MouseEvent, song: SongRow) => {
    event.preventDefault();
    if (selectedArtistId == null) return;
    setPlaylistContextMenu({
      song,
      sourceArtistId: selectedArtistId,
      sourcePlaylistName: selectedArtist?.artist_name ?? 'Playlist',
      x: event.clientX,
      y: event.clientY,
    });
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
    void playSong(song, { userInitiated: true });
  };

  const handlePlaylistDoubleClick = useCallback(
    async (artistId: number) => {
      if (
        isVcPlayLockBlocking(playLockRef.current, 'playlist-double-click', { playingSongId })
      ) {
        return;
      }

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

      const firstPlayable = playableQueueSongs(ordered, { sessionSkippedIds: vcSessionSkippedIds })[0];
      if (!firstPlayable) return;

      sortedSongsRef.current = ordered;
      void playSong(firstPlayable, { userInitiated: true });
    },
    [
      customOrderIds,
      playSong,
      playingSongId,
      selectedArtistId,
      songs,
      sortColumn,
      sortDirection,
      sortDurationsSnapshot,
    ],
  );

  const playNext = () => {
    if (isVcPlayLockBlocking(playLockRef.current, 'next', { playingSongId })) return;

    const role = detoursRef.current.activeRole;
    if (role === 'play-now') {
      void handleDetourPlaybackFailure();
      return;
    }
    if (role === 'on-deck') {
      const primary = detoursRef.current.primary;
      if (!primary) return;
      void advancePrimaryPlaylist(primary.anchorSongId, primary.consumedSongIds);
      return;
    }

    if (role === 'primary' && detoursRef.current.onDeck) {
      if (playingSongId != null && detoursRef.current.primary) {
        detoursRef.current.primary.anchorSongId = playingSongId;
      }
      void playQueuedOnDeckIfAny(true);
      return;
    }

    const primary = detoursRef.current.primary;
    if (role === 'primary' && primary) {
      const anchorId = playingSongIdRef.current ?? primary.anchorSongId;
      void advancePrimaryPlaylist(anchorId, []);
      return;
    }

    if (queueAnchorSongId == null) return;
    const nextSongId = pickNextPlayableSongId(sortedSongs, queueAnchorSongId, {
      shuffle,
      repeatMode,
      sessionSkippedIds: vcSessionSkippedIds,
    });
    if (nextSongId == null) return;
    const nextSong = sortedSongs.find((song) => song.id === nextSongId);
    if (nextSong) {
      void playSong(nextSong, {
        userInitiated: true,
        startAt: nextSong.id === playingSongId ? 0 : undefined,
      });
    }
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

    if (showingSoundcloudPage && playingSongId != null && activeSongPage?.id === playingSongId) {
      const clamped = duration > 0 ? Math.min(duration, Math.max(0, time)) : Math.max(0, time);
      if (vcSoundcloudCaptureActive) {
        setCurrentTime(clamped);
        return;
      }
      soundcloudPlayerRef.current?.seek(clamped);
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
    handleSoundcloudEnded,
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

    if (mainContentView === 'song' && showingFlowPage && activeSongPage) {
      return (
        <FlowSongPage
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

    if (mainContentView === 'song' && showingSoundcloudPage && activeSongPage) {
      return (
        <SoundcloudSongPage
          key={activeSongPage.id}
          song={activeSongPage}
          playerRef={soundcloudPlayerRef}
          playbackGeneration={playbackGenerationRef.current}
          shouldPlay={playingSongId === activeSongPage.id && isPlaying && !vcSoundcloudCaptureActive}
          captureInVc={vcSoundcloudCaptureActive}
          onReady={handleYoutubeReady}
          onPlayingChange={setIsPlaying}
          onEnded={handleSoundcloudEnded}
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

      if (isUserPlaylistArtistId(selectedArtist.id)) {
        return (
          <CustomPlaylistPanel
            playlistName={selectedArtist.artist_name}
            playlistAbout={selectedArtist.artist_bio}
            createdAt={selectedArtist.created_at}
            updatedAt={selectedArtist.updated_at ?? selectedArtist.created_at}
            songCount={selectedArtist.song_count ?? songs.length}
            songs={songs}
            playlistId={selectedCustomPlaylistId}
            addSongOpen={addSongOpen}
            busy={busy}
            onAddSongOpenChange={setAddSongOpen}
            onSongAdded={(result) => void handleExternalSongAdded(result)}
            onSharePlaylist={() => setSharePlaylistOpen(true)}
            onEditPlaylistInfo={() => {
              if (selectedArtist) openPlaylistInfoForArtist(selectedArtist);
            }}
            onRemovePlaylist={() => {
              if (selectedArtist) handleRequestRemoveLibraryPlaylist(selectedArtist);
            }}
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
      ref={listenerLayoutRef}
      className={`listener-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}${sidebarResizing ? ' sidebar-resizing' : ''}${!sidebarCollapsed && sidebarWidth >= LIBRARY_ADDED_COLUMN_MIN_WIDTH ? ' sidebar-library-added-visible' : ''}${chromeMinified ? ' listener-chrome-minified' : ''}`}
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
        onAddPlaylist={() => void handleCreateCustomPlaylist()}
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
        <section ref={listenerControlsRef} className="listener-controls panel">
          <PlayerBar
            disabled={!songs.length || activeSongPage == null}
            isPlaying={playingSongId != null && isPlaying}
            nowPlayingTitle={activeSongPage?.title ?? ''}
            nowPlayingArtist={activeSongPage?.artist_name ?? ''}
            nowPlayingCoverUrl={activeSongPage?.cover_url ?? null}
            shuffle={shuffle}
            repeatMode={repeatMode}
            volume={volume}
            currentTime={playingSongId != null ? currentTime : 0}
            duration={transportDuration}
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
            audioEffectsOpen={effectsLab.panelVisible}
            onToggleAudioEffects={toggleAudioEffects}
            seekTimeDisplay={playerSettings.seekTimeDisplay}
            onToggleSeekTimeDisplay={toggleSeekLabel}
            chromeMinified={chromeMinified}
            onToggleChromeMinified={() => setChromeMinified((on) => !on)}
            onDeck={onDeckInfo}
            onClearOnDeck={dismissOnDeck}
            songHistoryOpen={songHistoryOpen}
            onSongHistoryOpenChange={setSongHistoryOpen}
            songHistoryEntries={songHistoryEntries}
            songHistoryLoading={songHistoryLoading}
            onSongHistoryClearRequest={() => setClearSongHistoryOpen(true)}
            onSongHistoryAddToPlaylist={(entry) => void handleSongHistoryAddToPlaylist(entry)}
            onSongHistoryPutOnDeck={(entry) => void handleSongHistoryPutOnDeck(entry)}
            onSongHistoryPlayNow={(entry) => void handleSongHistoryPlayNow(entry)}
            onSongHistoryGoToSong={(entry) => void handleSongHistoryGoToSong(entry)}
            playerWindowRef={listenerLayoutRef}
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
            {mainContentView === 'song' && pageUrl && !showingSunoDemoPage && !showingFlowPage && !coverModalOpen && !visualizer.embeddedActive ? (
              <SongLikeButton
                liked={currentSongLiked}
                disabled={!canToggleLike || likeBusy}
                onToggle={() => void handleToggleLike()}
              />
            ) : null}
            <div className="song-page-panel-body">{renderMainContent()}</div>
          </section>

          <VerticalResizeHandle onResizeDelta={handleContentResize} />

          <section
            ref={playlistPanelRef}
            className={`playlist-panel panel${isLikedPlaylist ? ' liked-playlist' : ''}${isCustomPlaylistSelected ? ' custom-playlist' : ''}`}
          >
            <PlaylistTable
              songs={sortedSongs}
              profile={playlistTableProfile}
              columnOrder={columnOrder}
              columnWidths={columnWidths}
              isResizing={isResizing}
              resizeBetween={resizeBetween}
              isDragging={playlistDrag.isDragging}
              hasArtistCol={showArtistColumn}
              hasSourceCol={showSourceColumn}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={toggleSort}
              hasCustomOrder={hasCustomOrder}
              emptyMessage={
                isLikedPlaylist
                  ? 'No liked songs yet.'
                  : isCustomPlaylistSelected
                    ? 'No tracks yet. Open the playlist home and choose Add Song.'
                    : 'No songs in library.'
              }
              playingSongId={playingSongId}
              previewSongId={previewSongId}
              scrollToSongId={scrollToSongId}
              likedSongIds={likedSongIds}
              isLikedPlaylist={isLikedPlaylist}
              catalogOrderBySongId={catalogOrderBySongId}
              customOrderBySongId={customOrderBySongId}
              runtimeDurations={runtimeDurations}
              playlistLengthSettings={playlistLengthSettings}
              sessionSkippedIds={vcSessionSkippedIds}
              playlistDrag={playlistDrag}
              onRowClick={handleRowClick}
              onRowDoubleClick={handleRowDoubleClick}
              onRowContextMenu={handleRowContextMenu}
            />
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
          playlistName={playlistContextMenu.sourcePlaylistName}
          x={playlistContextMenu.x}
          y={playlistContextMenu.y}
          playingSongId={playingSongId}
          onAddToPlaylist={handleOpenAddToPlaylist}
          onCopyLink={(song) => void handleCopySongPageLink(song)}
          onPlayNow={(song) => void handlePlayNowFromContext(song)}
          onPutOnDeck={(song) =>
            handlePutOnDeckFromContext(
              song,
              playlistContextMenu.sourceArtistId,
              playlistContextMenu.sourcePlaylistName,
            )
          }
          onSkip={(song) => void handlePlaylistSongSkip(song)}
          onRemove={(song) => void handlePlaylistSongRemove(song)}
          onRestore={(song) => void handlePlaylistSongRestore(song)}
          sessionSkippedIds={vcSessionSkippedIds}
          onClose={() => setPlaylistContextMenu(null)}
        />
      ) : null}

      <OnDeckReplaceDialog
        open={onDeckReplacePrompt != null}
        existingSongTitle={onDeckReplacePrompt?.existingSongTitle ?? ''}
        existingPlaylistName={onDeckReplacePrompt?.existingPlaylistName ?? ''}
        onReplace={() => {
          const prompt = onDeckReplacePrompt;
          if (!prompt) return;
          queueOnDeck(
            prompt.incomingSong,
            prompt.incomingArtistId,
            prompt.incomingPlaylistName,
          );
          setOnDeckReplacePrompt(null);
        }}
        onPlayNow={() => {
          const prompt = onDeckReplacePrompt;
          if (!prompt) return;
          setOnDeckReplacePrompt(null);
          void handlePlayNowFromContext(prompt.incomingSong);
        }}
        onCancel={() => setOnDeckReplacePrompt(null)}
      />

      <ClearSongHistoryDialog
        open={clearSongHistoryOpen}
        onConfirm={() => void handleConfirmClearSongHistory()}
        onCancel={() => setClearSongHistoryOpen(false)}
      />

      {librarySidebarContextMenu ? (
        <LibrarySidebarContextMenu
          playlistName={librarySidebarContextMenu.artist.artist_name}
          x={librarySidebarContextMenu.x}
          y={librarySidebarContextMenu.y}
          onRename={handleRequestPlaylistInfo}
          onRemove={() => handleRequestRemoveLibraryPlaylist(librarySidebarContextMenu.artist)}
          onClose={() => setLibrarySidebarContextMenu(null)}
        />
      ) : null}

      <LibraryPlaylistInfoDialog
        open={libraryPlaylistInfoTarget != null}
        playlistName={libraryPlaylistInfoTarget?.artist_name ?? ''}
        playlistAbout={libraryPlaylistInfoTarget?.artist_bio ?? ''}
        busy={busy}
        onConfirm={(payload) => void handleConfirmPlaylistInfo(payload)}
        onCancel={() => setLibraryPlaylistInfoTarget(null)}
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
        vcLive={vc.vcOpen}
        onStart={(config) => {
          if (playingSongId == null) {
            setError('Play a song before starting VC Mode.');
            vc.closeModal();
            return;
          }
          visualizer.dismissVisualizer();
          void (async () => {
            applyVcAutoSkipToCurrentPlaylist(config);
            await vc.startVcMode(config);
          })();
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
        onChange={setEffectsLabSynced}
        crossfades={crossfades}
        onCrossfadesChange={setCrossfades}
        effectsOffline={audioEffectsOffline}
        mainAudioRef={audioRef}
        mirrorAudioRef={analyserAudioRef}
        mainVolume={volume}
      />
    </div>
  );
}
