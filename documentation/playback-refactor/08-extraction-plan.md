# Extraction Plan — Phases 0–7 with Deletion Points

**Phase 0 · Sprint 0.1** — **Historical.** Phases 1–7 implemented; see [FINAL-REPORT.md](./FINAL-REPORT.md).

Each phase is **shippable**: app behavior unchanged unless noted.

---

## Phase 0 — Inventory (this folder)

**Deliverables:** `documentation/playback-refactor/*`  
**Production code:** none  
**Delete:** nothing

---

## Phase 1 — Canonical contracts + dispatch facade

**Add:**

- `shared/playback/commands.ts`, `events.ts`, `snapshot.ts`, `results.ts`
- `src/playback/createPlaybackSession.ts` — **stub** delegating to ListenerMode callbacks initially
- `src/playback/adapters/*` — thin wrappers calling existing handlers

**Keep:** all logic in ListenerMode  
**Delete:** nothing yet

**Deletion point (Phase 4):** remove direct `playNext()` calls from PlayerBar once adapter wired.

---

## Phase 2 — Centralize policy in `shared/playback/policies`

**Move:**

- `shared/vcMode/playLock.ts` → `shared/playback/policies/playLock.ts` (re-export old path temporarily)
- Extract repeat/shuffle/on-deck rules from ListenerMode into policy modules
- `playbackQueue.ts` → `shared/playback/queue/planner.ts` (re-export)

**ListenerMode:** call policies instead of inline conditionals  
**Delete (Phase 7):** re-export shims in `shared/listener/` and `shared/vcMode/playLock.ts`

---

## Phase 3 — PlaybackSessionImpl + bootstrap

**Add:** `PlaybackSessionImpl.ts` owning detours, repeat, shuffle, play lock, phase  
**ListenerMode:** subscribe for UI; dispatch instead of mutating `detoursRef` (bridge period: impl updates ref for one phase if needed)  
**Tests:** Tier B harness B1–B6

**Delete (end of Phase 3):** direct `detoursRef` writes outside session (grep `detoursRef.current =`)

---

## Phase 4 — Transport adapters

**Wire:**

- `vc:transport` → `vcTransportAdapter.dispatch`
- `listener:playback-command` → `keyboardAdapter`
- PlayerBar → `playerBarAdapter`

**Delete:**

- `vcTransportHandlersRef` object and resync `useEffect`
- `playLockRef` in ListenerMode — read snapshot instead

---

## Phase 5 — Projections

**Add:** `buildVcStateFromSnapshot.ts`  
**Slim:** `useVcModeManager` — remove `pickNextSongId` duplicate; subscribe to session  
**Special pause:** session sets `waiting-for-host`; VC hook only renders countdown

**Delete:**

- Large `buildStatePayload` input prop list from ListenerMode (replace with snapshot subscription)
- `timingRef` in VC manager if redundant

---

## Phase 6 — MediaCoordinator + AnalyserBus + AudioEffectsEngine

**Extract:** HLS attach, generation, timing from ListenerMode and `useVcPlaybackAudio`  
**Unify:** single analyser tap  
**Session:** emits timing events; coordinator subscribes to snapshot for load URL

**Delete:**

- Duplicate HLS setup blocks (keep thin hooks calling coordinator)
- Dual `useAudioAnalyser` wiring in VC manager + visualizer manager

---

## Phase 7 — Legacy removal

**Delete:**

- Obsolete IPC if consolidated (audit 03-ipc-inventory)
- `useListenerPlaybackCommands` inline switch (if adapters complete)
- Unused refs: `playSongRef`, `playNextRef` indirection if session API stable
- Shim re-exports in old paths

**ListenerMode target size:** composition + library — no `playSong` body (delegates to session + coordinator)

---

## Phase 8 — Documentation (ongoing)

Update per sprint (see SPRINT-GUIDE). Not blocking merges.

---

## Risk mitigations

1. **One phase per PR** where possible  
2. **Characterization tests** before each move  
3. **Feature flag** optional: `USE_PLAYBACK_SESSION` env for parallel run during Phase 3–4  
4. **No behavior change** without explicit test update + user sign-off

## Grep checkpoints

Before closing each phase:

```bash
rg "detoursRef\.current\s*=" src/
rg "vcTransportHandlersRef" src/
rg "playLockRef" src/
rg "playSong\(" src/listener/ListenerMode.tsx
```

Counts should trend down per phase.
