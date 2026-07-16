# Sprint Guide — Testing & Review by Phase

**For:** implementer (you) + reviewer  
**Rule:** Do not start Phase N+1 until Phase N review checklist is signed off.

---

## Phase 0 — Inventory (Sprint 0.1)

### Goals

- Document current architecture (this folder).
- No production behavior changes.

### What you implement

- Read all reports in `documentation/playback-refactor/`.
- Optionally add Tier A tests listed in [07-characterization-test-plan.md](./07-characterization-test-plan.md).

### Automated testing

```bash
npm test
# or project-specific test command — ensure existing suites pass:
# shared/listener/playbackQueue.test.ts
# shared/vcMode/playLock.test.ts
```

### Manual smoke (baseline before refactor)

Run dev build, confirm these still work (note results in your phase response):

1. Play a catalog song; pause/resume; seek.
2. Next / Previous with shuffle off and on.
3. Repeat one / all / off — verify wrap behavior.
4. Open VC — audio audible from VC window; main muted.
5. VC transport: play/pause, seek, next/previous.
6. Play Lock on — next/play-other blocked; pause works.
7. 1 Song + Play Lock — auto-release after natural end.
8. Play Now + On Deck from context menu.
9. Special play style pause — countdown / host wait.
10. YouTube or SoundCloud track end advances queue.
11. Reorder playlist during playback — next track follows new order.
12. Submission playlist: paste URL in controller when configured.

### Review checklist

- [ ] Reports match your understanding of the app.
- [ ] Any inaccuracy flagged with file/line references.
- [ ] Locked decisions in [00-locked-decisions.md](./00-locked-decisions.md) still acceptable.
- [ ] Tier A test gaps you care about are noted for Phase 1.

### Doc updates

- None required beyond this folder.

---

## Phase 1 — Contracts + dispatch facade

### Goals

- `PlaybackCommand`, `PlaybackEvent`, `PlaybackSnapshot` types exist.
- `createPlaybackSession()` returns facade that **delegates to current ListenerMode** (no behavior change).

### What you implement

- Files under `shared/playback/` (commands, events, snapshot, results).
- Stub `src/playback/createPlaybackSession.ts` + `usePlaybackSnapshot` hook.
- Optional: one adapter path (e.g. PlayerBar next → `dispatch({ type: 'NEXT' })` → existing `playNext`).

### Automated testing

```bash
npm test
# Add type-level or minimal unit tests for command discriminated unions if helpful.
```

### Manual testing

Repeat **Phase 0 smoke items 1–4**. If adapter wired, verify Next still advances.

### Review checklist

- [ ] No duplicate playback logic in facade — only delegation.
- [ ] Command `source` field populated on new dispatch paths.
- [ ] ListenerMode still works if session not mounted (fallback).

### Doc updates

- Add `documentation/playback-session-architecture.md` skeleton referencing contracts.

---

## Phase 2 — Policy centralization

### Goals

- Play lock, queue, detour, track-end logic live in `shared/playback/policies` and `queue/`.
- ListenerMode imports policies; behavior identical.

### What you implement

- Move `playLock`, queue planner, detour resolution per [08-extraction-plan.md](./08-extraction-plan.md).
- Re-export old paths for one release if needed.
- Extend Tier A tests per [07-characterization-test-plan.md](./07-characterization-test-plan.md).

### Automated testing

```bash
npm test -- shared/playback shared/listener shared/vcMode
```

All new policy tests must pass. Old test files may re-export or import new paths.

### Manual testing

Phase 0 smoke **items 2, 3, 6, 7, 8, 9** focused on edge cases:

- Repeat-all + detour skip list (forward wrap).
- Play lock + natural end + 1 Song.
- On Deck plays after current ends.
- Special pause blocks auto-advance until controller "Play Next Song" or timer.

### Review checklist

- [ ] `rg "detoursRef" src/listener/ListenerMode.tsx` — still present but logic calls shared policies.
- [ ] No behavior change without updated test.
- [ ] Re-exports documented for deprecation.

### Doc updates

- Note policy module paths in `playback-session-architecture.md`.

---

## Phase 3 — PlaybackSessionImpl

### Goals

- Session owns detours, play lock, phase, repeat, shuffle.
- Tier B harness covers B1–B6.

### What you implement

- `PlaybackSessionImpl.ts` + test harness.
- ListenerMode subscribes; gradual migration of `detoursRef` ownership.

### Automated testing

```bash
npm test -- src/playback
```

Harness scenarios B1–B6 green.

### Manual testing

Full Phase 0 smoke suite.

**Extra:**

- Dev reload (Cmd+R) — document that play lock resets (dev only).
- Rapid double-click different songs — no stale track audio.

### Review checklist

- [ ] `detoursRef` mutations only inside session (grep checkpoint).
- [ ] Snapshot matches UI for playing song, on-deck, lock flags.
- [ ] Events emitted for track start/end (even if history still old path).

### Doc updates

- `playback-session-architecture.md` — snapshot fields, event list.

---

## Phase 4 — Transport adapters

### Goals

- VC transport, keyboard commands, PlayerBar → `dispatch` only.
- Remove `vcTransportHandlersRef` and `playLockRef`.

### What you implement

- `src/playback/adapters/vcTransportAdapter.ts`
- `keyboardAdapter.ts`, `playerBarAdapter.ts`
- Wire IPC listeners once at bootstrap.

### Automated testing

```bash
npm test -- src/playback
# Extend harness B7–B10 (stale load, waiting-for-host, vc exit)
```

### Manual testing

Phase 0 smoke **items 4, 5, 6, 7** plus:

- Global shortcuts: seek-back, stutter, volume, play-next-song during special pause.
- Controller Play Lock / 1 Song buttons.
- `toggle-play-lock` command from command mapper.

### Review checklist

- [ ] No `vcTransportHandlersRef` in codebase.
- [ ] Play lock toggles from all three paths (controller, IPC, shortcut).
- [ ] Rejected commands do not change `activeTrackId`.

### Doc updates

- `03-ipc-inventory.md` — mark migrated channels.

---

## Phase 5 — Projections

### Goals

- `buildVcStateFromSnapshot` replaces monolithic `buildStatePayload` inputs.
- `useVcModeManager` slimmed.
- `specialPlayPause` UI driven by `playbackPhase === 'waiting-for-host'`.

### What you implement

- `src/playback/projections/buildVcStateFromSnapshot.ts`
- `buildCommandRuntimeContextFromSnapshot.ts`
- Refactor VC manager to `session.subscribe`.

### Automated testing

```bash
npm test -- src/playback/projections shared/commands/runtimeContext
```

Add projection unit tests: given fixture snapshot + mock library → expected `VcStatePayload` slices.

### Manual testing

Phase 0 smoke **items 4, 5, 9** plus:

- VC designer preview still renders.
- Controller overlay availability (next, upcoming) matches queue.
- Lyrics placeholder waits for `lyricsSourceReady` behavior.

### Review checklist

- [ ] VC state push rate acceptable (no visible flicker).
- [ ] `deriveCommandRuntimeContextFromVcState` callers migrating to snapshot version.
- [ ] No duplicate `pickNextSongId` in VC manager.

### Doc updates

- `vc-mode-architecture.md` — projection from session.

---

## Phase 6 — Audio rationalization

### Goals

- MediaCoordinator, AnalyserBus, AudioEffectsEngine extracted.
- Single timing authority; graceful load failure.

### What you implement

- `src/audio/MediaCoordinator.ts`, `AnalyserBus.ts`, `AudioEffectsEngine.ts`
- Migrate HLS from ListenerMode + `useVcPlaybackAudio`.

### Automated testing

```bash
npm test -- src/playback src/audio
```

Media mock in harness for B7–B8.

### Manual testing

Phase 0 smoke **items 1, 4, 10** plus:

- Visualizer FFT active with VC open.
- Effects Lab audible on VC capture path.
- Force bad URL — verify skip/error matches prior behavior.
- Screen capture / OBS hears VC audio with effects.

### Review checklist

- [ ] One analyser attachment per mirror element (grep `useAudioAnalyser`).
- [ ] Main muted / VC audible unchanged when VC open.
- [ ] `audio-pipeline.md` drift resolved.

### Doc updates

- `documentation/audio-pipeline.md` — full rewrite.
- `vc-mode-architecture.md` — mute behavior.

---

## Phase 7 — Legacy deletion

### Goals

- Remove shims, duplicate refs, obsolete handlers.
- ListenerMode is composition + library.

### What you implement

- Deletions per [08-extraction-plan.md](./08-extraction-plan.md).
- Final grep checkpoints all clean.

### Automated testing

```bash
npm test
```

Full Tier A + B green.

### Manual testing

**Full Phase 0 smoke suite** on packaged build if possible (not only dev).

### Review checklist

- [ ] `playSong(` implementation not in ListenerMode (or < 20 lines delegate).
- [ ] No `playLockRef`, `vcTransportHandlersRef`, `detoursRef` in ListenerMode.
- [ ] Line count of ListenerMode trending down materially.

### Doc updates

- All architecture docs aligned (Phase 8 complete).

---

## Phase 8 — Documentation (continuous)

After each phase, update:

| Doc | When |
|-----|------|
| `playback-session-architecture.md` | Phases 1, 3, 5 |
| `audio-pipeline.md` | Phase 6 |
| `vc-mode-architecture.md` | Phases 5–6 |
| `playback-refactor/README.md` | Mark phase complete |

---

## How to respond after each sprint

Reply with:

1. **Phase number** completed.
2. **Automated test output** (pass/fail).
3. **Manual smoke** — pass/fail per numbered item; notes on failures.
4. **Review checklist** — checked items; blockers.
5. **Doc deltas** — what you changed.
6. **Questions / revisions** to locked decisions if any.

I will use your response to adjust the next phase plan or fix reports before you proceed.
