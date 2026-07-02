import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_VISUALIZER_ID,
  VISUALIZER_SETTINGS_KEY,
  type ProjectionMode,
  type VisualizerSongInfo,
} from '@shared/visualizerMessages';

import { getApp } from '../lib/bridge';
import type { SongRow } from '../types/app';
import { defaultVisualizerForSurface, getVisualizer, visualizerSupportsSurface } from './registry';
import { useAudioAnalyser } from './useAudioAnalyser';
import { useVisualizerIpcSender } from './useVisualizerStream';

type UseVisualizerManagerOptions = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playingSong: SongRow | null | undefined;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Current song page URL — used when projection opens in page mode. */
  pageUrl?: string | null;
};

export function useVisualizerManager({
  audioRef,
  playingSong,
  isPlaying,
  currentTime,
  duration,
  pageUrl,
}: UseVisualizerManagerOptions) {
  const [embeddedActive, setEmbeddedActive] = useState(false);
  const [activePluginId, setActivePluginId] = useState(DEFAULT_VISUALIZER_ID);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('page');

  const canVisualize = playingSong != null;

  const songInfo = useMemo<VisualizerSongInfo | null>(() => {
    if (!playingSong) return null;
    return {
      title: playingSong.title,
      artist: playingSong.artist_name ?? '',
      coverUrl: playingSong.cover_url,
    };
  }, [playingSong]);

  const visualizerProjectionActive = windowOpen && projectionMode === 'visualizer';
  const analyserEnabled = canVisualize && (embeddedActive || visualizerProjectionActive);

  const { analyser, frequencyData, timeDomainData } = useAudioAnalyser({
    audioRef,
    isPlaying,
    enabled: analyserEnabled,
  });

  const windowPluginId = useMemo(() => {
    const plugin = getVisualizer(activePluginId);
    if (plugin && visualizerSupportsSurface(plugin, 'window')) return activePluginId;
    return defaultVisualizerForSurface('window').id;
  }, [activePluginId]);

  const embeddedPluginId = useMemo(() => {
    const plugin = getVisualizer(activePluginId);
    if (plugin && visualizerSupportsSurface(plugin, 'embedded')) return activePluginId;
    return defaultVisualizerForSurface('embedded').id;
  }, [activePluginId]);

  useVisualizerIpcSender({
    enabled: windowOpen,
    sendFrames: visualizerProjectionActive && analyserEnabled,
    analyser,
    pluginId: windowPluginId,
    song: songInfo,
    isPlaying,
    currentTime,
    duration,
    projectionMode,
    pageUrl: pageUrl ?? null,
  });

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(VISUALIZER_SETTINGS_KEY).then((value) => {
      if (typeof value === 'string' && getVisualizer(value)) {
        setActivePluginId(value);
      }
    });
  }, []);

  useEffect(() => {
    const app = getApp();
    if (!app?.saveSettings) return;
    void app.saveSettings(VISUALIZER_SETTINGS_KEY, activePluginId);
  }, [activePluginId]);

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
    const offOpened = app.visualizer.onOpened(() => {
      setWindowOpen(true);
    });
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

  // Keep projection content in sync with panel visualizer state.
  useEffect(() => {
    if (!windowOpen) return;
    setProjectionMode(embeddedActive ? 'visualizer' : 'page');
  }, [embeddedActive, windowOpen]);

  const toggleEmbedded = useCallback(() => {
    setEmbeddedActive((value) => {
      const next = !value;
      if (next) {
        void getApp()?.vc?.close();
      }
      return next;
    });
  }, []);

  const selectPlugin = useCallback((pluginId: string) => {
    if (getVisualizer(pluginId)) {
      setActivePluginId(pluginId);
    }
  }, []);

  const openWindow = useCallback(
    async (options: { mode?: ProjectionMode; fullscreen?: boolean } = {}) => {
      const app = getApp();
      if (!app?.visualizer) return;

      const mode = options.mode ?? (embeddedActive ? 'visualizer' : 'page');
      await app.vc?.close();
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

  return {
    embeddedActive,
    activePluginId,
    embeddedPluginId,
    windowPluginId,
    windowOpen,
    windowFullscreen,
    projectionMode,
    canVisualize,
    analyser,
    frequencyData,
    timeDomainData,
    songInfo,
    toggleEmbedded,
    selectPlugin,
    openWindow,
    closeWindow,
    toggleProjection,
    toggleFullscreen,
    dismissVisualizer,
  };
}
