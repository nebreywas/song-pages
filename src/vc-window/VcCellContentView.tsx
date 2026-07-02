import type { VcCellContent, VcStatePayload } from '@shared/vcModeTypes';

import { getVisualizer } from '../visualizers/registry';
import { VisualizerPluginHost } from '../visualizers/VisualizerPluginHost';

type VcCellContentViewProps = {
  content: VcCellContent;
  state: VcStatePayload;
  frequencyData: Uint8Array;
  frame: number;
};

export function VcCellContentView({ content, state, frequencyData, frame }: VcCellContentViewProps) {
  const song = state.currentSong;
  const playback = state.playback;

  if (!content || !song) {
    return <div className="vc-cell-empty" />;
  }

  if (content === 'cover') {
    return song.coverUrl ? (
      <img className="vc-cover-fit" src={song.coverUrl} alt="" />
    ) : (
      <div className="vc-cell-empty">No cover</div>
    );
  }

  if (content === 'host') {
    return state.hostGraphicUrl ? (
      <img className="vc-host-fit" src={state.hostGraphicUrl} alt="VC host" />
    ) : (
      <div className="vc-cell-empty">No host graphic</div>
    );
  }

  if (content === 'lyrics') {
    if (!song.lyrics.trim()) return <div className="vc-cell-empty" />;
    const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0;
    return (
      <div className="vc-lyrics-scroll">
        <div className="vc-lyrics-inner" style={{ transform: `translateY(-${progress * 55}%)` }}>
          {song.lyrics}
        </div>
      </div>
    );
  }

  if (content === 'about') {
    return (
      <div className="vc-about-stack">
        {song.coverUrl ? <img className="vc-about-cover" src={song.coverUrl} alt="" /> : null}
        {song.caption ? <p className="vc-about-caption">{song.caption}</p> : null}
        {song.about ? <div className="vc-about-text">{song.about}</div> : null}
      </div>
    );
  }

  if (content === 'artist') {
    return (
      <div className="vc-artist-stack">
        {state.artistPhotoUrl ? <img className="vc-artist-photo" src={state.artistPhotoUrl} alt="" /> : null}
        <h3 className="vc-artist-name">{state.artistName ?? song.artist}</h3>
        {state.artistBio ? <p className="vc-artist-bio">{state.artistBio}</p> : null}
      </div>
    );
  }

  if (content === 'visualizer') {
    const plugin = getVisualizer(state.config.visualizerId);
    if (!plugin) return <div className="vc-cell-empty">Visualizer</div>;
    const timeDomain = new Uint8Array(frequencyData.length * 2);
    return (
      <VisualizerPluginHost
        surface="window"
        pluginId={plugin.id}
        analyser={null}
        frequencyData={frequencyData}
        timeDomainData={timeDomain}
        isPlaying={playback.isPlaying}
        currentTime={playback.currentTime}
        duration={playback.duration}
        song={{ title: song.title, artist: song.artist, coverUrl: song.coverUrl }}
        frame={frame}
      />
    );
  }

  return <div className="vc-cell-empty" />;
}
