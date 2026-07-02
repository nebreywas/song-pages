import { useEffect, useMemo, useState } from 'react';

import type { VcOverlayId, VcStatePayload } from '@shared/vcModeTypes';

import { formatTime } from '../listener/formatTime';

type PraiseHeartsProps = {
  token: number;
};

type Heart = {
  id: number;
  x: number;
  y: number;
  size: number;
  drift: number;
};

/** Random floating hearts for ⌘⌥P praise hotkey. */
export function PraiseHearts({ token }: PraiseHeartsProps) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (token <= 0) return;
    const batch = Array.from({ length: 14 }, (_, index) => ({
      id: token * 100 + index,
      x: 5 + Math.random() * 90,
      y: 10 + Math.random() * 80,
      size: 16 + Math.random() * 22,
      drift: -20 + Math.random() * 40,
    }));
    setHearts(batch);
    const timerId = window.setTimeout(() => setHearts([]), 3000);
    return () => window.clearTimeout(timerId);
  }, [token]);

  return (
    <div className="vc-praise-layer" aria-hidden="true">
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="vc-praise-heart"
          style={
            {
              left: `${heart.x}%`,
              top: `${heart.y}%`,
              fontSize: `${heart.size}px`,
              '--drift': `${heart.drift}px`,
            } as React.CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </div>
  );
}

type VcOverlaysProps = {
  state: VcStatePayload;
  activeOverlay: VcOverlayId | null;
  praiseToken: number;
};

export function VcOverlays({ state, activeOverlay, praiseToken }: VcOverlaysProps) {
  const song = state.currentSong;
  const playback = state.playback;

  const elapsedRemaining = useMemo(() => {
    const elapsed = formatTime(playback.currentTime);
    const remaining = formatTime(Math.max(0, playback.duration - playback.currentTime));
    return `${elapsed} / ${remaining}`;
  }, [playback.currentTime, playback.duration]);

  return (
    <>
      <PraiseHearts token={praiseToken} />

      {activeOverlay === 'remaining' ? (
        <div className="vc-overlay vc-overlay-remaining">{elapsedRemaining}</div>
      ) : null}

      {activeOverlay === 'next' && state.nextSong ? (
        <div className="vc-overlay vc-overlay-next">
          The next song is <strong>{state.nextSong.title}</strong> by {state.nextSong.artist}
        </div>
      ) : null}

      {activeOverlay === 'cover' && song?.coverUrl ? (
        <div className="vc-overlay vc-overlay-center-box">
          <img src={song.coverUrl} alt="" className="vc-overlay-cover-img" />
        </div>
      ) : null}

      {activeOverlay === 'host' && state.hostGraphicUrl ? (
        <div className="vc-overlay vc-overlay-center-box vc-overlay-host-box">
          <img src={state.hostGraphicUrl} alt="VC host" className="vc-overlay-host-img" />
        </div>
      ) : null}

      {activeOverlay === 'songInfo' && song ? (
        <div className="vc-overlay vc-overlay-center-box vc-overlay-info-box">
          <h2>{song.title}</h2>
          {song.year ? <p className="vc-overlay-year">{song.year}</p> : null}
          {song.caption ? <p className="vc-overlay-caption">{song.caption}</p> : null}
          {song.about ? <p className="vc-overlay-about">{song.about}</p> : null}
        </div>
      ) : null}

      {activeOverlay === 'upcoming' && state.upcoming.length ? (
        <div className="vc-overlay vc-overlay-center-box vc-overlay-upcoming-box">
          <h3>Up next</h3>
          <ul>
            {state.upcoming.map((entry) => (
              <li key={entry.id}>
                <span>{entry.title}</span>
                <span>{entry.artist}</span>
                <span>{entry.durationSeconds ? formatTime(entry.durationSeconds) : '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
