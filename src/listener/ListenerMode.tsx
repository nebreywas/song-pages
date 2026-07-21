import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { configUsesVisualizer, type VcModeConfig, type VcPlaybackEffectsMirror } from '@shared/vcModeTypes';
import { isSpecialPlayStyleActive } from '@shared/vcMode/specialPlayStyles';
import { getApp } from '../lib/bridge';
import { MediaCoordinator } from '../audio/MediaCoordinator';
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
import { MeydaLabPanel, meydaLabStore } from '../audio/meydaLab';
import { cancelPlaybackRateBurst } from '../audio/effectsLab/performance/rateBurst';
import { ToastStack } from './ToastStack';
import { useToasts } from './useToasts';
import { PlayerBar, type RepeatMode } from './PlayerBar';
import { createPlaybackSession, type PlaybackSessionImpl } from '../playback/createPlaybackSession';
import { createPlayerBarTransportHandlers } from '../playback/adapters/playerBarAdapter';
import type { PlaybackSessionEffect } from '../playback/effects';
import { usePlaybackSnapshot } from '../playback/hooks/usePlaybackSnapshot';
import { runPlaybackSessionEffects } from './playbackSessionEffects';
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
import { useZenInterlude } from './useZenInterlude';
import { useRadioBreak } from './useRadioBreak';
import { fetchRadioWeatherSnapshot } from './fetchRadioWeather';
import {
  pickZenSilenceSeconds,
  shouldStartZenInterlude,
} from '@shared/listener/zenMode';
import {
  buildRadioAnnouncementText,
  buildRadioBreakSegments,
  pickRadioAnnouncementKind,
  shouldStartRadioBreak,
} from '@shared/listener/radioMode';
import { resolveRadioVoiceProfile } from '@shared/listener/radioVoices';
import { usePlaylistLengthSettings } from './usePlaylistLengthSettings';
import { useLiveDebugSettings } from '../live-debug/useLiveDebugSettings';
import { persistPlaylistSongSkipped } from './playlistSongSkip';
import { isSongLongerThanMinutes } from '@shared/listener/songDuration';
import { useListenerLyricsDisplaySettings } from './useListenerLyricsDisplaySettings';
import { useListenerSidebarLibraryLayout } from './useListenerSidebarLibraryLayout';
import { probeSongDurationSeconds, songNeedsDurationProbe } from './probeSongDuration';
import { sortPlaylistSongs, type SortColumn, type SortDirection } from './sortPlaylist';
import { usePlaylistTableView } from './usePlaylistTableView';
import {
  aggregatePlaylistSongPlayStats,
  displayPlayCount,
} from '@shared/listener/playStats';
import {
  applyCustomPlaylistOrder,
  buildCatalogOrderMap,
  buildCustomOrderMap,
  playlistKeyForArtistId,
  reorderPlaylistIds,
} from '@shared/listener/playlistOrder';
import {
  playlistKindForArtistId,
  vcArtistDisplayName,
} from '@shared/listener/playlistKinds';
import {
  pickNextPlayableSongId,
  pickPreviousPlayableSongId,
  playableQueueSongs,
  resolvePlayableSong,
} from '@shared/playback/queue/planner';
import {
  buildLastPlaybackState,
  LISTENER_LAST_PLAYBACK_KEY,
  normalizeListenerLastPlayback,
  type ListenerLastPlaybackState,
} from '@shared/listener/lastPlayback';
import { pickCueSongInPlaylist } from '@shared/listener/startupCue';
import {
  type PlaybackDetourState,
  type PlaybackRole,
  type TrackEndAdvanceAction,
} from '@shared/playback/detours/state';
import { isSongSkipped, isSongUnavailable } from '@shared/listener/playlistKinds';
import { pickSuperShuffleEntry, type SuperShuffleEntry } from '@shared/listener/superShuffle';
import {
  ACTIVE_SHUFFLE_STRATEGY,
  clearShuffleBag,
  createEmptyShuffleBag,
  type ShuffleBagState,
} from '@shared/playback/queue/shuffleStrategy';
import {
  isNowPlayingLibraryEntry,
  isNowPlayingSong,
  NOW_PLAYING_ARTIST_REMOVE_TOAST,
  NOW_PLAYING_PLAYLIST_REMOVE_TOAST,
  NOW_PLAYING_SONG_REMOVE_TOAST,
} from '@shared/listener/nowPlayingGuards';
import { isVcPlayLockBlockingSongRemoval } from '@shared/playback';
import {
  loadOrderedPlaylistSongs,
  loadSuperShufflePool,
  pickNextPrimarySongId,
} from './playbackDetourHelpers';
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
import type { OnDeckTrack } from '@shared/playback/detours/state';
import { usePlaylistDragReorder } from './usePlaylistDragReorder';
import { PlaylistTable } from './PlaylistTable';
import { usePlaylistColumnWidths } from './usePlaylistColumnWidths';
import { SongLikeButton } from './SongLikeButton';
import { LikedSongsPanel } from './LikedSongsPanel';
import { SunoDemoSongPage } from './SunoDemoSongPage';
import { shouldUseDirectAudioPlayback } from './directAudioPlayback';
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
import { shareableSongLink } from '@shared/listener/shareableSongLink';
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
import {
  decideMinifyEdgeAction,
  decideMiniPlayerComplianceAction,
  findNextNonYoutubeSong,
  hasNonYoutubeSong as playlistHasNonYoutubeSong,
  resolveEffectiveMiniBehavior,
} from '@shared/listener/youtubeMiniCompliance';
import {
  isSoundcloudSong,
  soundcloudPermalinkFromSong,
} from '@shared/soundcloud/soundcloudFeature';
import type { ProjectorNativePagePayload } from '@shared/visualizerMessages';
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
import { usePlaybackTransportAdapters } from './usePlaybackTransportAdapters';
import { useMediaSession } from '../playback/hooks/useMediaSession';
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
/**
 * YouTube TOS: while a YouTube video is embedded in the player view, the song
 * page panel must be at least this tall and cannot be dragged smaller. Enforces
 * YouTube's minimum visible-player size so the embed is never squeezed down.
 */
const MIN_CONTENT_HEIGHT_YOUTUBE = 220;
const MIN_PLAYLIST_HEIGHT = 160;
/** Handle element height plus vertical margins — keeps playlist visible when dragging. */
const RESIZE_HANDLE_SPACE = 24;

function maxContentHeight(column: HTMLElement | null): number {
  if (!column) return DEFAULT_CONTENT_HEIGHT;
  const available = column.clientHeight - MIN_PLAYLIST_HEIGHT - RESIZE_HANDLE_SPACE;
  return Math.max(MIN_CONTENT_HEIGHT, available);
}

/**
 * Clamp the song-page panel height between `minHeight` and the room available
 * above the playlist. `minHeight` is raised to `MIN_CONTENT_HEIGHT_YOUTUBE` while
 * a YouTube embed is showing (see `minContentHeight`); it always wins, even if the
 * window is too short to also keep the full playlist minimum visible.
 */
function clampContentHeight(
  column: HTMLElement | null,
  height: number,
  minHeight: number = MIN_CONTENT_HEIGHT,
): number {
  const max = Math.max(minHeight, maxContentHeight(column));
  return Math.min(max, Math.max(minHeight, height));
}

export function ListenerMode({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const playlistKey = useMemo(
    () => (selectedArtistId != null ? playlistKeyForArtistId(selectedArtistId) : null),
    [selectedArtistId],
  );
  // Per-playlist Year↔Plays mode + sort — survives playlist switches.
  const tableView = usePlaylistTableView(playlistKey);
  const sortColumn = tableView.sortColumn as SortColumn;
  const sortDirection = tableView.sortDirection as SortDirection;
  const setSortColumn = tableView.setSortColumn as (column: SortColumn) => void;
  const setSortDirection = tableView.setSortDirection as (direction: SortDirection) => void;
  const setSort = tableView.setSort as (column: SortColumn, direction: SortDirection) => void;
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
  const {
    settings: playerSettings,
    toggleSeekLabel,
    setZenModeEnabled,
    setRadioModeEnabled,
  } = useListenerPlayerSettings();
  const { settings: playlistLengthSettings } = usePlaylistLengthSettings();
  const liveDebug = useLiveDebugSettings();
  const { settings: lyricsDisplaySettings, setRemoveBrackets: setLyricsRemoveBrackets, setViewMode: setLyricsViewMode } =
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

  const [volume, setVolume] = useState(0.85);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);
  const [effectsLab, setEffectsLab] = useState<EffectsLabState>(() => ({
    ...DEFAULT_EFFECTS_LAB_STATE,
    panelVisible: effectsLabStore.isPanelVisible(),
  }));
  /** Keep mirror graph warm while Meyda Lab is open (same idea as Effects Lab panel). */
  const [meydaLabVisible, setMeydaLabVisible] = useState(() => meydaLabStore.isPanelVisible());
  /** Dry performance FX keep the main mirror routed while no whole-song preset is Active. */
  const [performanceFxActive, setPerformanceFxActive] = useState(false);
  /**
   * VC window reports whether its capture `<audio>` is actually playing.
   * If VC is open but capture is silent, we must not leave the main player ducked.
   */
  const [vcCaptureAudioActive, setVcCaptureAudioActive] = useState(false);
  const [crossfades, setCrossfades] = useState(false);
  const [chromeMinified, setChromeMinified] = useState(false);
  const [contentHeight, setContentHeight] = useState(DEFAULT_CONTENT_HEIGHT);
  const [runtimeDurations, setRuntimeDurations] = useState<Record<number, number>>({});
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
  const queueContextRef = useRef({
    queueAnchorSongId: null as number | null,
    sortedSongs: [] as SongRow[],
    sessionSkippedIds: new Set<number>(),
  });
  const runPlaybackEffectsRef = useRef<(effects: PlaybackSessionEffect[]) => void>(() => {});
  const playbackSessionRef = useRef(
    createPlaybackSession({
      getQueueContext: () => queueContextRef.current,
      onEffects: (effects) => runPlaybackEffectsRef.current(effects),
    }),
  );
  const playbackSession = playbackSessionRef.current as PlaybackSessionImpl;
  const detoursRef = useRef<PlaybackDetourState>(playbackSession.getDetourState());
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
  /** Playlist-scoped play counts for the Year↔Plays column (History-backed). */
  const [playCountsBySongId, setPlayCountsBySongId] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [playCountsNonce, setPlayCountsNonce] = useState(0);
  const [songHistoryLoading, setSongHistoryLoading] = useState(false);
  const [clearSongHistoryOpen, setClearSongHistoryOpen] = useState(false);
  const [scrollToSongId, setScrollToSongId] = useState<number | null>(null);
  const [scrollToSongNonce, setScrollToSongNonce] = useState(0);
  /** Sidebar + title-click: playlist that currently owns/supplies transport playback. */
  const [playingSourcePlaylistId, setPlayingSourcePlaylistId] = useState<number | null>(null);
  /**
   * Super Shuffle — library-wide random advance.
   * Session-only. Double-tap the shuffle button to toggle.
   * Eligible pool is snapshotted when the session starts; library edits apply
   * the next time Super Shuffle is turned on.
   */
  const [superShuffleEnabled, setSuperShuffleEnabled] = useState(false);
  /** Frozen eligible pool for the active Super Shuffle session (null when off). */
  const superShuffleSessionPoolRef = useRef<SuperShuffleEntry<SongRow>[] | null>(null);
  /** In-flight snapshot build so an early Next can await the same capture. */
  const superShuffleSnapshotPromiseRef = useRef<Promise<SuperShuffleEntry<SongRow>[]> | null>(
    null,
  );
  /** Without-replacement bags — song ids only (cheap even for large libraries). */
  const playlistShuffleBagRef = useRef<ShuffleBagState>(createEmptyShuffleBag());
  const superShuffleBagRef = useRef<ShuffleBagState>(createEmptyShuffleBag());
  const advancePrimaryPlaylistRef = useRef<
    (anchorSongId: number, consumedSongIds: readonly number[]) => Promise<void>
  >(async () => {});
  const activeHistoryEntryIdRef = useRef<number | null>(null);
  /** Coalesce scrub pointer-moves into one from→to seek event per gesture. */
  const pendingHistorySeekRef = useRef<{
    fromSeconds: number;
    toSeconds: number;
    timer: number | null;
  } | null>(null);
  const commitHistorySeekRef = useRef<(fromSeconds: number, toSeconds: number) => void>(() => {});
  const songHistoryOpenRef = useRef(false);
  const pendingHistoryNavigationRef = useRef<{ song: SongRow; playlistId: number } | null>(null);
  const pendingRevealSongRef = useRef<{ songId: number; playlistId: number } | null>(null);
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
  const mainMediaCoordinatorRef = useRef<MediaCoordinator | null>(null);
  if (!mainMediaCoordinatorRef.current) {
    mainMediaCoordinatorRef.current = new MediaCoordinator();
  }
  const playbackGenerationRef = useRef(0);
  /** Ignore spurious `ended` while tearing down HLS / swapping tracks (double-advance). */
  const suppressPlaybackEndedRef = useRef(false);
  /** Serialize natural track-end auto-advance — stale `ended` must not call playSong twice. */
  const advancingFromEndedRef = useRef(false);
  /** Counts natural song completions since Zen was enabled / last interlude. */
  const zenCompletedSongsRef = useRef(0);
  const playingSongIdRef = useRef<number | null>(null);
  /** Song page currently in the main pane (preview browse or playing track). */
  const activeSongPageIdRef = useRef<number | null>(null);
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
  const resumeAfterSpecialPauseRef = useRef<() => void>(() => {});
  /** Last row passed to playSong — visualizer must not depend on the selected playlist's song list. */
  const playingSongRowRef = useRef<SongRow | null>(null);
  /**
   * Raw playing state of whatever widget (YouTube/SoundCloud) is mounted in the
   * main pane — true even for a browse preview that was never promoted to the
   * now-playing track. YouTube-compliance uses this to detect a preview video
   * that would keep playing (hidden) after minify.
   */
  const mainPaneWidgetPlayingRef = useRef(false);

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
  /** Prefer the playing row; fall back to subscribed artist profile when song rows omit artist_name. */
  const nowPlayingArtistName = useMemo(() => {
    const song = playingSong ?? previewSong;
    if (!song) return '';
    const artistProfile = artists.find((artist) => artist.id === song.artist_id) ?? null;
    return vcArtistDisplayName(song, artistProfile) ?? '';
  }, [artists, playingSong, previewSong]);
  const isLikedPlaylist = isLikedSongsArtist(selectedArtistId);
  const isCustomPlaylistSelected = isUserPlaylistArtistId(selectedArtistId);
  const playlistKind = playlistKindForArtistId(selectedArtistId);
  const showArtistColumn = isLikedPlaylist || isCustomPlaylistSelected;
  // Liked Songs mixes catalog + Suno/Flow/SC/YT — Source column identifies provenance.
  const showSourceColumn = isCustomPlaylistSelected || isLikedPlaylist;
  const playlistColumns = usePlaylistColumnWidths(playlistPanelRef, {
    hasArtist: showArtistColumn,
    hasSourceCol: showSourceColumn,
  });
  const { columnOrder, columnWidths, isResizing, profile: playlistTableProfile, resizeBetween } =
    playlistColumns;
  const activeSongPage = previewSong ?? playingSong;
  activeSongPageIdRef.current = activeSongPage?.id ?? null;
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
  /**
   * Browse (single-click) can mount a YouTube/SoundCloud embed that is not the playing track.
   * Only that playing track's widget may drive seekbar time/duration.
   */
  const widgetOwnsTransport =
    playingSongId != null &&
    activeSongPage != null &&
    playingSongId === activeSongPage.id &&
    (showingYoutubePage || showingSoundcloudPage);
  const canToggleLike =
    previewSong != null &&
    (previewSong.id > 0 || isSunoDemoSong(previewSong) || isUserPlaylistSongId(previewSong.id));
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
    return sortPlaylistSongs(
      songs,
      column,
      sortDirection,
      sortDurationsSnapshot,
      playCountsBySongId,
    );
  }, [customOrderIds, playCountsBySongId, songs, sortColumn, sortDirection, sortDurationsSnapshot]);

  const sortedSongsRef = useRef(sortedSongs);
  sortedSongsRef.current = sortedSongs;

  queueContextRef.current = {
    queueAnchorSongId,
    sortedSongs,
    sessionSkippedIds: vcSessionSkippedIds,
  };

  const playbackSnapshot = usePlaybackSnapshot(playbackSession);
  const shuffle = playbackSnapshot?.shuffle ?? false;
  const repeatMode = playbackSnapshot?.repeatMode ?? 'off';

  const isCurrentTrackRepeatable = useCallback((): boolean => {
    const row = playingSongRowRef.current;
    if (!row) return false;
    return (
      !isSongSkipped(row) &&
      !isSongUnavailable(row) &&
      !vcSessionSkippedIds.has(row.id)
    );
  }, [vcSessionSkippedIds]);

  /** Fast repeat-one loop in ended handlers — skip when the row cannot play again. */
  const shouldFastRepeatCurrentOnEnd = useCallback((): boolean => {
    return (
      repeatMode === 'one' &&
      detoursRef.current.activeRole === 'primary' &&
      !detoursRef.current.onDeck &&
      isCurrentTrackRepeatable()
    );
  }, [isCurrentTrackRepeatable, repeatMode]);

  /**
   * When play is pressed on a paused/stopped row that is skipped, do not resume it.
   * Advance to the next playable track when one exists.
   */
  const tryResumeCurrentOrAdvance = useCallback((): 'resume' | 'advanced' | 'blocked' => {
    if (isCurrentTrackRepeatable()) return 'resume';

    const row = playingSongRowRef.current;
    if (!row) return 'blocked';

    const playable = resolvePlayableSong(sortedSongsRef.current, row, {
      sessionSkippedIds: vcSessionSkippedIds,
    });
    if (!playable) return 'blocked';

    void playSongRef.current(playable, { userInitiated: true });
    return 'advanced';
  }, [isCurrentTrackRepeatable, vcSessionSkippedIds]);

  playingSongIdRef.current = playingSongId;

  const projectorHomepageUrl = useMemo(() => {
    if (!selectedArtist) return null;
    return selectedArtist.site_url?.trim() || selectedArtist.site_root_normalized?.trim() || null;
  }, [selectedArtist]);

  /** SoundCloud / Flow / Suno (non-HTTP) pages project as native UI, not a guest webview. */
  const projectorNativePage = useMemo((): ProjectorNativePagePayload | null => {
    const song = activeSongPage;
    if (!song) return null;

    if (isSoundcloudSong(song)) {
      const permalink = soundcloudPermalinkFromSong(song);
      if (!permalink) return null;
      return {
        kind: 'soundcloud',
        songId: song.id,
        title: song.title,
        artist: song.artist_name ?? null,
        coverUrl: song.cover_url ?? null,
        permalink,
      };
    }

    if (isFlowSong(song)) {
      return {
        kind: 'flow',
        songId: song.id,
        title: song.title,
        artist: song.artist_name ?? null,
        coverUrl: song.cover_url ?? null,
        caption: song.caption ?? null,
        songManifestUrl: song.song_manifest_url ?? null,
      };
    }

    if (isSunoDemoSong(song)) {
      return {
        kind: 'suno',
        songId: song.id,
        title: song.title,
        artist: song.artist_name ?? null,
        coverUrl: song.cover_url ?? null,
        year: song.year ?? null,
        caption: song.caption ?? null,
        pageUrl: song.page_url ?? null,
        songManifestUrl: song.song_manifest_url ?? null,
        externalId: song.external_id ?? null,
        playbackScope: song.playback_scope ?? null,
        providerMetadataJson: song.provider_metadata_json ?? null,
      };
    }

    return null;
  }, [activeSongPage]);

  const visualizer = useVisualizerManager({
    analyserAudioRef,
    playingSong,
    isPlaying,
    currentTime,
    duration,
    pageUrl,
    homepageUrl: projectorHomepageUrl,
    nativePage: projectorNativePage,
    lyricsDisplay: lyricsDisplaySettings,
    songPageFontIncreaseLevel: playerSettings.songPageFontIncreaseLevel,
    volume,
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

  // Rate hold is per-song — clear like ALARE trim so the next track starts normal.
  useEffect(() => {
    cancelPlaybackRateBurst(1);
    setEffectsLab((prev) =>
      prev.playbackRateHold === 1 ? prev : { ...prev, playbackRateHold: 1 },
    );
  }, [playingSongId]);

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

  useEffect(() => {
    const syncMeyda = () => setMeydaLabVisible(meydaLabStore.isPanelVisible());
    window.addEventListener('songpages-meyda-lab-changed', syncMeyda);
    return () => window.removeEventListener('songpages-meyda-lab-changed', syncMeyda);
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
        setSort(column, 'asc');
        return;
      }

      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        return;
      }

      setSort(column, 'asc');
    },
    [buildDurationSnapshot, setSort, setSortDirection, sortColumn, sortDirection],
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

    // Sort / Year↔Plays mode come from per-playlist persisted table view.
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
  }, [hasCustomOrder, setSortColumn, sortColumn]);

  const handlePlaylistReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!playlistKey) return;
      const reordered = reorderPlaylistIds(
        sortedSongsRef.current.map((song) => song.id),
        fromIndex,
        toIndex,
      );
      setCustomOrderIds(reordered);
      setSort('custom', 'asc');
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
    [loadLibrary, playlistKey, setSort],
  );

  const playlistDrag = usePlaylistDragReorder({
    rowCount: sortedSongs.length,
    onReorder: handlePlaylistReorder,
  });

  useEffect(() => {
    const app = getApp();
    if (!app || previewSongId == null) {
      setCurrentSongLiked(false);
      return;
    }
    // Catalog ids are positive; Suno demo + custom-playlist (Flow/SC/YT) use negative ids.
    if (
      previewSongId <= 0 &&
      !isSunoDemoSongId(previewSongId) &&
      !isUserPlaylistSongId(previewSongId)
    ) {
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
      setContentHeight((height) => clampContentHeight(column, height, minContentHeightRef.current));
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
    mainMediaCoordinatorRef.current?.invalidateLoads();
  };

  const pickNextSongId = useCallback(
    (currentSongId: number): number | null => {
      // Peek with a bag copy — must not consume the real without-replacement bag.
      const bag = playlistShuffleBagRef.current;
      const primary = detoursRef.current.primary;
      return pickNextPlayableSongId(sortedSongs, currentSongId, {
        shuffle,
        repeatMode,
        sessionSkippedIds: vcSessionSkippedIds,
        shuffleStrategy: ACTIVE_SHUFFLE_STRATEGY,
        shuffleBag: {
          scopeKey: bag.scopeKey,
          remainingIds: bag.remainingIds.slice(),
          exhausted: bag.exhausted,
        },
        shuffleScopeKey:
          primary != null
            ? `playlist:${primary.artistId}`
            : selectedArtistId != null
              ? `playlist:${selectedArtistId}`
              : 'playlist',
      });
    },
    [repeatMode, selectedArtistId, shuffle, sortedSongs, vcSessionSkippedIds],
  );

  const specialPlay = useSpecialPlayPause({
    onPlayNext: () => resumeAfterSpecialPauseRef.current(),
  });
  const zen = useZenInterlude({
    // Zen defers the same natural-end advance as VC special pauses; using the
    // shared resume path preserves detours, repeat, history, and queue policy.
    onComplete: () => resumeAfterSpecialPauseRef.current(),
  });
  const radio = useRadioBreak({
    onComplete: () => resumeAfterSpecialPauseRef.current(),
  });
  const zenInterludeActive = zen.interlude != null;
  const radioBreakActive = radio.breakState != null;
  const betweenTrackBreakActive = zenInterludeActive || radioBreakActive;

  useEffect(() => {
    if (playerSettings.zenModeEnabled) return;
    // Disabling Zen starts the next opt-in from a fresh three-song cycle.
    zenCompletedSongsRef.current = 0;
  }, [playerSettings.zenModeEnabled]);

  // Warm the weather cache while Radio is on so the first break isn't cold.
  useEffect(() => {
    if (!playerSettings.radioModeEnabled) return;
    void fetchRadioWeatherSnapshot();
  }, [playerSettings.radioModeEnabled]);

  /** Main-pane embed is the playing track (not a single-click browse preview). */
  const isMainPanePlayingWidget = useCallback(() => {
    const playingId = playingSongIdRef.current;
    return playingId != null && playingId === activeSongPageIdRef.current;
  }, []);

  const handleYoutubeReady = useCallback(() => {
    // Preview browse mounts widgets too — do not seek or force isPlaying for those.
    if (!isMainPanePlayingWidget()) return;
    if (playingSongIdRef.current != null) setIsPlaying(true);
    const pendingSeek = pendingPlaybackSeekRef.current;
    if (pendingSeek != null && pendingSeek > 0) {
      youtubePlayerRef.current?.seek(pendingSeek);
      setCurrentTime(pendingSeek);
      pendingPlaybackSeekRef.current = null;
    }
  }, [isMainPanePlayingWidget]);

  const handleYoutubeError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleWidgetPlayingChange = useCallback(
    (playing: boolean) => {
      // Record the raw main-pane embed state even for browse previews (a video
      // the user started via the embed's own controls, before it was promoted
      // to the now-playing track). YouTube-compliance needs to know a hidden
      // video would keep playing on minify — see the minify effect below.
      mainPaneWidgetPlayingRef.current = playing;
      if (!isMainPanePlayingWidget()) return;
      setIsPlaying(playing);
    },
    [isMainPanePlayingWidget],
  );

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
        playbackRateHold: effectsLab.playbackRateHold,
      },
    }),
    [
      effectsLab,
      effectsLab.abBypass,
      effectsLab.effectId,
      effectsLab.enabled,
      effectsLab.outputTrimDb,
      effectsLab.playbackRateHold,
      effectsLab.workletEnhance,
    ],
  );

  const vc = useVcModeManager({
    playbackSession,
    analyserAudioRef,
    playingSong,
    previewSong,
    sortedSongs,
    artists,
    activePlaybackUrl,
    volume,
    playbackEffects: vcPlaybackEffects,
    specialPlayPauseCountdown: specialPlay.specialPlayPause,
    sessionSkippedIds: vcSessionSkippedIds,
    liveDebugEnabled: liveDebug.enabled,
  });

  const isPlayLockActive = playbackSession.isPlayLockActive();

  useEffect(() => {
    playbackSession.syncVcPolicy({
      vcActive: vc.vcOpen,
      playLockEnabled: vc.playLockEnabled,
      playLockReleaseOnNext: vc.playLockReleaseOnNextSong,
    });
  }, [playbackSession, vc.playLockEnabled, vc.playLockReleaseOnNextSong, vc.vcOpen]);

  useEffect(() => {
    playbackSession.syncTransport({
      activeTrackId: playingSongId,
      isPlaying,
      waitingForHost:
        specialPlay.specialPlayPause?.active === true || betweenTrackBreakActive,
      currentTime,
      duration: transportDuration,
      mediaSource:
        showingYoutubePage && playingSongId != null
          ? 'youtube'
          : showingSoundcloudPage && playingSongId != null
            ? 'soundcloud'
            : showingFlowPage && playingSongId != null
              ? 'flow'
              : playingSongId != null &&
                  activeSongPage != null &&
                  shouldUseDirectAudioPlayback(
                    activePlaybackUrl ?? activeSongPage.playback_url ?? '',
                    activeSongPage.playback_scope,
                  )
                ? 'direct'
                : playingSongId != null
                  ? 'hls'
                  : null,
      playingSongIdRef: playingSongIdRef.current,
    });
  }, [
    activePlaybackUrl,
    activeSongPage,
    currentTime,
    isPlaying,
    playbackSession,
    playingSongId,
    showingFlowPage,
    showingSoundcloudPage,
    showingYoutubePage,
    specialPlay.specialPlayPause?.active,
    transportDuration,
    betweenTrackBreakActive,
  ]);

  const persistSongDuration = useCallback(async (songId: number, seconds: number) => {
    const rounded = Math.round(seconds);
    if (rounded <= 0) return;
    if (songId <= 0 && !isSunoDemoSongId(songId) && !isUserPlaylistSongId(songId)) return;

    // Bail when unchanged — SoundCloud/YouTube widgets re-report duration often.
    // A fresh runtimeDurations/songs identity forces the playlist body to rebuild and
    // makes source logos flicker while the mouse moves over rows.
    const alreadyCached = runtimeDurations[songId] === rounded;
    const song = songs.find((row) => row.id === songId);
    const songNeedsLocalDuration =
      song != null && (song.duration_seconds == null || song.duration_seconds <= 0);
    if (alreadyCached && !songNeedsLocalDuration) return;

    if (!alreadyCached) {
      setRuntimeDurations((prev) =>
        prev[songId] === rounded ? prev : { ...prev, [songId]: rounded },
      );
    }
    if (songNeedsLocalDuration) {
      setSongs((prev) => {
        let changed = false;
        const next = prev.map((row) => {
          if (row.id === songId && (row.duration_seconds == null || row.duration_seconds <= 0)) {
            changed = true;
            return { ...row, duration_seconds: rounded };
          }
          return row;
        });
        return changed ? next : prev;
      });
    }

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

  /** VC / transport duration for the currently playing song (not the browse preview). */
  const applyPlayingSongDuration = useCallback(
    (seconds: number) => {
      if (!(seconds > 0)) return;
      const playingId = playingSongIdRef.current;
      if (playingId == null) return;
      setDuration(seconds);
      void persistSongDuration(playingId, seconds);
    },
    [persistSongDuration],
  );

  /**
   * Main-pane YouTube/SoundCloud duration. Browse previews only cache length;
   * seekbar updates require the open page to be the playing track.
   */
  const handleMainPaneWidgetDuration = useCallback(
    (seconds: number) => {
      if (!(seconds > 0)) return;
      const pageId = activeSongPageIdRef.current;
      if (isMainPanePlayingWidget()) {
        applyPlayingSongDuration(seconds);
        return;
      }
      if (pageId != null) {
        void persistSongDuration(pageId, seconds);
      }
    },
    [applyPlayingSongDuration, isMainPanePlayingWidget, persistSongDuration],
  );

  const wasVcOpenRef = useRef(false);
  useEffect(() => {
    if (wasVcOpenRef.current && !vc.vcOpen) {
      setVcSessionSkippedIds(new Set());
    }
    wasVcOpenRef.current = vc.vcOpen;
  }, [vc.vcOpen]);

  // Starting VC mode defaults the listening state to repeat-playlist ('all') so a
  // listening party loops instead of stopping at the end. Fires only on the
  // start (rising) edge — the host can turn it off afterward and we won't force
  // it back on. There's no SET_REPEAT command, so cycle to 'all' (off→all→one→off).
  const vcStartedRepeatRef = useRef(false);
  useEffect(() => {
    if (vc.vcOpen && !vcStartedRepeatRef.current) {
      let guard = 0;
      while (playbackSession.getSnapshot().repeatMode !== 'all' && guard < 3) {
        playbackSession.dispatch({ type: 'CYCLE_REPEAT', source: 'system' });
        guard += 1;
      }
    }
    vcStartedRepeatRef.current = vc.vcOpen;
  }, [vc.vcOpen, playbackSession]);

  const vcYoutubeCaptureActive = useMemo(
    () =>
      vc.vcOpen &&
      configUsesVisualizer(vc.activeConfig) &&
      playingSong != null &&
      isYoutubeSong(playingSong),
    [vc.vcOpen, vc.activeConfig, playingSong],
  );

  /** Projector: Video owns the YouTube iframe while the theater is open. */
  const projectorYoutubeCaptureActive = useMemo(
    () => visualizer.videoProjectionActive && playingSong != null && isYoutubeSong(playingSong),
    [playingSong, visualizer.videoProjectionActive],
  );

  const youtubeRemoteCaptureActive = vcYoutubeCaptureActive || projectorYoutubeCaptureActive;

  // YouTube TOS: when the YouTube embed is actually mounted in THIS window's song
  // page (not captured off to VC/Projector), the panel must hold ≥220px and resist
  // being dragged smaller. Metadata-only capture pages have no embed to protect.
  const youtubeEmbedInMain =
    mainContentView === 'song' && showingYoutubePage && !youtubeRemoteCaptureActive;
  const minContentHeight = youtubeEmbedInMain ? MIN_CONTENT_HEIGHT_YOUTUBE : MIN_CONTENT_HEIGHT;
  // Read the live minimum inside effects with stale closures (ResizeObserver).
  const minContentHeightRef = useRef(minContentHeight);
  minContentHeightRef.current = minContentHeight;

  // Enforce the YouTube minimum the moment the embed appears (bump up if the
  // panel was smaller); relaxes back to the normal minimum when it goes away.
  useEffect(() => {
    setContentHeight((height) => clampContentHeight(mainColumnRef.current, height, minContentHeight));
  }, [minContentHeight]);

  const vcSoundcloudCaptureActive = useMemo(
    () =>
      vc.vcOpen &&
      configUsesVisualizer(vc.activeConfig) &&
      playingSong != null &&
      isSoundcloudSong(playingSong),
    [vc.vcOpen, vc.activeConfig, playingSong],
  );

  const vcWidgetCaptureActive = vcYoutubeCaptureActive || vcSoundcloudCaptureActive;
  /** Remote embed owns audible YouTube/SoundCloud (VC slot or Projector theater). */
  const remoteWidgetCaptureActive = youtubeRemoteCaptureActive || vcSoundcloudCaptureActive;

  const prevRemoteWidgetCaptureRef = useRef(false);
  useEffect(() => {
    const active = remoteWidgetCaptureActive;
    const wasActive = prevRemoteWidgetCaptureRef.current;
    prevRemoteWidgetCaptureRef.current = active;
    if (!wasActive && active && playingSongId != null && playingSong != null && isWidgetTransportSong(playingSong)) {
      setIsPlaying(true);
    }
  }, [remoteWidgetCaptureActive, playingSong, playingSongId]);

  const handleYoutubeEnded = useCallback(() => {
    if (advancingFromEndedRef.current) return;
    if (shouldFastRepeatCurrentOnEnd()) {
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
  }, [shouldFastRepeatCurrentOnEnd, vcYoutubeCaptureActive]);

  const handleSoundcloudEnded = useCallback(() => {
    if (advancingFromEndedRef.current) return;
    if (shouldFastRepeatCurrentOnEnd()) {
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
  }, [shouldFastRepeatCurrentOnEnd, vcSoundcloudCaptureActive]);

  /** Main-pane ended — ignore browse preview embeds. */
  const handleMainPaneYoutubeEnded = useCallback(() => {
    if (!isMainPanePlayingWidget()) return;
    handleYoutubeEnded();
  }, [handleYoutubeEnded, isMainPanePlayingWidget]);

  const handleMainPaneSoundcloudEnded = useCallback(() => {
    if (!isMainPanePlayingWidget()) return;
    handleSoundcloudEnded();
  }, [handleSoundcloudEnded, isMainPanePlayingWidget]);

  /** VC timing bridge for the playing track (main pane may show something else). */
  const applyYoutubeTiming = useCallback((nextTime: number, nextDuration: number) => {
    if (playingSongIdRef.current == null) return;
    if (!Number.isFinite(nextTime)) return;
    setCurrentTime(nextTime);
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
    }
  }, []);

  // OS / keyboard / headphone media keys → PlaybackSession (next to PlayerBar transport).
  useMediaSession({
    session: playbackSession,
    isPlaying,
    // YouTube/SoundCloud iframes overwrite navigator.mediaSession — re-assert while they play.
    reassertWhilePlaying: Boolean(
      playingSong && isPlaying && isWidgetTransportSong(playingSong),
    ),
    track: playingSong
      ? {
          title: playingSong.title,
          artist: nowPlayingArtistName || playingSong.artist_name || '',
          artworkUrl: playingSong.cover_url,
        }
      : null,
  });

  usePlaybackTransportAdapters({
    session: playbackSession,
    // Accept VC transport IPC from VC Mode and from Projector: Video theater.
    vcOpen: vc.vcOpen || projectorYoutubeCaptureActive,
    mainAudioRef: audioRef,
    getSortedSongs: () => sortedSongsRef.current,
    playSongById: (songId) => {
      const target = sortedSongsRef.current.find((song) => song.id === songId);
      if (target) void playSongRef.current(target);
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
    onToggleLiveDebug: () => liveDebug.toggle(),
    onHistorySeekRelative: (fromSeconds, toSeconds) => {
      // Keyboard relative seeks bypass session SEEK — record immediately.
      commitHistorySeekRef.current(fromSeconds, toSeconds);
    },
    playLockVc: {
      setPlayLockEnabled: vc.setPlayLockEnabled,
      setPlayLockReleaseOnNextSong: vc.setPlayLockReleaseOnNextSong,
    },
    media: {
      onYoutubeEnded: handleYoutubeEnded,
      onSoundcloudEnded: handleSoundcloudEnded,
      onYoutubeDuration: applyPlayingSongDuration,
      onYoutubeTiming: applyYoutubeTiming,
      onSoundcloudTiming: applyYoutubeTiming,
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
    if (!vc.vcOpen) {
      setVcCaptureAudioActive(false);
      return;
    }
    const app = getApp();
    return app?.vc?.onPlaybackStatus?.(({ active }) => {
      setVcCaptureAudioActive(Boolean(active));
    });
  }, [vc.vcOpen]);

  useEffect(() => {
    if (!vc.vcOpen) return;
    // Performance FX must never leave the main mirror audible under VC.
    setPerformanceFxActive(false);
  }, [vc.vcOpen]);

  useEffect(() => {
    if (!vc.vcOpen) specialPlay.clearPause();
  }, [specialPlay.clearPause, vc.vcOpen]);

  // Duck main only when VC capture audio is actually carrying the mix (or playback is paused).
  // Otherwise keep local speakers alive — a silent VC window used to mute the whole player.
  const vcOwnsAudibleOutput = vc.vcOpen && (vcCaptureAudioActive || !isPlaying);

  const analyserMirrorEnabled =
    (visualizer.canVisualize && visualizer.activeSession !== 'none') ||
    (visualizer.windowOpen && visualizer.projectionMode === 'visualizer' && visualizer.canVisualize) ||
    vc.analyserEnabled ||
    isEffectsLabAudible(effectsLab) ||
    // Warm the mirror while the panel is open so performance pads are not firing into silence.
    effectsLab.panelVisible ||
    meydaLabVisible ||
    performanceFxActive;

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
    // VC window owns audible output only while its capture element is actually playing.
    vcMirrorPlaybackActive: vcOwnsAudibleOutput,
    performanceFxActive,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (vcOwnsAudibleOutput) {
      audio.volume = 0;
      return;
    }
    if (isEffectsLabAudible(effectsLab) || performanceFxActive) return;
    audio.muted = false;
    audio.volume = volume;
  }, [volume, effectsLab, vcOwnsAudibleOutput, performanceFxActive]);

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

  /** True when Liked Songs availability probes don't apply (embeds / native demos). */
  const songSkipsLikedAvailabilityProbe = useCallback((song: SongRow) => {
    return (
      isWidgetTransportSong(song) ||
      isFlowSong(song) ||
      isSunoDemoSong(song) ||
      !/^https?:\/\//i.test(String(song.page_url ?? '').trim())
    );
  }, []);

  /** Lazy probe when traversing the Liked Songs playlist — re-checks on every visit. */
  const probeLikedSongAvailability = useCallback(
    async (song: SongRow) => {
      if (!isLikedSongsArtist(selectedArtistId)) return;

      // Widget / native demo tracks aren't HTML song pages — the http probe wrongly
      // marks them unavailable (songpages-soundcloud:, YouTube, Flow, Suno).
      if (songSkipsLikedAvailabilityProbe(song)) {
        if (song.unavailable === 1) {
          await markSongAvailability(song, false);
        }
        return;
      }

      const app = getApp();
      if (!app) return;

      const result = await app.listener.probeSongAvailability(song.page_url, song.playback_url);
      if (!result.ok || !result.data) return;

      await markSongAvailability(song, !result.data.ok);
    },
    [markSongAvailability, selectedArtistId, songSkipsLikedAvailabilityProbe],
  );

  // Clear false "unavailable" strikes left by the old probe path for embeds / demos.
  useEffect(() => {
    if (!isLikedPlaylist) return;
    for (const song of songs) {
      if (song.unavailable === 1 && songSkipsLikedAvailabilityProbe(song)) {
        void markSongAvailability(song, false);
      }
    }
  }, [isLikedPlaylist, markSongAvailability, songIdsSignature, songSkipsLikedAvailabilityProbe, songs]);
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

  const commitHistorySeek = useCallback(async (fromSeconds: number, toSeconds: number) => {
    const entryId = activeHistoryEntryIdRef.current;
    if (entryId == null) return;
    const app = getApp();
    if (!app?.listener?.recordSongHistorySeek) return;
    await app.listener.recordSongHistorySeek({
      historyEntryId: entryId,
      fromSeconds,
      toSeconds,
      direction: toSeconds >= fromSeconds ? 'forward' : 'back',
    });
  }, []);
  commitHistorySeekRef.current = (fromSeconds, toSeconds) => {
    void commitHistorySeek(fromSeconds, toSeconds);
  };

  /** Record seekbar interactions against the active history start (coalesced for scrubbing). */
  const noteHistorySeek = useCallback(
    (toSeconds: number, options?: { immediate?: boolean }) => {
      if (activeHistoryEntryIdRef.current == null) return;

      const existing = pendingHistorySeekRef.current;
      const fromSeconds = existing?.fromSeconds ?? getPlaybackPositionSeconds();

      if (options?.immediate) {
        if (existing?.timer != null) window.clearTimeout(existing.timer);
        pendingHistorySeekRef.current = null;
        void commitHistorySeek(fromSeconds, toSeconds);
        return;
      }

      if (existing?.timer != null) window.clearTimeout(existing.timer);
      const timer = window.setTimeout(() => {
        const pending = pendingHistorySeekRef.current;
        pendingHistorySeekRef.current = null;
        if (!pending) return;
        void commitHistorySeek(pending.fromSeconds, pending.toSeconds);
      }, 350);
      pendingHistorySeekRef.current = { fromSeconds, toSeconds, timer };
    },
    [commitHistorySeek, getPlaybackPositionSeconds],
  );

  const flushPendingHistorySeek = useCallback(() => {
    const pending = pendingHistorySeekRef.current;
    if (!pending) return;
    if (pending.timer != null) window.clearTimeout(pending.timer);
    pendingHistorySeekRef.current = null;
    void commitHistorySeek(pending.fromSeconds, pending.toSeconds);
  }, [commitHistorySeek]);

  const finalizeActiveHistoryEntry = useCallback(
    async (patch: {
      completed?: boolean;
      playbackSeconds?: number;
      durationSeconds?: number | null;
      interrupted?: boolean;
    }) => {
      // Flush any in-flight scrub onto this start before we close it out.
      flushPendingHistorySeek();

      const entryId = activeHistoryEntryIdRef.current;
      if (entryId == null) return;

      const app = getApp();
      if (!app?.listener?.updateSongHistoryEntry) return;

      await app.listener.updateSongHistoryEntry(entryId, patch);
      activeHistoryEntryIdRef.current = null;
      setPlayCountsNonce((n) => n + 1);

      if (songHistoryOpenRef.current) {
        void loadSongHistoryRef.current();
      }
    },
    [flushPendingHistorySeek],
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

  // Refresh playlist play counts from History (playlist-scoped, not Suno).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const app = getApp();
      if (!app?.listener?.listSongHistory) return;
      try {
        const [rows, seekHitIds] = await Promise.all([
          app.listener.listSongHistory(),
          app.listener.listSongHistorySeekHitEntryIds
            ? app.listener.listSongHistorySeekHitEntryIds()
            : Promise.resolve([] as number[]),
        ]);
        if (cancelled) return;
        const entries = normalizeSongHistoryRows(rows);
        const seekHits = new Set(Array.isArray(seekHitIds) ? seekHitIds : []);
        const byPlaylist = aggregatePlaylistSongPlayStats(entries, seekHits);
        const map = new Map<number, number>();
        for (const stats of byPlaylist.values()) {
          if (stats.playlistId !== selectedArtistId) continue;
          map.set(stats.songId, displayPlayCount(stats, playerSettings.playCountDisplay));
        }
        setPlayCountsBySongId(map);
      } catch {
        if (!cancelled) setPlayCountsBySongId(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerSettings.playCountDisplay, playCountsNonce, selectedArtistId]);

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
        setPlayCountsNonce((n) => n + 1);
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

      if (userInitiated && playbackSession.isPlayLockActive()) {
        if (detour) {
          if (role === 'play-now' && playbackSession.isTrajectoryChangeBlocked('play-now')) {
            return;
          }
          if (role === 'on-deck' && playbackSession.isTrajectoryChangeBlocked('on-deck')) {
            return;
          }
        } else if (playbackSession.isTrajectoryChangeBlocked('change-song', song.id)) {
          return;
        }
      }

      // A direct playback action supersedes silent / radio pseudo-tracks. Cancel
      // their clocks without auto-advancing — this playSong call owns the next
      // trajectory already.
      zen.cancel();
      radio.cancel();

      if (!detour) {
        interruptReturnSongRef.current = null;
        onDeckSongRef.current = null;
        setOnDeckInfo(null);
        if (selectedArtistId != null) {
          playbackSession.beginPrimaryPlayback(selectedArtistId, song.id);
        } else {
          playbackSession.clearDetours();
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
          playbackSession.beginDetourOnDeckPlayback(song.id);
          onDeckSongRef.current = null;
          setOnDeckInfo(null);
        }
        playbackSession.setDetourRole(role);
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

      // Sidebar “now playing playlist” follows the track’s source playlist.
      if (!detour && selectedArtistId != null) {
        setPlayingSourcePlaylistId(selectedArtistId);
      } else if (detour) {
        const role = options.role ?? 'primary';
        const sourceId =
          role === 'play-now' || role === 'on-deck'
            ? (options.historyContext?.playlistId ?? selectedArtistId)
            : (detoursRef.current.primary?.artistId ?? selectedArtistId);
        if (sourceId != null) setPlayingSourcePlaylistId(sourceId);
      }

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

      const onAudioError = (detail?: string) => {
        if (generation !== playbackGenerationRef.current) return;
        suppressPlaybackEndedRef.current = false;
        setError(detail ? `HLS error — ${detail}` : 'Could not load audio stream.');
        setIsPlaying(false);
        setActivePlaybackUrl(null);
        markUnavailableIfLiked();
        handlePlaybackFailure();
      };

      mainMediaCoordinatorRef.current?.attach(audio, playbackUrl, {
        generation,
        playbackScope: song.playback_scope,
        isGenerationCurrent: (g) => g === playbackGenerationRef.current,
        onReady: startPlayback,
        onError: onAudioError,
      });
    },
    [
      beginPlaybackHistory,
      markSongAvailability,
      probeLikedSongAvailability,
      selectedArtistId,
      vcSessionSkippedIds,
      zen.cancel,
      radio.cancel,
    ],
  );

  const primaryQueueOptions = useCallback(
    (): {
      shuffle: boolean;
      repeatMode: RepeatMode;
      sessionSkippedIds: Set<number>;
      shuffleStrategy: typeof ACTIVE_SHUFFLE_STRATEGY;
      shuffleBag: ShuffleBagState;
      shuffleScopeKey: string;
    } => {
      const primary = detoursRef.current.primary;
      return {
        shuffle,
        repeatMode,
        sessionSkippedIds: vcSessionSkippedIds,
        shuffleStrategy: ACTIVE_SHUFFLE_STRATEGY,
        shuffleBag: playlistShuffleBagRef.current,
        shuffleScopeKey:
          primary != null ? `playlist:${primary.artistId}` : 'playlist',
      };
    },
    [repeatMode, shuffle, vcSessionSkippedIds],
  );

  // Fresh without-replacement cycle when playlist shuffle is toggled off.
  useEffect(() => {
    if (!shuffle) {
      clearShuffleBag(playlistShuffleBagRef.current);
    }
  }, [shuffle]);

  /**
   * Super Shuffle session lifecycle: snapshot the eligible library once on start.
   * Do not rebuild when sidebar membership changes mid-session — that waits until
   * the user turns Super Shuffle off and on again.
   */
  useEffect(() => {
    if (!superShuffleEnabled) {
      clearShuffleBag(superShuffleBagRef.current, 'super');
      superShuffleSessionPoolRef.current = null;
      superShuffleSnapshotPromiseRef.current = null;
      return;
    }

    clearShuffleBag(superShuffleBagRef.current, 'super');
    let cancelled = false;
    const playlistIds = sidebarLibrary.displayArtists.map((artist) => artist.id);
    const snapshotPromise = loadSuperShufflePool(playlistIds).then((entries) => {
      if (!cancelled) {
        superShuffleSessionPoolRef.current = entries;
      }
      return entries;
    });
    superShuffleSnapshotPromiseRef.current = snapshotPromise;

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture displayArtists only at session start
  }, [superShuffleEnabled]);

  /** Await the session snapshot (built at Super Shuffle start). */
  const getSuperShuffleSessionPool = useCallback(async (): Promise<SuperShuffleEntry<SongRow>[]> => {
    if (superShuffleSessionPoolRef.current) return superShuffleSessionPoolRef.current;
    if (superShuffleSnapshotPromiseRef.current) {
      return superShuffleSnapshotPromiseRef.current;
    }
    return [];
  }, []);

  /**
   * Play a Super Shuffle pick after confirming it still exists in its playlist.
   * Returns false when the song was deleted / missing so the caller can skip ahead.
   */
  const tryPlaySuperShuffleEntry = useCallback(
    async (entry: SuperShuffleEntry<SongRow>): Promise<boolean> => {
      const app = getApp();
      if (!app) return false;

      const { playlistId } = entry;
      const songRows = await app.listener.listSongs(playlistId);
      const liveSong = songRows.find((row) => row.id === entry.song.id) ?? null;
      // Deleted or removed from the playlist since the session snapshot — skip.
      if (!liveSong) return false;

      const primary = detoursRef.current.primary;
      const needsPlaylistUiSwitch = selectedArtistId !== playlistId;
      const needsPrimaryPlaylistSwitch = primary?.artistId !== playlistId;

      if (needsPlaylistUiSwitch) {
        const nextPlaylistKey = playlistKeyForArtistId(playlistId);
        const orderState = app.listener.getPlaylistOrderState
          ? await app.listener.getPlaylistOrderState(
              nextPlaylistKey,
              songRows.map((row) => row.id),
            )
          : null;
        const nextCustomOrderIds =
          orderState?.ok && orderState.data?.hasCustomOrder ? orderState.data.songIds : null;

        skipNextPlaylistReloadRef.current = true;
        setSelectedArtistId(playlistId);
        setSongs(songRows);
        setCustomOrderIds(nextCustomOrderIds);
        setSort(nextCustomOrderIds ? 'custom' : 'order', 'asc');
        setSortDurationsSnapshot({});
      }

      if (needsPrimaryPlaylistSwitch) {
        // Crossing playlists resets consumed On Deck ids for the new traversal.
        playbackSession.setPrimaryContext(playlistId, liveSong.id);
      }

      playbackSession.setActiveRole('primary');
      playbackSession.updatePrimaryAnchor(liveSong.id);
      await playSong(liveSong, {
        detour: true,
        role: 'primary',
      });
      return true;
    },
    [playSong, playbackSession, selectedArtistId, setSort],
  );

  const ensurePrimaryPlaybackContext = useCallback(() => {
    if (detoursRef.current.primary || selectedArtistId == null || playingSongId == null) return;
    playbackSession.setPrimaryContext(selectedArtistId, playingSongId);
  }, [playbackSession, playingSongId, selectedArtistId]);

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
      if (!song) {
        // Song disappeared — skip forward rather than stalling transport.
        await advancePrimaryPlaylistRef.current(songId, primary.consumedSongIds);
        return;
      }
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

      // Super Shuffle: draw from the session snapshot; skip deleted picks.
      if (superShuffleEnabled) {
        const pool = await getSuperShuffleSessionPool();
        const excludeSongIds = new Set<number>([
          ...vcSessionSkippedIds,
          ...consumedSongIds,
        ]);
        let currentId: number | null = anchorSongId;

        for (let attempt = 0; attempt < 32; attempt += 1) {
          const pick = pickSuperShuffleEntry(pool, {
            currentSongId: currentId,
            excludeSongIds,
            repeatMode,
            shuffleStrategy: ACTIVE_SHUFFLE_STRATEGY,
            shuffleBag: superShuffleBagRef.current,
          });
          if (!pick) return;

          const played = await tryPlaySuperShuffleEntry(pick);
          if (played) return;

          // Missing since snapshot — treat like a skip and draw again.
          excludeSongIds.add(pick.song.id);
          currentId = pick.song.id;
        }
        return;
      }

      const ordered =
        primary.artistId === selectedArtistId
          ? sortedSongsRef.current
          : await loadOrderedPlaylistSongs(primary.artistId);

      let cursorId = anchorSongId;
      let consumed = [...consumedSongIds];

      for (let attempt = 0; attempt < 32; attempt += 1) {
        const nextSongId = pickNextPrimarySongId(
          ordered,
          cursorId,
          primaryQueueOptions(),
          consumed,
        );
        if (nextSongId == null) return;

        const nextSong = ordered.find((row) => row.id === nextSongId);
        if (!nextSong) {
          // Id was in the pick set but row is gone — skip and continue.
          consumed = [...consumed, nextSongId];
          cursorId = nextSongId;
          continue;
        }

        playbackSession.setActiveRole('primary');
        playbackSession.updatePrimaryAnchor(nextSong.id);
        const restartCurrent =
          nextSong.id === playingSongIdRef.current && primaryQueueOptions().repeatMode === 'one';
        await playSong(nextSong, {
          detour: true,
          role: 'primary',
          startAt: restartCurrent ? 0 : undefined,
        });
        return;
      }
    },
    [
      getSuperShuffleSessionPool,
      playSong,
      tryPlaySuperShuffleEntry,
      playbackSession,
      primaryQueueOptions,
      selectedArtistId,
      superShuffleEnabled,
      vcSessionSkippedIds,
      repeatMode,
    ],
  );

  useEffect(() => {
    advancePrimaryPlaylistRef.current = advancePrimaryPlaylist;
  }, [advancePrimaryPlaylist]);

  const handleDetourPlaybackFailure = useCallback(async () => {
    const role = detoursRef.current.activeRole;
    if (role === 'play-now') {
      const resumeSong = interruptReturnSongRef.current;
      const interrupt = detoursRef.current.interrupt;
      playbackSession.clearInterrupt();
      playbackSession.setActiveRole('primary');
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
      playbackSession.setActiveRole('primary');
      const primary = detoursRef.current.primary;
      if (!primary) return;
      await advancePrimaryPlaylist(primary.anchorSongId, primary.consumedSongIds);
      return;
    }

    // Primary (including Super Shuffle): missing / failed track → force next.
    if (role === 'primary') {
      const primary = detoursRef.current.primary;
      const currentSongId = playingSongIdRef.current;
      if (!primary || currentSongId == null) return;
      await advancePrimaryPlaylist(currentSongId, primary.consumedSongIds);
    }
  }, [advancePrimaryPlaylist, playSong, playbackSession]);

  /** Start the queued On Deck track — used when the current song ends or the user hits Next. */
  const playQueuedOnDeckIfAny = useCallback(async (fromUser = false): Promise<boolean> => {
    if (fromUser && playbackSession.isPlayLockActive()) return false;

    const deckTrack = detoursRef.current.onDeck;
    if (!deckTrack) return false;

    const deckSong = onDeckSongRef.current;
    playbackSession.setOnDeck(null);
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

    await playSong(deckSong, {
      detour: true,
      role: 'on-deck',
      historyContext: {
        playlistId: deckTrack.artistId,
        playlistName: deckTrack.playlistName,
        playbackType: 'on-deck',
      },
    });
    return true;
  }, [advancePrimaryPlaylist, playSong, playbackSession]);

  const dismissOnDeck = useCallback(() => {
    playbackSession.setOnDeck(null);
    onDeckSongRef.current = null;
    setOnDeckInfo(null);
  }, [advancePrimaryPlaylist, playSong, playbackSession]);

  const executeTrackEndAction = useCallback(
    async (action: TrackEndAdvanceAction) => {
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
          const row = playingSongRowRef.current;
          if (row && !isCurrentTrackRepeatable()) {
            await finalizeCompletedHistory();
            break;
          }
          const audio = audioRef.current;
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
          playbackSession.clearInterrupt();
          playbackSession.setActiveRole('primary');
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
          playbackSession.setActiveRole('primary');
          await playPrimarySongById(action.songId);
          break;
        }
        case 'advance-primary': {
          await finalizeCompletedHistory();
          playbackSession.setActiveRole('primary');
          await advancePrimaryPlaylist(action.anchorSongId, action.consumedSongIds);
          break;
        }
        case 'stop':
          await finalizeCompletedHistory();
          break;
      }
    },
    [
      advancePrimaryPlaylist,
      duration,
      finalizeActiveHistoryEntry,
      getPlaybackPositionSeconds,
      playPrimarySongById,
      playQueuedOnDeckIfAny,
      playSong,
      playbackSession,
      isCurrentTrackRepeatable,
      vcSoundcloudCaptureActive,
      vcYoutubeCaptureActive,
    ],
  );

  const releaseScheduledPlayLock = useCallback(() => {
    const armed =
      playbackSession.getSnapshot().playLockReleaseOnNext || vc.playLockReleaseOnNextSong;
    if (!armed) return;

    // Clear VC controller state and session together so syncVcPolicy cannot restore a stale lock.
    vc.setPlayLockReleaseOnNextSong(false);
    vc.setPlayLockEnabled(false);
    playbackSession.syncVcPolicy({
      vcActive: vc.vcOpen,
      playLockEnabled: false,
      playLockReleaseOnNext: false,
    });
  }, [playbackSession, vc]);

  const resumeAfterSpecialPause = useCallback(async () => {
    if (advancingFromEndedRef.current) return;

    const currentSongId = playingSongIdRef.current;
    if (currentSongId == null) return;

    advancingFromEndedRef.current = true;
    try {
      playbackSession.handleTrackEnded(currentSongId, {
        currentSongPlayable: isCurrentTrackRepeatable(),
      });
    } finally {
      advancingFromEndedRef.current = false;
    }
  }, [isCurrentTrackRepeatable, playbackSession]);
  resumeAfterSpecialPauseRef.current = () => {
    void resumeAfterSpecialPause();
  };

  const handleTrackNaturalEnd = useCallback(async () => {
    if (advancingFromEndedRef.current) return;

    const currentSongId = playingSongIdRef.current;
    if (currentSongId == null) return;

    if (vc.vcOpen) {
      if (isSpecialPlayStyleActive(vc.activeConfig.specialPlayStyle.style)) {
        // 1-song play lock clears when the song ends, before the between-song countdown.
        releaseScheduledPlayLock();
        if (specialPlay.beginPauseAfterSong(vc.activeConfig.specialPlayStyle)) {
          return;
        }
      }
    }

    // Listener-only between-track breaks. VC has its own host-directed pause
    // policy — do not stack independent clocks on top of it.
    const canInsertListeningBreak = !vc.vcOpen && repeatMode !== 'one';
    const detours = detoursRef.current;
    const hasFollowingTrack = canInsertListeningBreak
      ? detours.activeRole === 'play-now'
        ? detours.interrupt != null
        : detours.activeRole === 'on-deck'
          ? Boolean(
              detours.primary && pickNextSongId(detours.primary.anchorSongId) != null,
            )
          : Boolean(
              detours.onDeck ||
                (detours.primary && pickNextSongId(currentSongId) != null),
            )
      : false;

    // Zen: every three completed songs → silence (or half-silence around Radio).
    let zenSilenceSeconds: number | null = null;
    if (playerSettings.zenModeEnabled && canInsertListeningBreak) {
      zenCompletedSongsRef.current += 1;
      if (shouldStartZenInterlude(zenCompletedSongsRef.current)) {
        zenCompletedSongsRef.current = 0;
        if (hasFollowingTrack) {
          zenSilenceSeconds = pickZenSilenceSeconds();
        }
      }
    }

    // Radio: coin-flip announcement after a finished song (compatible with Zen).
    const wantRadio =
      playerSettings.radioModeEnabled &&
      canInsertListeningBreak &&
      hasFollowingTrack &&
      shouldStartRadioBreak();

    if (wantRadio) {
      // Composite breaks run entirely on the radio sequencer so Zen's half
      // silences bookend the announcement without two clocks fighting.
      zen.cancel();
      const weather = await fetchRadioWeatherSnapshot();
      const kind = pickRadioAnnouncementKind();
      const text = buildRadioAnnouncementText(kind, weather);
      const profile = resolveRadioVoiceProfile(playerSettings.radioVoiceId);
      radio.begin(
        buildRadioBreakSegments({
          announcementText: text,
          announcementKind: kind,
          zenSilenceSeconds,
        }),
        profile,
      );
      return;
    }

    if (zenSilenceSeconds != null) {
      zen.begin(zenSilenceSeconds);
      return;
    }

    advancingFromEndedRef.current = true;
    try {
      playbackSession.handleTrackEnded(currentSongId, {
        currentSongPlayable: isCurrentTrackRepeatable(),
      });
    } finally {
      advancingFromEndedRef.current = false;
    }
  }, [
    isCurrentTrackRepeatable,
    pickNextSongId,
    playbackSession,
    playerSettings.radioModeEnabled,
    playerSettings.radioVoiceId,
    playerSettings.zenModeEnabled,
    radio.begin,
    releaseScheduledPlayLock,
    repeatMode,
    specialPlay,
    vc.activeConfig.specialPlayStyle,
    vc.vcOpen,
    zen.begin,
    zen.cancel,
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
      playbackSession.setOnDeck({
        songId: song.id,
        artistId,
        songTitle: song.title,
        playlistName,
      });
      setOnDeckInfo({
        songId: song.id,
        playlistId: artistId,
        songTitle: song.title,
        artistName: song.artist_name ?? '',
        playlistName,
      });
    },
    [ensurePrimaryPlaybackContext, playbackSession],
  );

  const handlePlayNowFromContext = useCallback(
    async (song: SongRow) => {
      if (playingSongId == null || !playingSong) return;
      if (playbackSession.isTrajectoryChangeBlocked('play-now')) return;
      const menu = playlistContextMenu;
      setPlaylistContextMenu(null);
      setOnDeckReplacePrompt(null);
      ensurePrimaryPlaybackContext();

      const primary = detoursRef.current.primary;
      if (primary) {
        playbackSession.updatePrimaryAnchor(playingSongId);
      }

      interruptReturnSongRef.current = playingSong;
      playbackSession.setInterrupt({
        returnSongId: playingSong.id,
        returnArtistId: primary?.artistId ?? selectedArtistId ?? playingSong.artist_id,
        returnPositionSeconds: getPlaybackPositionSeconds(),
      });
      playbackSession.setActiveRole('play-now');
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
      playbackSession,
      selectedArtistId,
    ],
  );

  const handlePutOnDeckFromContext = useCallback(
    (song: SongRow, artistId: number, playlistName: string) => {
      if (playingSongId == null) return;
      if (playbackSession.isTrajectoryChangeBlocked('on-deck')) return;
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

      if (playbackSession.isTrajectoryChangeBlocked('play-now')) return;
      ensurePrimaryPlaybackContext();
      const primary = detoursRef.current.primary;
      if (primary) {
        playbackSession.updatePrimaryAnchor(playingSongId);
      }

      interruptReturnSongRef.current = playingSong;
      playbackSession.setInterrupt({
        returnSongId: playingSong.id,
        returnArtistId: primary?.artistId ?? selectedArtistId ?? playingSong.artist_id,
        returnPositionSeconds: getPlaybackPositionSeconds(),
      });
      playbackSession.setActiveRole('play-now');
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
      setScrollToSongNonce((n) => n + 1);
      setSongHistoryOpen(false);
    },
    [addToast, resolveHistorySong, selectedArtistId, showSongPage],
  );

  /** Single-click Now Playing title — select source playlist, open the song page, scroll to the row. */
  const revealSongInPlaylist = useCallback(
    (song: SongRow, playlistId: number | null) => {
      const focusSong = (row: SongRow) => {
        void showSongPage(row);
        setScrollToSongId(row.id);
        setScrollToSongNonce((n) => n + 1);
      };

      if (playlistId == null || selectedArtistId === playlistId) {
        focusSong(song);
        return;
      }

      pendingRevealSongRef.current = { songId: song.id, playlistId };
      skipNextPlaylistReloadRef.current = false;
      setSelectedArtistId(playlistId);
    },
    [selectedArtistId, showSongPage],
  );

  const handleRevealNowPlaying = useCallback(() => {
    if (playingSongId == null || !playingSong) return;

    const playlistId =
      playingSourcePlaylistId ??
      playbackSnapshot?.detours.primary?.artistId ??
      selectedArtistId;

    revealSongInPlaylist(playingSong, playlistId);
  }, [
    playingSong,
    playingSongId,
    playingSourcePlaylistId,
    playbackSnapshot?.detours.primary?.artistId,
    revealSongInPlaylist,
    selectedArtistId,
  ]);

  const handleRevealOnDeck = useCallback(() => {
    const deck = onDeckInfo;
    const song = onDeckSongRef.current;
    if (!deck || !song || song.id !== deck.songId) return;
    revealSongInPlaylist(song, deck.playlistId);
  }, [onDeckInfo, revealSongInPlaylist]);

  const handleConfirmClearSongHistory = useCallback(async () => {
    const app = getApp();
    if (!app?.listener?.clearSongHistory) return;
    await app.listener.clearSongHistory();
    setSongHistoryEntries([]);
    setPlayCountsNonce((n) => n + 1);
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
    setScrollToSongNonce((n) => n + 1);
  }, [selectedArtistId, showSongPage, sortedSongs]);

  // Finish title-click reveal after the source playlist finishes loading.
  useEffect(() => {
    const pending = pendingRevealSongRef.current;
    if (!pending || selectedArtistId !== pending.playlistId) return;

    const song = sortedSongs.find((row) => row.id === pending.songId);
    if (!song) return;

    pendingRevealSongRef.current = null;
    void showSongPage(song);
    setScrollToSongId(song.id);
    setScrollToSongNonce((n) => n + 1);
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
        setSort(customOrderIds ? 'custom' : 'order', 'asc');
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
      if (shouldFastRepeatCurrentOnEnd()) {
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
  }, [persistSongDuration, playingSongId, shouldFastRepeatCurrentOnEnd]);

  useEffect(() => {
    // Only poll the main-pane widget when it is the playing track (not a browse preview).
    if (vcWidgetCaptureActive || !widgetOwnsTransport || !isPlaying) return;

    const tick = () => {
      const player = showingYoutubePage
        ? youtubePlayerRef.current
        : soundcloudPlayerRef.current;
      if (!player) return;
      const nextTime = player.getCurrentTime();
      // Skip identical floats so seekbar ticks do not thrash ListenerMode for no reason.
      if (Number.isFinite(nextTime)) {
        setCurrentTime((prev) => (Math.abs(prev - nextTime) < 0.05 ? prev : nextTime));
      }
      const nextDuration = player.getDuration();
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        setDuration((prev) => (Math.abs(prev - nextDuration) < 0.05 ? prev : nextDuration));
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [
    isPlaying,
    showingYoutubePage,
    vcWidgetCaptureActive,
    widgetOwnsTransport,
  ]);

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
    // Soft guard — don't unsubscribe the artist that owns what's in the transport.
    if (isNowPlayingLibraryEntry(playingSongId, playingSourcePlaylistId, selectedArtistId)) {
      addToast(NOW_PLAYING_ARTIST_REMOVE_TOAST);
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

  const handleRequestRemoveLibraryPlaylist = useCallback(
    (artist: ArtistRow) => {
      if (isNowPlayingLibraryEntry(playingSongId, playingSourcePlaylistId, artist.id)) {
        addToast(NOW_PLAYING_PLAYLIST_REMOVE_TOAST);
        setLibrarySidebarContextMenu(null);
        return;
      }
      setLibraryPlaylistRemoveTarget(artist);
      setLibrarySidebarContextMenu(null);
    },
    [addToast, playingSongId, playingSourcePlaylistId],
  );

  const handleConfirmRemoveLibraryPlaylist = useCallback(async () => {
    const target = libraryPlaylistRemoveTarget;
    if (!target) return;

    const entryType = sidebarEntryType(target);
    if (entryType !== 'playlist') return;

    if (isNowPlayingLibraryEntry(playingSongId, playingSourcePlaylistId, target.id)) {
      addToast(NOW_PLAYING_PLAYLIST_REMOVE_TOAST);
      setLibraryPlaylistRemoveTarget(null);
      return;
    }

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
    playingSongId,
    playingSourcePlaylistId,
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
      if (playbackSession.isTrajectoryChangeBlocked('start-idle-playback')) {
        return;
      }
      void playSong(previewSong, { userInitiated: true });
      return;
    }

    if (showingYoutubePage && playingSongId != null && activeSongPage?.id === playingSongId) {
      if (vcYoutubeCaptureActive) {
        if (isPlaying) {
          setIsPlaying(false);
        } else if (tryResumeCurrentOrAdvance() === 'resume') {
          setIsPlaying(true);
        }
        return;
      }
      if (isPlaying) {
        youtubePlayerRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (tryResumeCurrentOrAdvance() !== 'resume') return;
        youtubePlayerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    if (showingSoundcloudPage && playingSongId != null && activeSongPage?.id === playingSongId) {
      if (vcSoundcloudCaptureActive) {
        if (isPlaying) {
          setIsPlaying(false);
        } else if (tryResumeCurrentOrAdvance() === 'resume') {
          setIsPlaying(true);
        }
        return;
      }
      if (isPlaying) {
        soundcloudPlayerRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (tryResumeCurrentOrAdvance() !== 'resume') return;
        soundcloudPlayerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (tryResumeCurrentOrAdvance() !== 'resume') return;
      void audio.play();
    } else {
      audio.pause();
    }
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
          {
            shuffle,
            repeatMode,
            sessionSkippedIds: vcSessionSkippedIds,
            shuffleStrategy: ACTIVE_SHUFFLE_STRATEGY,
            shuffleBag: playlistShuffleBagRef.current,
            shuffleScopeKey:
              selectedArtistId != null ? `playlist:${selectedArtistId}` : 'playlist',
          },
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
    [playingSongId, previewSongId, repeatMode, selectedArtistId, shuffle, vcSessionSkippedIds],
  );

  const handlePlaylistSongRemove = useCallback(
    async (song: SongRow) => {
      setPlaylistContextMenu(null);
      // Soft guard — don't pull the transport track out from under itself.
      if (isNowPlayingSong(playingSongId, song.id)) {
        addToast(NOW_PLAYING_SONG_REMOVE_TOAST);
        return;
      }
      if (isVcPlayLockBlockingSongRemoval(playbackSession.isPlayLockActive(), playingSongId, song.id)) {
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
    [
      addToast,
      clearPlaybackForRemovedSong,
      loadLibrary,
      playbackSession,
      playingSongId,
      selectedArtistId,
    ],
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

      // Moving off the source playlist removes the row — block when it's playing.
      if (isNowPlayingSong(playingSongId, modal.song.id)) {
        addToast(NOW_PLAYING_SONG_REMOVE_TOAST);
        return;
      }

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
    [
      addToast,
      clearPlaybackForRemovedSong,
      loadLibrary,
      playingSongId,
      selectedArtistId,
      songToPlaylistModal,
    ],
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

  const handleRowContextMenu = useCallback(
    (event: React.MouseEvent, song: SongRow) => {
      event.preventDefault();
      if (selectedArtistId == null) return;
      setPlaylistContextMenu({
        song,
        sourceArtistId: selectedArtistId,
        sourcePlaylistName: selectedArtist?.artist_name ?? 'Playlist',
        x: event.clientX,
        y: event.clientY,
      });
    },
    [selectedArtist?.artist_name, selectedArtistId],
  );

  const handleCopySongPageLink = async (song: SongRow) => {
    setPlaylistContextMenu(null);
    const link = shareableSongLink(song);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setError('Could not copy link to clipboard.');
    }
  };

  // Stable handlers keep PlaylistTableBody's memo intact while widget transport
  // polls currentTime — otherwise every tick remounts source logos under the cursor.
  const handleRowClick = useCallback(
    (song: SongRow) => {
      if (rowClickTimerRef.current != null) {
        window.clearTimeout(rowClickTimerRef.current);
      }
      rowClickTimerRef.current = window.setTimeout(() => {
        rowClickTimerRef.current = null;
        void showSongPage(song);
      }, 250);
    },
    [showSongPage],
  );

  const handleRowDoubleClick = useCallback(
    (song: SongRow) => {
      if (rowClickTimerRef.current != null) {
        window.clearTimeout(rowClickTimerRef.current);
        rowClickTimerRef.current = null;
      }
      if (playbackSession.isTrajectoryChangeBlocked('playlist-double-click')) {
        return;
      }
      void playSong(song, { userInitiated: true });
    },
    [playSong, playbackSession],
  );

  const handlePlaylistDoubleClick = useCallback(
    async (artistId: number) => {
      if (
        playbackSession.isTrajectoryChangeBlocked('playlist-double-click')
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
          ordered = sortPlaylistSongs(
            songRows,
            column,
            sortDirection,
            sortDurationsSnapshot,
            playCountsBySongId,
          );
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
      playCountsBySongId,
      playSong,
      playingSongId,
      selectedArtistId,
      songs,
      sortColumn,
      sortDirection,
      sortDurationsSnapshot,
    ],
  );

  const handleSeek = (time: number) => {
    if (showingYoutubePage && playingSongId != null && activeSongPage?.id === playingSongId) {
      const clamped = duration > 0 ? Math.min(duration, Math.max(0, time)) : Math.max(0, time);
      noteHistorySeek(clamped);
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
      noteHistorySeek(clamped);
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
    const clamped = Math.min(duration, Math.max(0, time));
    noteHistorySeek(clamped);
    audio.currentTime = clamped;
    setCurrentTime(audio.currentTime);
  };

  useEffect(() => {
    runPlaybackEffectsRef.current = (effects) => {
      runPlaybackSessionEffects(effects, {
        sortedSongs,
        playingSongId,
        playSong,
        advancePrimaryPlaylist,
        handleDetourPlaybackFailure,
        playQueuedOnDeckIfAny,
        dismissOnDeck,
        togglePlayPause,
        handleSeek,
        executeTrackEndAction,
        releasePlayLockIfScheduled: () => releaseScheduledPlayLock(),
        resumeAfterWait: () => specialPlay.playNextAfterPause(),
        applyVolumeDelta: (delta) => {
          setVolume((current) => Math.min(1, Math.max(0, current + delta)));
        },
        restartDetour: (role) => {
          const current = playingSongRowRef.current;
          if (current) void playSong(current, { detour: true, role, startAt: 0 });
        },
      });
    };
  }, [
    advancePrimaryPlaylist,
    dismissOnDeck,
    executeTrackEndAction,
    handleDetourPlaybackFailure,
    handleSeek,
    playQueuedOnDeckIfAny,
    playSong,
    sortedSongs,
    specialPlay.playNextAfterPause,
    releaseScheduledPlayLock,
    togglePlayPause,
    playingSongId,
  ]);

  const playerBarTransport = useMemo(
    () => createPlayerBarTransportHandlers(playbackSession),
    [playbackSession],
  );

  const handleToggleZenMode = useCallback(() => {
    const nextEnabled = !playerSettings.zenModeEnabled;
    zenCompletedSongsRef.current = 0;
    setZenModeEnabled(nextEnabled);
    if (!nextEnabled && zenInterludeActive) {
      // Turning Zen off from either the menu or its Now Playing popover also
      // removes the current silence and resumes the deferred queue advance.
      zen.removeAndContinue();
    }
  }, [
    playerSettings.zenModeEnabled,
    setZenModeEnabled,
    zen.removeAndContinue,
    zenInterludeActive,
  ]);

  const handleToggleRadioMode = useCallback(() => {
    const nextEnabled = !playerSettings.radioModeEnabled;
    setRadioModeEnabled(nextEnabled);
    if (!nextEnabled && radioBreakActive) {
      radio.removeAndContinue();
    }
  }, [
    playerSettings.radioModeEnabled,
    radio.removeAndContinue,
    radioBreakActive,
    setRadioModeEnabled,
  ]);

  const handleBetweenTrackPrevious = useCallback(() => {
    // Previous takes over the trajectory, so cancel without auto-advancing.
    zen.cancel();
    radio.cancel();
    playerBarTransport.onPrevious();
  }, [playerBarTransport, radio.cancel, zen.cancel]);

  const handleBetweenTrackTogglePlayPause = useCallback(() => {
    if (radioBreakActive) {
      radio.togglePlaying();
      return;
    }
    zen.togglePlaying();
  }, [radio.togglePlaying, radioBreakActive, zen.togglePlaying]);

  const handleBetweenTrackNext = useCallback(() => {
    if (radioBreakActive) {
      radio.removeAndContinue();
      return;
    }
    zen.removeAndContinue();
  }, [radio.removeAndContinue, radioBreakActive, zen.removeAndContinue]);

  const handleBetweenTrackSeek = useCallback(
    (seconds: number) => {
      if (radioBreakActive) {
        radio.seek(seconds);
        return;
      }
      zen.seek(seconds);
    },
    [radio.seek, radioBreakActive, zen.seek],
  );

  // --- YouTube mini-player compliance -------------------------------------
  // YouTube's TOS requires the video stay visible while it plays. Mini-player
  // (minified) mode hides the in-window embed, so when a YouTube track plays
  // there we mitigate per the user's chosen behavior (Settings → Player):
  //   'projector' → pop the embed into a small Projector window (default)
  //   'expand'    → temporarily un-minify, re-minify when the track ends
  //   'skip'      → skip YouTube tracks while minified
  // If VC is already showing the embed (vcYoutubeCaptureActive) the video is
  // visible elsewhere, so there's no violation and we leave everything alone.
  // Lifecycle of the compliance projector WE open (never a projector the user
  // opened themselves): 'idle' → 'opening' (open in flight) → 'open'. The
  // 'opening' step avoids a false "user closed it" read during the open
  // handshake (windowOpen flips true a render after we call openWindow).
  const projectorComplianceRef = useRef<'idle' | 'opening' | 'open'>('idle');
  const autoExpandedRef = useRef(false);
  const playingIsYoutube =
    playingSong != null && isYoutubeSong(playingSong) && !vcYoutubeCaptureActive;
  // Is there anywhere for 'skip' to land? If the whole playlist is YouTube,
  // skipping just cycles hidden videos (or stops), so we fall back to the
  // projector popup instead — see effectiveYoutubeMiniBehavior below.
  const hasNonYoutubeSong = useMemo(() => playlistHasNonYoutubeSong(sortedSongs), [sortedSongs]);
  const effectiveYoutubeMiniBehavior = resolveEffectiveMiniBehavior(
    playerSettings.youtubeMiniPlayerBehavior,
    hasNonYoutubeSong,
  );

  // A manual mini-player toggle is the user's own intent — drop the "expand"
  // bookkeeping so we don't immediately fight them by re-expanding/re-minifying.
  const handleToggleChromeMinified = useCallback(() => {
    autoExpandedRef.current = false;
    setChromeMinified((on) => !on);
  }, []);

  // YouTube TOS: minifying hides the main-window embed (display:none), which
  // Chromium can suspend so the "playing" signal drops and the projector
  // compliance never engages. When minify is taken over a playing YouTube track,
  // restart it at its current position: playSong sets isPlaying=true
  // programmatically (independent of the suspended embed), which re-fires the
  // projector-open effect below and hands the video off to the compliance window.
  const prevMinifiedForYoutubeRef = useRef(chromeMinified);
  useEffect(() => {
    const wasMinified = prevMinifiedForYoutubeRef.current;
    prevMinifiedForYoutubeRef.current = chromeMinified;
    // Only act on the rising edge (un-minified → minified).
    if (!chromeMinified || wasMinified) return;

    // Pure decision (see youtubeMiniCompliance): restart the now-playing YouTube
    // track so the projector handoff fires, or promote a playing browse-preview
    // that was never made the now-playing track. Side effects run here.
    const edgeAction = decideMinifyEdgeAction({
      behavior: effectiveYoutubeMiniBehavior,
      playingIsYoutube,
      hasPlayingSong: playingSong != null,
      mainPaneWidgetPlaying: mainPaneWidgetPlayingRef.current,
      mainContentIsSong: mainContentView === 'song',
      showingYoutubePage,
      youtubeRemoteCaptureActive,
      hasActiveSongPage: activeSongPage != null,
      activeSongPageIsPlayingTrack: activeSongPage != null && playingSongId === activeSongPage.id,
    });

    if (edgeAction === 'restart-current' && playingSong) {
      // playSong re-asserts isPlaying=true even if Chromium suspended the hidden
      // embed, which re-fires the projector-open effect below.
      const resumeAt = getPlaybackPositionSeconds();
      void playSongRef.current(playingSong, { startAt: resumeAt > 0 ? resumeAt : 0 });
    } else if (edgeAction === 'promote-preview' && activeSongPage) {
      // Promote at the preview's current position; setting playingSongId flips
      // playingIsYoutube true so the behavior effect below engages.
      const previewTime = youtubePlayerRef.current?.getCurrentTime();
      const resumeAt = Number.isFinite(previewTime) && (previewTime as number) > 0 ? (previewTime as number) : 0;
      void playSongRef.current(activeSongPage, { startAt: resumeAt, userInitiated: true });
    }
  }, [
    chromeMinified,
    effectiveYoutubeMiniBehavior,
    playingIsYoutube,
    playingSong,
    getPlaybackPositionSeconds,
    mainContentView,
    showingYoutubePage,
    youtubeRemoteCaptureActive,
    activeSongPage,
    playingSongId,
  ]);

  useEffect(() => {
    // Pure decision (see youtubeMiniCompliance) — the steady-state mini-player
    // behavior (skip / expand / projector) plus the next projector-lifecycle and
    // auto-expanded bookkeeping. Side effects (Next, minify, projector window)
    // and ref writes happen here; the branching itself is unit-tested.
    const decision = decideMiniPlayerComplianceAction({
      behavior: effectiveYoutubeMiniBehavior,
      chromeMinified,
      playingIsYoutube,
      isPlaying,
      projectorState: projectorComplianceRef.current,
      projectorWindowOpen: visualizer.windowOpen,
      autoExpanded: autoExpandedRef.current,
    });

    projectorComplianceRef.current = decision.projectorState;
    autoExpandedRef.current = decision.autoExpanded;

    switch (decision.action.type) {
      case 'skip-to-next':
      case 'skip-projector-closed':
        playerBarTransport.onNext();
        break;
      case 'expand-player':
        setChromeMinified(false);
        break;
      case 'restore-mini-player':
        setChromeMinified(true);
        break;
      case 'open-projector':
        void visualizer.openWindow({ mode: 'video', width: 400, height: 300 });
        break;
      case 'close-projector':
        void visualizer.closeWindow();
        break;
      case 'none':
        break;
    }
  }, [
    chromeMinified,
    playingIsYoutube,
    isPlaying,
    effectiveYoutubeMiniBehavior,
    playingSongId,
    visualizer.windowOpen,
    visualizer.openWindow,
    visualizer.closeWindow,
    playerBarTransport,
  ]);

  // YouTube TOS: opening the VC designer overlay covers the main-window YouTube
  // embed, which obstructs the playing video. Jump straight to the next
  // non-YouTube entry in the current playlist so nothing plays hidden behind the
  // overlay (and the party keeps going); if the whole playlist is YouTube, pause
  // instead. Playing the song directly is reliable even when NEXT would no-op
  // (YouTube track last, repeat off).
  useEffect(() => {
    if (!vc.modalOpen || !playingIsYoutube) return;
    const nextNonYoutube = findNextNonYoutubeSong(sortedSongs, playingSongId);
    if (nextNonYoutube) {
      void playSongRef.current(nextNonYoutube, { userInitiated: true });
    } else if (isPlaying) {
      playerBarTransport.onTogglePlayPause();
    }
  }, [vc.modalOpen, playingIsYoutube, isPlaying, playingSongId, sortedSongs, playerBarTransport]);

  const handleContentResize = (deltaY: number) => {
    const column = mainColumnRef.current;
    setContentHeight((height) => clampContentHeight(column, height + deltaY, minContentHeight));
  };

  const canLikeSong = useCallback(
    (song: SongRow | null | undefined) =>
      song != null &&
      (song.id > 0 || isSunoDemoSong(song) || isUserPlaylistSongId(song.id)),
    [],
  );

  const toggleLikeForSong = useCallback(
    async (song: SongRow) => {
      if (!canLikeSong(song)) return;

      const app = getApp();
      if (!app) return;

      // Unliking while viewing Liked Songs removes the row — block if it's playing.
      const currentlyLiked = likedSongIds.has(song.id) || song.liked_id != null;
      if (
        currentlyLiked &&
        isLikedPlaylist &&
        isNowPlayingSong(playingSongId, song.id)
      ) {
        addToast(NOW_PLAYING_SONG_REMOVE_TOAST);
        return;
      }

      setLikeBusy(true);
      const result = await app.listener.toggleLikeSong(song.id);
      setLikeBusy(false);

      if (!result.ok || !result.data) {
        setError(result.error || 'Could not update Liked Songs.');
        return;
      }

      if (previewSongId === song.id) {
        setCurrentSongLiked(result.data.liked);
      }
      setLikedSongCount(result.data.count);
      setLikedSongIds((prev) => {
        const next = new Set(prev);
        if (result.data!.liked) next.add(song.id);
        else next.delete(song.id);
        return next;
      });

      addToast(result.data.liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');

      await loadLibrary();

      if (isLikedPlaylist && !result.data.liked) {
        setSongs((prev) => prev.filter((row) => row.id !== song.id));
      }
    },
    [
      addToast,
      canLikeSong,
      isLikedPlaylist,
      likedSongIds,
      loadLibrary,
      playingSongId,
      previewSongId,
    ],
  );

  const handleToggleLike = async () => {
    if (!canToggleLike || previewSong == null) return;
    await toggleLikeForSong(previewSong);
  };

  const handleToggleLikedFromContext = (song: SongRow) => {
    setPlaylistContextMenu(null);
    void toggleLikeForSong(song);
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
          onViewModeChange={setLyricsViewMode}
          showPromptInformation={playerSettings.showSunoPromptInformation}
          fontIncreaseLevel={playerSettings.songPageFontIncreaseLevel}
        />
      );
    }

    if (mainContentView === 'song' && showingFlowPage && activeSongPage) {
      return (
        <FlowSongPage
          song={activeSongPage}
          lyricsSettings={lyricsDisplaySettings}
          onRemoveBracketsChange={setLyricsRemoveBrackets}
          onViewModeChange={setLyricsViewMode}
          fontIncreaseLevel={playerSettings.songPageFontIncreaseLevel}
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
          shouldPlay={playingSongId === activeSongPage.id && isPlaying && !youtubeRemoteCaptureActive}
          volume={volume}
          captureInVc={youtubeRemoteCaptureActive}
          onReady={handleYoutubeReady}
          onPlayingChange={handleWidgetPlayingChange}
          onEnded={handleMainPaneYoutubeEnded}
          onDuration={handleMainPaneWidgetDuration}
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
          fontIncreaseLevel={playerSettings.songPageFontIncreaseLevel}
          onReady={handleYoutubeReady}
          onPlayingChange={handleWidgetPlayingChange}
          onEnded={handleMainPaneSoundcloudEnded}
          onDuration={handleMainPaneWidgetDuration}
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
            fontIncreaseLevel={playerSettings.songPageFontIncreaseLevel}
            onRemoveBracketsChange={setLyricsRemoveBrackets}
            onViewModeChange={setLyricsViewMode}
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
        nowPlayingPlaylistId={playingSongId != null ? playingSourcePlaylistId : null}
        nowPlayingIsPlaying={playingSongId != null && isPlaying}
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
            isPlaying={
              radio.breakState?.running ??
              zen.interlude?.running ??
              (playingSongId != null && isPlaying)
            }
            nowPlayingTitle={
              radio.breakState?.title ??
              (zen.interlude
                ? `${zen.interlude.durationSeconds} seconds of Silence…`
                : (playingSong?.title ?? activeSongPage?.title ?? ''))
            }
            nowPlayingArtist={betweenTrackBreakActive ? '' : nowPlayingArtistName}
            nowPlayingCoverUrl={playingSong?.cover_url ?? activeSongPage?.cover_url ?? null}
            onRevealNowPlaying={
              !betweenTrackBreakActive && playingSongId != null
                ? handleRevealNowPlaying
                : undefined
            }
            shuffle={shuffle}
            superShuffle={superShuffleEnabled}
            repeatMode={repeatMode}
            volume={volume}
            currentTime={
              radio.breakState?.elapsedSeconds ??
              zen.interlude?.elapsedSeconds ??
              (playingSongId != null ? currentTime : 0)
            }
            duration={
              radio.breakState?.durationSeconds ??
              zen.interlude?.durationSeconds ??
              transportDuration
            }
            onToggleShuffle={playerBarTransport.onToggleShuffle}
            onToggleSuperShuffle={() => {
              setSuperShuffleEnabled((enabled) => !enabled);
            }}
            onPrevious={
              betweenTrackBreakActive
                ? handleBetweenTrackPrevious
                : playerBarTransport.onPrevious
            }
            onTogglePlayPause={
              betweenTrackBreakActive
                ? handleBetweenTrackTogglePlayPause
                : playerBarTransport.onTogglePlayPause
            }
            onNext={
              betweenTrackBreakActive
                ? handleBetweenTrackNext
                : playerBarTransport.onNext
            }
            onCycleRepeat={playerBarTransport.onCycleRepeat}
            onVolumeChange={setVolume}
            onSeek={betweenTrackBreakActive ? handleBetweenTrackSeek : playerBarTransport.onSeek}
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
            zenModeActive={playerSettings.zenModeEnabled}
            onToggleZenMode={handleToggleZenMode}
            radioModeActive={playerSettings.radioModeEnabled}
            onToggleRadioMode={handleToggleRadioMode}
            audioEffectsOpen={effectsLab.panelVisible}
            onToggleAudioEffects={toggleAudioEffects}
            seekTimeDisplay={playerSettings.seekTimeDisplay}
            onToggleSeekTimeDisplay={toggleSeekLabel}
            chromeMinified={chromeMinified}
            onToggleChromeMinified={handleToggleChromeMinified}
            onDeck={onDeckInfo}
            onClearOnDeck={dismissOnDeck}
            onRevealOnDeck={onDeckInfo ? handleRevealOnDeck : undefined}
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
          <section
            className="song-page-panel panel"
            style={{ height: contentHeight, minHeight: minContentHeight, flex: 'none' }}
          >
            <h2 className="sr-only">Listener content</h2>
            {/* YouTube embed covers the panel corner — omit there. Flow/Suno/SC/guest pages can like. */}
            {mainContentView === 'song' &&
            !showingYoutubePage &&
            !coverModalOpen &&
            !visualizer.embeddedActive &&
            (showingSunoDemoPage ||
              showingFlowPage ||
              showingSoundcloudPage ||
              Boolean(pageUrl)) ? (
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
              yearColumnMode={tableView.yearColumnMode}
              playCountsBySongId={playCountsBySongId}
              onToggleYearPlaysColumn={tableView.toggleYearPlaysColumn}
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
              scrollToSongNonce={scrollToSongNonce}
              isPlaying={playingSongId != null && isPlaying}
              onDeckSongId={onDeckInfo?.songId ?? null}
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
          liked={
            playlistKind === 'personal' || likedSongIds.has(playlistContextMenu.song.id)
          }
          onToggleLiked={
            playlistKind === 'personal'
              ? (song) => void handlePlaylistSongRemove(song)
              : canLikeSong(playlistContextMenu.song)
                ? handleToggleLikedFromContext
                : undefined
          }
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
          analyser={vc.butterchurnVcMirrorActive ? vc.analyser : visualizer.analyser}
          frequencyData={visualizer.frequencyData}
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
      <MeydaLabPanel mirrorAudioRef={analyserAudioRef} isPlaying={isPlaying} />
      <EffectsLabPanel
        state={effectsLab}
        onChange={setEffectsLabSynced}
        crossfades={crossfades}
        onCrossfadesChange={setCrossfades}
        effectsOffline={audioEffectsOffline}
        vcMirrorPlaybackActive={vc.vcOpen}
        onPerformanceRouteChange={setPerformanceFxActive}
        mainAudioRef={audioRef}
        mirrorAudioRef={analyserAudioRef}
        mainVolume={volume}
      />
    </div>
  );
}
