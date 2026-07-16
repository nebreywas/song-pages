# Agnostic Lyric Effects

**Status:** Experimental · Phase 1 (ALARE surface)  
**Purpose:** First-class lyric *presentation* modes that never invent timing, emphasis, or section meaning.

---

## Principles

These effects assume worst-case lyric input: plain text, no SRT/LRC, no reliable verse/chorus metadata, no vocal emphasis, no phrase timing.

They may use only:

- Currently visible lyric text
- Song playback clock
- Audio analysis (FFT → energy / onset)
- Basic text structure (characters, words, line breaks)

They are **not** fallbacks for future timed lyrics. Timed engines and these effects stay orthogonal.

---

## Effects (Phase 1)

| Id | Label | Behavior |
|----|-------|----------|
| `none` | None | Plain presentation |
| `beat-pulse` | Beat Pulse | On spectral-flux onsets, briefly pulse randomly chosen **visible** words |
| `energy-pulse` | Energy Pulse | On mix-level crests (loudness / energy), briefly pulse random **visible** words — Meyda-style pulse without claiming which word is sung |
| `matrix-reveal` | Matrix Reveal | Newly visible lines scramble, then resolve into real text |
| `progressive-clarity` | Progressive Clarity | Newly visible lines start soft/blurred and clear while on screen |
| `audio-reactive-type` | Audio-Reactive Type | Whole lyric block subtly scales / tracks / breathes with energy |

---

## Module layout

```
shared/lyricEffects/          # Pure modules + registry (testable without DOM)
  types.ts
  registry.ts
  resolve.ts
  audio/energy.ts
  audio/onset.ts
  effects/*.ts

src/vc-window/lyricEffects/   # VC render bridge
  useLyricEffectFrame.ts
  renderLyricEffectText.tsx
```

Assignment override: `lyricPresentationEffect` on vertical `lyrics` cells (Surface designer → Lyric presentation).

Live path: `frequencyData` (already streamed to the VC window for visualizers) is threaded into ALARE via `VcCellContentView` → `VcResolvedContentView` → `VcAlareLyricsView`.

---

## Explicit non-goals (Phase 1)

- Marquee / Simple Scroll wiring (API supports them; surfaces gate)
- Claiming tempo or lyric–vocal sync
- Replacing ALARE fade / tracking settings
- Combining multiple effects in one slot (single select for experimentation)

---

## How to evaluate

1. Assign Lyrics → Lyric tracking **ALARE**.
2. Set Lyric presentation to each experimental mode.
3. Play local-audio tracks with analyser signal (YouTube/SoundCloud FFT may be empty).
4. Keep modes that feel readable and musical; remove or retune the rest without touching the timeline allocator.
