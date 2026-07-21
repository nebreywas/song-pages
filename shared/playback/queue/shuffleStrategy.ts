/**
 * Pluggable shuffle strategies for playlist + Super Shuffle.
 *
 * - `plain-random` — independent random pick among eligible songs (legacy).
 * - `shuffle-bag` — without-replacement: shuffle IDs once, draw until empty, then
 *   refill (default). Spotify-style “hear everything once before repeats.”
 * - Future: `shuffle-weight` — bias toward popular / high-play songs before 1× coverage.
 *
 * Memory: bags store song **ids** only (numbers). ~20k ids is on the order of
 * a couple hundred KB — fine in Electron. Avoid keeping full song rows in the bag.
 *
 * Strategy selection is internal for now (`ACTIVE_SHUFFLE_STRATEGY`); UI can later
 * read/write the same id without changing draw call sites.
 */

export type ShuffleStrategyId = 'plain-random' | 'shuffle-bag';
// Future: | 'shuffle-weight'

/** Product default — without-replacement across the current pool. */
export const DEFAULT_SHUFFLE_STRATEGY: ShuffleStrategyId = 'shuffle-bag';

/**
 * Active strategy until Settings exposes a picker.
 * Change this (or wire a setting) to A/B other modes without rewriting callers.
 */
export const ACTIVE_SHUFFLE_STRATEGY: ShuffleStrategyId = DEFAULT_SHUFFLE_STRATEGY;

export type ShuffleBagState = {
  /** Identifies the pool (playlist id, `super`, etc.). Mismatch forces a refill. */
  scopeKey: string;
  /** Remaining ids in draw order (index 0 = next). Ids only — not full rows. */
  remainingIds: number[];
  /**
   * Set after the last song of a cycle when repeat is off — blocks refill until
   * the bag is cleared or the scope changes.
   */
  exhausted: boolean;
};

export type ShuffleDrawOptions = {
  scopeKey: string;
  currentSongId?: number | null;
  /** Extra exclusions (detour-consumed, VC session skips, …). */
  excludeIds?: ReadonlySet<number>;
  repeatMode: 'off' | 'one' | 'all';
  random?: () => number;
};

export function createEmptyShuffleBag(scopeKey = ''): ShuffleBagState {
  return { scopeKey, remainingIds: [], exhausted: false };
}

export function clearShuffleBag(bag: ShuffleBagState, scopeKey = ''): void {
  bag.scopeKey = scopeKey;
  bag.remainingIds = [];
  bag.exhausted = false;
}

/** Fisher–Yates shuffle of a copy of `ids`. */
export function shuffleIds(
  ids: readonly number[],
  random: () => number = Math.random,
): number[] {
  const next = ids.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

function withoutExcluded(
  playableIds: readonly number[],
  excludeIds?: ReadonlySet<number>,
): number[] {
  if (!excludeIds?.size) return playableIds.slice();
  return playableIds.filter((id) => !excludeIds.has(id));
}

/**
 * Build a fresh bag. Optionally skip ids so a refill does not immediately
 * re-queue the track that just finished.
 */
export function refillShuffleBag(
  scopeKey: string,
  playableIds: readonly number[],
  options?: {
    excludeIds?: ReadonlySet<number>;
    random?: () => number;
  },
): ShuffleBagState {
  const ids = withoutExcluded(playableIds, options?.excludeIds);
  return {
    scopeKey,
    remainingIds: shuffleIds(ids, options?.random),
    exhausted: false,
  };
}

/**
 * Legacy independent random pick — can repeat songs before the pool is exhausted.
 */
export function pickPlainRandomSongId(
  playableIds: readonly number[],
  options: {
    currentSongId?: number | null;
    excludeIds?: ReadonlySet<number>;
    repeatMode: 'off' | 'one' | 'all';
    random?: () => number;
  },
): number | null {
  const random = options.random ?? Math.random;
  const currentSongId = options.currentSongId ?? null;
  let candidates = withoutExcluded(playableIds, options.excludeIds).filter(
    (id) => id !== currentSongId,
  );

  if (!candidates.length) {
    if (options.repeatMode !== 'all') return null;
    candidates = withoutExcluded(playableIds, options.excludeIds);
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(random() * candidates.length)] ?? null;
}

export type ShuffleDrawResult = {
  songId: number | null;
  bag: ShuffleBagState;
};

/**
 * Draw the next song id for the active strategy.
 * Callers should commit `result.bag` onto their session bag ref.
 */
export function drawShuffledSongId(
  strategy: ShuffleStrategyId,
  playableIds: readonly number[],
  bag: ShuffleBagState,
  options: ShuffleDrawOptions,
): ShuffleDrawResult {
  if (strategy === 'plain-random') {
    return {
      songId: pickPlainRandomSongId(playableIds, options),
      bag,
    };
  }

  return drawFromShuffleBag(playableIds, bag, options);
}

/**
 * Without-replacement draw. Prunes stale / current ids, refills when empty
 * (repeat all), stops when empty (repeat off).
 */
export function drawFromShuffleBag(
  playableIds: readonly number[],
  bag: ShuffleBagState,
  options: ShuffleDrawOptions,
): ShuffleDrawResult {
  const random = options.random ?? Math.random;
  const currentSongId = options.currentSongId ?? null;
  const playableSet = new Set(playableIds);

  const prune = (ids: readonly number[]) =>
    ids.filter((id) => {
      if (!playableSet.has(id)) return false;
      if (options.excludeIds?.has(id)) return false;
      // Already playing — never draw it as “next” within this advance.
      if (currentSongId != null && id === currentSongId) return false;
      return true;
    });

  const scopeChanged = bag.scopeKey !== options.scopeKey;

  // Completed a full pass with repeat off — do not start another cycle.
  if (bag.exhausted && !scopeChanged && options.repeatMode === 'off') {
    return {
      songId: null,
      bag: { scopeKey: options.scopeKey, remainingIds: [], exhausted: true },
    };
  }

  let remaining = prune(bag.remainingIds);

  if (scopeChanged || remaining.length === 0) {
    const refillExclude = new Set<number>(options.excludeIds ?? []);
    if (currentSongId != null) refillExclude.add(currentSongId);

    let refilled = refillShuffleBag(options.scopeKey, playableIds, {
      excludeIds: refillExclude,
      random,
    });
    remaining = prune(refilled.remainingIds);

    // Tiny pool: excluding “current” left nothing — allow a full refill.
    if (!remaining.length && playableIds.length > 0) {
      refilled = refillShuffleBag(options.scopeKey, playableIds, {
        excludeIds: options.excludeIds,
        random,
      });
      remaining = prune(refilled.remainingIds);
    }

    if (!remaining.length) {
      // Sole playable track is already current — loop it when repeat allows.
      if (
        playableIds.length === 1 &&
        currentSongId != null &&
        playableIds[0] === currentSongId &&
        options.repeatMode !== 'off'
      ) {
        return {
          songId: currentSongId,
          bag: { scopeKey: options.scopeKey, remainingIds: [], exhausted: false },
        };
      }
      return {
        songId: null,
        bag: {
          scopeKey: options.scopeKey,
          remainingIds: [],
          exhausted: options.repeatMode === 'off',
        },
      };
    }
  }

  const songId = remaining[0]!;
  const nextRemaining = remaining.slice(1);
  const exhausted = nextRemaining.length === 0 && options.repeatMode === 'off';

  return {
    songId,
    bag: {
      scopeKey: options.scopeKey,
      remainingIds: nextRemaining,
      exhausted,
    },
  };
}

/** Apply a draw result onto a mutable bag held by the session (ref object). */
export function commitShuffleBag(target: ShuffleBagState, next: ShuffleBagState): void {
  target.scopeKey = next.scopeKey;
  target.remainingIds = next.remainingIds;
  target.exhausted = next.exhausted;
}
