import { useMemo } from 'react';

import { DEFAULT_VISUALIZER_ID } from '@shared/visualizerMessages';

import { SongPageWebview } from '../listener/SongPageWebview';
import { AudioDebugPanel, useAudioDebugHotkey } from '../audio/debug/AudioDebugPanel';
import { defaultVisualizerForSurface, getVisualizer, visualizerSupportsSurface } from '../visualizers/registry';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';
import { useVisualizerIpcStream } from '../visualizers/useVisualizerStream';
import { ProjectorFlowSongPage } from './ProjectorFlowSongPage';
import { ProjectorSoundcloudSongPage } from './ProjectorSoundcloudSongPage';
import { ProjectorSunoSongPage } from './ProjectorSunoSongPage';
import { ProjectorYoutubeTheater } from './ProjectorYoutubeTheater';

/** Projector window — Song Page, FFT Visualizer, or Video theater. */
export function VisualizerWindowApp() {
  const { stream, connected } = useVisualizerIpcStream();
  useAudioDebugHotkey();

  const experienceId = useMemo(() => {
    if (!stream) return DEFAULT_VISUALIZER_ID;
    const experience = getVisualizer(stream.experienceId);
    if (experience && visualizerSupportsSurface(experience, 'window')) {
      return stream.experienceId;
    }
    return defaultVisualizerForSurface('window').id;
  }, [stream]);

  if (!connected) {
    return (
      <div className="visualizer-window-shell visualizer-window-waiting">
        <p>Connecting to Song Pages…</p>
        <p className="visualizer-window-hint">Open Projector from the player menu.</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="visualizer-window-shell visualizer-window-waiting">
        <p>Connected — waiting for content…</p>
        <p className="visualizer-window-hint">Select a song or playlist in the main window.</p>
      </div>
    );
  }

  if (stream.projectionMode === 'video') {
    if (!stream.video || stream.video.provider !== 'youtube') {
      return (
        <div className="visualizer-window-shell visualizer-window-waiting">
          <p>No video ready</p>
          <p className="visualizer-window-hint">Play a YouTube track to use Projector: Video.</p>
        </div>
      );
    }

    return (
      <div className="visualizer-window-shell visualizer-window-video">
        <ProjectorYoutubeTheater
          videoId={stream.video.videoId}
          songId={stream.video.songId}
          isPlaying={stream.isPlaying}
          currentTime={stream.currentTime}
          duration={stream.duration}
          volume={stream.video.volume}
        />
      </div>
    );
  }

  if (stream.projectionMode === 'page') {
    if (stream.nativePage?.kind === 'soundcloud') {
      return (
        <ProjectorSoundcloudSongPage
          page={stream.nativePage}
          fontIncreaseLevel={stream.songPageFontIncreaseLevel ?? 0}
        />
      );
    }
    if (stream.nativePage?.kind === 'flow') {
      return (
        <ProjectorFlowSongPage
          page={stream.nativePage}
          lyricsDisplay={stream.lyricsDisplay}
          fontIncreaseLevel={stream.songPageFontIncreaseLevel ?? 0}
        />
      );
    }
    if (stream.nativePage?.kind === 'suno') {
      return (
        <ProjectorSunoSongPage
          page={stream.nativePage}
          lyricsDisplay={stream.lyricsDisplay}
          fontIncreaseLevel={stream.songPageFontIncreaseLevel ?? 0}
        />
      );
    }

    const url = stream.pageUrl?.trim() || stream.homepageUrl?.trim() || '';
    if (!url) {
      return (
        <div className="visualizer-window-shell visualizer-window-waiting">
          <p>No song page loaded</p>
          <p className="visualizer-window-hint">
            Select a song or playlist homepage in the main window, then open Projector.
          </p>
        </div>
      );
    }

    return (
      <div className="visualizer-window-shell visualizer-window-page">
        <SongPageWebview
          url={url}
          fontIncreaseLevel={stream.songPageFontIncreaseLevel ?? 0}
        />
      </div>
    );
  }

  return (
    <div className="visualizer-window-shell">
      <VisualizerPluginHost
        surface="window"
        experienceId={experienceId}
        analyser={null}
        frequencyData={stream.frequencyData}
        timeDomainData={stream.timeDomainData}
        isPlaying={stream.isPlaying}
        currentTime={stream.currentTime}
        duration={stream.duration}
        song={stream.song}
        frame={stream.frame}
        canvasFrame={stream.canvasFrame}
      />
      <AudioDebugPanel surface="projection" />
    </div>
  );
}
