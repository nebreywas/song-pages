import { useEffect, useState } from 'react';

import type { PlaybackSnapshot } from '@shared/playback';

import type { PlaybackSession } from '../types';

/** React read hook — session remains authoritative; this only subscribes. */
export function usePlaybackSnapshot(session: PlaybackSession | null): PlaybackSnapshot | null {
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(() =>
    session ? session.getSnapshot() : null,
  );

  useEffect(() => {
    if (!session) {
      setSnapshot(null);
      return;
    }
    return session.subscribe(setSnapshot);
  }, [session]);

  return snapshot;
}
