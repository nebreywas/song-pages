import type { PlaybackSession } from '../types';

/** PlayerBar transport — dispatches commands; does not execute playback logic. */
export function createPlayerBarTransportHandlers(session: PlaybackSession) {
  return {
    onToggleShuffle: () => {
      session.dispatch({ type: 'TOGGLE_SHUFFLE', source: 'player-ui' });
    },
    onPrevious: () => {
      session.dispatch({ type: 'PREVIOUS', source: 'player-ui' });
    },
    onTogglePlayPause: () => {
      session.dispatch({ type: 'TOGGLE_PLAY_PAUSE', source: 'player-ui' });
    },
    onNext: () => {
      session.dispatch({ type: 'NEXT', source: 'player-ui' });
    },
    onCycleRepeat: () => {
      session.dispatch({ type: 'CYCLE_REPEAT', source: 'player-ui' });
    },
    onSeek: (time: number) => {
      session.dispatch({ type: 'SEEK', source: 'player-ui', time });
    },
  };
}
