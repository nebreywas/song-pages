import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SongPagesSongManifest } from '@shared/manifests';
import type { VcModeConfig, VcPlaybackEffectsMirror, VcSpecialPlayPauseState, VcStatePayload, VcSurfaceConfig, VcUpcomingSong } from '@shared/vcModeTypes';
import { DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR } from '@shared/vcMode/playbackEffectsMirror';
import { deriveCommandRuntimeContextFromVcState } from '@shared/commands';
import { configUsesVisualizer, normalizeVcConfig } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { resolveAssetUrl } from '../lib/resolveAssetUrl';
import { isVirtualPlaylistSong, vcArtistDisplayName } from '@shared/listener/playlistKinds';
import type { ArtistRow, SongRow } from '../types/app';
import { isButterchurnExperienceId } from '../visualizers/butterchurn/presets/approved/presetKeys';
import { normalizeExperienceId } from '../visualizers/native/registry';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { useAudioAnalyser } from '../visualizers/useAudioAnalyser';
import { createDefaultVcConfig, migrateVcConfig, VC_SETTINGS_KEY } from './vcModeDefaults';
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
  /** Hidden mirror for VC visualizer FFT — see useAnalyserPlaybackMirror. */
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  /** Selected song page when not actively playing — used for Surface designer preview. */
  previewSong?: SongRow | null | undefined;
  sortedSongs: SongRow[];
  playingSongId: number | null;
  pickNextSongId: (currentId: number) => number | null;
  artists: ArtistRow[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Resolved HLS URL for the active track — mirrored into the VC window for stream capture. */
  activePlaybackUrl: string | null;
  volume: number;
  /** Bass / lo-fi / Effects Lab — mirrored for audible FX in the VC capture window. */
  playbackEffects?: VcPlaybackEffectsMirror;
  specialPlayPause?: VcSpecialPlayPauseState | null;
};

function buildSongPayload(
  song: SongRow | null | undefined,
  manifest: SongPagesSongManifest | null,
  artist: ArtistRow | null,
): VcStatePayload['currentSong'] {
  if (!song) return null;
  const profileArtist = isVirtualPlaylistSong(song) ? null : artist;
  const trackArtist =
    song.artist_name?.trim() || manifest?.artistName?.trim() || profileArtist?.artist_name?.trim() || '';
  return {
    id: song.id,
    title: song.title,
    artist: trackArtist,
    year: song.year,
    caption: song.caption,
    coverUrl: resolveAssetUrl(song.page_url, song.cover_url ?? manifest?.coverUrl ?? null),
    videoCoverUrl: resolveAssetUrl(song.page_url, manifest?.extraImageUrl ?? null),
    about: manifest?.about ?? '',
    lyrics: manifest?.lyrics ?? '',
    artistId: song.artist_id,
    durationSeconds: song.duration_seconds,
    mainGenre: null,
    additionalGenres: null,
  };
}

export function useVcModeManager({
  analyserAudioRef,
  playingSong,
  previewSong,
  sortedSongs,
  playingSongId,
  pickNextSongId,
  artists,
  isPlaying,
  currentTime,
  duration,
  activePlaybackUrl,
  volume,
  playbackEffects = DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR,
  specialPlayPause = null,
}: UseVcModeManagerOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [vcOpen, setVcOpen] = useState(false);
  const [activeConfig, setActiveConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [canvasMirrorFrame, setCanvasMirrorFrame] = useState<string | null>(null);
  const [songManifest, setSongManifest] = useState<SongPagesSongManifest | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistRow | null>(null);
  const [hostCatalog, setHostCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());

  const manifestCacheRef = useRef(new Map<string, SongPagesSongManifest>());
  const timingRef = useRef({ currentTime, duration, isPlaying });
  const canvasMirrorFrameRef = useRef<string | null>(null);
  const activeConfigRef = useRef(activeConfig);
  const surfaceSaveTimerRef = useRef<number | null>(null);
  /** Prevents a late settings hydrate from overwriting config passed to Start VC. */
  const activeConfigSourceRef = useRef<'default' | 'settings' | 'start'>('default');

  const [reportedVisualizerId, setReportedVisualizerId] = useState<string | null>(null);
  const prevVcOpenRef = useRef(false);
  const kudos = useKudoPresets();

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) return;

    let cancelled = false;
    void app.getSettings(VC_SETTINGS_KEY).then((saved) => {
      if (cancelled || saved == null) return;
      // Start VC passes an explicit config — never clobber it with an older async load.
      if (activeConfigSourceRef.current === 'start') return;
      setActiveConfig(migrateVcConfig(saved));
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
      return;
    }

    if (!wasOpen) {
      setReportedVisualizerId(normalizeExperienceId(activeConfig.visualizerId));
    }
  }, [vcOpen, activeConfig.visualizerId]);

  const vcVisualizerId = useMemo(
    () => reportedVisualizerId ?? normalizeExperienceId(activeConfig.visualizerId),
    [activeConfig.visualizerId, reportedVisualizerId],
  );
  const vcUsesButterchurn = isButterchurnExperienceId(vcVisualizerId);
  const vcVisualizerSettings = useExperienceSettings(vcVisualizerId);

  useEffect(() => {
    timingRef.current = { currentTime, duration, isPlaying };
  }, [currentTime, duration, isPlaying]);

  const analyserEnabled = vcOpen && configUsesVisualizer(activeConfig) && playingSong != null;

  const { analyser, butterchurnTap, applyButterchurnAudioSettings, audioContext } = useAudioAnalyser({
    audioRef: analyserAudioRef,
    isPlaying,
    enabled: analyserEnabled,
  });

  const butterchurnVcMirrorActive = vcOpen && analyserEnabled && vcUsesButterchurn;

  /** Playing song, or the song page currently selected in the listener — for designer preview assets. */
  const designerSong = playingSong ?? previewSong ?? null;
  /** Queue overlays anchor on the playing track, or the selected song page when idle. */
  const queueAnchorSongId = playingSongId ?? previewSong?.id ?? null;

  const nextSongPreview = useMemo(() => {
    if (queueAnchorSongId == null) return null;
    const nextId = pickNextSongId(queueAnchorSongId);
    if (nextId == null) return null;
    const next = sortedSongs.find((song) => song.id === nextId);
    if (!next) return null;
    return { title: next.title, artist: next.artist_name ?? '' };
  }, [pickNextSongId, queueAnchorSongId, sortedSongs]);

  const upcomingMax = activeConfig.upcomingOverlay.maxCount;

  const upcoming = useMemo((): VcUpcomingSong[] => {
    if (queueAnchorSongId == null) return [];
    const currentIndex = sortedSongs.findIndex((song) => song.id === queueAnchorSongId);
    if (currentIndex < 0) return [];
    return sortedSongs.slice(currentIndex + 1, currentIndex + 1 + upcomingMax).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist_name ?? '',
      durationSeconds: song.duration_seconds,
      coverUrl: resolveAssetUrl(song.page_url, song.cover_url ?? null),
    }));
  }, [queueAnchorSongId, sortedSongs, upcomingMax]);

  useEffect(() => {
    if (!designerSong?.song_manifest_url) {
      setSongManifest(null);
      return;
    }
    const url = designerSong.song_manifest_url;
    const cached = manifestCacheRef.current.get(url);
    if (cached) {
      setSongManifest(cached);
      return;
    }

    const app = getApp();
    if (!app?.listener.fetchSongManifest) return;

    let cancelled = false;
    void app.listener.fetchSongManifest(url).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      const manifest = result.data as SongPagesSongManifest;
      manifestCacheRef.current.set(url, manifest);
      setSongManifest(manifest);
    });

    return () => {
      cancelled = true;
    };
  }, [designerSong?.id, designerSong?.song_manifest_url]);

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

  const buildStatePayload = useCallback((): VcStatePayload => {
    const config = normalizeVcConfig(activeConfig);
    const displaySong = playingSong ?? previewSong ?? null;
    return {
      config,
      playback: { currentTime, duration, isPlaying },
      audioMirror: {
        songId: playingSong?.id ?? null,
        playbackUrl: activePlaybackUrl ?? playingSong?.playback_url ?? null,
        volume,
        playbackEffects,
      },
      currentSong: buildSongPayload(displaySong, songManifest, artistProfile),
      nextSong: nextSongPreview,
      upcoming,
      hostGraphicUrl: hostGraphicPopupUrl,
      artistName: vcArtistDisplayName(displaySong, artistProfile, songManifest?.artistName),
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
      effectiveVisualizerId: vcVisualizerId,
      kudoPresets: kudos.presets,
      specialPlayPause,
    };
  }, [
    activeConfig,
    activePlaybackUrl,
    artistProfile,
    currentTime,
    duration,
    isPlaying,
    hostGraphicPopupUrl,
    kudos.presets,
    nextSongPreview,
    playingSong,
    previewSong,
    songManifest,
    specialPlayPause,
    upcoming,
    vcVisualizerId,
    volume,
    playbackEffects,
  ]);

  /** Song + artist context for Surface designer preview (playing or selected song page). */
  const buildDesignerPreviewState = useCallback((): VcStatePayload => {
    const song = designerSong;
    const useLivePlayback = playingSong != null && song?.id === playingSong.id;
    return {
      config: normalizeVcConfig(activeConfig),
      playback: useLivePlayback
        ? { currentTime, duration, isPlaying }
        : {
            currentTime: 0,
            duration: song?.duration_seconds ?? 0,
            isPlaying: false,
          },
      audioMirror: { songId: null, playbackUrl: null, volume, playbackEffects },
      currentSong: buildSongPayload(song, songManifest, artistProfile),
      nextSong: nextSongPreview,
      upcoming,
      hostGraphicUrl: hostGraphicPopupUrl,
      artistName: vcArtistDisplayName(song, artistProfile, songManifest?.artistName),
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
      effectiveVisualizerId: vcVisualizerId,
      kudoPresets: kudos.presets,
      specialPlayPause,
    };
  }, [
    activeConfig,
    artistProfile,
    currentTime,
    designerSong,
    duration,
    isPlaying,
    hostGraphicPopupUrl,
    kudos.presets,
    nextSongPreview,
    playingSong,
    songManifest,
    specialPlayPause,
    upcoming,
    vcVisualizerId,
    volume,
    playbackEffects,
  ]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const pushState = () => {
      const payload = buildStatePayload();
      app.vc!.sendState(payload);
      app.commands?.setRuntimeContext?.(
        deriveCommandRuntimeContextFromVcState(payload, { vcModeActive: true }),
      );
    };
    const scheduleSurfaceSave = (config: VcModeConfig) => {
      if (surfaceSaveTimerRef.current != null) {
        window.clearTimeout(surfaceSaveTimerRef.current);
      }
      surfaceSaveTimerRef.current = window.setTimeout(() => {
        void getApp()?.saveSettings?.(VC_SETTINGS_KEY, config);
      }, SURFACE_SAVE_DEBOUNCE_MS);
    };
    const persistSurfaceNow = (config: VcModeConfig) => {
      if (surfaceSaveTimerRef.current != null) {
        window.clearTimeout(surfaceSaveTimerRef.current);
        surfaceSaveTimerRef.current = null;
      }
      void getApp()?.saveSettings?.(VC_SETTINGS_KEY, config);
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
        scheduleSurfaceSave(next);
      }
      app.vc!.sendState({ ...buildStatePayload(), config: next });
      return next;
    };

    pushState();
    const stateId = window.setInterval(pushState, STATE_INTERVAL_MS);
    const offSync = app.vc.onRequestSync?.(() => pushState());

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

    const offActiveVisualizer = app.vc.onActiveVisualizerReport?.((id: string) => {
      setReportedVisualizerId(normalizeExperienceId(id));
    });

    return () => {
      window.clearInterval(stateId);
      offSync?.();
      offSurfacePatch?.();
      offSurfaceCommit?.();
      offActiveVisualizer?.();
      if (surfaceSaveTimerRef.current != null) {
        window.clearTimeout(surfaceSaveTimerRef.current);
        surfaceSaveTimerRef.current = null;
      }
    };
  }, [buildStatePayload, vcOpen]);

  /** Push VC state when the host popup URL resolves so Toggle Host Graphic Display stays available. */
  useEffect(() => {
    if (!vcOpen) return;
    const app = getApp();
    if (!app?.vc) return;

    const payload = buildStatePayload();
    app.vc.sendState(payload);
    app.commands?.setRuntimeContext?.(
      deriveCommandRuntimeContextFromVcState(payload, { vcModeActive: true }),
    );
  }, [buildStatePayload, hostGraphicPopupUrl, vcOpen]);

  useEffect(() => {
    if (vcOpen) return;
    getApp()?.commands?.setRuntimeContext?.({ vcModeActive: false });
  }, [vcOpen]);

  /** Push Kudo preset changes to VC immediately. */
  useEffect(() => {
    if (!vcOpen) return;
    const payload = buildStatePayload();
    getApp()?.vc?.sendState(payload);
    getApp()?.commands?.setRuntimeContext?.(
      deriveCommandRuntimeContextFromVcState(payload, { vcModeActive: true }),
    );
  }, [buildStatePayload, kudos.presets, vcOpen]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !analyser || !app?.vc?.sendFrame) return;

    const scratch = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(scratch as Uint8Array<ArrayBuffer>);
      const timing = timingRef.current;
      app.vc!.sendFrame({
        type: 'frame',
        // Copy — scratch buffer is reused each tick; typed array IPC matches visualizer path.
        frequency: new Uint8Array(scratch),
        currentTime: timing.currentTime,
        duration: timing.duration,
        isPlaying: timing.isPlaying,
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
      setVcOpen(false);
      // Return host to Surface designer after VC ends (window X or programmatic close).
      setModalOpen(true);
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
      const [catalog, savedVc] = await Promise.all([
        loadHostContentCatalog(),
        app.getSettings?.(VC_SETTINGS_KEY) ?? Promise.resolve(null),
      ]);
      setHostCatalog(migrateHostContentCatalog(catalog));
      const savedConfig = savedVc != null ? migrateVcConfig(savedVc) : null;
      const normalized = normalizeVcConfig({
        ...config,
        hostGraphicPopupId:
          config.hostGraphicPopupId ?? savedConfig?.hostGraphicPopupId ?? null,
        upcomingOverlay: config.upcomingOverlay ?? savedConfig?.upcomingOverlay,
      });
      activeConfigSourceRef.current = 'start';
      activeConfigRef.current = normalized;
      setActiveConfig(normalized);
      setModalOpen(false);
      setVcOpen(true);
      await app.vc.open({});
    },
    [closeVisualizerSurfaces],
  );

  const closeVcMode = useCallback(async () => {
    const app = getApp();
    if (!app?.vc) return;
    await app.vc.close();
    setVcOpen(false);
    setCanvasMirrorFrame(null);
    setModalOpen(true);
  }, []);

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
    activeConfig,
    analyserEnabled,
    vcVisualizerId,
    vcVisualizerSettings,
    butterchurnVcMirrorActive,
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
