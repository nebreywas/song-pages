# ALARE 1.0 --- Approximate Lyric Allocation & Rendering Engine

**Status:** MVP 1.0 specification — VC integration decisions locked (see §22)\
**Target:** Song Pages VC Mode (live output + designer preview); main player and compiled static pages out of scope for this sprint\
**Primary goal:** Automatically progress a complete lyric set through a
song at an approximately appropriate pace without requiring manual host
scrolling or synchronized lyric timestamps

------------------------------------------------------------------------

# 1. Purpose

ALARE is an approximate lyric progression and rendering system. It is
not intended to provide karaoke-grade synchronization, word-level
synchronization, syllable-level synchronization, exact vocal
transcription alignment, guaranteed identification of sung versus
instrumental passages, or semantic understanding of song structure.

> **Given a song, its total duration, a lyric blob, and a lyric display
> area, progress the lyrics automatically so viewers have a reasonable
> opportunity to read the complete lyric set during playback.**

The system should aim for proximity rather than exact synchronization. A
successful ALARE presentation should begin near the beginning of the
song, progress at a plausible rate, avoid obviously racing or stalling,
show enough surrounding text to tolerate timing error, expose most or
all lyrics during the song, complete approximately near the end of
playback, and require no manual host intervention.

------------------------------------------------------------------------

# 2. Core Product Principle

ALARE should not pretend to know more than it knows.

The engine knows or can derive total song duration, lyric text, line
boundaries, blank-line boundaries, word counts, character counts,
approximate syllable counts, display area dimensions, selected font
size, selected rendering mode, approximate visible text capacity, and
optionally weak audio-derived activity signals.

The engine generally does not know exact vocal entry or exit time, exact
section structure, whether bracketed material is structural metadata,
whether published lyrics include all ad libs, whether sung delivery
follows written line breaks, or whether words are held, rushed,
repeated, omitted, or melismatic.

> **ALARE 1.0 should normalize all lyric inputs into the same analytical
> form and estimate progression from text density, song duration,
> display capacity, and optional weak audio evidence.**

------------------------------------------------------------------------

# 3. ALARE Bracketed-Text Rule

When a host selects lyrics for display using the **ALARE lyric tracking
option**, the system must automatically strip bracketed text from both
the ALARE display representation and the analytical timing
representation.

Examples include:

``` text
[Verse]
[Verse 1]
[Chorus]
[Guitar Solo]
[Solo]
[Piano Solo]
[Drop]
[Breakdown]
[Instrumental]
[Instrumental 2 Bars]
[Whispered]
[Louder]
```

ALARE does not offer a mode that preserves bracketed text.

This is a deliberate product rule. Bracketed material is too
inconsistent across lyric sources to serve as reliable timing or
structural metadata. It may represent song sections, production
instructions, performance directions, instrumental passages,
AI-generation instructions, stage directions, or other information.

Other lyric-tracking algorithms in Song Pages may preserve
`[Bracketed Text]`. Those algorithms may be simpler, more flexible in
what they display, and more prone to timing mistakes.

> **ALARE trades bracketed-text display flexibility for a more
> normalized and predictable approximate tracking model.**

The original stored lyric object must remain unchanged. Bracket removal
occurs only in the derived ALARE representation used for display and
timing.

## 3.1 Scope of bracket stripping (ALARE 1.0)

- **ASCII square brackets only:** spans matching `[ ... ]`.
- **Chord annotations are stripped intentionally** (e.g. `[Am]`, `[C#m7]`). ALARE is a normalized lyric-reading mode, not a chord-chart mode.
- **Parentheses are not stripped** — `(Yeah!)`, `(spoken)` remain in the analytical and display text unless a separate non-ALARE display rule applies.
- **Do not expand** to `【...】` or other bracket styles in 1.0 unless trivial to add safely.
- **Nested or malformed brackets:** handle defensively; normalization must never crash or mutate the original stored source.
- **Non-ALARE modes** may keep an optional **Remove bracketed text** assignment toggle (`lyricsRemoveBracketed`). When ALARE is selected, bracket stripping is **mandatory** and that checkbox is hidden or disabled — ALARE always uses the bracket-stripped derived representation.

------------------------------------------------------------------------

# 4. Input Normalization Pipeline

## 4.1 Core Rule

All lyric blobs should receive the same normalization treatment.
Bracketed material should not be used for structural interpretation.

For ALARE timing and display purposes, bracketed text should be removed
before analysis and rendering. The original source text must remain
unchanged in storage.

``` typescript
interface NormalizedLyrics {
  originalText: string;
  analyticalText: string;
  blocks: LyricBlock[];
  lines: LyricLine[];
}
```

## 4.2 Bracketed Information Removal

Apply a consistent regex/grep-style normalization pass to remove
bracketed information.

Conceptually:

``` text
[ ... ]
```

Example source:

``` text
[Verse 1]
I saw you standing by the door
You said you'd been there once before

[Instrumental 2 bars]

I never knew what I should say
So I just watched you walk away
```

ALARE representation:

``` text
I saw you standing by the door
You said you'd been there once before

I never knew what I should say
So I just watched you walk away
```

The implementation should safely handle multiple bracketed expressions
and avoid allowing removal to create pathological empty blocks.

## 4.3 Parenthetical Information

Parenthetical information should not automatically be removed unless the
lyric-display configuration or existing Song Pages lyric rules request
it.

Examples:

``` text
(Yeah!)
(come on)
(I still love you)
```

These may represent actual sung or performed content. Parenthetical text
remains part of timing analysis by default.

If the host selects a display transformation that hides parenthetical
content, ALARE should preferably calculate against the same transformed
lyric representation actually being displayed.

> **Time the text being shown whenever practical.**

## 4.4 Line Ending Normalization

Normalize CRLF and CR line endings to LF (`\n`). Preserve individual
lyric line boundaries.

## 4.5 Blank-Line Normalization

One or more blank lines should create a block boundary. Multiple
consecutive blank lines should not create multiple empty timing blocks.

## 4.6 Whitespace Normalization

For analytical purposes:

-   trim leading and trailing whitespace
-   remove empty lines inside normalized blocks
-   normalize repeated spaces where appropriate
-   preserve punctuation
-   preserve original stored text separately

## 4.7 Markdown and plain-text normalization (ALARE 1.0)

ALARE 1.0 uses a **normalized plain-text derived representation** for both analysis and display:

1. Strip bracketed content (§3) via `stripBracketedLyricsText`.
2. Apply **basic Markdown syntax removal** via `stripMarkdownLyricsText` (or `normalizeAlareLyricsText` for the full pipeline).

Do **not** time against rendered HTML rows in 1.0. Original stored lyrics remain unchanged.

**Phase 1 Markdown policy:** use a simple regex-oriented stripper in `shared/lyricsText.ts`, not a full Markdown parser. Current demo songs, playlists, and pages **do not use Markdown in lyrics**, so correctness on exotic GFM edge cases is not a sprint goal. The stripper removes common markers (headings, emphasis, links, inline code, list/blockquote prefixes, horizontal rules) and keeps readable text. Revisit if real lyric sources start using Markdown heavily.

**Simple Scroll** (the compatibility lyric-tracking mode) may continue to display Markdown when `markdownSource` is enabled. This is a deliberate split: Simple Scroll favors formatting flexibility; ALARE favors normalized approximate pacing.

## 4.8 No deduplication

ALARE times the normalized lyric blob **as written**. If a chorus appears three times in the source, all three occurrences receive allocation. If it appears once, ALARE does not invent repetitions. This follows the humility principle (§2).

------------------------------------------------------------------------

# 5. Structural Model

ALARE should use a deliberately simple hierarchy:

``` text
Song
└── Block
    └── Line
        └── Words / Characters / Estimated Syllables
```

A block is created from blank-line separation.

A block is not assumed to be a verse, chorus, bridge, intro, outro, or
refrain. It is simply:

> **A visually separated group of lyric lines.**

------------------------------------------------------------------------

# 6. Analytical Metrics

Each lyric line should receive several inexpensive metrics.

``` typescript
interface LyricLine {
  id: string;
  text: string;
  characterCount: number;
  wordCount: number;
  estimatedSyllables: number;
  timingWeight: number;
  blockId: string;
}
```

## 6.1 Character Count

Character count is important because display capacity depends on font
size, area width, line wrapping, horizontal scrolling, and viewport
capacity.

Track at minimum total characters, visible characters, and characters
excluding whitespace.

## 6.2 Word Count

Word count provides a stable density signal and should remain an
independent metric.

## 6.3 Estimated Syllable Count

Use a lightweight local syllable estimator. It may consider vowel
groups, common diphthongs, silent trailing `e`, contractions, and a
minimum of one syllable for normal lexical words.

Syllable count is an approximate timing signal, not ground truth.

## 6.4 Minimum Line Weight

Every non-empty lyric line should receive a minimum timing floor.

``` typescript
timingWeight =
  BASE_LINE_WEIGHT +
  characterComponent +
  wordComponent +
  syllableComponent;
```

All coefficients should be centralized and tunable.

------------------------------------------------------------------------

# 7. Song-Level Pace Estimation

## 7.1 Core Principle

ALARE should derive a song-specific progression pace from total song
duration, total analytical text, total line count, total block count,
total character count, total word count, and estimated syllable count.

The system should not assume every song is sung at a universal fixed
rate.

## 7.2 Reserved Edge Padding

Recommended initial tunable defaults:

``` text
Intro Reserve: 3–5% of total duration
Outro Reserve: 2–4% of total duration
```

These are heuristics and should be centralized constants. Reduce them
when lyric density is too high. **Intro/outro reserve is the primary Phase 1 tool** for unmarked instrumental passages at the start or end of a track. Density pressure may also shrink or grow reserves: sparse lyrics over a long duration may tolerate larger edge reserves and block gaps; dense lyrics reduce them. Do not invent semantic instrumental detection in Phase 1.

## 7.3 Block Boundary Allowance

Blank-line boundaries often indicate some degree of structural or vocal
separation. ALARE may reserve a modest timing allowance between blocks.

> **A blank line is evidence of separation, not proof of an instrumental
> break.**

## 7.4 Density Pressure

Conceptually:

``` text
densityPressure =
totalTimingWeight
/
availableLyricDuration
```

When density pressure is high:

1.  use normal allocation
2.  reduce block-boundary allowances
3.  reduce default intro reserve
4.  reduce default outro reserve
5.  apply bounded final compression

## 7.5 Resolved track duration

All ALARE timing must use a single resolved duration. Centralize in **`resolveTrackDuration()`** — do not let different components choose duration independently.

**Precedence (recommended):**

1. Stable catalog/manifest `durationSeconds` when valid.
2. Otherwise finite media `playback.duration`.
3. If playback duration later becomes valid and **materially disagrees** with manifest duration, prefer the actual playable media duration for the active session and recompute the timeline once.

------------------------------------------------------------------------

# 8. Approximate Timeline Allocation

## 8.1 Baseline Allocation

After normalization and metric calculation:

1.  determine total song duration
2.  reserve modest intro padding
3.  reserve modest outro padding
4.  reserve modest block-boundary allowances
5.  calculate total lyric timing weight
6.  allocate remaining duration proportionally across lyric lines
7.  generate monotonic approximate timing intervals

Conceptually:

``` text
Line Share = Line Timing Weight / Total Lyric Timing Weight

Line Duration = Line Share × Available Lyric Duration
```

## 8.2 Timeline Requirements

Lyric intervals must be monotonically ordered, never overlap, remain
within song duration, permit intentional gaps, and complete
approximately near the end of the song.

> **Lyric intervals must not overlap and must remain bounded within
> `0 <= time <= totalDuration`. Gaps are permitted.**

------------------------------------------------------------------------

# 9. Optional Audio Activity Assistance

## 9.1 Purpose

ALARE may optionally use lightweight audio analysis to improve
approximate pacing.

> **A weak correction signal, not a vocal detector and not a
> synchronization engine.**

## 9.2 Why Audio Analysis May Help

A waveform may contain quiet intros, sudden full-band entries,
breakdowns, extended sparse passages, outro decay, and major
instrumental transitions.

If the engine detects a long low-activity region, it may be useful to
slow or delay lyric progression slightly.

## 9.3 Why Frequency Detection Is Dangerous

Simple frequency analysis cannot reliably determine whether someone is
singing. Human vocal ranges overlap heavily with guitars, synthesizers,
piano, horns, distorted instruments, and backing tracks.

Do not implement:

``` text
Energy between X Hz and Y Hz = vocals present
```

## 9.4 Recommended MVP Audio Signal

If audio analysis is implemented, prefer broad activity measurements
such as:

-   RMS energy
-   spectral flux
-   onset density
-   rolling energy change
-   sustained low-activity regions

``` typescript
interface AudioActivityWindow {
  startTime: number;
  endTime: number;
  energy: number;
  activityScore: number;
}
```

Recommended window size: `0.5–2.0 seconds`, tunable.

## 9.5 Audio Influence Limit

Audio activity must not dominate text allocation.

``` text
Text-derived pacing: primary
Audio activity correction: secondary
```

A bounded local progression adjustment such as `0.75x–1.25x` may be
tested. Audio assistance should be configurable and easy to disable.

------------------------------------------------------------------------

# 10. Display-Aware Rendering

The rendering system should use actual display configuration as an input
to progression behavior.

The host may control:

-   display area width
-   display area height
-   font size
-   rendering mode
-   fade behavior
-   line count where applicable

> **ALARE should not calculate progression independently from the amount
> of lyric text the viewer can actually see.**

------------------------------------------------------------------------

# 11. Vertical Multi-Line Mode (Phase 1)

> **Horizontal ALARE is deferred** (see §12). Phase 1 ships vertical multi-line ALARE only.

## 11.1 Host Configuration

For vertical lyric presentation, the host selects or influences:

-   font size (via existing VC assignment typography — see §14)
-   display area dimensions
-   desired visible line count where supported (`targetVisibleLines` — a **preference**, not a command; see §11.2)
-   fading enabled/disabled (defaults **on**)
-   opacity profile where supported (derived automatically when fade is on)

The system should calculate actual layout capacity after text wrapping.

## 11.2 Effective Visible Capacity

The configured number of lines is a **host preference**. The renderer **clamps** to what cell height, resolved font metrics, and wrapping can actually support. Do not hide the setting; show the effective result where practical. A tiny cell requesting seven lines should degrade safely rather than overflow.

Distinguish **Lyric Lines** from **Rendered Text Rows**. Use actual
rendered geometry where practical.

**Default vertical presentation** is geometry-derived, not hard-coded to a universal line count. Use cell height, resolved font metrics, and line wrapping to calculate a reasonable visible window. The approximate active region should sit near the visual center, with enough preceding and upcoming context to mask timing error.

## 11.3 Vertical Window

The renderer should maintain a moving window around the approximate
current lyric position.

Example:

``` text
50%
75%
100%
100%
75%
50%
```

Both even and odd visible line counts must be supported.

## 11.4 Fade Mode

If fading is enabled, derive an opacity profile from visible line count,
selected peak/bright region, available area height, and font size.

Example:

``` typescript
[0.50, 0.75, 1.00, 1.00, 0.75, 0.50]
```

The host should not be required to configure every opacity value
manually.

**Relationship to Simple Scroll edge fade:** When ALARE fade is enabled, ALARE uses its own **per-line opacity profile** (§11.4). This **replaces** today's `lyricsEdgeFade` container mask for ALARE assignments. Do not stack both effects by default. Simple Scroll keeps `lyricsEdgeFade` unchanged.

## 11.5 No-Fade Mode

If fading is disabled, all visible lyric lines render at normal opacity,
progression follows the approximate timeline, and the viewport scrolls
as necessary.

------------------------------------------------------------------------

# 12. Horizontal Single-Line Mode (deferred)

> **Not in ALARE 1.0 / this sprint.** Horizontal ALARE is a later phase. Phase 1 is vertical multi-line only. Existing non-ALARE horizontal or simple behaviors elsewhere in Song Pages are unchanged.

## 12.1 Purpose (future)

Horizontal mode displays lyrics as a left-to-right progressing text
stream.

Display capacity depends heavily on area width, font size, font metrics,
character widths, spaces, and punctuation.

## 12.2 Visible Character Capacity

Inputs include actual display width, selected font size, selected font
family, and measured text width where available.

Prefer actual browser text measurement over fixed-width character
assumptions.

Conceptually:

``` text
visibleTextCapacity =
viewportWidth
/
measuredAverageGlyphWidth
```

## 12.3 Scroll Rate

Baseline horizontal scroll rate should derive from total analytical text
width, available song duration, intro reserve, outro reserve, and
optional audio activity correction.

``` text
scrollRate =
totalRenderedTextWidth
/
availableProgressionDuration
```

## 12.4 Viewport-Aware Adjustment

The goal is approximately:

``` text
the complete lyric stream has had an opportunity to enter and pass through the readable viewport during the song
```

Account for initial viewport occupancy, final viewport occupancy, total
text width, and scroll distance.

------------------------------------------------------------------------

# 13. Rendering Transitions

Vertical progression should use smooth transforms and opacity
transitions.

Recommended starting point:

``` css
transition:
  transform 0.4s ease,
  opacity 0.3s ease;
```

Centralize these values.

------------------------------------------------------------------------

# 14. Host Configuration Model

``` typescript
interface ALARERenderConfig {
  /** Phase 1: vertical only. Horizontal reserved for a later phase. */
  mode: 'vertical';

  /** Resolved from VC assignment typography (HostFontStyleId / HostFontSizeId → CSS metrics). */
  fontFamily: string;
  fontSizePx: number;

  fadeEnabled: boolean;

  vertical: {
    /** Host preference; renderer clamps to geometry. */
    targetVisibleLines?: number;
    maxBrightnessLines?: number;
  };

  timing?: {
    globalSpeedAdjustment: number;
    /** Phase 2+. Hook exists in Phase 1; no IPC/analysis plumbing yet. */
    audioAssistEnabled: boolean;
  };
}
```

The exact schema may adapt to existing Song Pages architecture (`VcAssignmentOverrides`, `shared/vcMode/assignmentSettings.ts`). ALARE reads the **assigned font size of the lyrics area/float** as a first-class input.

------------------------------------------------------------------------

# 15. Automatic Display Calculation

When lyrics are assigned to a VC area, the system knows or can measure
area width, area height, font size, font family, rendering mode, lyric
text, and song duration.

For vertical mode (Phase 1):

``` text
Area Geometry
+
Font Metrics
+
Requested Visible Lines (clamped)
+
Lyric Timeline
=
Vertical Display Plan
```

Horizontal scroll plan (§12) is deferred.

------------------------------------------------------------------------

# 16. Data Architecture

``` typescript
interface LyricLine {
  id: string;
  text: string;
  characterCount: number;
  wordCount: number;
  estimatedSyllables: number;
  timingWeight: number;
  blockId: string;
  startTime: number;
  endTime: number;
}

interface LyricBlock {
  id: string;
  lines: LyricLine[];
  startTime: number;
  endTime: number;
}

interface AudioActivityWindow {
  startTime: number;
  endTime: number;
  energy: number;
  activityScore: number;
}

interface ALARETimeline {
  songId: string;
  totalDuration: number;
  analyticalText: string;
  totalCharacters: number;
  totalWords: number;
  estimatedTotalSyllables: number;
  blocks: LyricBlock[];
  lines: LyricLine[];
  audioActivity?: AudioActivityWindow[];
}
```

------------------------------------------------------------------------

# 17. Implementation Strategy

## 17.1 Phase 1 --- Deterministic text engine (vertical ALARE)

Implement first **without audio analysis plumbing**. Include the `audioActivity?` hook on `ALARETimeline` (§16) but do not send or consume activity windows until Phase 2.

**In scope this sprint:** VC Mode live output + representative Designer preview (§22). Main player and compiled static Song Pages are out of scope.

Required:

1.  assignment control: **Lyric tracking: Simple Scroll | ALARE** (default Simple Scroll for existing configs)
2.  bracket-removal normalization (mandatory under ALARE)
3.  markdown strip/normalize for ALARE plain-text derived form
4.  line-ending normalization
5.  blank-line block detection
6.  line extraction (no deduplication)
7.  character, word, and syllable estimates
8.  timing weights and `resolveTrackDuration()`-based allocation
9.  vertical multi-line progression and display-aware calculations
10. per-line opacity fade profile (replaces `lyricsEdgeFade` under ALARE)
11. playback sync: seek jumps, pause freezes, resume continues; follow main playback clock
12. fallback/host lyrics run through ALARE when ALARE is selected

**Deferred from Phase 1:** horizontal ALARE (§12), fake timing playback in Designer, Phase 2 audio IPC.

## 17.2 Phase 2 --- Audio activity experiment

Add optional lightweight audio analysis. **Compute in the main/audio-analysis side**; send derived `AudioActivityWindow[]` to the VC presentation system. Do not create a second independent analysis pipeline in the VC mirror unless later evidence demands it.

Test whether RMS energy, spectral flux, onset density, and low-activity
regions meaningfully improve approximate progression.

Do not assume they will. Retain audio assistance only if real listening
tests show improvement. The text engine must function completely without it.

## 17.3 Phase 3 --- Horizontal ALARE + calibration

Test against:

-   sparse ballad
-   dense rap
-   house track with few lyrics
-   country song
-   rock song
-   long instrumental intro
-   long instrumental outro
-   repeated chorus-heavy pop
-   AI-generated song with production tags
-   published lyrics with no section labels
-   lyrics with very short lines
-   lyrics with very long lines

Evaluate whether progression generally stays near the song, exposes the
complete lyric set, finishes approximately near completion, avoids
stalls and racing, benefits from larger visible areas, and improves with
audio assistance (Phase 2+).

**High-density edge case:** exposing the complete lyric set is a strong goal, not permission to become unreadable. Progressively reduce block allowances and edge reserves, then apply bounded compression. If text still cannot be presented comfortably, ALARE may fail gracefully rather than race absurdly — but make a best effort to expose all lines. Surface a density warning/debug metric rather than silently pretending success.

------------------------------------------------------------------------

# 18. Acceptance Criteria

ALARE 1.0 is successful when:

1.  Lyrics assignments offer **Lyric tracking: Simple Scroll | ALARE**; existing configs remain Simple Scroll.
2.  Simple Scroll preserves today's approximate `progress × 55%` vertical scroll (compatibility mode).
3.  Any lyric blob can be processed without requiring section tags.
4.  Selecting ALARE automatically strips bracketed information from the ALARE display and analytical timing input (ASCII `[ ... ]` only; chords included).
5.  ALARE does not offer a preserve-bracketed-text mode; `lyricsRemoveBracketed` remains for Simple Scroll only.
6.  Original stored lyric text remains unchanged.
7.  ALARE uses normalized plain text (brackets + markdown stripped); Simple Scroll may still show Markdown.
8.  No deduplication of repeated chorus sections.
9.  Blank-line-separated blocks are detected; individual lyric lines preserved.
10. Character, word, and syllable metrics are calculated; every line receives a timing weight.
11. Timeline uses centralized `resolveTrackDuration()`; intervals do not overlap; gaps permitted.
12. Vertical ALARE is geometry-aware; `targetVisibleLines` is clamped safely.
13. Even and odd visible line counts supported; fade derives per-line opacity; no-fade mode functions.
14. ALARE fade replaces `lyricsEdgeFade` under ALARE (not stacked by default).
15. Seek jumps lyric position; pause freezes; resume continues; follows main playback clock (~0.4s VC mirror drift acceptable).
16. Timeline recomputes on song/lyric/duration/timing-config change; display plan on font/geometry/layout/fade preference change.
17. Designer shows a representative static layout plan (no fake timing playback in Phase 1).
18. Fallback lyrics use ALARE when ALARE is selected (same normalization and timing).
19. The host does not manually scroll during live ALARE playback.
20. Complete lyric exposure is a best-effort strong goal with graceful degradation under extreme density.
21. `audioActivity?` hook exists; audio assist disabled and non-blocking in Phase 1.

**Deferred to later phases:** horizontal ALARE (criteria formerly 21–22), live audio assist (26–28 until Phase 2).

------------------------------------------------------------------------

# 19. Explicit Non-Goals

ALARE 1.0 does not attempt:

-   karaoke synchronization
-   word-level timestamps
-   syllable-level timestamps
-   phoneme alignment
-   speech recognition
-   lyric transcription
-   semantic section classification
-   chorus detection
-   verse detection
-   interpretation of bracketed production instructions
-   preservation of bracketed text in ALARE display mode
-   guaranteed vocal detection
-   manual timestamp authoring
-   replacement for synchronized lyric standards

------------------------------------------------------------------------

# 20. Relationship to Other Lyric Tracking Modes

Song Pages VC lyrics support two lyric-tracking modes at the assignment level:

| Mode | Behavior |
|------|----------|
| **Simple Scroll** (default) | Today's compatibility algorithm: vertical `translateY` proportional to playback progress (~55% scroll range). Supports optional `lyricsEdgeFade`, optional `lyricsRemoveBracketed`, and Markdown display. Existing configurations remain on this mode. |
| **ALARE** | Normalized plain-text approximate line timeline, vertical multi-line window, per-line opacity fade. Mandatory bracket strip; markdown stripped for ALARE display. |

ALARE is one lyric-tracking approach within Song Pages. After testing, ALARE may become the default for **new** lyric assignments; do not migrate existing configs in the first sprint.

Other lyric-tracking modes may:

-   preserve bracketed text (Simple Scroll + optional toggle)
-   expose more of the original lyric formatting (Markdown under Simple Scroll)
-   use simpler scrolling models
-   make fewer normalization changes
-   provide greater display flexibility
-   be more prone to timing drift or visible mistakes

ALARE intentionally makes a different tradeoff:

> **ALARE removes bracketed text, normalizes the lyric representation,
> and uses display-aware approximate pacing to improve the odds of a
> coherent hands-free presentation.**

The host's selection of ALARE therefore carries an explicit behavioral
consequence: bracketed text is not shown.

------------------------------------------------------------------------

# 21. Core Product Rule

> **ALARE automatically moves a complete normalized lyric set through a
> song at a plausible approximate pace using lyric density, song
> duration, actual display geometry, font metrics, and optionally weak
> audio activity evidence.**

> **When ALARE is selected, bracketed text is automatically stripped
> from the ALARE display and timing representation. The original stored
> lyrics remain unchanged. Other lyric-tracking modes may preserve
> bracketed text.**

The system succeeds when viewers can comfortably follow and read lyrics
without requiring the host to manually operate the lyric display.

------------------------------------------------------------------------

# 22. Song Pages VC integration (locked decisions)

This section records implementation decisions agreed for the first ALARE sprint. It supplements §1–§21 and should be updated if product choices change.

## 22.1 Assignment UI

- Add **Lyric tracking: Simple Scroll | ALARE** on lyrics assignments.
- **Default:** Simple Scroll for all existing saved configurations.
- When ALARE is selected: hide or disable **Remove bracketed text** (`lyricsRemoveBracketed`); stripping is automatic.
- Simple Scroll keeps `lyricsRemoveBracketed`, `lyricsEdgeFade`, and Markdown display unchanged.

## 22.2 Recomputation

| Artifact | Recompute when |
|----------|----------------|
| **Timing timeline** | Song change, normalized lyric change, duration change, timing-config change |
| **Display plan** | Font change, cell resize, layout change, visible-line preference, fade config, window geometry |

Cache by appropriate content/config hashes where useful; **correctness first**.

## 22.3 Playback sync

- **Seek:** jump immediately to the ALARE position for `currentTime`.
- **Pause:** freeze lyric position.
- **Resume:** continue from frozen position.
- **Song skip:** build/load new timeline for the new track.
- **Clock:** follow authoritative **main playback state**, not an independent VC accumulator. Existing ~0.4s VC audio mirror drift is acceptable.

## 22.4 Designer preview (Phase 1)

Show a **representative static layout plan**: resolved visible-line window, wrapping, typography, fade profile, using assigned lyric content when available. **No fake timing playback** in the Designer this sprint. Live VC is where hosts validate progression (e.g. demo 2–3 songs before going live).

## 22.5 Fallback lyrics

When VC shows host/catalog fallback text instead of song lyrics, run **the same ALARE pipeline** if ALARE is selected. Do not silently fall back to Simple Scroll.

## 22.6 Shared code reuse

- Bracket stripping for ALARE should use `stripBracketedLyricsText` in `shared/lyricsText.ts` (see `documentation/shared-utilities.md`).
- Markdown stripping for ALARE uses `stripMarkdownLyricsText` / `normalizeAlareLyricsText` in the same module (basic regex pass; no demo lyrics use Markdown today).
- Add `resolveTrackDuration()` in `shared/` (or adjacent VC module) as the single duration entry point for ALARE.
- ALARE engine modules should live under `shared/` when usable from VC window and designer without duplication.

## 22.7 Out of scope (this sprint)

- Main listener player lyric display
- Compiled static Song Pages lyric pages
- Horizontal ALARE (§12)
- Phase 2 audio IPC and analysis plumbing
- Fake ALARE animation in Designer
