# Web Voice, Chromium TTS, and macOS Enhanced Voices

**Status:** Lab findings · **Date:** 2026-07-19  
**Audience:** Song Pages contributors; also any Electron / Chromium / Web Speech app that wants local TTS without rediscovering these traps.

This document records what we learned while building the **Web Voice Demo** (`CmdOrCtrl+5`). The demo remains a calibration lab. A future product feature should **not** expose the full system voice catalog — see [Product direction](#product-direction-for-song-pages).

---

## Why this exists

Song Pages may eventually use short spoken interludes (between songs, Zen mode, radio-style breaks). The Web Voice Demo was built to answer a practical question:

> Which voices can an Electron app actually *reach*, with what rate/pitch controls, on a real Mac?

The short answer: **more than Chromium admits in the UI, less than System Settings claims is “installed,” and some voices only via the native `say` engine.**

---

## Quick map (read this first)

| Goal | Use | Notes |
|------|-----|--------|
| Browse what Chromium exposes | `window.speechSynthesis.getVoices()` | No Google “online” voices in Electron — those are Chrome-branded, not Chromium |
| Speak unique Enhanced names (Allison, Evan, Nathan, …) | Often **Chromium is enough** | If the display name is unique, web speech can address it |
| Speak **Samantha (Enhanced)** (and similar twins) | **macOS `say`** from the main process | Chromium lists twins but speaks the compact sibling |
| Pitch on web speech | `SpeechSynthesisUtterance.pitch` | Works on Chromium’s path |
| Pitch on native `say` | Embedded `[[pbas ±N]]` in the spoken text | Works for Samantha Enhanced in our tests; treat as “good enough,” not a music-grade pitch engine |
| Rate on native `say` | `-r` words-per-minute | Map UI multipliers onto ~175 wpm baseline |

---

## Engines involved (do not conflate them)

Three different layers show up with three different voice lists:

1. **System Settings → Accessibility → Spoken Content → Manage Voices**  
   User-facing download UI. Labels like “Samantha (Enhanced)” and “Using 167.3 MB.” This is the source of truth for *whether the user intended to install* a voice.

2. **AVFoundation / `say -v '?'`**  
   What the OS speech stack actually registered. After a download, this can lag until the speech daemon reloads (see [Stale voice registry](#stale-voice-registry-after-download)).

3. **Chromium `speechSynthesis` (Electron renderer)**  
   A *filtered, remapped* view of platform voices. Display names and `voiceURI` values often do **not** match Apple identifiers (`com.apple.voice.enhanced.en-US.Samantha`).

Assuming “installed in System Settings” ⇒ “available in `getVoices()`” ⇒ “`speak()` uses that quality” is the mistake this lab corrects.

---

## Chromium vs branded Chrome

Electron ships **Chromium**, not Google Chrome.

- Chrome’s “Google US English” / cloud neural voices are **not** part of stock Chromium.
- Electron’s Web Speech path uses **local OS voices** (on macOS, Apple’s TTS).
- “Manage Voices” in macOS is about **Apple** downloads, not Google’s web voices.

If an app needs Google-quality cloud TTS, that is a separate product decision (API key, network, privacy) — not something Electron gets for free by calling `speechSynthesis`.

---

## macOS voice quality tiers

Apple ships multiple builds of the “same” speaker name:

| Tier | Typical identifier fragment | Character |
|------|-----------------------------|-----------|
| Compact / default | `.compact.` | Small, always present, thinner / more robotic |
| Enhanced | `.enhanced.` or name suffix `(Enhanced)` | Large download (often 100–200+ MB), much more natural |
| Premium / Siri-class | `.premium.` or Siri voice packs | Highest quality; some Siri packs are **not** exposed to third-party apps |

**Critical:** System Settings may show a voice as installed while apps still only see the compact build until the speech registry refreshes.

Siri-only voice packs (e.g. “Voice 1” under a Siri heading) can download bytes without becoming usable from `say` / AVFoundation / apps. Prefer voices listed under the spoken-content catalog with explicit **(Enhanced)** / **(Premium)** labels.

---

## The Samantha twin problem (the big finding)

### What happens

1. User installs **Samantha (Enhanced)** in System Settings.
2. OS eventually registers *two* voices:
   - `com.apple.voice.compact.en-US.Samantha`
   - `com.apple.voice.enhanced.en-US.Samantha`
3. Chromium’s `getVoices()` may expose **two** English Samantha entries.
4. Both often share the **same** `name` / `voiceURI` string, e.g.  
   `Samantha (English (United States))`.
5. A React `<option key={voice.voiceURI}>` collapses the list (duplicate keys).
6. Even after selecting by array index and assigning `utterance.voice = voices[i]`, Chromium’s speak path effectively resolves by **name string** and invokes the **compact** Samantha.

So: **listing two items ≠ being able to speak the Enhanced one through Web Speech.**

### Voices that often *do* work via Chromium

When Enhanced downloads have **unique display names** in Chromium (examples we saw: Allison, Evan, Nathan with distinct Enhanced labels), web `speechSynthesis` can address them without `say`.

**Rule of thumb:** unique Enhanced name → try Chromium first; shared name with a compact sibling (Samantha) → use native `say`.

### What actually reaches Enhanced Samantha

macOS `/usr/bin/say` accepts the unambiguous voice name:

```bash
say -v 'Samantha (Enhanced)' 'Hello from the enhanced voice.'
# also works:
say -v 'com.apple.voice.enhanced.en-US.Samantha' 'Hello.'
```

`say -v '?'` lists both:

```text
Samantha            en_US    # ...
Samantha (Enhanced) en_US    # ...
```

Song Pages therefore added main-process IPC (`webVoice:listNativeVoices`, `webVoice:speakNative`, `webVoice:stopNative`) that shells to `say` with text on stdin (no shell string interpolation).

---

## Parsing `say -v '?'` (subtle bug)

Voice names are printed in a **fixed-width name column**. Short names leave two spaces before the locale; long names leave **one**:

```text
Allison (Enhanced)  en_US    # ...
Samantha (Enhanced) en_US    # ...   ← only one space before en_US
```

A parser that requires `\s{2,}` between name and locale **silently drops** `Samantha (Enhanced)` while still listing shorter Enhanced names. Use `\s+` and anchor on the locale token immediately before `#`.

---

## Stale voice registry after download

Symptoms we hit:

- System Settings: “Samantha (Enhanced) · Using 167.3 MB” (no cloud download icon).
- `say -v '?'` and AVFoundation: only compact Samantha.
- Asset data may already exist under `TTSAXResourceModelAssets`, but the live voice list has not refreshed.

Workaround that restored registration on this machine:

```bash
killall ttsd 2>/dev/null
killall speechsynthesisd 2>/dev/null
# then re-query:
say -v '?' | grep -i samantha
```

Electron / Chromium also cache voice enumeration for the process lifetime. After OS registration changes: **fully quit the app** (`Cmd+Q`) and relaunch — renderer “Refresh voices” alone is not always enough.

---

## Rate and pitch controls

### Chromium Web Speech

- `utterance.rate` — multiplier (demo uses ~0.72–1.12).
- `utterance.pitch` — multiplier; implemented in the browser stack.
- Available whenever you stay on the web speech path.

### Native `say`

| Control | Mechanism |
|---------|-----------|
| Rate | CLI `-r` in **words per minute**. Map UI multiplier × ~175 wpm. |
| Pitch | No CLI flag. Prefixed embedded speech command: `[[pbas ±N]]` (baseline pitch ≈ semitones). Convert multiplier with \(12 \log_2(\mathrm{multiplier})\), clamp (e.g. ±10). |

Verified: `[[pbas]]` **does** affect Samantha (Enhanced) in our auditioning — usable for host-style VO. Do not assume music-grade pitch accuracy; large shifts can sound flattened on neural voices. Sweet spot for radio-host feel: roughly ±2–3 semitones (slider ~0.85–1.15).

Compact / older MacinTalk voices historically honored more embedded commands; neural Enhanced voices may honor fewer — always **audition** the specific voice you ship.

---

## Security note (native path)

If you spawn `say` from Electron main:

- Prefer `spawn('/usr/bin/say', args, { stdio: [...] })` — **no shell**.
- Pass spoken text via **stdin** (`-f -`), not interpolated into a shell command line.
- Validate / allowlist voice names from your curated catalog rather than free-form user input when this graduates to product.

---

## Song Pages code pointers

| Piece | Location |
|-------|----------|
| Demo UI | `src/web-voice/WebVoiceDemo.tsx` |
| Demo styles | `src/web-voice/web-voice-demo.css` |
| Menu entry | `electron/menu.js` — Web Voice Demo · `CmdOrCtrl+5` |
| App mode | `web-voice` in `src/App.tsx`, `src/types/app.d.ts` |
| Native IPC | `electron/ipc.js` — `webVoice:*` handlers |
| Preload bridge | `electron/preload.js` — `app.webVoice` |
| Original static demo | `demo-code/north-haven-radio-voice-demo/` |

The demo supports both engines with a UI toggle:

- **Chromium speechSynthesis** — inspect what Electron exposes; useful for unique Enhanced names.
- **macOS native say** — reaches twin Enhanced voices Chromium cannot address.

---

## Product direction for Song Pages

When (if) this becomes a real Listener / VC / between-song feature:

1. **Do not** expose the full OS or Chromium voice list.
2. Ship a small **config file** (e.g. plain text / JSON) listing a curated set — something like 3 “regular” voices known-good with rate/pitch on Chromium, plus 3–5 Enhanced voices known-good on the native path (exact counts TBD).
3. Each entry should pin: display name, engine (`web` | `native`), exact `say` voice string or Chromium match key, default rate/pitch, and whether a Mac download is required.
4. UX should feel seamless for built-in / compact voices.
5. For Enhanced-on-Mac, document **in-app**: install named voices via System Settings → Accessibility → Spoken Content → Manage Voices… (and that a restart may be required).
6. Expect **Windows / Linux** to need separate curated entries — do not assume the Mac catalog ports.

**Listener Radio Mode (2026-07-19 demo):** A first product slice now lives in Listener — toggle **Radio** next to Zen in the player menu. Curated voices are hardcoded in `shared/listener/radioVoices.ts` (Allison default, Nathan default male, Samantha E/R, Evan, Daniel, Moira, plus Random). Settings → **Radio Voice** picks the announcer. Radio-only breaks are 2.5s silence → announcement → 2.5s silence after a finished song (~50% chance). Compatible with Zen: when both fire, the announcement is inserted directly between the two halves of the Zen silence, without adding Radio's own silence. Weather/sun copy uses Open-Meteo for ZIP **04032** (Freeport, ME). Enhanced voices still go through native `say` IPC from the Web Voice lab.

This lab exists to discover “what works exactly how we know it works,” then freeze that into config — not to build a general voice browser for end users.

---

## Checklist for any Electron / Web Speech app

Use this when adding local TTS elsewhere:

- [ ] Confirm you are on **Chromium**, not Chrome — cloud Google voices may be absent.
- [ ] After installing OS voices, verify with **`say -v '?'`** / AVFoundation, not only System Settings UI.
- [ ] If a download “is installed” but apps don’t see it, restart speech daemons and **fully quit** the app.
- [ ] When listing voices in UI, **never** key React options solely by `voiceURI` / name — duplicates happen.
- [ ] Selecting `utterance.voice` is not enough if Chromium resolves by name — **audition**; if you always hear the thin sibling, use a native API (`say` / platform TTS). Observed behavior: assigning either Samantha voice through SpeechSynthesisUtterance.voice still produces the compact Samantha. This appears consistent with Chromium resolving the voices by display name rather than preserving the specific underlying identity.
- [ ] Prefer **curated allowlists** over dumping every novelty MacinTalk voice (Bells, Zarvox, …).
- [ ] Map rate carefully (`say` wants WPM; Web Speech wants a multiplier).
- [ ] Treat pitch as **engine-specific**; test each shipping voice.
- [ ] Document Enhanced download steps for users on Mac.

---

## Open follow-ups (not decided)

- Final curated voice IDs and config file format for Song Pages product use.
- Whether between-song VO uses native-only on Mac, or a hybrid (Chromium when unique, `say` for twins).
- Windows SAPI / Linux espeak-ng curated catalogs.
- Optional post-process pitch via Web Audio if a future voice ignores `[[pbas]]`.

---

## One-line summary

**System Settings can install Enhanced Samantha; Chromium can list two Samanthas; only macOS `say` (with the exact `(Enhanced)` name) reliably speaks the good one — and your `say -v '?'` parser must allow a single space before the locale or you’ll drop her from the menu entirely.**
