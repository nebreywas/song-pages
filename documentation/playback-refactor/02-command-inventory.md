# Playback Command Inventory

**Phase 0 · Sprint 0.1** — **Historical.** Current flow: [playback-session-architecture.md](../playback-session-architecture.md).

Maps user/system actions that affect or query playback **as the product exists today**.

> This is a **snapshot**, not a fixed protocol. Commands will be added, renamed, and removed over time. What must stay stable is the **architecture**: Input generates commands → subsystems dispatch/handle → snapshots and events flow out. See [00-locked-decisions.md](./00-locked-decisions.md).

**Target (this refactor):** playback-changing actions become `PlaybackCommand` dispatches. Non-playback commands (VC overlays, kudos, layout) remain separate command domains routed by Input.

## Transport commands (change trajectory)

| Action | Source(s) today | Handler today | Target command |
|--------|-----------------|---------------|----------------|
| Play / pause | PlayerBar, VC transport, spacebar? | `togglePlayPause` | `TOGGLE_PLAY_PAUSE` |
| Previous | PlayerBar, VC transport | `playPrevious` | `PREVIOUS` |
| Next | PlayerBar, VC transport | `playNext` | `NEXT` |
| Seek | PlayerBar, VC transport | `handleSeek` | `SEEK` |
| Play song (by id) | VC transport, upcoming UI | `playSong` | `PLAY_TRACK` |
| Double-click row | PlaylistTable | `playSong` userInitiated | `PLAY_TRACK` |
| Double-click playlist | Sidebar | `handlePlaylistDoubleClick` | `PLAY_TRACK` (first playable) |
| Play Now (context) | PlaylistRowContextMenu | `handlePlayNowFromContext` | `PLAY_NOW` |
| Put On Deck | Context menu | `handlePutOnDeckFromContext` | `QUEUE_ON_DECK` |
| Dismiss On Deck | PlayerBar | `dismissOnDeck` | `DISMISS_ON_DECK` |
| Play Next Song (special pause) | Controller, command service | `playNextAfterPause` | `RESUME_AFTER_WAIT` |
| Cycle repeat | PlayerBar | `cycleRepeat` | `CYCLE_REPEAT` |
| Toggle shuffle | PlayerBar | `setShuffle` | `TOGGLE_SHUFFLE` |
| Volume delta | Command service | `useListenerPlaybackCommands` | `VOLUME_DELTA` |
| Visualizer step | Command service | `useListenerPlaybackCommands` | `VISUALIZER_STEP` (not session?) |

## Policy / VC commands (change policy, not always track)

| Action | Source(s) | Handler today | Target command |
|--------|-----------|---------------|----------------|
| Toggle Play Lock | Controller, command service | IPC → `useVcModeManager` | `SET_PLAY_LOCK` / `TOGGLE_PLAY_LOCK` |
| Toggle release on next | Controller | IPC → VC manager | `SET_PLAY_LOCK_RELEASE` |
| Toggle play lock (shortcut) | `toggle-play-lock` catalog | commandService → main | same |

## Media lifecycle (system)

| Action | Source | Handler today | Target event |
|--------|--------|---------------|--------------|
| Track natural end (HLS) | `audio` ended | `handleTrackNaturalEnd` | `TRACK_ENDED` → planner |
| YouTube ended (main) | YoutubePlayer | widget handler | `TRACK_ENDED` |
| YouTube ended (VC) | VC transport | `handleTrackNaturalEnd` | `TRACK_ENDED` |
| SoundCloud ended | same pattern | same | `TRACK_ENDED` |
| Load failure | HLS/error handlers | `handlePlaybackFailure` | `PLAYBACK_FAILED` |
| Stale load callback | generation guard | ignored | — |

## DJ / command service (main window)

From `MAIN_PLAYBACK_BY_COMMAND` in `electron/commands/commandService.js`:

| Command ID | Maps to |
|------------|---------|
| `seek-back-500` … `seek-back-5s` | `seekRelative` |
| `stutter-500` … `stutter-2000` | `stutter` |
| `play-next-song` | `playNextAfterPause` or `NEXT` |
| `volume-up` / `volume-down` | volume delta |
| `visualizer-next` / `visualizer-previous` | visualizer step |

## VC hotkeys (presentation, not playback session)

Routed via `vc:hotkey` — overlays, visualizer rotate, layout mode, ALARE speed, kudos. **Stay in VC shell** unless they imply playback (document separately in projection map).

## Playlist mutations (library layer — not PlaybackCommand)

| Action | Handler | Session notification |
|--------|---------|----------------------|
| Reorder songs | `handlePlaylistReorder` | `onQueueChanged` |
| Remove song | `handlePlaylistSongRemove` | may stop/advance if active |
| Add external song | AddSong / submission paste | `onQueueChanged` |
| Delete playlist | `handleConfirmRemoveLibraryPlaylist` | protection check |
| Change sort column | `setSortColumn` | affects **next** pick only |

## Natural end planner (internal)

`resolveTrackEndAdvance` in `shared/playback/detours/state.ts` — not a user command; invoked after `TRACK_ENDED` when not in `waiting-for-host`.

## Play Lock guard matrix (target policy tests)

| Command | Play Lock on | Release on next |
|---------|--------------|-----------------|
| `NEXT` | reject | — |
| `PREVIOUS` | reject | — |
| `PLAY_TRACK` (other song) | reject | — |
| `PLAY_NOW` | reject | — |
| `QUEUE_ON_DECK` | reject | — |
| `TOGGLE_PLAY_PAUSE` (current) | allow | — |
| `SEEK` | allow | — |
| Natural `TRACK_ENDED` | allow advance | may clear lock |
| Playlist reorder | allow (library) | — |

## Command sources (canonical)

```ts
type PlaybackCommandSource =
  | 'player-ui'
  | 'vc-surface'
  | 'vc-controller'
  | 'keyboard'
  | 'context-menu'
  | 'system'
  | 'external';
```

Map today → target:

| Today | Source |
|-------|--------|
| PlayerBar | `player-ui` |
| VcTransportBar | `vc-surface` |
| Controller buttons | `vc-controller` |
| Global shortcuts | `keyboard` |
| Context menus | `context-menu` |
| Track end / load fail | `system` |
| Future connectors | `external` |
