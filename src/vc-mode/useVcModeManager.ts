import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SongPagesSongManifest } from '@shared/manifests';
import type { VcModeConfig, VcStatePayload, VcUpcomingSong } from '@shared/vcModeTypes';
import { normalizeVcConfig } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import type { ArtistRow, SongRow } from '../types/app';
import { isButterchurnExperienceId } from '../visualizers/butterchurn/presets/approved/presetKeys';
import { normalizeExperienceId } from '../visualizers/native/registry';
import { useExperienceSettings } from '../visualizers/settings/useExperienceSettings';
import { useAudioAnalyser } from '../visualizers/useAudioAnalyser';
import { createDefaultVcConfig } from './vcModeDefaults';

const FRAME_INTERVAL_MS = 16;
const STATE_INTERVAL_MS = 200;
const UPCOMING_MAX = 10;

function localFileUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (filePath.startsWith('file://')) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`;
}

function configUsesVisualizer(config: VcModeConfig): boolean {
  return config.cells.some((cell) => cell.slotA === 'visualizer' || cell.slotB === 'visualizer');
}

type UseVcModeManagerOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  sortedSongs: SongRow[];
  playingSongId: number | null;
  pickNextSongId: (currentId: number) => number | null;
  artists: ArtistRow[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

export function useVcModeManager({
  audioRef,
  playingSong,
  sortedSongs,
  playingSongId,
  pickNextSongId,
  artists,
  isPlaying,
  currentTime,
  duration,
}: UseVcModeManagerOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [vcOpen, setVcOpen] = useState(false);
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
    if (!playingSong?.song_manifest_url) {
      setSongManifest(null);
      return;
    }
    const url = playingSong.song_manifest_url;
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
  }, [playingSong?.id, playingSong?.song_manifest_url]);

  useEffect(() => {
    if (!playingSong) {
      setArtistProfile(null);
      return;
    }
    const cached = artists.find((row) => row.id === playingSong.artist_id) ?? null;
    setArtistProfile(cached);

    const app = getApp();
    if (!app?.listener.ensureArtistManifest) return;

    let cancelled = false;
    void app.listener.ensureArtistManifest(playingSong.artist_id).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      setArtistProfile(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [artists, playingSong?.artist_id, playingSong?.id]);

  const buildStatePayload = useCallback((): VcStatePayload => {
    const config = normalizeVcConfig(activeConfig);
    return {
      config,
      playback: { currentTime, duration, isPlaying },
      currentSong: playingSong
        ? {
            id: playingSong.id,
            title: playingSong.title,
            artist: playingSong.artist_name ?? artistProfile?.artist_name ?? '',
            year: playingSong.year,
            caption: playingSong.caption,
            coverUrl: playingSong.cover_url,
            about: songManifest?.about ?? '',
            lyrics: songManifest?.lyrics ?? '',
            artistId: playingSong.artist_id,
          }
        : null,
      nextSong: nextSongPreview,
      upcoming,
      hostGraphicUrl: localFileUrl(config.hostGraphicPath),
      artistName: artistProfile?.artist_name ?? playingSong?.artist_name ?? null,
      artistBio: artistProfile?.artist_bio ?? null,
      artistPhotoUrl: artistProfile?.artist_photo_url ?? null,
    };
  }, [
    activeConfig,
    artistProfile,
    currentTime,
    duration,
    isPlaying,
    nextSongPreview,
    playingSong,
    songManifest,
    upcoming,
  ]);

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
    const offClosed = app.vc.onClosed(() => setVcOpen(false));

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
    setCanvasMirrorFrame(null);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

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
    openModal,
    closeModal,
    startVcMode,
    closeVcMode,
  };
}
