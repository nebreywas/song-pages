# Future Enhancements (Out of Scope)

**Not part of the playback refactor (Phases 1–7).**

Documented here so the architecture has a place to land later.

---

## Developer command console

An internal dev page for debugging as subsystems mature:

| Panel | Purpose |
|-------|---------|
| Command catalog | Live view of registered commands + availability context |
| Event catalog | Subscribed event types and recent payloads |
| Playback snapshot viewer | `getSnapshot()` rendered and diffed |
| Live event log | Tail of session / IPC events |
| Command injection | Dispatch test commands with chosen source |
| IPC inspection | Channel traffic (dev only) |
| Session state inspection | Detours, lock flags, media generation |

**Today:** `documentation/playback-refactor/` + characterization tests serve this role well enough.

**When to build:** After PlaybackSession and Input routing are stable (post Phase 7 or alongside Input subsystem extraction).

---

## Input subsystem extraction

Full `src/input/` coordinator — see [06-target-module-tree.md](./06-target-module-tree.md). Consolidates:

- `electron/commands/commandService.js` routing
- VC hotkey and transport IPC ingress
- Global keyboard mappings
- Focus and active-window determination

Does not require playback refactor to complete first, but should **consume** the same command types the refactor introduces.
