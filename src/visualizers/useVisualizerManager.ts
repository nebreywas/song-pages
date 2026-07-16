import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  projectorKindFromProjectionMode,
  projectorTitleForKind,
} from '@shared/projector/titles';
import {
  resolveInitialProjectionMode,
  resolveLiveProjectionMode,
} from '@shared/projector/resolveProjectionMode';
import {
  DEFAULT_VISUALIZER_ID,
  type ProjectionMode,
  type ProjectorNativePagePayload,
  type ProjectorVideoPayload,
  type VisualizerSongInfo,
} from '@shared/visualizerMessages';
import type { ListenerLyricsDisplaySettings } from '@shared/listener/lyricsDisplaySettings';
import type { SongPageFontIncreaseLevel } from '@shared/listener/playerSettings';
import { youtubeVideoIdFromSong, isYoutubeSong } from '@shared/youtube/youtubeFeature';

import { normalizeSongRowAssets, resolveSongCoverUrl } from '@shared/listener/songResolution';

import { getApp } from '../lib/bridge';
import type { SongRow } from '../types/app';
import { buildVisualizerContext } from './core/context/buildContext';
import type { VisualizerSessionTarget } from './core/runtime/types';
import { normalizeExperienceId } from './native/registry';
import { isButterchurnExperienceId } from './butterchurn/presets/approved/presetKeys';
import {
  getExperience,
  resolveExperienceForTarget,
} from './registry';
import {
  VISUALIZER_ACTIVE_EXPERIENCE_KEY,
  VISUALIZER_LEGACY_PLUGIN_KEY,
  VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY,
} from './settings/persistence/keys';
import { useAnalyserBus } from '../audio/hooks/useAnalyserBus';
import { useVisualizerIpcSender } from './useVisualizerStream';

type UseVisualizerManagerOptions = {
  /** Hidden mirror element — Web Audio analyser attaches here, not the audible player. */
  analyserAudioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  pageUrl?: string | null;
  /** Artist / playlist homepage when no song page is open. */
  homepageUrl?: string | null;
  /** Native in-app pages (SoundCloud, …) that Projector should render without a webview. */
  nativePage?: ProjectorNativePagePayload | null;
  /** Listener lyrics display prefs mirrored onto Projector native song pages. */
  lyricsDisplay?: ListenerLyricsDisplaySettings | null;
  /** Song page font bump mirrored onto Projector song pages. */
  songPageFontIncreaseLevel?: SongPageFontIncreaseLevel | null;
  /** Native player volume (0–1) — forwarded to Projector: Video embeds. */
  volume?: number;
};

/** POST 1.0: one active rendering session — embedded OR external projection visualizer. */
function resolveActiveSession(embeddedActive: boolean, projectionVisualizerActive: boolean): VisualizerSessionTarget {
  if (embeddedActive) return 'main-embedded';
  if (projectionVisualizerActive) return 'external-projection';
  return 'none';
}

export function useVisualizerManager({
  analyserAudioRef,
  playingSong,
  isPlaying,
  currentTime,
  duration,
  pageUrl,
  homepageUrl,
  nativePage = null,
  lyricsDisplay = null,
  songPageFontIncreaseLevel = null,
  volume = 0.85,
}: UseVisualizerManagerOptions) {
  const [embeddedActive, setEmbeddedActive] = useState(false);
  const [activeExperienceId, setActiveExperienceId] = useState(DEFAULT_VISUALIZER_ID);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('page');
  /** Once the user opens Projector as Visualizer, stay there until close / mode resolve on re-open. */
  const [stickyVisualizer, setStickyVisualizer] = useState(false);
  const [canvasMirrorFrame, setCanvasMirrorFrame] = useState<string | null>(null);

  const canVisualize = playingSong != null;

  const songInfo = useMemo<VisualizerSongInfo | null>(() => {
    if (!playingSong) return null;
    const normalized = normalizeSongRowAssets(playingSong);
    return {
      title: normalized.title,
      artist: normalized.artist_name ?? '',
      coverUrl: resolveSongCoverUrl(normalized),
    };
  }, [playingSong]);

  const visualizerContext = useMemo(() => buildVisualizerContext(playingSong ?? null), [playingSong]);

  const visualizerProjectionActive = windowOpen && projectionMode === 'visualizer';
  const videoProjectionActive = windowOpen && projectionMode === 'video';
  const activeSession = resolveActiveSession(embeddedActive, visualizerProjectionActive);
  const analyserEnabled = canVisualize && activeSession !== 'none';

  const { analyser, butterchurnTap, applyButterchurnAudioSettings, frequencyData, timeDomainData, audioContext } =
    useAnalyserBus({
    consumerId: 'visualizer-main',
    audioRef: analyserAudioRef,
    isPlaying,
    enabled: analyserEnabled,
  });

  const windowExperienceId = useMemo(() => {
    return resolveExperienceForTarget(activeExperienceId, 'external-projection').id;
  }, [activeExperienceId]);

  const embeddedExperienceId = useMemo(() => {
    return resolveExperienceForTarget(activeExperienceId, 'main-embedded').id;
  }, [activeExperienceId]);

  const isButterchurnExperience = isButterchurnExperienceId(activeExperienceId);
  const butterchurnMirrorActive =
    visualizerProjectionActive && !embeddedActive && isButterchurnExperience && analyserEnabled;

  const projectorVideo = useMemo<ProjectorVideoPayload | null>(() => {
    if (!videoProjectionActive || !playingSong || !isYoutubeSong(playingSong)) return null;
    const videoId = youtubeVideoIdFromSong(playingSong);
    if (!videoId) return null;
    return {
      provider: 'youtube',
      videoId,
      songId: playingSong.id,
      volume,
    };
  }, [playingSong, videoProjectionActive, volume]);

  useVisualizerIpcSender({
    enabled: windowOpen,
    sendFrames: visualizerProjectionActive && analyserEnabled,
    analyser,
    experienceId: windowExperienceId,
    song: songInfo,
    isPlaying,
    currentTime,
    duration,
    projectionMode,
    pageUrl: pageUrl ?? null,
    homepageUrl: homepageUrl ?? null,
    nativePage,
    lyricsDisplay,
    songPageFontIncreaseLevel,
    video: projectorVideo,
    canvasFrame: butterchurnMirrorActive ? canvasMirrorFrame : null,
  });

  // Keep OS title aligned with Projector: Song Page / Visualizer / Video.
  useEffect(() => {
    if (!windowOpen) return;
    const title = projectorTitleForKind(projectorKindFromProjectionMode(projectionMode));
    void getApp()?.visualizer?.setTitle?.(title);
  }, [projectionMode, windowOpen]);

  // Auto-switch Song Page ↔ Video while open (Visualizer stays sticky until close).
  useEffect(() => {
    if (!windowOpen) return;
    const next = resolveLiveProjectionMode({
      stickyVisualizer,
      playingSong,
    });
    setProjectionMode((current) => (current === next ? current : next));
  }, [playingSong, stickyVisualizer, windowOpen]);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) return;

    void (async () => {
      const saved =
        (await app.getSettings(VISUALIZER_ACTIVE_EXPERIENCE_KEY)) ??
        (await app.getSettings(VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY)) ??
        (await app.getSettings(VISUALIZER_LEGACY_PLUGIN_KEY));

      if (typeof saved === 'string' && getExperience(normalizeExperienceId(saved))) {
        setActiveExperienceId(normalizeExperienceId(saved));
      }
    })();
  }, []);

  useEffect(() => {
    const app = getApp();
    if (!app?.saveSettings) return;
    void app.saveSettings(VISUALIZER_ACTIVE_EXPERIENCE_KEY, activeExperienceId);
    void app.saveSettings(VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY, activeExperienceId);
  }, [activeExperienceId]);

  useEffect(() => {
    const app = getApp();
    if (!app?.visualizer) return;

    const refreshStatus = () => {
      void app.visualizer.status().then((result) => {
        if (!result.ok || !result.data) return;
        setWindowOpen(result.data.open);
        setWindowFullscreen(result.data.fullscreen);
      });
    };

    refreshStatus();
    const offOpened = app.visualizer.onOpened(() => setWindowOpen(true));
    const offClosed = app.visualizer.onClosed(() => {
      setWindowOpen(false);
      setWindowFullscreen(false);
      setStickyVisualizer(false);
    });
    const offFullScreen = app.visualizer.onFullScreenChanged((fullscreen) => {
      setWindowFullscreen(fullscreen);
    });

    return () => {
      offOpened();
      offClosed();
      offFullScreen();
    };
  }, []);

  const selectExperience = useCallback((experienceId: string) => {
    const normalized = normalizeExperienceId(experienceId);
    if (getExperience(normalized)) {
      setActiveExperienceId(normalized);
    }
  }, []);

  const toggleEmbedded = useCallback(() => {
    setEmbeddedActive((value) => {
      const next = !value;
      if (next) {
        void getApp()?.vc?.close();
        // Single-active invariant: Projector shows Song Page / Video while embedded runs.
        if (windowOpen) {
          setStickyVisualizer(false);
          setProjectionMode(
            resolveLiveProjectionMode({ stickyVisualizer: false, playingSong }),
          );
        }
      }
      return next;
    });
  }, [playingSong, windowOpen]);

  const openWindow = useCallback(
    async (options: { mode?: ProjectionMode; fullscreen?: boolean } = {}) => {
      const app = getApp();
      if (!app?.visualizer) return;

      const mode =
        options.mode ??
        resolveInitialProjectionMode({
          embeddedVisualizerActive: embeddedActive,
          playingSong,
        });
      await app.vc?.close();

      if (mode === 'visualizer') {
        // Single-active invariant: external visualizer replaces in-player visualizer.
        setEmbeddedActive(false);
        setStickyVisualizer(true);
      } else {
        setStickyVisualizer(false);
      }

      setProjectionMode(mode);
      setWindowOpen(true);
      await app.visualizer.open({ fullscreen: options.fullscreen ?? false });
      void app.visualizer.setTitle?.(
        projectorTitleForKind(projectorKindFromProjectionMode(mode)),
      );
    },
    [embeddedActive, playingSong],
  );

  const closeWindow = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    setStickyVisualizer(false);
    await app.visualizer.close();
  }, []);

  const toggleProjection = useCallback(async () => {
    if (windowOpen) {
      await closeWindow();
      return;
    }

    await openWindow({});
  }, [closeWindow, openWindow, windowOpen]);

  const toggleFullscreen = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    await app.visualizer.setFullScreen(!windowFullscreen);
  }, [windowFullscreen]);

  const dismissVisualizer = useCallback(() => {
    setEmbeddedActive(false);
    setWindowOpen(false);
    setStickyVisualizer(false);
    void getApp()?.visualizer?.close();
  }, []);

  const launchEmbedded = useCallback(() => {
    void getApp()?.vc?.close();
    if (windowOpen) {
      setStickyVisualizer(false);
      setProjectionMode(resolveLiveProjectionMode({ stickyVisualizer: false, playingSong }));
    }
    setEmbeddedActive(true);
  }, [playingSong, windowOpen]);

  const openSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  const closeSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(false);
  }, []);

  return {
    embeddedActive,
    activeExperienceId,
    embeddedExperienceId,
    windowExperienceId,
    activeSession,
    windowOpen,
    windowFullscreen,
    projectionMode,
    videoProjectionActive,
    settingsDialogOpen,
    canVisualize,
    analyser,
    butterchurnTap,
    applyButterchurnAudioSettings,
    audioContext,
    frequencyData,
    timeDomainData,
    songInfo,
    visualizerContext,
    isButterchurnExperience,
    butterchurnMirrorActive,
    setCanvasMirrorFrame,
    toggleEmbedded,
    launchEmbedded,
    selectExperience,
    openWindow,
    closeWindow,
    toggleProjection,
    toggleFullscreen,
    dismissVisualizer,
    openSettingsDialog,
    closeSettingsDialog,
  };
}
