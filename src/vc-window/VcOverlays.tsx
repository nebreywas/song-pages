import { useMemo } from 'react';

import type { HostContentCatalog } from '@shared/hostContent';
import type { VcOverlayId, VcStatePayload } from '@shared/vcModeTypes';

import { formatTime } from '../listener/formatTime';
import { useHostGraphicPopupUrl } from '../vc-mode/useHostGraphicPopupUrl';
import { VcUpcomingOverlay } from './VcUpcomingOverlay';

type VcOverlaysProps = {
  state: VcStatePayload;
  activeOverlay: VcOverlayId | null;
  hostCatalog: HostContentCatalog;
};

export function VcOverlays({ state, activeOverlay, hostCatalog }: VcOverlaysProps) {
  const song = state.currentSong;
  const playback = state.playback;
  const hostPopupId = state.config.hostGraphicPopupId;
  const catalogHostGraphicUrl = useHostGraphicPopupUrl(
    hostCatalog,
    hostPopupId,
    state.hostGraphicUrl,
  );
  const hostGraphicUrl = catalogHostGraphicUrl ?? state.hostGraphicUrl;

  const elapsedRemaining = useMemo(() => {
    const elapsed = formatTime(playback.currentTime);
    const remaining = formatTime(Math.max(0, playback.duration - playback.currentTime));
    return `${elapsed} / ${remaining}`;
  }, [playback.currentTime, playback.duration]);

  return (
    <>
      {activeOverlay === 'remaining' ? (
        <div className="vc-overlay vc-overlay-remaining">{elapsedRemaining}</div>
      ) : null}

      {activeOverlay === 'next' ? (
        <div className="vc-overlay vc-overlay-next">
          {state.nextSong ? (
            <>
              The next song is <strong>{state.nextSong.title}</strong> by {state.nextSong.artist}
            </>
          ) : (
            <span>No next song in queue.</span>
          )}
        </div>
      ) : null}

      {activeOverlay === 'cover' ? (
        <div className="vc-overlay vc-overlay-center-box">
          {song?.coverUrl ? (
            <img src={song.coverUrl} alt="" className="vc-overlay-cover-img" />
          ) : (
            <p className="vc-overlay-empty-message">No cover art for the current song.</p>
          )}
        </div>
      ) : null}

      {activeOverlay === 'host' ? (
        <div className="vc-overlay vc-overlay-center-box vc-overlay-host-box">
          {!hostPopupId ? (
            <p className="vc-overlay-empty-message">No host graphic selected in VC Settings.</p>
          ) : hostGraphicUrl ? (
            <img src={hostGraphicUrl} alt="VC host" className="vc-overlay-host-img" />
          ) : (
            <p className="vc-overlay-host-status">Loading host graphic…</p>
          )}
        </div>
      ) : null}

      {activeOverlay === 'songInfo' ? (
        <div className="vc-overlay vc-overlay-center-box vc-overlay-info-box">
          {song ? (
            <>
              <h2>{song.title}</h2>
              {song.year ? <p className="vc-overlay-year">{song.year}</p> : null}
              {song.caption ? <p className="vc-overlay-caption">{song.caption}</p> : null}
              {song.about ? <p className="vc-overlay-about">{song.about}</p> : null}
            </>
          ) : (
            <p className="vc-overlay-empty-message">No song is loaded.</p>
          )}
        </div>
      ) : null}

      {activeOverlay === 'upcoming' ? (
        <VcUpcomingOverlay songs={state.upcoming} settings={state.config.upcomingOverlay} />
      ) : null}
    </>
  );
}
