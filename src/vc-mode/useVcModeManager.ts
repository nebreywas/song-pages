import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SongPagesSongManifest } from '@shared/manifests';
import type { VcModeConfig, VcStatePayload, VcUpcomingSong } from '@shared/vcModeTypes';
import { configUsesVisualizer, normalizeVcConfig } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { resolveAssetUrl } from '../lib/resolveAssetUrl';
import type { ArtistRow, SongRow } from '../types/app';
import { isButterchurnExperienceId } from '../visualizers/butterchurn/presets/approved/presetKeys';
import { normalizeExperienceId } from '../visualizers/native/registry';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { getAudioGraphIfExists, setMainSpeakerMuted } from '../visualizers/audioGraph';
import { useAudioAnalyser } from '../visualizers/useAudioAnalyser';
import { createDefaultVcConfig } from './vcModeDefaults';

const FRAME_INTERVAL_MS = 16;
const STATE_INTERVAL_MS = 200;
const UPCOMING_MAX = 10;

type UseVcModeManagerOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
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
  bassBoost: boolean;
  lofi: boolean;
};

function buildSongPayload(
  song: SongRow | null | undefined,
  manifest: SongPagesSongManifest | null,
  artist: ArtistRow | null,
): VcStatePayload['currentSong'] {
  if (!song) return null;
  return {
    id: song.id,
    title: song.title,
    artist: song.artist_name ?? artist?.artist_name ?? '',
    year: song.year,
    caption: song.caption,
    coverUrl: resolveAssetUrl(song.page_url, song.cover_url ?? manifest?.coverUrl ?? null),
    videoCoverUrl: resolveAssetUrl(song.page_url, manifest?.extraImageUrl ?? null),
    about: manifest?.about ?? '',
    lyrics: manifest?.lyrics ?? '',
    artistId: song.artist_id,
  };
}

export function useVcModeManager({
  audioRef,
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
  bassBoost,
  lofi,
}: UseVcModeManagerOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [vcOpen, setVcOpen] = useState(false);
  const [vcMirrorAudible, setVcMirrorAudible] = useState(false);
  const [activeConfig, setActiveConfig] = useState<VcModeConfig>(() => createDefaultVcConfig());
  const [canvasMirrorFrame, setCanvasMirrorFrame] = useState<string | null>(null);
  const [songManifest, setSongManifest] = useState<SongPagesSongManifest | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistRow | null>(null);

  const manifestCacheRef = useRef(new Map<string, SongPagesSongManifest>());
  const timingRef = useRef({ currentTime, duration, isPlaying });
  const canvasMirrorFrameRef = useRef<string | null>(null);

  useEffect(() => {
    canvasMirrorFrameRef.current = canvasMirrorFrame;
  }, [canvasMirrorFrame]);

  const vcVisualizerId = useMemo(
    () => normalizeExperienceId(activeConfig.visualizerId),
    [activeConfig.visualizerId],
  );
  const vcUsesButterchurn = isButterchurnExperienceId(vcVisualizerId);
  const vcVisualizerSettings = useExperienceSettings(vcVisualizerId);

  useEffect(() => {
    timingRef.current = { currentTime, duration, isPlaying };
  }, [currentTime, duration, isPlaying]);

  const analyserEnabled = vcOpen && configUsesVisualizer(activeConfig) && playingSong != null;

  const { analyser, butterchurnTap, applyButterchurnAudioSettings, audioContext } = useAudioAnalyser({
    audioRef,
    isPlaying,
    enabled: analyserEnabled,
  });

  const butterchurnVcMirrorActive = vcOpen && analyserEnabled && vcUsesButterchurn;

  /** Playing song, or the song page currently selected in the listener — for designer preview assets. */
  const designerSong = playingSong ?? previewSong ?? null;

  const nextSongPreview = useMemo(() => {
    if (playingSongId == null) return null;
    const nextId = pickNextSongId(playingSongId);
    if (nextId == null) return null;
    const next = sortedSongs.find((song) => song.id === nextId);
    if (!next) return null;
    return { title: next.title, artist: next.artist_name ?? '' };
  }, [pickNextSongId, playingSongId, sortedSongs]);

  const upcoming = useMemo((): VcUpcomingSong[] => {
    if (playingSongId == null) return [];
    const currentIndex = sortedSongs.findIndex((song) => song.id === playingSongId);
    if (currentIndex < 0) return [];
    return sortedSongs.slice(currentIndex + 1, currentIndex + 1 + UPCOMING_MAX).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist_name ?? '',
      durationSeconds: song.duration_seconds,
    }));
  }, [playingSongId, sortedSongs]);

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
    setArtistProfile(cached);

    const app = getApp();
    if (!app?.listener.ensureArtistManifest) return;

    let cancelled = false;
    void app.listener.ensureArtistManifest(designerSong.artist_id).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      setArtistProfile(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [artists, designerSong?.artist_id, designerSong?.id]);

  const buildStatePayload = useCallback((): VcStatePayload => {
    const config = normalizeVcConfig(activeConfig);
    return {
      config,
      playback: { currentTime, duration, isPlaying },
      audioMirror: {
        songId: playingSong?.id ?? null,
        playbackUrl: activePlaybackUrl ?? playingSong?.playback_url ?? null,
        volume,
      },
      currentSong: buildSongPayload(playingSong, songManifest, artistProfile),
      nextSong: nextSongPreview,
      upcoming,
      hostGraphicUrl: null,
      artistName: artistProfile?.artist_name ?? playingSong?.artist_name ?? null,
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
    };
  }, [
    activeConfig,
    activePlaybackUrl,
    artistProfile,
    currentTime,
    duration,
    isPlaying,
    nextSongPreview,
    playingSong,
    songManifest,
    upcoming,
    volume,
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
      audioMirror: { songId: null, playbackUrl: null, volume },
      currentSong: buildSongPayload(song, songManifest, artistProfile),
      nextSong: nextSongPreview,
      upcoming,
      hostGraphicUrl: null,
      artistName: artistProfile?.artist_name ?? song?.artist_name ?? null,
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: resolveAssetUrl(artistProfile?.site_url, artistProfile?.artist_photo_url ?? null),
    };
  }, [
    activeConfig,
    artistProfile,
    currentTime,
    designerSong,
    duration,
    isPlaying,
    nextSongPreview,
    playingSong,
    songManifest,
    upcoming,
  ]);

  useEffect(() => {
    if (!vcOpen) {
      setVcMirrorAudible(false);
    }
  }, [vcOpen]);

  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onPlaybackStatus) return;

    const offStatus = app.vc.onPlaybackStatus(({ active }) => {
      setVcMirrorAudible(Boolean(active));
    });

    return () => {
      offStatus();
      setVcMirrorAudible(false);
    };
  }, []);

  /**
   * Mute main-window speakers only when the VC mirror is actually playing through
   * a Web Audio graph. Otherwise keep local playback on the listener window.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const graph = getAudioGraphIfExists(audio);
    const shouldMuteMain = vcOpen && vcMirrorAudible && graph != null;

    setMainSpeakerMuted(audio, shouldMuteMain);
    audio.volume = volume;
  }, [audioRef, vcOpen, vcMirrorAudible, volume, analyser, bassBoost, lofi]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !app?.vc) return;

    const pushState = () => app.vc!.sendState(buildStatePayload());
    pushState();
    const stateId = window.setInterval(pushState, STATE_INTERVAL_MS);
    const offSync = app.vc.onRequestSync?.(() => pushState());

    return () => {
      window.clearInterval(stateId);
      offSync?.();
    };
  }, [buildStatePayload, vcOpen]);

  useEffect(() => {
    const app = getApp();
    if (!vcOpen || !analyser || !app?.vc?.sendFrame) return;

    const scratch = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(scratch as Uint8Array<ArrayBuffer>);
      const timing = timingRef.current;
      app.vc!.sendFrame({
        type: 'frame',
        frequency: Array.from(scratch),
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
      setVcMirrorAudible(false);
      const audio = audioRef.current;
      if (audio) setMainSpeakerMuted(audio, false);
    });

    return () => {
      offOpened();
      offClosed();
    };
  }, [audioRef]);

  const closeVisualizerSurfaces = useCallback(async () => {
    const app = getApp();
    await app?.visualizer?.close();
  }, []);

  const startVcMode = useCallback(
    async (config: VcModeConfig) => {
      const app = getApp();
      if (!app?.vc) return;

      await closeVisualizerSurfaces();
      setActiveConfig(normalizeVcConfig(config));
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
    setVcMirrorAudible(false);
    setCanvasMirrorFrame(null);
    const audio = audioRef.current;
    if (audio) setMainSpeakerMuted(audio, false);
  }, [audioRef]);

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
  };
}
