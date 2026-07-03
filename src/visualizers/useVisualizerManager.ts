import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_VISUALIZER_ID,
  type ProjectionMode,
  type VisualizerSongInfo,
} from '@shared/visualizerMessages';

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
import { useAudioAnalyser } from './useAudioAnalyser';
import { useVisualizerIpcSender } from './useVisualizerStream';

type UseVisualizerManagerOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  pageUrl?: string | null;
};

/** POST 1.0: one active rendering session — embedded OR external projection visualizer. */
function resolveActiveSession(embeddedActive: boolean, projectionVisualizerActive: boolean): VisualizerSessionTarget {
  if (embeddedActive) return 'main-embedded';
  if (projectionVisualizerActive) return 'external-projection';
  return 'none';
}

export function useVisualizerManager({
  audioRef,
  playingSong,
  isPlaying,
  currentTime,
  duration,
  pageUrl,
}: UseVisualizerManagerOptions) {
  const [embeddedActive, setEmbeddedActive] = useState(false);
  const [activeExperienceId, setActiveExperienceId] = useState(DEFAULT_VISUALIZER_ID);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('page');
  const [canvasMirrorFrame, setCanvasMirrorFrame] = useState<string | null>(null);

  const canVisualize = playingSong != null;

  const songInfo = useMemo<VisualizerSongInfo | null>(() => {
    if (!playingSong) return null;
    return {
      title: playingSong.title,
      artist: playingSong.artist_name ?? '',
      coverUrl: playingSong.cover_url,
    };
  }, [playingSong]);

  const visualizerContext = useMemo(() => buildVisualizerContext(playingSong ?? null), [playingSong]);

  const visualizerProjectionActive = windowOpen && projectionMode === 'visualizer';
  const activeSession = resolveActiveSession(embeddedActive, visualizerProjectionActive);
  const analyserEnabled = canVisualize && activeSession !== 'none';

  const { analyser, butterchurnTap, applyButterchurnAudioSettings, frequencyData, timeDomainData, audioContext } =
    useAudioAnalyser({
    audioRef,
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

  useVisualizerIpcSender({
    enabled: windowOpen,
    sendFrames: visualizerProjectionActive && analyserEnabled,
    analyser,
    pluginId: windowExperienceId,
    song: songInfo,
    isPlaying,
    currentTime,
    duration,
    projectionMode,
    pageUrl: pageUrl ?? null,
    canvasFrame: butterchurnMirrorActive ? canvasMirrorFrame : null,
  });

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
        // Single-active invariant: projection shows song page while embedded runs.
        if (windowOpen) setProjectionMode('page');
      }
      return next;
    });
  }, [windowOpen]);

  const openWindow = useCallback(
    async (options: { mode?: ProjectionMode; fullscreen?: boolean } = {}) => {
      const app = getApp();
      if (!app?.visualizer) return;

      const mode = options.mode ?? (embeddedActive ? 'visualizer' : 'page');
      await app.vc?.close();

      if (mode === 'visualizer') {
        // Single-active invariant: external visualizer replaces in-player visualizer.
        setEmbeddedActive(false);
      }

      setProjectionMode(mode);
      setWindowOpen(true);
      await app.visualizer.open({ fullscreen: options.fullscreen ?? false });
    },
    [embeddedActive],
  );

  const closeWindow = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    await app.visualizer.close();
  }, []);

  const toggleProjection = useCallback(async () => {
    if (windowOpen) {
      await closeWindow();
      return;
    }

    const mode: ProjectionMode = embeddedActive ? 'visualizer' : 'page';
    await openWindow({ mode });
  }, [closeWindow, embeddedActive, openWindow, windowOpen]);

  const toggleFullscreen = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    await app.visualizer.setFullScreen(!windowFullscreen);
  }, [windowFullscreen]);

  const dismissVisualizer = useCallback(() => {
    setEmbeddedActive(false);
    setWindowOpen(false);
    void getApp()?.visualizer?.close();
  }, []);

  const launchEmbedded = useCallback(() => {
    void getApp()?.vc?.close();
    if (windowOpen) setProjectionMode('page');
    setEmbeddedActive(true);
  }, [windowOpen]);

  const openSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  const closeSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(false);
  }, []);

  return {
    embeddedActive,
    activeExperienceId,
    activePluginId: activeExperienceId,
    embeddedExperienceId,
    embeddedPluginId: embeddedExperienceId,
    windowExperienceId,
    windowPluginId: windowExperienceId,
    activeSession,
    windowOpen,
    windowFullscreen,
    projectionMode,
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
    selectPlugin: selectExperience,
    openWindow,
    closeWindow,
    toggleProjection,
    toggleFullscreen,
    dismissVisualizer,
    openSettingsDialog,
    closeSettingsDialog,
  };
}
