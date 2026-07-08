# Audit Revision 2 Review — Required Corrections Before Implementation

**Date:** 2026-07-08  
**Document reviewed:** `Song Pages Application Audit` — Revision 2  
**Purpose:** Provide final maintainer review notes so the audit can be cleaned up, frozen, and then used to approve implementation commits individually.

---

# 1. Overall Assessment

Revision 2 is substantially stronger than Revision 1.

The audit now appears to be a credible implementation-control document rather than a generic Electron checklist. It responded well to the previous review comments, added meaningful code-path detail, and converted several vague concerns into explicit implementation gates.

The most important improvement is that the audit now distinguishes among:

```text
confirmed small fixes
policy-backed security changes
architectural debt
measurement-before-optimization items
future hardening slices
```

That is exactly the right posture for Song Pages at this stage.

The document is now close to ready, but it still has several internal inconsistencies and a few wording issues that should be corrected before it becomes the canonical audit plan.

The goal of this review is **not** to send the agent into another broad audit cycle. The goal is to clean up Revision 2 so it can be frozen and then used to approve small implementation commits.

---

# 2. What Revision 2 Gets Right

## 2.1 Trusted-window navigation is now properly elevated

This is one of the most important improvements in Revision 2.

The audit now correctly identifies that the real risk is not simply:

```text
webSecurity: false
```

The more important risk composition is:

```text
trusted BrowserWindow
+ webSecurity: false
+ sandbox: false
+ broad preload exposure
+ no will-navigate handler
+ no setWindowOpenHandler
```

This is a much sharper security finding.

The key sentence should remain:

> Risk amplification: `webSecurity: false` + full preload + no navigation guard = if trusted shell ever loads remote HTML, IPC surface is retained.

That line explains the issue clearly for future agents.

## 2.2 URL policy matrix is product-aware

The URL policy matrix is much better than a blanket SSRF fix.

It correctly distinguishes:

- subscribed catalogs;
- refreshes;
- manifest fetches;
- availability probes;
- cache media;
- Suno/external-source adapters;
- dev localhost.

This matters because Song Pages is a distributed publishing and media system. It may legitimately support user-hosted catalogs, local dev servers, LAN testing, and user-supplied source adapters.

This principle should remain:

> Private-network denial applies to renderer-driven probe/manifest, not necessarily to user-initiated subscribe.

That is the correct balance between hardening and product reality.

## 2.3 Compile trusted-root inventory is strong

The compile path section is much improved.

The audit now records that normal UI currently sends:

```text
{ manifest }
```

only, which means the issue is an IPC capability boundary problem rather than a normal UI path problem.

The future rule is also correct:

```text
picker result
→ trusted in main process
→ compile session remembers authorization
→ renderer cannot simply invent equivalent path string
```

This is a durable design principle and should remain.

## 2.4 Preload capability map is valuable

The preload capability map is one of the best artifacts in Revision 2.

It moves the issue from:

> full preload everywhere is bad

to:

> here is what each window actually appears to need.

This makes a future preload split much safer.

The proposed pilot strategy is also correct:

> Start with controller or visualizer.

Do not attempt to split every preload surface in one large rewrite.

## 2.5 Audio lifecycle map protects the capture architecture

The HLS/audio lifecycle map is excellent.

It records why multiple audio paths exist:

```text
Main audible player
→ authoritative playback / macOS capture

Analyser mirror
→ visualization / FFT / FX support

VC slave
→ VC capture
```

The audit now correctly says:

> Overlap is intentional; do not collapse without measurement.

That is important. Future agents should not “optimize away” a duplicated audio path without understanding macOS capture and VC requirements.

## 2.6 VC FFT issue is now actionable

The VC FFT finding is now concrete:

```text
Visualizer projection path → new Uint8Array(scratch)
VC surface path             → Array.from(scratch)
```

The receiver already handles `Uint8Array`.

This makes the proposed fix a small parity correction rather than speculative optimization.

## 2.7 Butterchurn is correctly measurement-gated

Revision 2 correctly changes Butterchurn from “fix/throttle” to:

> Measure before selecting a fix.

That is the right posture.

## 2.8 ListenerMode transport refactor is correctly downgraded

Revision 2 correctly downgrades the `ListenerMode` timeupdate concern to:

```text
P2 / P1-investigate
```

Four React updates per second in a large component are worth profiling, but they are not automatically a P1 architecture defect.

---

# 3. Required Consistency Corrections

Before freezing the audit as Revision 2, please correct the internal inconsistencies below.

## 3.1 Fix the malformed Source Classes table

Current issue:

The Security Boundary Map has a malformed Markdown table. It begins as:

```markdown
| Tier | Content | Treatment |
|------|---------|-----------|
| **A0 — Application code** | React shell... |
| Class | Source | Handling |
|-------|--------|----------|
```

This combines two different table formats.

Also, the heading still says:

```text
Trust tiers
```

but the revised model is now:

```text
Source classes
```

### Required replacement

Replace that subsection with:

```markdown
### Source Classes

> These are source classes, not a linear trust hierarchy. All non-application content is untrusted unless explicitly transformed through a validated local workflow.

| Class | Source | Handling |
|-------|--------|----------|
| **A0** | Application code: React shell, preload, main, compiled app bundle | Trusted application code; still minimize privilege |
| **R1** | Subscribed artist catalog data | Untrusted remote JSON/HLS metadata; treat as data, never code |
| **W1** | Published/hosted song pages | Untrusted executable web content; render only in guest webview with sandbox and CSP |
| **L1** | User-selected local media | User intent; validate paths, filenames, metadata, and file handling at IPC boundaries |
| **R2** | User-supplied remote adapter content: Suno resolver, custom playlist URL snapshots, probes | Explicit user action; adapter-specific fetch policy; not equivalent to R1 subscribed catalogs |
| **M1** | Third-party CDN/media assets: HLS segments, CDN MP3, artwork | Fetch/play/display only; never execute |
```

This correction is important because future agents will read this section quickly.

---

## 3.2 Synchronize stale priorities in the Performance Risk Map

Current inconsistency:

The Executive Summary correctly says:

```text
ListenerMode timeupdate → P2 / P1-investigate
Butterchurn JPEG-in-IPC → P1-investigate
```

But the Performance Risk Map still lists:

```text
ListenerMode rerender on timeupdate → P1
Butterchurn JPEG in IPC → P1
Triple HLS decode → P1
```

### Required corrections

Update the Performance Risk Map priorities:

| Risk | Current priority | Corrected priority |
|---|---:|---:|
| ListenerMode rerender on `timeupdate` | P1 | **P2 / P1-investigate** |
| Butterchurn JPEG in IPC | P1 | **P1-investigate** |
| Triple HLS decode | P1 | **P1-investigate** or **P1 lifecycle review** |

Triple HLS decode should not be framed as a simple defect because the audio lifecycle appendix explains that some overlap is intentional.

---

## 3.3 Synchronize Phase 1 with the final proposed commit order

Current inconsistency:

The Executive Summary and final proposed commits say the first implementation sequence should be:

```text
1. hostContent containment
2. guest bind verification
3. guest scheme filter
4. HLS cleanup
5. compile trusted path parity
6. URL policy
7. trusted-window navigation guards
8. VC Uint8Array
9. FFmpeg docs
```

But section `E. Prioritized Improvement Plan` still says Phase 1 starts with:

```text
1a P0-1 fetch URL policy
1b P0-2 compile path trust
1c hostContent
...
```

### Required correction

Update Phase 1 to match the final proposed commit sequence.

Suggested Phase 1:

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

This will make the plan consistent with the final approval table.

---

## 3.4 Replace “Butterchurn IPC throttle” with “Butterchurn IPC measurement”

Current issue:

Phase 2 says:

```text
P1-6 Butterchurn IPC throttle
```

But the revised audit correctly says:

```text
Do not select fix until measured.
```

### Required correction

Change Phase 2 item from:

```text
P1-6 Butterchurn IPC throttle
```

to:

```text
P1-6 Butterchurn IPC measurement / instrumentation
```

Any throttle or rendering change should become a separate future approved commit after measurement.

---

## 3.5 Replace “transport state extraction” with “transport profiling”

Current issue:

Phase 2 says:

```text
P1-7 transport state extraction
```

But Revision 2 correctly says the refactor requires profiling first.

### Required correction

Change Phase 2 item from:

```text
P1-7 transport state extraction
```

to:

```text
ListenerMode transport profiling
```

Extraction should be conditional on profiling evidence.

---

## 3.6 Clean up stale §9 audio language

Current issue:

§9 still says:

```text
Gaps: Transport in React root (P1-7); triple decode when mirror+VC (P1)
```

This no longer matches the revised classification.

### Required replacement

Use language like:

```markdown
**Investigation areas:**
- Transport state currently lives in the `ListenerMode` React root. This is suspicious in a large component but requires React profiling before refactor.
- Main audio, analyser mirror, and VC slave audio may overlap. Some overlap is intentional for capture and analysis. Optimize only from lifecycle measurements.
- `crossfades` UI exists without full implementation — P2 doc/product drift.
```

---

## 3.7 Change §10 “Violations” wording

Current issue:

§10 says:

```text
Violations: VC FFT Array.from; visualizer frame IPC ~60Hz; Butterchurn JPEG strings in frame payload.
```

This is too strong.

The VC FFT `Array.from` is actionable, but visualizer frame IPC and Butterchurn JPEG payloads require measurement before judging them as defects.

### Required replacement

Use:

```markdown
**High-frequency paths requiring action or measurement:**
- VC FFT uses `Array.from(scratch)` at ~60 Hz — actionable parity fix with visualizer path.
- Visualizer frame IPC runs at high frequency — acceptable only if measured impact remains low.
- Butterchurn JPEG strings in frame payload — measure payload size, encode cost, and frame behavior before remediation.
```

---

## 3.8 Replace remaining “Suno API” phrasing

The audit mostly corrected this, but §7 still says:

```text
Suno: dedicated resolver + fixed API host.
```

Please avoid “Suno API” or “API host” unless the implementation truly uses an authorized/documented API.

### Required replacement

Use:

```text
Suno external-source resolver: dedicated adapter with fixed service-host policy.
```

or:

```text
Suno remote source adapter: dedicated resolver with fixed remote host policy.
```

The appendix can mention the exact host where needed as implementation detail, but the integration should not be described as an official API.

---

## 3.9 Verify “compile runs synchronously on IPC thread” language

Current issue:

The audit says:

```text
Compile runs synchronously on IPC thread (FFmpeg can block handler duration).
```

and elsewhere:

```text
Compile | blocking IPC invoke; FFmpeg per song
```

This wording may be misleading.

If the implementation uses async `execFile` / Promises, the renderer may await a long-running IPC request, but the Electron main event loop may not be literally blocked.

### Required clarification

Please verify the implementation and use precise language:

| Actual behavior | Correct wording |
|---|---|
| `execFileSync`, synchronous CPU-heavy work, or synchronous long-running loops | main-thread blocking |
| async `execFile` with awaited Promise | long-running IPC request, not necessarily main-thread blocking |
| synchronous path/file preparation before async FFmpeg | brief synchronous setup; long-running child process |

Do not imply a main-process blocking problem unless confirmed.

---

# 4. Notes on Proposed Implementation Commits

The proposed implementation commit list is good. I would treat the commits as follows.

| Commit | Assessment |
|---|---|
| `fix(security): contain hostContent media paths under userData root` | Ready |
| `fix(security): verify guest webContents partition before bindSongPageGuest` | Ready after exact identity predicate review |
| `fix(security): filter schemes on guest external navigation` | Ready |
| `fix(playback): destroy mirror HLS instance on unmount` | Ready |
| `fix(security): compile IPC trusted path parity with dev API` | Ready after trusted-root policy is applied |
| `feat(security): purpose-specific remote URL validator for IPC fetch` | Ready after matrix approval |
| `fix(security): trusted-window navigation guards` | Important; review dev/prod origin logic carefully |
| `perf(vc): use Uint8Array for VC FFT IPC frames` | Ready based on receiver evidence |
| `docs: FFmpeg requirement and compile prerequisites` | Ready |

## 4.1 Guest identity verification needs exact predicate review

The proposed guest verification commit is correct in concept, but the implementation detail matters.

Partition membership alone may not prove that the target is the intended Song Pages guest webview.

Consider verifying some combination of:

```text
expected guest partition
+ webContents type / guest relationship
+ ownership by expected host window
+ known guest registration or session association
```

The exact predicate should be reviewed in the commit.

## 4.2 Trusted-window navigation guard needs careful dev/prod handling

For production, trusted windows should only be allowed to load intended app resources.

For development, the allowed dev origin should be exact enough to avoid accidental remote navigation but flexible enough to support the actual Vite/Electron dev setup.

The guard should account for:

```text
prod file:// app bundle
dev http://localhost:<expected port>
expected custom protocol if any
```

Unexpected navigation should be denied and logged.

---

# 5. What Should Be Approved First

Subject to the corrections above, the first approvals should be the smallest, lowest-risk items:

1. hostContent path containment
2. guest bind verification
3. guest external URL scheme filter
4. HLS mirror cleanup
5. VC FFT `Uint8Array` parity
6. FFmpeg requirement documentation

Then approve the policy-backed items:

7. compile trusted path parity
8. purpose-specific URL validator
9. trusted-window navigation guards

Preload splitting should be a serious follow-on P1 series, but not the first thing.

---

# 6. What Should Remain Deferred

The following should remain deferred until measurement or later product need:

- Butterchurn IPC throttle or architecture change;
- ListenerMode transport extraction;
- list virtualization;
- Zustand or state-management change;
- PixiJS;
- WaveSurfer;
- Radix;
- `react-resizable-panels`;
- custom title bars;
- Discord Rich Presence;
- broad platform polish.

The audit should continue to treat these as investigation items, not automatic implementation.

---

# 7. Recommended Agent Response

Use this as the direct instruction to the coding agent:

> Revision 2 is strong and close to ready. Before freezing the audit, please apply the consistency corrections listed below:
>
> 1. Fix the malformed Source Classes table and rename the heading from Trust tiers to Source Classes.
> 2. Synchronize stale priorities in the Performance Risk Map: ListenerMode becomes P2/P1-investigate; Butterchurn becomes P1-investigate; triple HLS decode becomes lifecycle review/investigate.
> 3. Update Phase 1 to match the final proposed commit order.
> 4. Replace “Butterchurn IPC throttle” with “Butterchurn IPC measurement / instrumentation.”
> 5. Replace “transport state extraction” with “ListenerMode transport profiling.”
> 6. Clean up stale §9 audio language around transport and triple decode.
> 7. Change §10 “Violations” to “High-frequency paths requiring action or measurement.”
> 8. Replace remaining “Suno API/API host” phrasing with precise external-source resolver terminology.
> 9. Verify whether compile truly blocks the main process or is a long-running async IPC request; adjust wording accordingly.
>
> After those edits, freeze the audit as Revision 2 and propose the first small implementation commit for approval. Do not start a broad refactor. Do not implement measurement-gated items without measurement. Do not change VC/audio capture architecture without explicit approval.

---

# 8. Final Conclusion

Revision 2 has done its job.

The audit now records:

- what is trusted;
- what is untrusted;
- why unusual Electron settings exist;
- which security findings are concrete;
- which are architectural debt;
- which performance concerns require evidence;
- which audio duplication is intentional;
- what future agents must not casually optimize away;
- and exactly how implementation approval should proceed.

After the consistency corrections above, the document should be frozen and used to approve small implementation commits individually.

Another broad audit pass is not needed right now. The next value comes from implementing bounded fixes, validating behavior, and learning from the results.
