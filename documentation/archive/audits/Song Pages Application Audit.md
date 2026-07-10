> **Archived** (2026-07-10). Active docs: [../../README.md](../../README.md).

# Song Pages Application Audit

**Date:** 2026-07-08  
**Spec:** [ApplicationAuditSpec.md](./ApplicationAuditSpec.md)  
**Review:** [audit-review-comments.md](./audit-review-comments.md) · [audit-review-comments2.md](./audit-review-comments2.md)  
**Status:** **Revision 2 (frozen)** — canonical audit plan; approve implementation commits individually  
**Method:** Code-path analysis, cross-reference with existing docs; packaged macOS verification delegated to maintainer

---

## Executive Summary

Song Pages has a **sound intentional split** between a trusted Electron shell (React + preload + main) and **well-hardened guest song-page webviews**. Guest isolation, navigation policy, and compiler-baked CSP on published sites are mature. The main architectural risks are not “missing Electron best practices” but **gaps at the trust boundary between the trusted shell and privileged main-process capabilities**.

### Top findings (priority order)

| # | Finding | Priority | Scope |
|---|---------|----------|-------|
| 1 | Main-process fetch IPC (`fetchSongManifest`, `probeSongAvailability`) accepts URLs without purpose-specific policy — SSRF-style probing if renderer compromised | **P0/P1-high** | small (after policy matrix) |
| 2 | Compile IPC can accept renderer-supplied `fileMap` / `outputRoot` without trusted-root validation — FFmpeg path trust parity gap vs dev API | **P0** | small (after root inventory) |
| 3 | **Trusted windows lack navigation handlers** (`will-navigate`, `setWindowOpenHandler`) while shell uses `webSecurity: false` + broad preload — escalates if shell XSS/navigation occurs | **P1-high** | small–medium |
| 4 | Shell `webSecurity: false` + `sandbox: false` — **architectural security debt** (risk multiplier, not standalone exploitable bug today) | **P1 debt** | medium (mitigation backlog) |
| 5 | Full preload API on VC, visualizer, controller windows — unnecessary privilege surface | **P1** | medium |
| 6 | `hostContent` path containment missing (`../` traversal) | **P1** | small |
| 7 | `listener:bindSongPageGuest` does not verify guest webview identity | **P1** | small |
| 8 | Guest `openExternal` without scheme filter (contrast: `app:openExternal` validates http(s)) | **P1** | small |
| 9 | VC FFT uses `Array.from(scratch)` at ~60 Hz (visualizer path already uses `Uint8Array`) | **P1** | small |
| 10 | Butterchurn JPEG-in-IPC — **measure before fix** | **P1-investigate** | medium |
| 11 | HLS mirror cleanup gap on unmount | **P1** | small |
| 12 | `ListenerMode` timeupdate → React state ~4 Hz — **profile before refactor** | **P2 / P1-investigate** | medium |
| 13 | FFmpeg not bundled — release-readiness gap | **P1** | medium (docs + UX) |

### What is already working well

- **Guest webviews:** separate partition, sandbox, no preload, permission denial, download block, same-origin navigation policy ([guest-rendering-security.md](./../../guest-rendering-security.md)).
- **Preload pattern:** single `contextBridge.exposeInMainWorld('app', …)` with subscription cleanup — no raw `ipcRenderer` export.
- **Audio architecture:** authoritative main `<audio>`, mirror for Web Audio only, macOS capture constraint documented and enforced (`AudioServiceOutOfProcess` disabled).
- **Custom cache protocol:** path traversal guard under cache entry dirs; used for offline playback.
- **Command system:** centralized main-process dispatch with availability gating (ALARE/input bindings) — good foundation.
- **VC Mode:** treated as near-1.0; no structural refactor recommended in this pass.

### Recommended next-sprint sequence (after approval)

1. **Small security fixes first:** hostContent containment, guest bind verification, guest scheme filter, mirror HLS cleanup.
2. **Policy-backed hardening:** purpose-specific URL policy (P0-1), compile trusted-root parity (P0-2).
3. **Trusted-window navigation guards** + shell mitigation backlog (P1).
4. **Playback IPC:** VC FFT `Uint8Array` parity; Butterchurn measurement before remediation.
5. **VC/stream:** document lifecycle; preload split as serious P1 slice (not before small fixes).
6. **Packaging:** FFmpeg docs + maintainer checklist.
7. **Scale / perf:** profiling tests; defer ListenerMode refactor and list virtualization until evidence.

### Audit posture

This pass is **code-path analysis + documented risk**, not full benchmarking. Scale thinking uses **~5,000 songs / ~50 subscribed artists** as stress targets without premature optimization. macOS is primary; Windows secondary unless code paths are obviously cross-platform-sensitive.

---

## Proposed P0 Hotfixes

> **Instructions:** Approve items individually before implementation. Each is designed as an independent, testable slice.

### P0-1: Main-process fetch URL policy

**Problem:** `listener:fetchSongManifest` and `listener:probeSongAvailability` perform `fetch()` on renderer-supplied URLs without purpose-specific restrictions (`electron/ipc.js`).

**Prerequisite:** Purpose-specific policy matrix — see [Appendix: URL Policy Matrix](#appendix-url-policy-matrix-pre-implementation). Do **not** implement a blanket localhost/private-network deny without purpose context.

**Proposed fix:** Shared `validateRemoteUrl(url, { purpose })` applied at IPC boundary; fetch modules call validator before `fetch()`.

**Verification:** Unit tests per purpose; manual subscribe, cache populate, Suno adapter, manifest fetch, probe.

**Regression risk:** Medium if policy too aggressive — matrix review required first.

**Approve:** ☐ Yes ☐ No ☐ Discuss (after matrix review)

---

### P0-2: Compile IPC path trust (Electron parity with dev API)

**Problem:** `artist:compile` IPC accepts optional `payload.fileMap` and `payload.outputRoot` (`electron/compiler-bridge.js`). Dev compile API uses `resolveTrustedLocalPath()` (`compiler/localPathResolve.ts`); Electron bridge bypasses it. **Note:** Current UI sends `{ manifest }` only (`src/artist/compileArtistPage.ts`) — gap is IPC-exploitable, not normal UI.

**Prerequisite:** Trusted-root inventory — see [Appendix: Compile Trusted Roots](#appendix-compile-trusted-roots-pre-implementation).

**Proposed fix:** Always build file map from manifest through trusted-path resolver; validate `outputRoot` against trusted write roots; reject arbitrary renderer paths.

**Verification:** Normal artist compile; devtools invoke with bad paths rejected; future picker-based export still works if wired.

**Regression risk:** Low for current UI.

**Approve:** ☐ Yes ☐ No ☐ Discuss (after root inventory)

---

### P1-ARCH: Shell `webSecurity: false` / `sandbox: false` mitigation backlog

**Classification:** **P1 architectural security debt.** Escalates to **P0** if trusted-shell navigation to remote content, shell injection, or preload-on-untrusted-content becomes possible.

**Why not P0 today:** Remote song pages run in **guest webviews** (sandboxed, no preload). Shell relaxations support HLS/CDN and `<webview>` parent rendering — see [security-model-and-completed-actions.md](./../../security-model-and-completed-actions.md).

**Proposed fix (this slice):** Track mitigation backlog only — no behavior change:

1. Per-window preload narrowing (P1-1)
2. Trusted-window navigation guards (P1-NAV)
3. Main-process media proxy where feasible (future)
4. Re-evaluate parent sandbox when Electron/webview allows

**Approve backlog tracking:** ☐ Yes ☐ No ☐ Discuss

---

## P0 / P1 Quick Map

| ID | Area | P | Scope | Implement now? |
|----|------|---|-------|----------------|
| P0-1 | Fetch URL policy (purpose-specific) | P0/P1-high | small | After matrix approval |
| P0-2 | Compile path trust | P0 | small | After root inventory |
| P1-ARCH | Shell security debt backlog | P1 debt | — | Track only |
| P1-NAV | Trusted-window navigation guards | P1-high | small–medium | Recommended |
| P1-1 | Per-window preload split | P1 | medium | After small fixes |
| P1-2 | hostContent path containment | P1 | small | **Approve first** |
| P1-3 | Guest bind webContents verification | P1 | small | **Approve first** |
| P1-4 | Guest `openExternal` scheme filter | P1 | small | **Approve first** |
| P1-5 | VC FFT `Uint8Array` IPC | P1 | small | After IPC verify |
| P1-6 | Butterchurn IPC | P1-investigate | medium | Measure first |
| P1-7 | ListenerMode transport extraction | P2 / investigate | medium | Profile first |
| P1-8 | Mirror HLS unmount cleanup | P1 | small | **Approve first** |
| P1-9 | IPC validation layer (no Zod yet) | P1 | medium | Ask before Zod |
| P1-10 | FFmpeg packaging/docs | P1 | medium | Recommended |
| P1-11 | Logging coverage expansion | P1 | medium | After security |

---

## A. Architecture Map (Current State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Electron Main Process                              │
│  main.js — lifecycle, userData pin, cache scheme, menu, window refs           │
│  ipc.js — ~70 ipcMain.handle + ipcMain.on channels                          │
│  database.js — SQLite (better-sqlite3, asarUnpack)                          │
│  logger.js — daily file logs, exportLogs()                                  │
│  listener/* — subscribe, library, cache, playlists, guest session           │
│  compiler-bridge.js — TS compile service (bundle.cjs when packaged)         │
│  hostContent.js — VC host media in userData                                 │
│  commands/commandService.js — globalShortcut, gate, dispatch                │
│  vcWindow.js / visualizerWindow.js / controllerWindow.js — secondary wins   │
└─────────────────────────────────────────────────────────────────────────────┘
         ▲ IPC invoke/on                    │ fs, fetch, execFile(ffmpeg)
         │                                   ▼
┌────────────────┐              ┌────────────────────────────────────────────┐
│ electron/      │  contextBridge│  Renderer windows (Vite → dist/)          │
│ preload.js     │──────────────▶│  • Main: ListenerMode + Artist compile   │
│ window.app     │              │  • VC: VcWindowApp                        │
└────────────────┘              │  • Visualizer: VisualizerWindowApp        │
                                │  • Controller: transport overlay          │
                                └────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            SongPageWebview            EmbeddedVisualizerHost      useVcModeManager
            (guest webview)            Butterchurn / native        IPC → VC window
            sandbox partition          canvas / WebGL              useVcPlaybackAudio
```

### Main process responsibilities

| Responsibility | Location | Notes |
|----------------|----------|-------|
| App lifecycle | `electron/main.js` | macOS audio-in-process flag for capture |
| IPC hub | `electron/ipc.js` | Listener, artist, VC, visualizer, commands, settings |
| SQLite | `electron/database.js` | Artists, songs, cache, playlists, settings, kudos |
| Remote catalog ingest | `electron/listener/subscribe.js` | http(s) only on subscribe URL |
| Asset cache | `electron/listener/cacheManager.js` | Background populate; main-loop async |
| Custom protocol | `electron/listener/cache/protocol.js` | `songpages-cache://` — readFile serve |
| Guest hardening | `guestSession.js`, `guestSecurity.js` | Permissions, navigation, external open |
| Compile/publish | `compiler-bridge.js` → `compiler/*` | FFmpeg via PATH; not bundled |
| Commands / shortcuts | `commands/commandService.js` | Gate pattern, VC runtime context |
| Host content FS | `hostContent.js` | Import graphics/video for VC |

### Preload

- **File:** `electron/preload.js`
- **Exposure:** `window.app` — listener, artist, VC, visualizer, settings, logs, commands, hostContent
- **Pattern:** Capability-oriented invoke wrappers; `on*` returns unsubscribe
- **Gap:** Same surface on all four window types

### Renderer (by entry)

| Entry | HTML | Primary role |
|-------|------|--------------|
| Main | `src/index.html` → `dist/index.html` | Listener, artist compile UI, settings |
| VC | `src/vc-window/vc.html` | Broadcast surface + slave audio |
| Visualizer | `src/visualizer-window/visualizer.html` | Projection / external display |
| Controller | `src/controller-window/controller.html` | VC transport overlay |

### Audio engine

| Component | Role |
|-----------|------|
| `ListenerMode.tsx` `audioRef` | Authoritative audible playback |
| `analyserAudioRef` + `useAnalyserPlaybackMirror` | Hidden mirror; HLS duplicate when enabled |
| `src/audio/graph/*` | Web Audio: FX, AnalyserNode, Butterchurn tap |
| `useVcPlaybackAudio` | VC window `<audio>` for capture; sync via IPC |
| HLS.js | Main, mirror, VC, probe — `enableWorker: true` |

See [audio-pipeline.md](./../../audio-pipeline.md) (mostly accurate). [visualizer-architecture.md](./../../visualizer-architecture.md) has **stale module paths** (`src/audio/` is canonical).

### Visualizer engine

| Mode | Path |
|------|------|
| Embedded | `EmbeddedVisualizerHost` + RAF loop in main window |
| Projection | `useVisualizerIpcSender` → `visualizer:sendFrame` → `VisualizerWindowApp` |
| Butterchurn | WebGL in-process; mirror JPEG via `ButterchurnMirrorHost` for external surfaces |
| Registry | `src/visualizers/core/registry`, Butterchurn adapter, native canvas visualizers |

### Streamer / VC engine

| Piece | Location |
|-------|----------|
| VC designer + start | `src/vc-mode/useVcModeManager.ts` |
| Surface layout | `src/vc-window/VcGrid`, `VcCell`, host content |
| Playback mirror | IPC state + frame (~200ms state, ~60Hz FFT) |
| Kudos | `src/kudos/*`, presets in SQLite |
| Input/commands | `shared/commands/*`, main `commandService.js` |
| ALARE / gate | `gateHandler.js`, `gateInputCapture.js` |

**VC audit stance:** Document-only unless P0/P1 security/stability found. No credential exposure in renderer identified; stream encoding/broadcast is capture-based (window share), not RTMP credentials in IPC.

### Persistence

| Data | Store |
|------|-------|
| Library, cache, playlists | SQLite `app.db` in userData |
| Settings (sidebar width, VC config, theme, commands, kudos) | SQLite `settings` table |
| Host content media | `userData/host-content/media/` |
| Compile output | `userData/artistpages/<slug>/` |
| Logs | `userData/logs/app-YYYY-MM-DD.log` |

**Not persisted:** Main window bounds (fixed 1200×800); secondary window geometry between sessions.

### Packaging

- **Tool:** electron-builder (`electron-builder.yml`)
- **ASAR:** enabled; `better_sqlite3.node` unpacked
- **Targets:** macOS dmg (primary); Windows nsis/portable/zip (secondary)
- **FFmpeg:** not bundled — `execFile('ffmpeg')` on PATH
- **Bundle weight:** Butterchurn preset packs ~3.2MB lazy chunks; full `compiler/**` TS in ASAR

### Background jobs (informal, not unified queue)

| Job | Mechanism |
|-----|-----------|
| Cache populate | `cacheManager.schedulePopulate()` — Promise map on main loop |
| Subscribe / refresh | async IPC handlers |
| Compile | long-running async IPC invoke (`async` handler + `execFile` FFmpeg child); renderer awaits completion |
| Launch refresh | `refreshAllArtists()` on ready |

No `worker_threads`, UtilityProcess, or job queue abstraction today.

---

## B. Security Boundary Map

### Source Classes

> These are source classes, not a linear trust hierarchy. All non-application content is untrusted unless explicitly transformed through a validated local workflow.

| Class | Source | Handling |
|-------|--------|----------|
| **A0** | Application code: React shell, preload, main, compiled app bundle | Trusted application code; still minimize privilege |
| **R1** | Subscribed artist catalog data | Untrusted remote JSON/HLS metadata; treat as data, never code |
| **W1** | Published/hosted song pages | Untrusted executable web content; render only in guest webview with sandbox and CSP |
| **L1** | User-selected local media | User intent; validate paths, filenames, metadata, and file handling at IPC boundaries |
| **R2** | User-supplied remote adapter content: Suno external-source resolver, custom playlist URL snapshots, probes | Explicit user action; adapter-specific fetch policy; not equivalent to R1 subscribed catalogs |
| **M1** | Third-party CDN/media assets: HLS segments, CDN MP3, artwork | Fetch/play/display only; never execute |

### Privileged operations (main process only)

- Filesystem read/write (DB, cache, compile output, host content)
- `execFile('ffmpeg'|'ffprobe')`
- `shell.openExternal`, `shell.openPath`
- Remote `fetch` (subscribe, cache, manifest, probe, Suno external-source resolver)
- Custom protocol handler (`songpages-cache://`)
- Global shortcuts, native dialogs
- Window creation / fullscreen

### IPC boundary

- **~70 channels** in `electron/ipc.js` (52 `handle`, remainder `on`)
- **Validated (partial):** subscribe module, Suno resolvers, some playlist ops, `app:openExternal`, command save state
- **High risk passthrough:** fetch URLs, `artist:readMp3Bytes`, `artist:openOutputFolder`, compile extras, `hostContent` paths, all high-frequency `on` channels without sender check

### External navigation

| Surface | Policy |
|---------|--------|
| Guest webview | Same origin + pathname; else block + `openExternal` (no scheme filter) |
| App shell | `app:openExternal` requires `https?://` |
| Trusted windows | No `will-navigate` handler on main webContents |

### Remote fetch proxy (CORS bypass)

- **Why:** Renderer `webSecurity: false` reduces CORS pain; some work still in main (`fetchSongManifest`, subscribe, cache populate)
- **Risk:** Main becomes network proxy — SSRF-like probing, oversized responses, redirect chains
- **Mitigation backlog:** URL policy, size/timeout limits (partially present), no generic “fetch any URL” API

### Content Security Policy

| Surface | CSP |
|---------|-----|
| Main shell | Meta CSP in `src/index.html` — includes `'unsafe-eval'` (Butterchurn), broad `http:`/`file:`/`songpages-cache:` |
| VC / visualizer / controller HTML | Stricter — no `unsafe-eval` in satellite entries |
| Compiled song pages | Strict — `shared/siteCsp.ts` |

### Intentional relaxations (audit hard, do not remove blindly)

| Setting | Windows | Why | Risk if XSS in shell |
|---------|---------|-----|----------------------|
| `webSecurity: false` | All trusted | HLS/CDN without CORS | Cross-origin read/write |
| `sandbox: false` | All trusted | `<webview>` guest rendering | Larger blast radius |
| `webviewTag: true` | Main | Song page display | Guest escape if misconfigured |

Reference: [security-model-and-completed-actions.md](./../../security-model-and-completed-actions.md)

---

## C. Performance Risk Map

| Risk | Source | Likely symptom | Priority |
|------|--------|----------------|----------|
| ListenerMode rerender on `timeupdate` | `setCurrentTime` ~4 Hz in 2000+ line root | CPU, jank during playback | **P2 / P1-investigate** |
| VC FFT `Array.from` @ 60 Hz | `useVcModeManager.ts` | Main thread GC, IPC cost | P1 |
| Butterchurn JPEG in IPC @ ~30–60 Hz | `ButterchurnMirrorHost` + `useVisualizerStream` | Large structured clone, stutter | **P1-investigate** |
| Projection window setState every frame | `useVisualizerIpcStream` | Secondary window CPU | P1-investigate |
| Triple HLS decode (main + mirror + VC) | Independent players same URL | Memory, CPU | **P1 lifecycle review / investigate** |
| Cache protocol full-file read | `protocol.js` readFile | Latency/memory on large segments | P2 |
| Butterchurn preset pack load | 6 dynamic imports | Bundle size, first visualizer open | P2 |
| Unvirtualized playlist table | `ListenerMode` song table | Scroll jank at 5k scale | P2 (investigate) |
| Sync log append | `logger.js` appendFileSync | Main thread under load | P2 |
| Main window fixed size | No geometry persistence | UX only | P3 |

### Suggested profiling tests (not run in this pass)

1. React Profiler: `ListenerMode` commits during 2 min playback with visualizer off vs on.
2. Audio debug panel (`Ctrl/Cmd+Alt+A`): IPC send rate, peak bin, stalls with projection open.
3. Performance recording: 10 s Butterchurn projection — `toDataURL` + IPC cost.
4. Heap snapshot diff: VC open 5 min — compare `Array.from` allocation rate before/after P1-5 fix.
5. Activity Monitor: memory across 50 track skips with mirror + VC enabled.
6. Packaged macOS: first launch, cached playback via `songpages-cache://`, Discord window capture smoke.

---

## D. Dependency Recommendations

| Library | Verdict | Problem it would solve | Already solved? | Notes |
|---------|---------|------------------------|---------------|-------|
| **Zod** | **Defer / ask first** | IPC schema validation | Partial type checks + unit tests | Recommend small internal validators first |
| **electron-log** | **Investigate** | Cross-process logging, rotation | Custom `logger.js` | Extend custom vs migrate |
| **music-metadata** | **Investigate** | FLAC/M4A/WAV tags | `jsmediatags` (MP3) + ffprobe at compile | Only if format expansion planned |
| **WaveSurfer.js** | **Defer** | Interactive waveforms | None needed today | Precomputed peaks preferred per spec |
| **PixiJS** | **Reject (now)** | GPU particles | Butterchurn + Canvas 2D | Benchmark first if new viz class |
| **FFmpeg npm bundle** | **Investigate** | Packaged compile | PATH dependency | Packaging slice; direct execFile OK |
| **fluent-ffmpeg** | **Reject** | FFmpeg wrapper | Direct execFile | Per spec §15 |
| **react-resizable-panels** | **Reject (now)** | Panel layout | Custom sidebar resize exists | Only if concrete gap |
| **electron-window-state** | **Defer** | Window geometry | Partial SQLite settings | Small custom layer may suffice |
| **electron-context-menu** | **Defer** | Native menus | Custom React context menus | Brief P2 note |
| **Radix UI** | **Defer** | A11y primitives | Custom components | No second UI stack without need |
| **Zustand** | **Defer** | Transport state | React useState in ListenerMode | Only if P1-7 profiling justifies |
| **Axios** | **Reject** | HTTP client | Native fetch | — |
| **Playwright** | **Reject** | Browser automation | Not used | Explicit permission required |

---

## E. Prioritized Improvement Plan

### Phase 1 — Security hardening + small fixes (approved commit order)

| Slice | Items | Est. | Test focus |
|-------|-------|------|------------|
| 1a | hostContent root containment | small | VC host media resolve/delete |
| 1b | guest webContents / partition verification | small | Song page load + navigation |
| 1c | guest external URL scheme filter | small | External links from guest |
| 1d | mirror HLS unmount cleanup | small | Mode switches, quit |
| 1e | compile trusted path parity | small–medium | Artist compile happy path + malicious IPC |
| 1f | purpose-specific fetch URL validator | small–medium | Subscribe, manifest, probe, Suno/external adapter |
| 1g | trusted-window navigation guards | small–medium | Main, VC, visualizer, controller windows |
| 1h | VC FFT `Uint8Array` IPC parity | small | VC + visualizer FFT |
| 1i | FFmpeg requirement docs | small | Packaged compile expectations |

### Phase 2 — Measurement & conditional playback work

| Slice | Items | Est. | Test focus |
|-------|-------|------|------------|
| 2a | Butterchurn IPC measurement / instrumentation | small | Frame rate, payload size, encode cost |
| 2b | ListenerMode transport profiling | small | React Profiler; large playlist |
| 2c | Triple HLS lifecycle review | small | When decoders active; suspend only with evidence |

**Deferred automatically:** Any audio process model change that breaks macOS Discord/OBS window capture. Butterchurn throttle/redesign and transport extraction require Phase 2 evidence first.

### Phase 3 — VC / stream reliability

| Slice | Items | Est. | Test focus |
|-------|-------|------|------------|
| 3a | Document VC lifecycle state machine | small | — |
| 3b | IPC sender checks on `on` channels | medium | Cross-window injection |
| 3c | Per-window preload split (P1-1) | medium | Each window feature set |

### Phase 4 — Packaging / release readiness

| Slice | Items | Est. | Test focus |
|-------|-------|------|------------|
| 4a | FFmpeg requirement UX + docs | small | Packaged compile |
| 4b | Packaged macOS checklist (maintainer) | — | See appendix |
| 4c | ASAR hygiene (optional trim compiler TS) | small | Package size |
| 4d | Main window bounds persistence | small | Multi-monitor |

### Phase 5 — Scale & polish

| Slice | Items | Est. | Test focus |
|-------|-------|------|------------|
| 5a | Logging expansion + diagnostics export design | medium | Support bundle |
| 5b | List virtualization (if profiling warrants) | medium | 5k song scroll |
| 5c | P2/P3 UX items | varies | Context menus, media keys |

---

## Source Classes & Trust Rules (Draft — promote to `trust-boundaries.md` after review)

> **Note:** These are **source classes**, not a linear trust hierarchy. All non-application content is untrusted unless explicitly transformed through a validated local workflow.

| Class | Label | Examples | Threat model |
|-------|-------|----------|----------------|
| **A0** | Application code | React shell, preload, main, bundled app | Trusted; minimize privilege |
| **R1** | Remote catalog data | `songpages-catalog.json`, subscribed manifests | Untrusted data — never execute |
| **W1** | Remote song page web content | Artist-hosted HTML in guest webview | Untrusted executable web — sandbox + CSP |
| **L1** | User-selected local media | MP3 picks, host content imports | User intent; validate paths/metadata |
| **R2** | User-supplied remote adapter content | Suno external-source resolver, custom playlist URL snapshots, probes | Explicit user action; adapter-specific fetch policy |
| **M1** | Remote media assets | HLS segments, CDN MP3, artwork | Fetch/play only |

### Rules

1. **Remote catalog JSON is data, not code.** No `eval`, unsanitized `innerHTML`, or script injection from catalog fields.
2. **Song page HTML runs only in the guest webview** — sandbox, no Node, no preload, no IPC.
3. **Permission to play remote media ≠ permission to execute remote code.**
4. **R1 catalogs** — user-initiated subscribe/refresh to http(s) URLs; stored origin drives refresh.
5. **R2 adapters** — severable features (e.g. Suno demo resolver fetching `studio-api.prod.suno.com` and CDN playback URLs); not equivalent to R1 subscribed catalogs; must not bypass adapter host policy.
6. **L1 files** — picker or known userData paths only; reject traversal and out-of-root paths at IPC.
7. **Metadata precedence (recommended):** SQLite local edits authoritative in-app; published JSON authoritative for distribution; embedded tags import-only unless explicit “write tags” (not implemented).
8. **Compiler output** — untrusted as web content (W1 rules when hosted); app-generated only.

---

## Detailed Findings by Spec Section

### §2 Core architectural principle

**Aligned:** Main coordinates lifecycle, windows, IPC, FS, protocol. Renderer is UI + playback presentation.

**Gaps:**
- Main event loop runs cache populate and refresh without bounded job queue.
- Compile is a **long-running async IPC request** (`async` `ipcMain.handle` + `await compileArtistPage` + async `execFile` FFmpeg/ffprobe in `compiler/hlsExport.ts`). The renderer awaits completion; FFmpeg runs in child processes — **not** synchronous main-thread blocking, though handler duration can be long for large catalogs.
- No UtilityProcess — acceptable at current scale; revisit if waveform peak generation or batch transcode lands.

**Electron leaking into shared code:** `shared/*` is largely portable; `@shared/demo`, playlist helpers, kudos, commands are domain logic — good. Bridge types in `src/types/app.d.ts` are Electron-shaped — acceptable at UI boundary.

### §3 Security baseline

See Security Boundary Map and P0/P1 items. Guest model is strong; shell relaxations are the main concern.

### §4 IPC validation

**Channel inventory:** 52+ `ipcMain.handle`, 12+ `ipcMain.on` (visualizer, VC, commands).

**Recommendation:** Lightweight `assertSenderWindow(role)` for `on` channels; shared URL/path validators; **ask before Zod**. Unit tests exist for shared logic (`shared/**/*.test.ts`) — extend for validators.

**Recently touched IPC (extra scrutiny):** Custom playlists (`listener:*UserPlaylist*`) — basic type checks; song payload not deeply validated (trusts renderer SongRow shape). Acceptable at A0 boundary; snapshot fields sanitized in `userPlaylists.js` on write.

### §5 CSP

Main shell CSP documented in `src/index.html`. `'unsafe-eval'` required for Butterchurn — document as accepted risk with trusted bundle only.

**Audit question answered:** Compiled pages use strict CSP; guest cannot inject into shell. Shell XSS remains the threat model for relaxed CSP.

### §6 Navigation

Guest policy implemented. **Gap:** guest external open without scheme filter (P1-4).

### §7 Remote fetching

Subscribe: http(s) validated in module. Cache: URLs from subscribed catalog. **Gaps:** manifest fetch and probe (P0-1). **Suno external-source resolver:** dedicated demo adapter with fixed remote host policy (implementation detail: `studio-api.prod.suno.com` and CDN playback URLs — not an official API integration).

### §8 Local audio / custom protocol

**Listener playback:** `resolveSongAccess` → network URL or `songpages-cache://entry/{cacheId}/...`. Protocol uses readFile (not streaming). **Working;** improve streaming/range as P2.

**Compiler/publish:** Outputs static HLS to disk; ships `hls.light.min.js` — separate from listener cache protocol.

### §9 Audio playback

**Re-verified from code:** Single authoritative main audio; mirror + VC slaves; playback survives mode changes (user baseline confirmed).

**Investigation areas:**
- Transport state currently lives in the `ListenerMode` React root. Suspicious in a large component but requires React profiling before refactor (**P2 / P1-investigate**).
- Main audio, analyser mirror, and VC slave audio may overlap. Some overlap is intentional for capture and analysis. Optimize only from lifecycle measurements (**P1 lifecycle review**).
- `crossfades` UI exists without full implementation — P2 doc/product drift.

### §10 High-frequency IPC

**High-frequency paths requiring action or measurement:**
- VC FFT uses `Array.from(scratch)` at ~60 Hz — **actionable parity fix** with visualizer path (P1-5).
- Visualizer frame IPC runs at high frequency (~60 Hz) — acceptable only if measured impact remains low.
- Butterchurn JPEG strings in frame payload — measure payload size, encode cost, and frame behavior before remediation (**P1-investigate**).

**Acceptable patterns:** bounded progress, commands, discrete state — not a 60 FPS general-purpose IPC bus.

### §11 AudioWorklet

**Not used.** AnalyserNode polling only. No migration imperative.

### §12 Visualizer

Butterchurn WebGL + native canvas. Projection via IPC. **Risk:** frame payload size. PixiJS: reject without evidence.

### §13 Waveform

No interactive waveform library. Duration probe via throwaway audio/HLS. Defer WaveSurfer.

### §14 Metadata

MP3: `jsmediatags` in renderer after `readMp3Bytes`. Compile: ffprobe. **Precedence:** not formally documented — see Source Classes draft.

### §15 FFmpeg

Present: `compiler/hlsExport.ts`, `artist:checkFfmpeg`. Not bundled. Direct execFile — good pattern. **Packaging gap:** P1-10.

### §16 Background jobs

No unified queue. Recommend defer until 2+ job types need shared lifecycle.

### §17 Large catalog

SQLite for library — good. Table UI not virtualized. Bounded concurrency not enforced on bulk ops — investigate at scale.

### §18 Memory

**P1:** mirror HLS unmount leak. **P2:** HLS fatal without destroy in ListenerMode. Butterchurn destroy path looks correct.

### §19–24 Desktop UX (brief)

| Topic | Status |
|-------|--------|
| Context menus | Custom React menus in listener — adequate; native menus defer |
| Resizable panels | Sidebar resize implemented — no react-resizable-panels |
| Global media keys | Command system + globalShortcut — document conflicts |
| Window persistence | Partial — main bounds not saved |
| Custom title bars | Defer |
| Discord Rich Presence | Defer |

### §25 Startup / FOUC

Main window: 1200×800, no documented backgroundColor audit — **investigate** quick win for theme flash.

### §27 Logging

Custom logger — main only. Gaps: IPC failures, fetch outcomes, guest blocks, renderer diagnostics. **Recommend:** extend logger + optional audioDebug export in diagnostics slice.

### §28 Crash recovery

No formal renderer crash reload strategy documented. FFmpeg failure surfaces to compile IPC only.

### §29 Packaging

ASAR + native unpack verified pattern. **Maintainer checklist** in appendix. Windows paths with spaces: NSIS `executableName: SongPages` (no spaces) — good.

### §30 Bundle size

Butterchurn presets dominate. Compiler TS in ASAR — trim candidate.

### §32 React rendering

ListenerMode monolith — primary concern. PlayerBar not memoized — minor.

### §33 VC / stream isolation

**Document-only** this pass. Command dispatch isolated in main. VC failure should not destroy catalog — architecture supports; verify with failure injection in manual QA.

**Kudos / ALARE / input bindings:** Kudos render in VC layer; command gate prevents accidental dispatch; presets in SQLite. Extra regression: kudo trigger during VC + visualizer rotation commands.

---

## Recently Touched Systems — Extra Regression Scrutiny

| System | Risk note | Suggested verification |
|--------|-----------|------------------------|
| **Custom playlists** | New IPC + R2 snapshot URLs from mixed sources | Add/move/remove; playback Suno+catalog snapshots; duplicate handling |
| **Butterchurn refactor** | `'unsafe-eval'`, large preset chunks, mirror IPC | Projection + embedded; preset switch; memory after close |
| **Kudos** | Text grapheme limits; VC overlay | Trigger during playback; emoji phrase; no IPC leak |
| **ALARE / command bindings** | globalShortcut registration/cleanup | Remap keys; VC gate; quit/unregister |
| **VC surface designer** | Surface patch IPC unparsed | Commit surface; controller transport |
| **Sidebar resize** | Settings persistence | Width bounds; collapse |

---

## Appendix: Packaged macOS Verification Checklist (Maintainer)

> Run after security/playback slices; record notes in this section or a linked issue.

- [ ] Clean install / first launch
- [ ] Subscribe + refresh artist
- [ ] Local cache hit playback (`songpages-cache://`)
- [ ] Remote HLS playback (CDN)
- [ ] Suno demo add + play
- [ ] Custom playlist create + add/move song
- [ ] Guest song page navigation + external link
- [ ] Embedded visualizer + projection window
- [ ] Butterchurn preset switch on projection
- [ ] VC Mode open + Discord/OBS window capture (audio present)
- [ ] Artist compile (FFmpeg on PATH)
- [ ] Log export (`logs:export`)
- [ ] Unicode / spaces in file paths
- [ ] Quit + relaunch (settings persist)

---

## Appendix: Related Documentation

| Doc | Relationship |
|-----|--------------|
| [security-model-and-completed-actions.md](../../security-model-and-completed-actions.md) | Accurate baseline; shell relaxations still current |
| [guest-rendering-security.md](../../guest-rendering-security.md) | Guest policy detail |
| [audio-pipeline.md](../../audio-pipeline.md) | Audio architecture — mostly accurate |
| [visualizer-architecture.md](../../visualizer-architecture.md) | Visualizer reference |
| [vc-mode-architecture.md](../../vc-mode-architecture.md) | VC reference |
| [archive/specs/song-pages-input-control-system.md](../specs/song-pages-input-control-system.md) | Commands / ALARE |
| [audit-review-comments.md](./audit-review-comments.md) | Revision 1 review + reclassification |
| [audit-review-comments2.md](./audit-review-comments2.md) | Revision 2 freeze review + consistency corrections |
| [archive/specs/kudos-system-1.md](../specs/kudos-system-1.md) | Kudos spec |

---

## Revision 2 — Review Response & Pre-Implementation Clarifications (frozen)

Per [audit-review-comments.md](./audit-review-comments.md) and [audit-review-comments2.md](./audit-review-comments2.md). **No application code changes until individual commits are approved.**

---

### Reclassification summary

| Finding | Was | Now |
|---------|-----|-----|
| Shell `webSecurity:false` / `sandbox:false` | P0 | **P1 architectural debt** (P0 if shell navigation/injection path found) |
| Fetch URL policy | P0 | **P0/P1-high** after purpose matrix |
| Trusted-window navigation | Underemphasized | **P1-high** — expanded below |
| ListenerMode timeupdate | P1 | **P2 / P1-investigate** — profile first |
| Butterchurn JPEG IPC | P1 fix | **P1-investigate** — measure first |
| Suno terminology | “Suno API” | **Suno external-source resolver** (demo adapter) |

---

### Appendix: URL Policy Matrix (Pre-Implementation)

Proposed `validateRemoteUrl(url, { purpose })` — **review before coding P0-1**.

| Purpose | Call site | URL source today | Schemes | localhost / private IP | Redirects | Timeout | Max size | Credentials | Notes |
|---------|-----------|------------------|---------|------------------------|-----------|---------|----------|-------------|-------|
| `subscribe-catalog` | `subscribe.js` via IPC | User-entered site URL | http, https | **Allow** (user-hosted dev sites) | follow (fetch default) | 30s | JSON only | none | Already validates protocol in module |
| `refresh-catalog` | `subscribe.js` refresh | SQLite stored site base | http, https | Allow if stored | follow | 30s | JSON | none | Same-origin asset paths derived from site base |
| `fetch-song-manifest` | `ipc.js` | Renderer URL; Suno virtual prefix short-circuit | https (+ http?) | **Deny unless dev flag** | limit 5 | 30s | 1 MB JSON | none | Prefer URLs derived from subscription context when possible |
| `probe-song-availability` | `songAvailability.js` | Renderer page + playback URLs | https (+ http for user sites?) | Tighter than subscribe | limit 3 | 8s | HEAD/GET minimal | none | Availability only — no body retention |
| `cache-media` | `fetchAssets.js`, cache populate | URLs from subscribed page HTML (same-origin filter) | http, https | Allow user-hosted | follow | 30s | per-asset cap | none | Same-origin extraction already in module |
| `external-source-adapter-suno` | `sunoDemo/feature.js` | User paste → share page → `studio-api.prod.suno.com` | https only | n/a (fixed hosts) | follow | 30s | JSON + CDN audio | none | **Adapter-internal policy** — not generic IPC fetch |
| `dev-localhost` | Future / explicit | Dev only | http, https | Allow when `!app.isPackaged` or setting | follow | 30s | purpose-specific | none | Optional escape hatch for local catalog dev |

**Principles:**

- No generic “main process fetch any URL” API.
- R2 adapters enforce policy **inside adapter modules**; IPC validates only that invoke args match expected shape.
- `fetch-song-manifest` for non-Suno URLs is the highest-risk channel — tighten first.
- Private-network denial applies to **renderer-driven probe/manifest**, not necessarily to user-initiated subscribe (artist on LAN).

---

### Appendix: Compile Trusted Roots (Pre-Implementation)

Inventory for P0-2. Current behavior:

| Root type | Path | Trusted for read (FFmpeg input)? | Trusted for write (output)? | How established |
|-----------|------|----------------------------------|----------------------------|-----------------|
| Project tree | `path.join(__dirname, '..')` | **Yes** (dev API) | No (dev uses `project/artistpages/`) | Application |
| User home | `$HOME/**` | **Yes** (dev API only via `resolveTrustedLocalPath`) | No | Dev compile API |
| userData compile default | `userData/artistpages/<slug>/` | No | **Yes** (Electron default today) | `compiler-bridge.js` |
| userData uploads | `userData/compile-uploads/` | No | **Yes** | Compile service |
| User picker audio/image | Absolute path from dialog | **Should be yes** when path came from `artist:pickAudio` / `pickImage` | No | Native dialog |
| User picker output folder | `artist:pickOutputFolder` exists but **UI does not pass to compile today** | No | **Yes when wired** | Native dialog → store trusted root in compile session |
| Renderer `payload.fileMap` | Arbitrary | **No — reject** | No | — |
| Renderer `payload.outputRoot` | Arbitrary | No | **No — reject unless under trusted write roots** | — |
| Remote/catalog path strings | — | **No** | No | — |

**Recommended Electron rule:**

```text
compile(manifest)
  → buildFileMapFromManifest(manifest)
  → resolveTrustedLocalPath(projectRoot, each path)  // parity with dev API
  → outputRoot = userData/artistpages/<slug> OR session-stored picker path
  → reject IPC-supplied fileMap/outputRoot overrides
```

**Future:** If export-to-folder UX ships, persist picker result in main process for the compile invocation — do not trust renderer string alone.

---

### Appendix: Trusted-Window Navigation Audit

**Finding:** Only **guest webviews** register `will-navigate` / `setWindowOpenHandler` (`guestSecurity.js`). **All trusted BrowserWindows do not.**

| Window | Initial load | Can navigate away? | `will-navigate` | `setWindowOpenHandler` | `<a target=_blank>` | `window.location` remote | Preload after nav | Drop URL/file |
|--------|--------------|-------------------|-----------------|------------------------|---------------------|--------------------------|-------------------|---------------|
| **Main** | `loadFile(dist/index.html)` prod; `loadURL(localhost:5173)` dev | SPA only in prod; dev could navigate if compromised | **No** | **No** | Default Chromium (no handler) | Possible if XSS + `webSecurity:false` | Stays on same webContents | Not audited — likely default |
| **VC** | `loadFile` / dev URL | Same | **No** | **No** | Default | Same risk | Full preload remains | Not audited |
| **Visualizer** | Same | Same | **No** | **No** | Default | Same risk | Full preload | Not audited |
| **Controller** | Same | Same | **No** | **No** | Default | Same risk | Full preload | Not audited |
| **Settings** | Modal in main window | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| **Guest webview** | Imperative guest URL | Constrained | **Yes** | **Yes (deny + openExternal)** | External browser | Blocked / external | No preload | N/A |

**Risk amplification:** `webSecurity: false` + full preload + no navigation guard = if trusted shell ever loads remote HTML, IPC surface is retained.

**Recommended P1-NAV slice (per window or shared helper):**

1. `webContents.on('will-navigate')` — allow only `file://` app bundle (prod) or dev server origin (dev); deny else + log.
2. `setWindowOpenHandler` — deny; route http(s) through `app:openExternal` policy.
3. Optional: block unexpected `will-attach-webview` if not needed outside main.

**DevTools:** Enabled via app menu in dev only (`installAppMenu`) — must not ship enabled in production builds.

---

### Appendix: Preload Capability Map (Window Role)

Current: **one** `electron/preload.js` → `window.app` on all windows.

| Capability | Main | VC | Visualizer | Controller | Notes |
|------------|:----:|:--:|:----------:|:----------:|-------|
| `listener.*` | ✓ | — | — | — | Subscribe, playlists, cache |
| `artist.*` | ✓ | — | — | — | Compile, projects |
| `visualizer.open/send*` | ✓ | — | recv only via IPC | — | Main sends frames |
| `vc.open/send*` | ✓ | partial send | — | — | VC window uses `vc.*` |
| `vc.onState/onFrame` | — | ✓ | — | — | |
| `hostContent.*` | ✓ | ✓ resolve | — | — | VC graphics |
| `commands.*` | ✓ | partial | — | ✓ | Controller dispatches |
| `controller.*` | ✓ | — | — | invoke open | |
| `settings/logs` | ✓ | — | — | — | |

**Target shape (P1-1 — do not implement until small fixes land):**

- `window.app` — main only (listener, artist, settings, logs, open windows)
- `window.vc` — VC window subset
- `window.visualizer` — recv/config only if needed (today projection uses IPC from main, minimal preload)
- `window.controller` — commands + kudos settings read

Start with **controller** or **visualizer** (smallest invoke surface) as pilot split.

---

### Appendix: HLS / Audio Player Lifecycle Map

| Player | Element | When active | Can suspend? | Capture / analysis role |
|--------|---------|-------------|--------------|-------------------------|
| **Main audible** | `audioRef` in `ListenerMode` | Whenever track plays | No during playback | **macOS Discord/OBS capture target** (FX off) |
| **Analyser mirror** | `analyserAudioRef` | When `analyserMirrorEnabled`: embedded viz session, projection viz open, `vc.analyserEnabled`, bassBoost, or lofi | **Yes** — when all false | Web Audio FFT / FX; duplicate HLS decode |
| **VC slave** | VC window `<audio>` | When VC open + mirror playback URL set | **No during live VC** | Window capture includes audio |

**`analyserMirrorEnabled` condition** (from `ListenerMode.tsx`):

```text
(visualizer active session) OR (projection window + visualizer mode) OR vc.analyserEnabled OR bassBoost OR lofi
```

**Overlap:** VC open with visualizer surface can enable **both** mirror (main) and VC slave — intentional for capture; do not collapse without measurement.

**Known cleanup gap:** `useAnalyserPlaybackMirror` HLS branch returns empty cleanup on unmount — **P1-8 fix**.

**Deferred:** Any change to `AudioServiceOutOfProcess` / process model — breaks macOS capture per `main.js` comment.

---

### Appendix: VC FFT IPC — Verification Notes (P1-5)

| Check | Visualizer projection | VC surface |
|-------|----------------------|------------|
| Sender | `useVisualizerStream.ts` | `useVcModeManager.ts` |
| Frequency payload | `new Uint8Array(scratch)` | `Array.from(scratch)` ❌ |
| Receiver | `useVisualizerIpcStream` | `useVcWindowState.ts` |
| Receiver accepts | Uint8Array | `instanceof Uint8Array` **or** `new Uint8Array(array)` |

**Conclusion:** Receiver already handles `Uint8Array`. Fix is sender-side parity + manual verify structured clone does not mutate shared buffer (copy per tick is correct — same as visualizer).

**Test:** VC open + audio debug / heap snapshot — allocation rate before/after.

---

### Appendix: Butterchurn IPC — Measurement Plan (P1-6)

**Do not select fix until measured.**

| Metric | How |
|--------|-----|
| Frame rate | `audioDebug` ipc-send counters; Performance tab |
| Payload size | Log `canvasFrame?.length` once per second |
| Encode cost | Profile `toDataURL` in `ButterchurnMirrorHost` |
| Queue/drop | Check if projection falls behind (visual stutter) |
| Active paths | Projection Butterchurn vs VC mirror (`vcUsesButterchurn`) |

**Candidate fixes (choose after data):** throttle to 15–30 FPS; `toBlob` vs `toDataURL`; send JPEG only when frame changed; drop frames under load; render Butterchurn in projection window directly (larger slice).

---

### Appendix: ListenerMode Transport — Investigation Plan (P1-7 → P2)

4 Hz `setCurrentTime` is **suspicious in a large component** but not proof of harm.

**Before refactor:**

1. React Profiler — 2 min playback, visualizer on/off
2. Commit duration and subtree rerender counts
3. Large playlist (synthetic 1k+ rows) scroll during playback
4. Only authorize extraction if broad expensive commits confirmed

---

## Proposed Phase 1 Implementation Commits (Individual Approval)

> Approve commits **individually**. Order matches Phase 1 slices 1a–1i.

| # | Commit title | Scope | Risk | Notes | Approve |
|---|--------------|-------|------|-------|---------|
| **1** | `fix(security): contain hostContent media paths under userData root` | `hostContent.js` resolve/delete | Low | Ready | ☐ |
| **2** | `fix(security): verify guest webContents identity before bindSongPageGuest` | `guestSecurity.js` + partition / host-window predicate | Low | Review exact predicate: partition + guest relationship + host ownership | ☐ |
| **3** | `fix(security): filter schemes on guest external navigation` | `guestSecurity.js` `openExternally` | Low | Ready | ☐ |
| **4** | `fix(playback): destroy mirror HLS instance on unmount` | `useAnalyserPlaybackMirror.ts` | Low | Ready | ☐ |
| **5** | `fix(security): compile IPC trusted path parity with dev API` | `compiler-bridge.js` + shared resolver | Medium | After trusted-root policy | ☐ |
| **6** | `feat(security): purpose-specific remote URL validator for IPC fetch` | new `electron/net/urlPolicy.js` + ipc hooks | Medium | After matrix approval | ☐ |
| **7** | `fix(security): trusted-window navigation guards` | shared helper + window modules | Medium | Prod: file bundle only; dev: exact Vite origin; log denials | ☐ |
| **8** | `perf(vc): use Uint8Array for VC FFT IPC frames` | `useVcModeManager.ts` | Low | Receiver already accepts Uint8Array | ☐ |
| **9** | `docs: FFmpeg requirement and compile prerequisites` | docs slice | None | Ready | ☐ |

**Recommended first approvals (lowest risk):** 1, 2, 3, 4, 8, 9 — then policy-backed 5, 6, 7.

**Explicitly deferred pending measurement / profiling:** Butterchurn IPC remediation, ListenerMode transport extraction, preload split (separate P1 series), Zod, list virtualization.

---

*End of Revision 2 (frozen). Approve implementation commits individually — do not start a broad refactor.*
