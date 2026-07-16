import { useMemo, useRef } from 'react';

import type { HostContentCatalog } from '@shared/hostContent';
import { resolveVcCellContent } from '@shared/vcMode/contentResolution';
import {
  type VcCellContent,
  type VcHostSlotBinding,
  type VcSongSlotSettings,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { getVisualizer } from '../visualizers/registry';
import { isVcYoutubeSong } from '@shared/youtube/youtubeFeature';
import { isVcSoundcloudSong } from '@shared/soundcloud/soundcloudFeature';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';
import { VcResolvedContentView } from './VcResolvedContentView';
import { VcSoundcloudPlayer } from './VcSoundcloudPlayer';
import { VcVisualizerNameBar } from './VcVisualizerNameBar';
import { VcYoutubePlayer } from './VcYoutubePlayer';
import { buildLiveVcResolutionContext } from './vcResolutionContext';
import { useOptionalVcVisualizerRotationContext } from './VcVisualizerRotationContext';

type VcCellContentViewProps = {
  content: VcCellContent;
  hostBinding: VcHostSlotBinding | null;
  songBinding: VcSongSlotSettings | null;
  hostCatalog: HostContentCatalog;
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
  canvasFrame: string | null;
};

export function VcCellContentView({
  content,
  hostBinding,
  songBinding,
  hostCatalog,
  state,
  frequencyData,
  frame,
  canvasFrame,
}: VcCellContentViewProps) {
  const rotation = useOptionalVcVisualizerRotationContext();
  const resolved = useMemo(
    () =>
      resolveVcCellContent(
        content,
        hostBinding,
        buildLiveVcResolutionContext(state, hostCatalog),
        songBinding?.overrides,
      ),
    [
      content,
      hostBinding,
      songBinding,
      hostCatalog,
      state.currentSong,
      state.artistName,
      state.artistBio,
      state.artistPhotoUrl,
      state.playback,
      state.upcoming,
      state.config.useFallbacks,
      state.config.suppressEmbedProviderLyricsMessages,
      state.lyricsSourceReady,
      state.config.gridDesign,
    ],
  );

  if (resolved.kind === 'empty') {
    return <div className="vc-cell-empty" />;
  }

  if (resolved.kind === 'visualizer') {
    const song = state.currentSong;
    const playback = state.playback;
    if (!song) return <div className="vc-cell-empty">Visualizer</div>;

    // Visualizer slot temporarily hosts the YouTube embed for custom-playlist YT tracks.
    if (isVcYoutubeSong(song) && song.youtubeVideoId) {
      return (
        <VcYoutubePlayer
          videoId={song.youtubeVideoId}
          songId={song.id}
          playback={playback}
          mirrorSongId={state.audioMirror?.songId ?? null}
          volume={state.audioMirror?.volume ?? 1}
        />
      );
    }

    // SoundCloud tracks use the provider's waveform visual — no Web Audio tap available.
    if (isVcSoundcloudSong(song) && song.soundcloudPermalink) {
      return (
        <VcSoundcloudPlayer
          permalink={song.soundcloudPermalink}
          songId={song.id}
          playback={playback}
          mirrorSongId={state.audioMirror?.songId ?? null}
        />
      );
    }

    const experienceId =
      rotation?.activeVisualizerId ??
      state.effectiveVisualizerId ??
      state.config.visualizerId;
    const plugin = getVisualizer(experienceId);
    if (!plugin) return <div className="vc-cell-empty">Visualizer</div>;
    const timeDomain = new Uint8Array(frequencyData.length * 2);
    return (
      <div className="vc-visualizer-surface">
        <VisualizerPluginHost
          key={plugin.id}
          surface="window"
          experienceId={plugin.id}
          analyser={null}
          frequencyData={frequencyData}
          timeDomainData={timeDomain}
          isPlaying={playback.isPlaying}
          currentTime={playback.currentTime}
          duration={playback.duration}
          song={{ title: song.title, artist: song.artist, coverUrl: song.coverUrl }}
          frame={frame}
          canvasFrame={canvasFrame}
        />
        <VcVisualizerNameBar
          name={rotation?.nameReveal.name ?? ''}
          visible={rotation?.nameReveal.visible === true}
        />
      </div>
    );
  }

  return (
    <VcResolvedContentView
      resolved={resolved}
      playback={state.playback}
      frequencyData={frequencyData}
      playbackUrl={state.audioMirror?.playbackUrl ?? null}
    />
  );
}
