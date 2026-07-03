import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';
import Hls from 'hls.js';
import { SongPageWebview } from './SongPageWebview';
import { ListenerWelcome } from './ListenerWelcome';
import { ArtistInfoPanel } from './ArtistInfoPanel';
import { usePlaybackEffects } from './usePlaybackEffects';
import { ToastStack } from './ToastStack';
import { useToasts } from './useToasts';
import { PlayerBar, type RepeatMode } from './PlayerBar';
import { VerticalResizeHandle } from './VerticalResizeHandle';
import { ListenerSidebar, SIDEBAR_COLLAPSED_KEY } from './ListenerSidebar';
import { SubscribeArtistModal } from './SubscribeArtistModal';
import { formatTime } from './formatTime';
import { probeSongDurationSeconds, songNeedsDurationProbe } from './probeSongDuration';
import { sortPlaylistSongs, type SortColumn, type SortDirection } from './sortPlaylist';
import { SortableColumnHeader } from './SortableColumnHeader';
import { SongLikeButton } from './SongLikeButton';
import { LikedSongsPanel } from './LikedSongsPanel';
import { LikedSongIndicator } from './LikedSongIndicator';
import { PlaylistRowContextMenu } from './PlaylistRowContextMenu';
import { shareableSongPageUrl } from './shareableSongPageUrl';
import { resolveSongAccess } from './resolveSongAccess';
import {
  buildLikedSongsArtistRow,
  isLikedSongsArtist,
  LIKED_SONGS_ARTIST_ID,
} from './likedSongs';
import type { ArtistRow, SongRow } from '../types/app';
import { EmbeddedVisualizerHost } from '../visualizers/EmbeddedVisualizerHost';
import { VisualizerSettingsDialog } from '../visualizers/settings/ui/VisualizerSettingsDialog';
import { ButterchurnMirrorHost } from '../visualizers/butterchurn/adapter/ButterchurnMirrorHost';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { useVisualizerManager } from '../visualizers/useVisualizerManager';
import { VcModeModal } from '../vc-mode/VcModeModal';
import { VcCloseConfirmModal } from '../vc-mode/VcCloseConfirmModal';
import { useVcModeManager } from '../vc-mode/useVcModeManager';
import '../styles/toast.css';
import '../styles/visualizer.css';
import '../vc-mode/vcMode.css';

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
  const [vcCloseConfirmOpen, setVcCloseConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, addToast, dismissToast } = useToasts();
  const [busy, setBusy] = useState(false);

  const [playingSongId, setPlayingSongId] = useState<number | null>(null);
  const [previewSongId, setPreviewSongId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);

  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [volume, setVolume] = useState(0.85);
  const [bassBoost, setBassBoost] = useState(false);
  const [lofi, setLofi] = useState(false);
  const [crossfades, setCrossfades] = useState(false);
  const [contentHeight, setContentHeight] = useState(DEFAULT_CONTENT_HEIGHT);
  const [runtimeDurations, setRuntimeDurations] = useState<Record<number, number>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  /** Duration values frozen at last explicit sort — avoids live reorder as probes finish. */
  const [sortDurationsSnapshot, setSortDurationsSnapshot] = useState<Record<number, number>>({});
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackGenerationRef = useRef(0);
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const rowClickTimerRef = useRef<number | null>(null);
  const durationProbeRef = useRef<Set<number>>(new Set());

  const selectedArtist = artists.find((artist) => artist.id === selectedArtistId) ?? null;
  const playingSong = songs.find((song) => song.id === playingSongId) ?? null;
  const previewSong = songs.find((song) => song.id === previewSongId) ?? playingSong;
  const isLikedPlaylist = isLikedSongsArtist(selectedArtistId);
  const canToggleLike = previewSong != null && previewSong.id > 0;

  const sortedSongs = useMemo(
    () => sortPlaylistSongs(songs, sortColumn, sortDirection, sortDurationsSnapshot),
    [songs, sortColumn, sortDirection, sortDurationsSnapshot],
  );

  const visualizer = useVisualizerManager({
    audioRef,
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

  usePlaybackEffects({
    audioRef,
    isPlaying,
    bassBoost,
    lofi,
  });

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

    // # always restores catalog order — no asc/desc toggle.
    if (column === 'order') {
      setSortColumn('order');
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
    if (rounded <= 0 || songId <= 0) return;

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

    const [artistRows, likedCount, likedIds] = await Promise.all([
      app.listener.listArtists(),
      app.listener.countLikedSongs(),
      app.listener.listLikedSongIds(),
    ]);

    setLikedSongCount(likedCount);
    setLikedSongIds(new Set(likedIds));

    const displayArtists =
      likedCount > 0 ? [buildLikedSongsArtistRow(likedCount), ...artistRows] : artistRows;
    setArtists(displayArtists);

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
  }, []);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const pickNextSongId = useCallback(
    (currentSongId: number): number | null => {
      if (!sortedSongs.length) return null;

      const currentIndex = sortedSongs.findIndex((song) => song.id === currentSongId);
      if (currentIndex < 0) return null;

      if (shuffle) {
        if (sortedSongs.length === 1) return sortedSongs[0]?.id ?? null;
        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * sortedSongs.length);
        }
        return sortedSongs[nextIndex]?.id ?? null;
      }

      if (currentIndex + 1 < sortedSongs.length) {
        return sortedSongs[currentIndex + 1]?.id ?? null;
      }

      if (repeatMode === 'all') {
        return sortedSongs[0]?.id ?? null;
      }

      return null;
    },
    [repeatMode, shuffle, sortedSongs],
  );

  const vc = useVcModeManager({
    audioRef,
    playingSong,
    sortedSongs,
    playingSongId,
    pickNextSongId,
    artists,
    isPlaying,
    currentTime,
    duration,
  });

  useEffect(() => {
    if (!vc.vcOpen) {
      setVcCloseConfirmOpen(false);
    }
  }, [vc.vcOpen]);

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
      setPreviewSongId(song.id);
      setMainContentView('song');
      setPageLoadError(null);

      const access = await resolveSongAccess(song, 'show_song_page');
      setPageUrl(access.pageUrl);

      void probeDurationForSong(song);
      void probeLikedSongAvailability(song);
    },
    [probeDurationForSong, probeLikedSongAvailability],
  );

  const playSong = useCallback(
    async (song: SongRow) => {
      const generation = ++playbackGenerationRef.current;

      setPlayingSongId(song.id);
      setPreviewSongId(song.id);
      setMainContentView('song');
      setPageLoadError(null);
      setError(null);

      const access = await resolveSongAccess(song, 'play_song');
      setPageUrl(access.pageUrl);

      void probeLikedSongAvailability(song);

      const audio = audioRef.current;
      if (!audio) return;

      destroyHls();
      audio.pause();

      const playbackUrl = access.playbackUrl;
      const markUnavailableIfLiked = () => {
        if (isLikedSongsArtist(selectedArtistId)) {
          void markSongAvailability(song, true);
        }
      };

      const startPlayback = () => {
        if (generation !== playbackGenerationRef.current) return;
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
            markUnavailableIfLiked();
          },
        );
      };

      const onAudioError = () => {
        if (generation !== playbackGenerationRef.current) return;
        setError('Could not load audio stream.');
        setIsPlaying(false);
        markUnavailableIfLiked();
      };

      if (Hls.isSupported()) {
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
            const detail = data.details ? `${data.type}: ${data.details}` : data.type;
            setError(`HLS error — ${detail}`);
            setIsPlaying(false);
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
        setError('HLS playback is not supported in this environment.');
      }
    },
    [markSongAvailability, probeLikedSongAvailability, selectedArtistId],
  );

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
      setIsPlaying(false);
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        void audio.play();
        setIsPlaying(true);
        return;
      }
      if (playingSongId == null) return;
      const nextSongId = pickNextSongId(playingSongId);
      if (nextSongId == null) return;
      const nextSong = sortedSongs.find((song) => song.id === nextSongId);
      if (nextSong) void playSong(nextSong);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

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
  }, [persistSongDuration, pickNextSongId, playSong, playingSongId, repeatMode, sortedSongs]);

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
    if (selectedArtistId === null || isLikedSongsArtist(selectedArtistId)) return;
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
    if (selectedArtistId === null || isLikedSongsArtist(selectedArtistId)) return;
    setBusy(true);
    const app = getApp();
    if (!app) return;

    await app.listener.removeArtist(selectedArtistId);
    setSelectedArtistId(null);
    setMainContentView('welcome');
    setPageUrl(null);
    setPlayingSongId(null);
    setPreviewSongId(null);
    destroyHls();
    audioRef.current?.pause();
    setBusy(false);
    await loadLibrary();
  };

  const selectArtist = (artistId: number) => {
    setSelectedArtistId(artistId);
    setMainContentView('artist');
  };

  const togglePlayPause = () => {
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
    const currentIndex = sortedSongs.findIndex((song) => song.id === playingSongId);
    if (currentIndex > 0) void playSong(sortedSongs[currentIndex - 1]!);
  };

  const handleRowContextMenu = (event: React.MouseEvent, song: SongRow) => {
    event.preventDefault();
    setPlaylistContextMenu({ song, x: event.clientX, y: event.clientY });
  };

  const handleCopySongPageLink = async (song: SongRow) => {
    setPlaylistContextMenu(null);
    const link = shareableSongPageUrl(song.page_url);
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

  const playNext = () => {
    if (playingSongId == null) return;
    const nextSongId = pickNextSongId(playingSongId);
    if (nextSongId == null) return;
    const nextSong = sortedSongs.find((song) => song.id === nextSongId);
    if (nextSong) void playSong(nextSong);
  };

  const cycleRepeat = () => {
    setRepeatMode((mode) => {
      if (mode === 'off') return 'all';
      if (mode === 'all') return 'one';
      return 'off';
    });
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    audio.currentTime = Math.min(duration, Math.max(0, time));
    setCurrentTime(audio.currentTime);
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
          pluginId={visualizer.embeddedPluginId}
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

    if (mainContentView === 'song' && pageUrl) {
      return (
        <>
          <SongPageWebview
            url={pageUrl}
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
    <div className={`listener-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <ListenerSidebar
        artists={artists}
        selectedArtistId={selectedArtistId}
        collapsed={sidebarCollapsed}
        busy={busy}
        onToggleCollapsed={toggleSidebarCollapsed}
        onOpenSettings={onOpenSettings}
        onSubscribe={() => setSubscribeModalOpen(true)}
        onRefresh={() => void handleRefresh()}
        onSelectArtist={selectArtist}
      />

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
          />
          <audio ref={audioRef} preload="metadata" />
        </section>
        {error ? <p className="error listener-feedback">{error}</p> : null}

        <div className="listener-main" ref={mainColumnRef}>
          <section className="song-page-panel panel" style={{ height: contentHeight, flex: 'none' }}>
            <h2 className="sr-only">Listener content</h2>
            {mainContentView === 'song' && pageUrl && !coverModalOpen && !visualizer.embeddedActive ? (
              <SongLikeButton
                liked={currentSongLiked}
                disabled={!canToggleLike || likeBusy}
                onToggle={() => void handleToggleLike()}
              />
            ) : null}
            <div className="song-page-panel-body">{renderMainContent()}</div>
          </section>

          <VerticalResizeHandle onResizeDelta={handleContentResize} />

          <section className={`playlist-panel panel${isLikedPlaylist ? ' liked-playlist' : ''}`}>
            <table className="song-table">
            <thead>
              <tr>
                <SortableColumnHeader
                  label="#"
                  column="order"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortableColumnHeader
                  label="Title"
                  column="title"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                {isLikedPlaylist ? (
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
                  className={isLikedPlaylist ? 'col-album' : undefined}
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
              {sortedSongs.map((song, index) => (
                <tr
                  key={song.id}
                  className={`song-row${song.id === playingSongId ? ' playing-row' : ''}${
                    song.id === previewSongId ? ' selected-row' : ''
                  }${song.unavailable === 1 ? ' unavailable-row' : ''}`}
                  onClick={() => handleRowClick(song)}
                  onDoubleClick={() => handleRowDoubleClick(song)}
                  onContextMenu={(event) => handleRowContextMenu(event, song)}
                >
                  <td>{index + 1}</td>
                  <td>
                    <span className="song-title-cell">
                      {!isLikedPlaylist && song.id > 0 && likedSongIds.has(song.id) ? (
                        <LikedSongIndicator />
                      ) : null}
                      <span className={song.unavailable === 1 ? 'unavailable-title' : undefined}>
                        {song.title}
                      </span>
                    </span>
                  </td>
                  {isLikedPlaylist ? <td className="col-artist">{song.artist_name || '—'}</td> : null}
                  <td className={isLikedPlaylist ? 'col-album' : undefined}>{song.album || '—'}</td>
                  <td>{song.year || '—'}</td>
                  <td className="col-duration">
                    {song.unavailable === 1 ? (
                      <UnavailableLengthMarker />
                    ) : (
                      songDurationLabel(song, runtimeDurations[song.id])
                    )}
                  </td>
                </tr>
              ))}
              {!songs.length ? (
                <tr>
                  <td colSpan={isLikedPlaylist ? 6 : 5} className="empty">
                    {isLikedPlaylist ? 'No liked songs yet.' : 'No songs in library.'}
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
          x={playlistContextMenu.x}
          y={playlistContextMenu.y}
          onCopyLink={(song) => void handleCopySongPageLink(song)}
          onClose={() => setPlaylistContextMenu(null)}
        />
      ) : null}

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
    </div>
  );
}
