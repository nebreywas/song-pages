# Playback Refactor — Phase 0 Reports

**Status:** Phases 1–7 complete · **Last updated:** July 2026  
**Parent plan:** [../ImprovedSongPages-sprint](../ImprovedSongPages-sprint)

This folder holds the Phase 0 deliverables for the Playback Session refactor. Phase 0 reports remain the historical map; **implementation is complete through Phase 7** (Phase 8 = doc alignment).

## Locked decisions (summary)

See [00-locked-decisions.md](./00-locked-decisions.md).

## Reports

| # | Document | Purpose |
|---|----------|---------|
| 0 | [00-locked-decisions.md](./00-locked-decisions.md) | Architectural rules agreed before implementation |
| 1 | [01-state-ownership-inventory.md](./01-state-ownership-inventory.md) | Who owns what today → future owner |
| 2 | [02-command-inventory.md](./02-command-inventory.md) | Every playback-changing action and its path |
| 3 | [03-ipc-inventory.md](./03-ipc-inventory.md) | Channels, payloads, fan-out |
| 4 | [04-projection-map.md](./04-projection-map.md) | Authoritative vs derived UI/VC fields |
| 5 | [05-audio-topology.md](./05-audio-topology.md) | Media elements, HLS, timing, audible routing |
| 6 | [06-target-module-tree.md](./06-target-module-tree.md) | Target file layout after refactor |
| 7 | [07-characterization-test-plan.md](./07-characterization-test-plan.md) | Tier A/B tests + Electron-less harness |
| 8 | [08-extraction-plan.md](./08-extraction-plan.md) | Phased extraction + explicit deletion points |
| 9 | [09-future-enhancements.md](./09-future-enhancements.md) | Dev console, Input extraction (out of scope) |
| — | [FINAL-REPORT.md](./FINAL-REPORT.md) | **Completion summary** — metrics, TODOs, canonical doc index |

## Status

**Phases 1–8 complete** (July 2026). See [FINAL-REPORT.md](./FINAL-REPORT.md) for metrics and backlog.

## How to work through phases

**[SPRINT-GUIDE.md](./SPRINT-GUIDE.md)** — per-phase/sprint:

- Goals and exit criteria  
- What to implement  
- **Testing instructions** (automated + manual)  
- **Review checklist** (what you should verify before merging)  
- Doc updates for that phase  

## Core rules

> Subsystems communicate through **commands**, **snapshots**, and **events** — not by directly modifying each other's state.

> **Input generates commands. UI does not execute behavior.**

Application-level peers: **Input**, **PlaybackSession**, **VC Mode**, **Library**, **Audio**.
