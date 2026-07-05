import { useMemo } from 'react';

import type { HostContentCatalog } from '@shared/hostContent';
import { resolveVcCellContent } from '@shared/vcMode/contentResolution';
import {
  type VcCellContent,
  type VcHostSlotBinding,
  type VcSongSlotSettings,
  type VcStatePayload,
} from '@shared/vcModeTypes';

import { getVisualizer } from '../visualizers/registry';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';
import { VcResolvedContentView } from './VcResolvedContentView';

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
  const resolved = useMemo(
    () =>
      resolveVcCellContent(content, hostBinding, {
        song: state.currentSong,
        artistName: state.artistName,
        artistPhotoUrl: state.artistPhotoUrl,
        catalog: hostCatalog,
        useFallbacks: state.config.useFallbacks !== false,
        gridDesign: state.config.gridDesign,
      }, songBinding?.overrides),
    [content, hostBinding, songBinding, hostCatalog, state.currentSong, state.artistName, state.artistPhotoUrl, state.config.useFallbacks, state.config.gridDesign],
  );

  if (resolved.kind === 'empty') {
    return <div className="vc-cell-empty" />;
  }

  if (resolved.kind === 'visualizer') {
    const song = state.currentSong;
    const playback = state.playback;
    const plugin = getVisualizer(state.config.visualizerId);
    if (!plugin || !song) return <div className="vc-cell-empty">Visualizer</div>;
    const timeDomain = new Uint8Array(frequencyData.length * 2);
    return (
      <VisualizerPluginHost
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
    );
  }

  return <VcResolvedContentView resolved={resolved} playback={state.playback} />;
}
