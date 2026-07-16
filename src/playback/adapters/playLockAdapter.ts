import type { PlaybackSession } from '../types';

/** VC manager mirrors — controller UI reads React state, not session snapshot directly. */
export type PlayLockVcSync = {
  setPlayLockEnabled: (enabled: boolean) => void;
  setPlayLockReleaseOnNextSong: (enabled: boolean) => void;
};

function syncVcFromSession(session: PlaybackSession, vc: PlayLockVcSync): void {
  const snapshot = session.getSnapshot();
  vc.setPlayLockEnabled(snapshot.playLockEnabled);
  vc.setPlayLockReleaseOnNextSong(snapshot.playLockReleaseOnNext);
}

/** Controller / shortcut play-lock toggles → session dispatch, then mirror to VC state. */
export function dispatchTogglePlayLock(session: PlaybackSession, vc: PlayLockVcSync): void {
  session.dispatch({ type: 'TOGGLE_PLAY_LOCK', source: 'vc-controller' });
  syncVcFromSession(session, vc);
}

export function dispatchTogglePlayLockReleaseOnNext(
  session: PlaybackSession,
  vc: PlayLockVcSync,
): void {
  const current = session.getSnapshot().playLockReleaseOnNext;
  session.dispatch({
    type: 'SET_PLAY_LOCK_RELEASE',
    source: 'vc-controller',
    enabled: !current,
  });
  syncVcFromSession(session, vc);
}

export function dispatchSetPlayLockReleaseOnNext(
  session: PlaybackSession,
  vc: PlayLockVcSync,
  enabled: boolean,
): void {
  session.dispatch({
    type: 'SET_PLAY_LOCK_RELEASE',
    source: 'vc-controller',
    enabled,
  });
  syncVcFromSession(session, vc);
}
