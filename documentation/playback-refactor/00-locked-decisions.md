# Locked Decisions — Playback Refactor

These decisions are fixed for the refactor unless explicitly revisited.

## Architectural rule

Subsystems communicate through **commands**, **snapshots**, and **events** — not by directly modifying each other's state.

> **Input generates commands. UI does not execute behavior.**

## Application subsystems (peers)

Long-lived subsystems sit at application level — not inside individual features:

| Subsystem | Owns |
|-----------|------|
| **Input** | Focus, active window/mode, keyboard mappings, gesture routing, command generation and dispatch to targets |
| **PlaybackSession** | Playback truth, queue cursor, detours, transport policy |
| **VC Mode** | Presentation, workflow, surface, kudos (not playback) |
| **Library** | Playlists, mutations, catalog data |
| **Audio** | MediaCoordinator, effects engine, analyser bus |

**Input** is not part of Playback, VC, or Library. Keyboard, mouse, controller buttons, menus, touch surfaces, and future control surfaces route through Input, which decides what command to emit and which subsystem receives it.

Individual UI components may expose bindings or configuration for UX, but they do **not** own the overall input architecture.

During this refactor, Phase 4 "adapters" are **thin bridges** from today's scattered handlers toward dispatch. Full Input subsystem extraction is documented for later — **out of scope** for Phases 1–7 unless a natural seam appears without broadening scope.

## Command architecture (evolvable)

The [command inventory](./02-command-inventory.md) documents the **product today**, not a permanent protocol.

- Many commands will survive; new ones will be added; some will disappear.
- The goal is a **clean command architecture** that absorbs change without structural churn:
  - Typed command unions per domain (`PlaybackCommand`, future `VcCommand`, etc.)
  - Stable `dispatch` / `getSnapshot` / `subscribe` boundaries
  - Catalog entries map to commands; catalog evolves independently

## Scope constraint

This refactor is **infrastructure only**:

- Preserve existing behavior
- Improve ownership and reduce coupling
- Simplify future development
- **No** unrelated UX or product changes

## PlaybackSession

- **Framework-independent** service (`dispatch`, `getSnapshot`, `subscribe`).
- **App lifetime** — instantiated via `src/playback/createPlaybackSession.ts`, not owned by React.
- Lives in the **main renderer** (not Electron main process).
- Survives VC open/close; queue, position, detours, repeat persist across VC transitions.

## VC Mode boundary

- VC owns **presentation and workflow** (surface, kudos, designer, controller, submission config).
- PlaybackSession owns **playback truth**.
- VC dispatches commands and enables policies; session decides success/failure.
- **Play Lock** is VC-scoped: cleared when VC exits (`vcActive → false`).
- **Special between-song pause** is VC-only behavior:
  - Session: `playbackPhase: 'playing' | 'paused' | 'waiting-for-host'`
  - VC: countdown UI, controller copy (no `secondsRemaining` in session)

## No presentation state in session

- VC layouts, templates, scenes, and similar UI belong to VC Mode (or other presentation managers).
- Session does **not** own "Scene" or surface geometry.

## Playlist / library

- **Playback order** resolved at **next-track decision time** from current library view order (including mid-song sort changes).
- **PlaylistMutation** (library layer) handles add/remove/reorder/delete.
- **Submission playlist protection**: enforced in library mutation layer when `vcActive && defaultSubmissionPlaylistId` set; session/config only exposes flags.

## Audio effects

- **AudioEffectsEngine** (sibling subsystem) owns DSP.
- Session holds **user intent** (effect on/off, preset); engine holds processing and routing.

## Song history

- Event-driven from session events (started, completed, interrupted, on-deck, play-now, partial duration).
- Preserve current rich semantics; do not reduce to "completed only."

## Commands vs events

- Requested command ≠ emitted event.
- Play Lock rejection: structured result, **no** track-change event.
- Load failure: `PLAYBACK_FAILED` (or equivalent) event, not silent no-op.

## Testing strategy

- **Electron-less characterization harness** first; mock media adapters.
- Fast, deterministic policy/transition tests in `shared/playback/` and session impl.
- Electron integration tests deferred unless a gap appears.

## Behavior preservation

- This pass is **infrastructure**, not UX redesign.
- Characterization tests lock existing semantics unless a behavior change is explicitly requested.

## Documentation

- Update canonical docs **incrementally** per phase (see SPRINT-GUIDE.md).
- Do not block implementation on a single big-bang doc pass.
