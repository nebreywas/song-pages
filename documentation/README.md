# Song Pages Documentation

**Status:** Canonical index · **Last organized:** 2026-07-10  
**Audience:** Contributors and coding agents — read this before substantial feature work.

---

## Start here (agents)

1. **[design-and-vision.md](./design-and-vision.md)** — Product boundaries, static-first publishing, what Listener vs Artist vs VC are for.
2. **[persistence-philosophy.md](./persistence-philosophy.md)** — **Required before any SQLite/schema work.** Snapshot-First playlists, relationship classes (ownership / snapshot / convenience / cache / derived).
3. **[OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)** — Deferred decisions and audit backlog triggers (not an implementation to-do list).

**Rule:** Assess first. Implement persistence or security changes only when the product benefits today. Archived specs and closed audits live under [archive/](./archive/) for historical context.

---

## Active documentation (root)

### Product & vision

| Document | Use when |
|----------|----------|
| [design-and-vision.md](./design-and-vision.md) | Understanding scope, modes, long-term goals |

### Persistence & settings

| Document | Use when |
|----------|----------|
| [persistence-philosophy.md](./persistence-philosophy.md) | Any schema, FK, migration, or denormalization decision |
| [settings-and-persistence.md](./settings-and-persistence.md) | Settings keys, `userData` paths, backup/test commands |
| [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) | Schema inventory, deletion semantics, closed audit guidance (§18 triggers) |

### Security

| Document | Use when |
|----------|----------|
| [guest-rendering-security.md](./guest-rendering-security.md) | Song page webviews, navigation, CSP |
| [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) | Trust boundaries, shell vs guest, checklist |

### Publishing & manifests

| Document | Use when |
|----------|----------|
| [manifest-schemas.md](./manifest-schemas.md) | `songpages-*.json` contracts, compile output |
| [ffmpeg-compile-prerequisites.md](./ffmpeg-compile-prerequisites.md) | Artist Mode compile (FFmpeg not bundled) |

### Audio & playback

| Document | Use when |
|----------|----------|
| [audio-pipeline.md](./audio-pipeline.md) | **Canonical** — main/mirror/VC audio, Discord capture, debug |
| [audio-systems-baseline.md](./audio-systems-baseline.md) | Effect vocabulary, transport vs graph, encapsulation |

### VC Mode, visualizers, lyrics

| Document | Use when |
|----------|----------|
| [vc-mode-architecture.md](./vc-mode-architecture.md) | VC runtime, IPC, mirror, projection window |
| [visualizer-architecture.md](./visualizer-architecture.md) | Web Audio graph, experiences, Butterchurn |
| [ALARE.md](./ALARE.md) | Approximate lyric line tracking in VC |
| [shared-utilities.md](./shared-utilities.md) | Reusable `shared/` helpers (lyrics, time, markdown) |

---

## Archive

Historical **specs** (MVP design documents), **audits** (completed review deliverables), **investigations** (closed one-off analyses), and **sprints** (proposed work not scheduled) live in [archive/](./archive/).

| Folder | Contents |
|--------|----------|
| [archive/specs/](./archive/specs/) | Original product/MVP specifications (VC designer, kudos, commands, host content, audit specs) |
| [archive/audits/](./archive/audits/) | Application audit report + review comments (frozen security backlog) |
| [archive/investigations/](./archive/investigations/) | Closed technical investigations |
| [archive/sprints/](./archive/sprints/) | Proposed discovery sprints (e.g. audio effects lab) |

Implemented features may still reference archived specs from code (`@see documentation/archive/specs/...`). Prefer **architecture docs** at root for current behavior.

---

## Code ↔ documentation map

| Code area | Primary doc |
|-----------|-------------|
| `electron/database.js`, `electron/listener/*` | persistence-philosophy.md, settings-and-persistence.md |
| `electron/listener/userPlaylists.js` | persistence-philosophy.md (snapshots) |
| `src/audio/*` | audio-pipeline.md, audio-systems-baseline.md |
| `src/vc-mode/*`, `src/vc-window/*` | vc-mode-architecture.md |
| `src/visualizers/*` | visualizer-architecture.md |
| `shared/alare/*`, `shared/lyricsText.ts` | ALARE.md, shared-utilities.md |
| `shared/kudos/*` | archive/specs/kudos-system-1.md (MVP spec) |
| `shared/commands/*` | archive/specs/song-pages-input-control-system.md |
| Guest webview / `electron/guest*` | guest-rendering-security.md |
| `compiler/*` | manifest-schemas.md |

Add `@see documentation/...` in module headers when introducing new cross-cutting subsystems.

---

## Maintenance rules

1. **New persistence** — classify relationship in persistence-philosophy.md terms before proposing FKs or tables.
2. **New settings key** — add row to settings-and-persistence.md.
3. **Shipped MVP spec** — move spec to `archive/specs/`; keep architecture doc at root current.
4. **Closed audit** — move deliverable to `archive/audits/`; leave philosophy/guidance at root.
5. **Do not** grow root with duplicate specs; one canonical architecture doc per subsystem.
6. **Architecture vs spec vs archive** — architecture describes current truth; specs describe work; archive preserves history. When they blur, reorganize.

**Principle:** Assess first; implement only when the product benefits. See OPEN-QUESTIONS.md for deferred items — not an automatic backlog.

---

## Commands & scripts

| Command / script | Doc reference |
|------------------|---------------|
| `npm run backup:db` | [settings-and-persistence.md](./settings-and-persistence.md) |
| `npm run test:db` | [settings-and-persistence.md](./settings-and-persistence.md) |
| `scripts/build-compiler.mjs` | [manifest-schemas.md](./manifest-schemas.md), [ffmpeg-compile-prerequisites.md](./ffmpeg-compile-prerequisites.md) |
| `scripts/generate-butterchurn-catalog.mjs` | [visualizer-architecture.md](./visualizer-architecture.md) |

```bash
npm run backup:db   # before schema work (quit app first)
npm run test:db     # listener DB tests (temp DB only)
```
