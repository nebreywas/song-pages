# Characterization Test Plan

**Phase 0 · Sprint 0.1**

Goal: lock **current behavior** before moving code. Tests run **without Electron**.

## Tier A — Pure functions (`shared/`)

Run with existing test runner (vitest/jest — match project config).

### Already exists

| File | Covers |
|------|--------|
| `shared/listener/playbackQueue.test.ts` | next/prev, shuffle, repeat-all, skipSongIds |
| `shared/vcMode/playLock.test.ts` | play lock guard helpers |

### Add / extend (Phase 0 optional, Phase 1 required)

| Suite | Cases |
|-------|-------|
| `playbackQueue` | repeat-one, empty playlist, all skipped, custom order at decision time |
| `playbackDetours` | `resolveTrackEndAdvance`: interrupt return, on-deck, release-on-next clears lock |
| `playLock` | each command in guard matrix (02-command-inventory) |
| `trackEnd` | special pause does not auto-advance until resume command |
| `submissionPlaylist` | mutation blocked when vcActive + default id (library layer mock) |

### Example case names (copy into test files)

```
playLock rejects NEXT when enabled
playLock allows TOGGLE_PLAY_PAUSE when enabled
release on next clears lock after TRACK_ENDED
repeat-all wrap ignores detour skipSongIds
shuffle repeat-all wraps to unplayed track
pickPrevious wraps on repeat-all
resolveTrackEndAdvance returns interrupt return song
on-deck plays after primary ends when queued
```

## Tier B — Session harness (Phase 3+)

**Location:** `src/playback/__tests__/PlaybackSession.harness.test.ts`

### Mock adapters

```ts
type MockMediaAdapter = {
  load(url: string): Promise<void>;
  play(): void;
  pause(): void;
  seek(t: number): void;
  emitEnded(): void;
  emitError(err: Error): void;
};
```

### Scenario table

| ID | Scenario | Assert |
|----|----------|--------|
| B1 | PLAY_TRACK on row A | snapshot.activeTrackId, TRACK_STARTED event |
| B2 | NEXT with shuffle off | next id per library order |
| B3 | NEXT play lock on | rejected, id unchanged |
| B4 | TRACK_ENDED repeat-all | wraps to first |
| B5 | PLAY_NOW then end | returns to interrupt return |
| B6 | ON_DECK then end primary | plays on-deck |
| B7 | PLAYBACK_FAILED | event, no silent hang |
| B8 | stale load generation | second load wins, no ended from first |
| B9 | waiting-for-host | phase set; NEXT blocked until RESUME |
| B10 | vc exit | playLockEnabled false |
| B11 | playlist reorder mid-song | NEXT uses new order |
| B12 | remove active song | stop or advance per current behavior |

### Harness API

```ts
const session = createPlaybackSessionForTest({
  library: mockLibrary,
  media: mockMedia,
  initialSnapshot?: Partial<PlaybackSnapshot>,
});
session.dispatch({ type: 'NEXT', source: 'player-ui' });
expect(session.getSnapshot().activeTrackId).toBe(expected);
```

## Tier C — Manual / Electron (per sprint in SPRINT-GUIDE)

Not automated in Phase 0. User runs checklist each phase.

## When to write tests

| Phase | Tier A | Tier B |
|-------|--------|--------|
| 0 | optional extensions | — |
| 1 | command/snapshot type guards | — |
| 2 | all policy moves | — |
| 3 | — | harness + B1–B6 |
| 4 | — | B7–B10 |
| 5 | projection pure tests | — |
| 6 | — | media mock scenarios |
| 7 | delete dead code only if A+B green | full suite green |

## CI expectation

Tier A + B run on every PR touching `shared/playback/` or `src/playback/`. No Electron in CI for playback refactor.
