import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_VISUALIZER_ID,
  VISUALIZER_SETTINGS_KEY,
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
};

export function useVisualizerManager({
  audioRef,
  playingSong,
  isPlaying,
  currentTime,
  duration,
}: UseVisualizerManagerOptions) {
  const [embeddedActive, setEmbeddedActive] = useState(false);
  const [activePluginId, setActivePluginId] = useState(DEFAULT_VISUALIZER_ID);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowFullscreen, setWindowFullscreen] = useState(false);

  const canVisualize = playingSong != null;

  const songInfo = useMemo<VisualizerSongInfo | null>(() => {
    if (!playingSong) return null;
    return {
      title: playingSong.title,
      artist: playingSong.artist_name ?? '',
      coverUrl: playingSong.cover_url,
    };
  }, [playingSong]);

  // Panel and projection are mutually exclusive — only one surface active at a time.
  const analyserEnabled = canVisualize && (embeddedActive || windowOpen);

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
    analyser,
    pluginId: windowPluginId,
    song: songInfo,
    isPlaying,
    currentTime,
    duration,
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
      setEmbeddedActive(false);
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

  const toggleEmbedded = useCallback(() => {
    setEmbeddedActive((value) => {
      const next = !value;
      if (next) {
        void getApp()?.visualizer?.close();
        setWindowOpen(false);
      }
      return next;
    });
  }, []);

  const selectPlugin = useCallback((pluginId: string) => {
    if (getVisualizer(pluginId)) {
      setActivePluginId(pluginId);
    }
  }, []);

  const openWindow = useCallback(async (fullscreen = false) => {
    const app = getApp();
    if (!app?.visualizer) return;
    setEmbeddedActive(false);
    setWindowOpen(true);
    await app.visualizer.open({ fullscreen });
  }, []);

  const closeWindow = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    await app.visualizer.close();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const app = getApp();
    if (!app?.visualizer) return;
    await app.visualizer.setFullScreen(!windowFullscreen);
  }, [windowFullscreen]);

  return {
    embeddedActive,
    activePluginId,
    embeddedPluginId,
    windowPluginId,
    windowOpen,
    windowFullscreen,
    canVisualize,
    analyser,
    frequencyData,
    timeDomainData,
    songInfo,
    toggleEmbedded,
    selectPlugin,
    openWindow,
    closeWindow,
    toggleFullscreen,
  };
}
