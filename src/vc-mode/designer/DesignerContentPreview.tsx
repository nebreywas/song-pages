/**
 * Lightweight content preview for the Surface designer.
 * Never mounts a live visualizer — uses a placeholder for that source.
 */

import type { VcCellContent, VcStatePayload } from '@shared/vcModeTypes';

type DesignerContentPreviewProps = {
  content: VcCellContent;
  state: VcStatePayload | null;
};

export function DesignerContentPreview({ content, state }: DesignerContentPreviewProps) {
  if (!content) {
    return <div className="vc-designer-preview-empty" />;
  }

  // Never instantiate a second visualizer session in the designer.
  if (content === 'visualizer') {
    return (
      <div className="vc-designer-preview-placeholder vc-designer-preview-visualizer">
        <span>Visualizer</span>
      </div>
    );
  }

  const song = state?.currentSong;

  if (content === 'cover') {
    return song?.coverUrl ? (
      <img className="vc-designer-preview-media" src={song.coverUrl} alt="" />
    ) : (
      <div className="vc-designer-preview-placeholder">Cover</div>
    );
  }

  if (content === 'host') {
    return state?.hostGraphicUrl ? (
      <img className="vc-designer-preview-media" src={state.hostGraphicUrl} alt="" />
    ) : (
      <div className="vc-designer-preview-placeholder">Host</div>
    );
  }

  if (content === 'lyrics') {
    const lyrics = song?.lyrics?.trim();
    return lyrics ? (
      <div className="vc-designer-preview-text">{lyrics.slice(0, 280)}</div>
    ) : (
      <div className="vc-designer-preview-placeholder">Lyrics</div>
    );
  }

  if (content === 'about') {
    return (
      <div className="vc-designer-preview-text">
        {song?.caption ? <strong>{song.caption}</strong> : null}
        <div>{song?.about?.slice(0, 200) || 'About song'}</div>
      </div>
    );
  }

  if (content === 'artist') {
    return (
      <div className="vc-designer-preview-text">
        {state?.artistPhotoUrl ? (
          <img className="vc-designer-preview-avatar" src={state.artistPhotoUrl} alt="" />
        ) : null}
        <div>{state?.artistName ?? song?.artist ?? 'Artist'}</div>
      </div>
    );
  }

  return <div className="vc-designer-preview-placeholder" />;
}
