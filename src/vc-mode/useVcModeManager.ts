import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SongPagesSongManifest } from '@shared/manifests';
import type { VcModeConfig, VcPlaybackEffectsMirror, VcProjectionWindowBounds, VcSpecialPlayPauseState, VcStatePayload, VcSurfaceConfig } from '@shared/vcModeTypes';
import { DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR } from '@shared/vcMode/playbackEffectsMirror';
import type { PlaybackSession } from '../playback/types';
import { usePlaybackSnapshot } from '../playback/hooks/usePlaybackSnapshot';
import { buildCommandRuntimeContextFromSnapshot } from '../playback/projections/buildCommandRuntimeContextFromSnapshot';
import { buildVcStateFromSnapshot } from '../playback/projections/buildVcStateFromSnapshot';
import { configUsesVisualizer, findMemeTimer, normalizeVcConfig } from '@shared/vcModeTypes';
import type { ActiveMeme } from '@shared/memes/types';
import { sanitizeMemeSettings } from '@shared/memes/sanitizeMemeSettings';
import { applyMemeTimer } from '@shared/memes/memeTimer';
import { isYoutubeSong, youtubeVideoIdFromSong } from '@shared/youtube/youtubeFeature';
import { isSoundcloudSong, soundcloudPermalinkFromSong } from '@shared/soundcloud/soundcloudFeature';
import { resolveSunoDemoManifestUrl } from '@shared/demo/sunoDemoFeature';

import { resolveSongCoverUrl, normalizeSongRowAssets } from '@shared/listener/songResolution';
import { shareableSongLink } from '@shared/listener/shareableSongLink';
import { resolvePlaylistSongSource } from '@shared/listener/playlistSongSource';
import { resolveSongLyricsVideoUrl } from '@shared/vcMode/resolveSongLyricsVideoUrl';
import { resolveSongVideoCoverUrl } from '@shared/vcMode/resolveSongVideoCoverUrl';

import { getApp } from '../lib/bridge';
import { resolveAssetUrl } from '../lib/resolveAssetUrl';
import { isVirtualPlaylistSong, vcArtistDisplayName } from '@shared/listener/playlistKinds';
import type { ArtistRow, SongRow } from '../types/app';
import { isButterchurnExperienceId } from '../visualizers/butterchurn/presets/approved/presetKeys';
import { normalizeExperienceId } from '../visualizers/native/registry';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { useAnalyserBus } from '../audio/hooks/useAnalyserBus';
import { resolveProjectionWindowForDesign } from '@shared/vcSurfaceDesigns';
import { createDefaultVcConfig, migrateVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';
import {
  awaitVcPersistIdle,
  getCachedVcSurfaceDesignCatalog,
  getVcSurfaceDesignPickerState,
  loadActiveVcModeConfig,
  persistVcModeConfig,
  persistVcProjectionWindow,
  switchActiveVcSurfaceDesign,
} from './vcSurfaceDesignStore';
import { useHostGraphicPopupUrl } from './useHostGraphicPopupUrl';
import { useKudoPresets } from '../kudos/useKudoPresets';
import { loadHostContentCatalog } from '../host-content/loadHostContentCatalog';
import {
  createDefaultHostContentCatalog,
  migrateHostContentCatalog,
  type HostContentCatalog,
} from '@shared/hostContent';

const FRAME_INTERVAL_MS = 16;
const STATE_INTERVAL_MS = 200;
const SURFACE_SAVE_DEBOUNCE_MS = 500;

type UseVcModeManagerOptions = {
  playbackSession: PlaybackSession;
  /** Hidden mirror for VC visualizer FFT — see useAnalyserPlaybackMirror. */
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  /** Selected song page when not actively playing — used for Surface designer preview. */
  previewSong?: SongRow | null | undefined;
  sortedSongs: SongRow[];
  artists: ArtistRow[];
  /** VC-session auto-skips — cleared when VC Mode ends. */
  sessionSkippedIds?: ReadonlySet<number>;
  /** Resolved HLS URL for the active track — mirrored into the VC window for stream capture. */
  activePlaybackUrl: string | null;
  volume: number;
  /** Bass / lo-fi / Effects Lab — mirrored for audible FX in the VC capture window. */
  playbackEffects?: VcPlaybackEffectsMirror;
  /** Countdown fields for between-song pause — active flag comes from session snapshot. */
  specialPlayPauseCountdown?: VcSpecialPlayPauseState | null;
  /** App-wide Live Debug mode — mirrored onto the VC HUD. */
  liveDebugEnabled?: boolean;
};

function effectiveManifestUrlForSong(song: SongRow | null | undefined): string | null {
  if (!song) return null;
  const normalized = normalizeSongRowAssets(song);
  // Suno custom-playlist snapshots: canonical manifest from page_url, not stale stored URL.
  return resolveSunoDemoManifestUrl(normalized) || normalized.song_manifest_url?.trim() || null;
}

function activeManifestForSong(
  song: SongRow | null | undefined,
  manifest: SongPagesSongManifest | null,
  loadedManifestUrl: string | null,
): SongPagesSongManifest | null {
  if (!song || !manifest || !loadedManifestUrl) return null;
  const url = effectiveManifestUrlForSong(song);
  if (!url || url !== loadedManifestUrl) return null;
  return manifest;
}

function lyricsSourceReadyForSong(
  song: SongRow | null | undefined,
  loadedManifestUrl: string | null,
): boolean {
  if (!song) return true;
  const url = effectiveManifestUrlForSong(song);
  if (!url) return true;
  return loadedManifestUrl === url;
}

function buildSongPayload(
  song: SongRow | null | undefined,
  manifest: SongPagesSongManifest | null,
  artist: ArtistRow | null,
  loadedManifestUrl: string | null,
): VcStatePayload['currentSong'] {
  if (!song) return null;
  const normalized = normalizeSongRowAssets(song);
  const profileArtist = isVirtualPlaylistSong(song) ? null : artist;
  const activeManifest = activeManifestForSong(song, manifest, loadedManifestUrl);
  const trackArtist =
    normalized.artist_name?.trim() || activeManifest?.artistName?.trim() || profileArtist?.artist_name?.trim() || '';
  return {
    id: normalized.id,
    title: normalized.title,
    artist: trackArtist,
    year: normalized.year,
    caption: normalized.caption,
    coverUrl: resolveSongCoverUrl(normalized, activeManifest?.coverUrl ?? null),
    // Suno: video_cover_url → Video Cover; video_url → Lyrics Video.
    videoCoverUrl: resolveSongVideoCoverUrl(normalized, activeManifest),
    lyricsVideoUrl: resolveSongLyricsVideoUrl(normalized, activeManifest),
    about: activeManifest?.about ?? '',
    lyrics: activeManifest?.lyrics ?? '',
    artistId: normalized.artist_id,
    durationSeconds: normalized.duration_seconds,
    mainGenre: null,
    additionalGenres: null,
    playbackScope: normalized.playback_scope ?? null,
    youtubeVideoId: isYoutubeSong(normalized) ? youtubeVideoIdFromSong(normalized) : null,
    soundcloudPermalink: isSoundcloudSong(normalized)
      ? soundcloudPermalinkFromSong(normalized)
      : null,
    sourceId: resolvePlaylistSongSource(normalized).id,
    shareUrl: shareableSongLink(normalized),
  };
}

export function useVcModeManager({
  playbackSession,
  analyserAudioRef,
  playingSong,
  previewSong,
  sortedSongs,
  artists,
  sessionSkippedIds,
  activePlaybackUrl,
  volume,
  playbackEffects = DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR,
  specialPlayPauseCountdown = null,
  liveDebugEnabled = false,
}: UseVcModeManagerOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [vcOpen, setVcOpen] = useState(false);
  const [playLockEnabled, setPlayLockEnabled] = useState(false);
  const [playLockReleaseOnNextSong, setPlayLockReleaseOnNextSong] = useState(false);
  const playLockReleaseOnNextRef = useRef(false);
  const [activeConfig, setActiveConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [canvasMirrorFrame, setCanvasMirrorFrame] = useState<string | null>(null);
  const [songManifest, setSongManifest] = useState<SongPagesSongManifest | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistRow | null>(null);
  const [hostCatalog, setHostCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());

  const manifestCacheRef = useRef(new Map<string, SongPagesSongManifest>());
  /** Manifest URL that `songManifest` state belongs to — prevents cross-track bleed. */
  const loadedManifestUrlRef = useRef<string | null>(null);
  const playbackSnapshot = usePlaybackSnapshot(playbackSession);
  const playbackSnapshotRef = useRef(playbackSnapshot);
  playbackSnapshotRef.current = playbackSnapshot ?? playbackSession.getSnapshot();
  const canvasMirrorFrameRef = useRef<string | null>(null);
  const activeConfigRef = useRef(activeConfig);
  const surfaceSaveTimerRef = useRef<number | null>(null);
  /** Surface design that owns projection bounds for the current VC session. */
  const vcSessionDesignIdRef = useRef<string | null>(null);
  /** Prevents a late settings hydrate from overwriting config passed to Start VC. */
  const activeConfigSourceRef = useRef<'default' | 'settings' | 'start'>('default');

  const [reportedVisualizerId, setReportedVisualizerId] = useState<string | null>(null);
  const reportedVisualizerIdRef = useRef<string | null>(null);
  reportedVisualizerIdRef.current = reportedVisualizerId;
  // Pins the live visualizer across surface switches so switching designs does
  // not change the running visualizer. Applied only to the outgoing state
  // payload — never to activeConfig, so each design's stored visualizerId is
  // preserved. Baseline = the switched-in design's own visualizerId, used to
  // detect (and honor) an intentional visualizer change afterwards.
  const surfaceVisualizerOverrideRef = useRef<string | null>(null);
  const surfaceVisualizerBaselineRef = useRef<string | null>(null);
  const prevVcOpenRef = useRef(false);
  const kudos = useKudoPresets();

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) return;

    let cancelled = false;
    void loadActiveVcModeConfig().then((loaded) => {
      if (cancelled) return;
      // Start VC passes an explicit config — never clobber it with an older async load.
      if (activeConfigSourceRef.current === 'start') return;
      setActiveConfig(migrateVcConfig(loaded));
      activeConfigSourceRef.current = 'settings';
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadHostContentCatalog().then((catalog) => {
      if (!cancelled) setHostCatalog(migrateHostContentCatalog(catalog));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hostGraphicPopupUrl = useHostGraphicPopupUrl(
    hostCatalog,
    activeConfig.hostGraphicPopupId,
  );

  useEffect(() => {
    playLockReleaseOnNextRef.current = playLockReleaseOnNextSong;
  }, [playLockReleaseOnNextSong]);

  useEffect(() => {
    activeConfigRef.current = activeConfig;
  }, [activeConfig]);

  useEffect(() => {
    canvasMirrorFrameRef.current = canvasMirrorFrame;
  }, [canvasMirrorFrame]);

  useEffect(() => {
    const wasOpen = prevVcOpenRef.current;
    prevVcOpenRef.current = vcOpen;

    if (!vcOpen) {
      setReportedVisualizerId(null);
      surfaceVisualizerOverrideRef.current = null;
      surfaceVisualizerBaselineRef.current = null;
      return;
    }

    if (!wasOpen) {
      setReportedVisualizerId(normalizeExperienceId(activeConfig.visualizerId));
    }
  }, [vcOpen, activeConfig.visualizerId]);

  // Release the surface visualizer pin once the configured visualizer changes
  // intentionally (e.g. the host picks a new one in the designer) so that choice
  // takes effect instead of being masked by the pin.
  useEffect(() => {
    if (surfaceVisualizerOverrideRef.current == null) return;
    if (normalizeExperienceId(activeConfig.visualizerId) !== surfaceVisualizerBaselineRef.current) {
      surfaceVisualizerOverrideRef.current = null;
      surfaceVisualizerBaselineRef.current = null;
    }
  }, [activeConfig.visualizerId]);

  const vcVisualizerId = useMemo(
    () => reportedVisualizerId ?? normalizeExperienceId(activeConfig.visualizerId),
    [activeConfig.visualizerId, reportedVisualizerId],
  );
  const vcUsesButterchurn = isButterchurnExperienceId(vcVisualizerId);
  const vcVisualizerSettings = useExperienceSettings(vcVisualizerId);

  useEffect(() => {
    playbackSnapshotRef.current = playbackSnapshot ?? playbackSession.getSnapshot();
  }, [playbackSession, playbackSnapshot]);

  const transportIsPlaying = playbackSnapshot?.playbackPhase === 'playing';

  const analyserEnabled =
    vcOpen &&
    configUsesVisualizer(activeConfig) &&
    playingSong != null &&
    !isYoutubeSong(playingSong) &&
    !isSoundcloudSong(playingSong);

  const { analyser, butterchurnTap, applyButterchurnAudioSettings, audioContext } = useAnalyserBus({
    consumerId: 'vc-visualizer',
    audioRef: analyserAudioRef,
    isPlaying: transportIsPlaying,
    enabled: analyserEnabled,
  });

  const butterchurnVcMirrorActive = vcOpen && analyserEnabled && vcUsesButterchurn;

  /** Playing song, or the song page currently selected in the listener — for designer preview assets. */
  const designerSong = playingSong ?? previewSong ?? null;
  /** Queue overlays anchor on the playing track, or the selected song page when idle. */
  const queueAnchorSongId = playbackSnapshot?.activeTrackId ?? previewSong?.id ?? null;

  const upcomingMax = activeConfig.upcomingOverlay.maxCount;

  const commandRuntimeLibrary = useMemo(
    () => ({
      sortedSongs,
      queueAnchorSongId,
      sessionSkippedIds,
      upcomingMax,
      hasCurrentSong: designerSong != null,
      hasCoverArt: false,
      hasHostGraphic: Boolean(hostGraphicPopupUrl) || Boolean(activeConfig.hostGraphicPopupId),
    }),
    [
      activeConfig.hostGraphicPopupId,
      designerSong,
      hostGraphicPopupUrl,
      queueAnchorSongId,
      sessionSkippedIds,
      sortedSongs,
      upcomingMax,
    ],
  );

  useEffect(() => {
    const song = designerSong ? normalizeSongRowAssets(designerSong) : null;
    const url = effectiveManifestUrlForSong(song);
    if (!url) {
      loadedManifestUrlRef.current = null;
      setSongManifest(null);
      return;
    }
    const cached = manifestCacheRef.current.get(url);
    if (cached) {
      loadedManifestUrlRef.current = url;
      setSongManifest(cached);
      return;
    }

    // Drop the prior track's manifest while this one loads — stale empty lyrics triggered fallbacks.
    loadedManifestUrlRef.current = null;
    setSongManifest(null);

    const app = getApp();
    if (!app?.listener.fetchSongManifest) return;

    let cancelled = false;
    void app.listener.fetchSongManifest(url).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      const manifest = result.data as SongPagesSongManifest;
      manifestCacheRef.current.set(url, manifest);
      loadedManifestUrlRef.current = url;
      setSongManifest(manifest);
    });

    return () => {
      cancelled = true;
    };
  }, [designerSong?.id, designerSong?.song_manifest_url, designerSong?.page_url, designerSong?.playback_scope]);

  useEffect(() => {
    if (!designerSong) {
      setArtistProfile(null);
      return;
    }
    const cached = artists.find((row) => row.id === designerSong.artist_id) ?? null;
    if (isVirtualPlaylistSong(designerSong)) {
      setArtistProfile(null);
      return;
    }
    setArtistProfile(cached);

    const app = getApp();
    if (!app?.listener.ensureArtistManifest) return;

    let cancelled = false;
    void app.listener.ensureArtistManifest(designerSong.artist_id).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      if (isVirtualPlaylistSong(designerSong) || result.data.id !== designerSong.artist_id) return;
      setArtistProfile(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [artists, designerSong?.artist_id, designerSong?.id]);

  // Transient meme projected onto a `meme-surface` region. Kept in a ref (not
  // React state) so updates don't churn the memoized state-payload builder;
  // the projector receives it via the regular VcStatePayload broadcast.
  const activeMemeRef = useRef<ActiveMeme | null>(null);
  const memeTokenRef = useRef(0);
  const memeClearTimerRef = useRef<number | null>(null);

  const buildStatePayload = useCallback((): VcStatePayload => {
    const baseConfig = normalizeVcConfig(activeConfig);
    // Keep the running visualizer pinned across surface switches (override is
    // set in switchVcSurface). Only the payload is affected; activeConfig — and
    // thus persistence — retains each design's own visualizerId.
    const surfaceVisualizerOverride = surfaceVisualizerOverrideRef.current;
    const config = surfaceVisualizerOverride
      ? { ...baseConfig, visualizerId: surfaceVisualizerOverride }
      : baseConfig;
    const displaySong = playingSong ?? previewSong ?? null;
    const loadedManifestUrl = loadedManifestUrlRef.current;
    const activeManifest = activeManifestForSong(displaySong, songManifest, loadedManifestUrl);
    const snapshot = playbackSnapshot ?? playbackSession.getSnapshot();
    const projected = buildVcStateFromSnapshot({
      snapshot,
      sortedSongs,
      queueAnchorSongId,
      sessionSkippedIds,
      upcomingMax,
      specialPlayPauseCountdown,
    });

    return {
      config,
      playback: projected.playback,
      audioMirror: {
        songId: projected.activeTrackId,
        playbackUrl:
          playingSong != null
            ? (activePlaybackUrl ?? playingSong.playback_url ?? null)
            : null,
        volume,
        playbackEffects,
      },
      currentSong: buildSongPayload(displaySong, songManifest, artistProfile, loadedManifestUrl),
      nextSong: projected.nextSong,
      upcoming: projected.upcoming,
      hostGraphicUrl: hostGraphicPopupUrl,
      artistName: vcArtistDisplayName(displaySong, artistProfile, activeManifest?.artistName),
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
      kudoPresets: kudos.presets,
      specialPlayPause: projected.specialPlayPause,
      surfaceDesigns: getVcSurfaceDesignPickerState(),
      lyricsSourceReady: lyricsSourceReadyForSong(displaySong, loadedManifestUrl),
      playLockEnabled: projected.playLockEnabled,
      playLockReleaseOnNextSong: projected.playLockReleaseOnNextSong,
      effectiveVisualizerId: surfaceVisualizerOverride ?? vcVisualizerId,
      liveDebugEnabled: liveDebugEnabled === true,
      // Transient — read from a ref so a new meme doesn't invalidate this
      // memoized builder (and thus reset the state-push interval).
      activeMeme: activeMemeRef.current,
    };
  }, [
    activeConfig,
    activePlaybackUrl,
    artistProfile,
    hostGraphicPopupUrl,
    kudos.presets,
    liveDebugEnabled,
    playbackSession,
    playbackSnapshot,
    playingSong,
    previewSong,
    queueAnchorSongId,
    sessionSkippedIds,
    songManifest,
    specialPlayPauseCountdown,
    sortedSongs,
    upcomingMax,
    vcVisualizerId,
    volume,
    playbackEffects,
  ]);

  /** Song + artist context for Surface designer preview (playing or selected song page). */
  const buildDesignerPreviewState = useCallback((): VcStatePayload => {
    const song = designerSong;
    const useLivePlayback = playingSong != null && song?.id === playingSong.id;
    const loadedManifestUrl = loadedManifestUrlRef.current;
    const activeManifest = activeManifestForSong(song, songManifest, loadedManifestUrl);
    const snapshot = playbackSnapshot ?? playbackSession.getSnapshot();
    const projected = buildVcStateFromSnapshot({
      snapshot,
      sortedSongs,
      queueAnchorSongId,
      sessionSkippedIds,
      upcomingMax,
      specialPlayPauseCountdown,
    });

    return {
      config: normalizeVcConfig(activeConfig),
      playback: useLivePlayback
        ? projected.playback
        : {
            currentTime: 0,
            duration: song?.duration_seconds ?? 0,
            isPlaying: false,
          },
      audioMirror: { songId: null, playbackUrl: null, volume, playbackEffects },
      currentSong: buildSongPayload(song, songManifest, artistProfile, loadedManifestUrl),
      nextSong: projected.nextSong,
      upcoming: projected.upcoming,
      hostGraphicUrl: hostGraphicPopupUrl,
      artistName: vcArtistDisplayName(song, artistProfile, activeManifest?.artistName),
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
      effectiveVisualizerId: vcVisualizerId,
      kudoPresets: kudos.presets,
      specialPlayPause: projected.specialPlayPause,
      lyricsSourceReady: lyricsSourceReadyForSong(song, loadedManifestUrl),
      liveDebugEnabled: liveDebugEnabled === true,
    };
  }, [
    activeConfig,
    artistProfile,
    designerSong,
    hostGraphicPopupUrl,
    kudos.presets,
    liveDebugEnabled,
    playbackSession,
    playbackSnapshot,
    playingSong,
    queueAnchorSongId,
    sessionSkippedIds,
    songManifest,
    specialPlayPauseCountdown,
    sortedSongs,
    upcomingMax,
    vcVisualizerId,
    volume,
    playbackEffects,
  ]);

  const publishCommandRuntimeContext = useCallback(
    (payload: VcStatePayload) => {
      getApp()?.commands?.setRuntimeContext?.(
        buildCommandRuntimeContextFromSnapshot(
          playbackSnapshotRef.current,
          {
            ...commandRuntimeLibrary,
            hasCoverArt: Boolean(payload.currentSong?.coverUrl),
            hasHostGraphic:
              Boolean(payload.hostGraphicUrl) || Boolean(payload.config.hostGraphicPopupId),
          },
          { vcModeActive: true },
        ),
      );
    },
    [commandRuntimeLibrary],
  );

  const buildStatePayloadRef = useRef(buildStatePayload);
  buildStatePayloadRef.current = buildStatePayload;

  const flushPendingVcPersist = useCallback(() => {
    if (surfaceSaveTimerRef.current != null) {
      window.clearTimeout(surfaceSaveTimerRef.current);
      surfaceSaveTimerRef.current = null;
      void persistVcModeConfig(activeConfigRef.current);
    }
  }, []);
  const flushPendingVcPersistRef = useRef(flushPendingVcPersist);
  flushPendingVcPersistRef.current = flushPendingVcPersist;

  // Layout-mode surface edits + projection window bounds — stable while VC is open.
  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const scheduleVcPersist = (config: VcModeConfig, timerRef: { current: number | null }) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void persistVcModeConfig(config);
      }, SURFACE_SAVE_DEBOUNCE_MS);
    };
    const persistSurfaceNow = (config: VcModeConfig) => {
      if (surfaceSaveTimerRef.current != null) {
        window.clearTimeout(surfaceSaveTimerRef.current);
        surfaceSaveTimerRef.current = null;
      }
      void persistVcModeConfig(config);
    };
    const applySurfaceConfig = (surface: VcSurfaceConfig, persist: 'debounced' | 'immediate') => {
      const prev = activeConfigRef.current;
      const next = normalizeVcConfig({
        ...prev,
        surface,
      });
      activeConfigRef.current = next;
      setActiveConfig(next);
      if (persist === 'immediate') {
        persistSurfaceNow(next);
      } else {
        scheduleVcPersist(next, surfaceSaveTimerRef);
      }
      app.vc!.sendState({ ...buildStatePayloadRef.current(), config: next });
      return next;
    };

    const offSurfacePatch = app.vc.onSurfacePatch?.((patch: Partial<VcSurfaceConfig>) => {
      const prev = activeConfigRef.current;
      applySurfaceConfig(
        {
          ...prev.surface,
          ...patch,
          dividers: patch.dividers ?? prev.surface.dividers,
          floats: patch.floats ?? prev.surface.floats,
        },
        'debounced',
      );
    });

    const offSurfaceCommit = app.vc.onSurfaceCommit?.((surface: VcSurfaceConfig) => {
      applySurfaceConfig(surface, 'immediate');
    });

    const offProjectionWindow = app.vc.onProjectionWindowChanged?.((bounds: VcProjectionWindowBounds) => {
      const prev = activeConfigRef.current;
      const next = normalizeVcConfig({
        ...prev,
        projectionWindow: bounds,
      });
      activeConfigRef.current = next;
      setActiveConfig(next);
      const designId = vcSessionDesignIdRef.current;
      if (designId) {
        void persistVcProjectionWindow(designId, bounds);
      } else {
        void persistVcModeConfig(next);
      }
    });

    const offActiveVisualizer = app.vc.onActiveVisualizerReport?.((id: string) => {
      setReportedVisualizerId(normalizeExperienceId(id));
    });

    return () => {
      offSurfacePatch?.();
      offSurfaceCommit?.();
      offProjectionWindow?.();
      offActiveVisualizer?.();
      flushPendingVcPersist();
    };
  }, [flushPendingVcPersist, vcOpen]);

  const switchVcSurface = useCallback(async (designId: string) => {
    const app = getApp();
    if (!app?.vc || !vcOpen) return;

    const catalog = getCachedVcSurfaceDesignCatalog();
    if (!catalog || designId === catalog.activeDesignId) return;

    flushPendingVcPersistRef.current();
    await awaitVcPersistIdle();

    // Preserve the running visualizer across the switch. Capture what's on
    // screen now (rotation-aware via reportedVisualizerId) and pin it so the
    // new design's own visualizerId doesn't yank the visuals mid-show.
    const keepVisualizerId =
      reportedVisualizerIdRef.current ?? normalizeExperienceId(activeConfigRef.current.visualizerId);

    const nextConfig = await switchActiveVcSurfaceDesign(designId, activeConfigRef.current);
    if (!nextConfig) return;

    const normalized = normalizeVcConfig(nextConfig);
    vcSessionDesignIdRef.current = designId;
    activeConfigRef.current = normalized;
    setActiveConfig(normalized);

    // Pin only the outgoing payload's visualizer — activeConfig keeps the new
    // design's stored visualizerId so persistence isn't corrupted. Baseline is
    // that stored id, so a later intentional change releases the pin.
    surfaceVisualizerOverrideRef.current = keepVisualizerId;
    surfaceVisualizerBaselineRef.current = normalizeExperienceId(normalized.visualizerId);
    setReportedVisualizerId(keepVisualizerId);

    if (normalized.projectionWindow) {
      await app.vc.open({ projectionWindow: normalized.projectionWindow });
    }

    app.vc.sendState({
      ...buildStatePayloadRef.current(),
      config: { ...normalized, visualizerId: keepVisualizerId },
      effectiveVisualizerId: keepVisualizerId,
      surfaceDesigns: getVcSurfaceDesignPickerState(),
    });
  }, [vcOpen]);

  // VC controller surface picker — only while VC is live.
  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc?.onSwitchSurface) return;

    const offSwitchSurface = app.vc.onSwitchSurface((designId) => {
      void switchVcSurface(designId);
    });

    return () => {
      offSwitchSurface();
    };
  }, [switchVcSurface, vcOpen]);

  // Meme Surface — controller pushes a resolved meme; we own the transient
  // activeMeme state, broadcast it, and auto-clear it per the host's settings.
  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc?.onShowMeme || !app.vc.onClearMeme) return;

    const cancelClearTimer = () => {
      if (memeClearTimerRef.current != null) {
        window.clearTimeout(memeClearTimerRef.current);
        memeClearTimerRef.current = null;
      }
    };

    const pushMemeState = () => {
      getApp()?.vc?.sendState(buildStatePayloadRef.current());
    };

    const clearMeme = () => {
      cancelClearTimer();
      if (activeMemeRef.current === null) return;
      activeMemeRef.current = null;
      pushMemeState();
    };

    const offShow = app.vc.onShowMeme((media) => {
      cancelClearTimer();
      console.info('[meme] show received', { url: media?.url, mediaType: media?.mediaType });
      // Per-region timer (set on the meme-surface content settings) overrides the
      // global default duration / play-indefinitely behavior.
      const settings = applyMemeTimer(
        sanitizeMemeSettings(activeConfigRef.current.memeSettings),
        findMemeTimer(activeConfigRef.current),
      );
      const token = (memeTokenRef.current += 1);
      activeMemeRef.current = { media, token, startedAt: Date.now(), settings };
      pushMemeState();

      // Duration-based clear lives here (main renderer) so it survives a
      // projector reload/request-sync. Roundtrip-based clear (video only) is
      // driven by the projector, which calls clearMeme() when its loop count
      // AND the minimum duration are both satisfied ("whichever is greater").
      const roundtripDriven = settings.minRoundtrips > 0 && media.mediaType === 'video';
      if (!settings.playIndefinitely && !roundtripDriven) {
        memeClearTimerRef.current = window.setTimeout(() => {
          memeClearTimerRef.current = null;
          activeMemeRef.current = null;
          pushMemeState();
        }, settings.durationSeconds * 1000);
      }
    });

    const offClear = app.vc.onClearMeme(() => clearMeme());

    return () => {
      offShow();
      offClear();
      cancelClearTimer();
    };
  }, [vcOpen]);

  // Play Lock toggles are wired in usePlaybackTransportAdapters (Phase 4).

  const releasePlayLockIfScheduled = useCallback(() => {
    if (!playLockReleaseOnNextRef.current && !playLockReleaseOnNextSong) return;
    playLockReleaseOnNextRef.current = false;
    setPlayLockReleaseOnNextSong(false);
    setPlayLockEnabled(false);
  }, [playLockReleaseOnNextSong]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const pushState = () => {
      const payload = buildStatePayload();
      app.vc!.sendState(payload);
      publishCommandRuntimeContext(payload);
    };

    pushState();
    const stateId = window.setInterval(pushState, STATE_INTERVAL_MS);
    const offSync = app.vc.onRequestSync?.(() => pushState());

    return () => {
      window.clearInterval(stateId);
      offSync?.();
    };
  }, [buildStatePayload, publishCommandRuntimeContext, vcOpen]);

  /** Push play-lock flags immediately so the controller reflects toggles without interval lag. */
  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const payload = buildStatePayload();
    app.vc.sendState(payload);
    publishCommandRuntimeContext(payload);
  }, [
    buildStatePayload,
    playbackSnapshot?.playLockEnabled,
    playbackSnapshot?.playLockReleaseOnNext,
    publishCommandRuntimeContext,
    vcOpen,
  ]);

  /** Push VC state when the host popup URL resolves so Toggle Host Graphic Display stays available. */
  useEffect(() => {
    if (!vcOpen) return;
    const app = getApp();
    if (!app?.vc) return;

    const payload = buildStatePayload();
    app.vc.sendState(payload);
    publishCommandRuntimeContext(payload);
  }, [buildStatePayload, hostGraphicPopupUrl, publishCommandRuntimeContext, vcOpen]);

  useEffect(() => {
    if (vcOpen) return;
    getApp()?.commands?.setRuntimeContext?.({ vcModeActive: false });
  }, [vcOpen]);

  /** Push Kudo preset changes to VC immediately. */
  useEffect(() => {
    if (!vcOpen) return;
    const payload = buildStatePayload();
    getApp()?.vc?.sendState(payload);
    publishCommandRuntimeContext(payload);
  }, [buildStatePayload, kudos.presets, publishCommandRuntimeContext, vcOpen]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !analyser || !app?.vc?.sendFrame) return;

    const scratch = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(scratch as Uint8Array<ArrayBuffer>);
      const snapshot = playbackSnapshotRef.current;
      app.vc!.sendFrame({
        type: 'frame',
        // Copy — scratch buffer is reused each tick; typed array IPC matches visualizer path.
        frequency: new Uint8Array(scratch),
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        isPlaying: snapshot.playbackPhase === 'playing',
        canvasFrame: vcUsesButterchurn ? canvasMirrorFrameRef.current : null,
      });
    };

    tick();
    const frameId = window.setInterval(tick, FRAME_INTERVAL_MS);
    return () => window.clearInterval(frameId);
  }, [analyser, vcOpen, vcUsesButterchurn]);

  useEffect(() => {
    const app = getApp();
    if (!app?.vc) return;

    void app.vc.status().then((result) => {
      if (result.ok && result.data?.open) setVcOpen(true);
    });

    const offOpened = app.vc.onOpened(() => setVcOpen(true));
    const offClosed = app.vc.onClosed(() => {
      void (async () => {
        flushPendingVcPersistRef.current();
        await awaitVcPersistIdle();
        vcSessionDesignIdRef.current = null;
        playLockReleaseOnNextRef.current = false;
        setPlayLockReleaseOnNextSong(false);
        setPlayLockEnabled(false);
        setVcOpen(false);
        setModalOpen(true);
      })();
    });

    return () => {
      offOpened();
      offClosed();
    };
  }, []);

  const closeVisualizerSurfaces = useCallback(async () => {
    const app = getApp();
    await app?.visualizer?.close();
  }, []);

  const startVcMode = useCallback(
    async (config: VcModeConfig) => {
      const app = getApp();
      if (!app?.vc) return;

      await closeVisualizerSurfaces();
      const [hostCatalogRaw, savedVc] = await Promise.all([
        loadHostContentCatalog(),
        app.getSettings?.(VC_SETTINGS_KEY) ?? Promise.resolve(null),
        loadActiveVcModeConfig(),
      ]);
      setHostCatalog(migrateHostContentCatalog(hostCatalogRaw));
      const savedConfig = savedVc != null ? migrateVcConfig(savedVc) : null;
      const surfaceCatalog = getCachedVcSurfaceDesignCatalog();
      const projectionWindow = resolveProjectionWindowForDesign(config, surfaceCatalog);
      const normalized = normalizeVcConfig({
        ...config,
        hostGraphicPopupId:
          config.hostGraphicPopupId ?? savedConfig?.hostGraphicPopupId ?? null,
        upcomingOverlay: config.upcomingOverlay ?? savedConfig?.upcomingOverlay,
        ...(projectionWindow ? { projectionWindow } : {}),
      });
      vcSessionDesignIdRef.current = surfaceCatalog?.activeDesignId ?? null;
      activeConfigSourceRef.current = 'start';
      activeConfigRef.current = normalized;
      setActiveConfig(normalized);
      playLockReleaseOnNextRef.current = false;
      setPlayLockReleaseOnNextSong(false);
      setPlayLockEnabled(false);
      await persistVcModeConfig(normalized);
      setModalOpen(false);
      setVcOpen(true);
      await app.vc.open({
        projectionWindow: normalized.projectionWindow,
      });
    },
    [closeVisualizerSurfaces],
  );

  const closeVcMode = useCallback(async () => {
    const app = getApp();
    if (!app?.vc) return;
    flushPendingVcPersist();
    await app.vc.close();
    await awaitVcPersistIdle();
    vcSessionDesignIdRef.current = null;
    playLockReleaseOnNextRef.current = false;
    setPlayLockReleaseOnNextSong(false);
    setPlayLockEnabled(false);
    setVcOpen(false);
    setCanvasMirrorFrame(null);
    setModalOpen(true);
  }, [flushPendingVcPersist]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  /** Song/artist context for the Surface designer preview (no live visualizer). */
  const designerPreviewState = useMemo(
    (): VcStatePayload => buildDesignerPreviewState(),
    [buildDesignerPreviewState],
  );

  return {
    modalOpen,
    vcOpen,
    playLockEnabled,
    setPlayLockEnabled,
    playLockReleaseOnNextSong,
    setPlayLockReleaseOnNextSong,
    releasePlayLockIfScheduled,
    activeConfig,
    analyserEnabled,
    vcVisualizerId,
    vcVisualizerSettings,
    butterchurnVcMirrorActive,
    /** Shared bus analyser — use for Meyda bass drive (before Butterchurn EQ). */
    analyser,
    butterchurnTap,
    applyButterchurnAudioSettings,
    audioContext,
    setCanvasMirrorFrame,
    designerPreviewState,
    openModal,
    closeModal,
    startVcMode,
    closeVcMode,
    kudos,
  };
}
