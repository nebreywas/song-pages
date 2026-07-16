# Shared utilities

**Status:** Canonical · **Index:** [README.md](./README.md)

Reusable **functions** in `shared/` that are safe to call from the renderer, compiler, Electron main, and VC window. Import via the `@shared/…` alias (Vite) or relative paths from `compiler/`.

For **types, IPC payloads, and persisted config shapes**, see the domain docs ([vc-mode-architecture.md](./vc-mode-architecture.md), [manifest-schemas.md](./manifest-schemas.md), [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md)). This file is for **behavior** you might need in more than one place.

When you add a new cross-cutting helper under `shared/`, export it from a small module (not buried inside a feature folder) and add a row here.

---

## Catalog

| Function | Module | Use when |
|----------|--------|----------|
| `stripBracketedLyricsText` | `shared/lyricsText.ts` | Display-time removal of `[Chorus]`-style annotations from lyrics |
| `stripMarkdownLyricsText` | `shared/lyricsText.ts` | Basic Markdown marker removal for ALARE plain-text normalization |
| `normalizeAlareLyricsText` | `shared/lyricsText.ts` | ALARE pipeline: brackets then Markdown (derived text only) |
| Lyric presentation effects | `shared/lyricEffects/` | Agnostic Beat Pulse / Matrix Reveal / Clarity / Audio-Reactive Type (no timing semantics) |
| Pretty Lyrics compiler | `shared/prettyLyrics/` | Text-analysis typography manifest (lab prototype; recurrence-first) |
| `formatPlaybackTime` | `shared/formatPlaybackTime.ts` | Format seconds as `m:ss` for player and VC surfaces |
| `renderMarkdownToHtml` | `shared/markdown.ts` | Compile or preview markdown from manifests/drafts → sanitized HTML |

Tests for shared utilities live beside the module (`shared/*.test.ts`) and run with `npm test`.

---

## Lyrics text — `stripBracketedLyricsText`

**Module:** `shared/lyricsText.ts`

Removes square-bracket segments from lyrics **at display time**. Stored song/manifest lyrics are never modified.

```ts
import { stripBracketedLyricsText } from '@shared/lyricsText';

stripBracketedLyricsText('[Verse 1]\nHello [softly] world\n[Chorus]\nAgain');
// → '\nHello world\n\nAgain'

stripBracketedLyricsText('[Verse 1]\n[Bridge]\n[Chorus]\nLine one');
// → '\n\nLine one'  (triple+ newlines capped at double)
```

**Behavior:**

- Strips every `[…]` segment on each line (non-nested; typical stage-direction style).
- Collapses runs of spaces left after removal.
- Lines that contained **only** bracket annotations become empty lines (verse spacing is preserved).
- Runs of three or more newlines are collapsed to two (at most one blank line between blocks).
- Does not trim the whole document.

**Where it is used today:**

| Surface | Wiring |
|---------|--------|
| VC Mode (live + designer preview) | Lyrics assignment override `lyricsRemoveBracketed` → applied in `shared/vcMode/contentResolution.ts` during `applySongPresentation` |

**VC designer:** Song slot **Lyrics** → **Bracketed text** → **Remove bracketed text** (default off). Setting is persisted on the cell’s `songSlotA` / `songSlotB` overrides.

**Reuse elsewhere:** Static compile (`compiler/`), artist editor preview, listener UI — import `stripBracketedLyricsText` directly; do not duplicate the regex. Call immediately before render (plain text or before `renderMarkdownToHtml`).

---

## ALARE plain text — `stripMarkdownLyricsText` / `normalizeAlareLyricsText`

**Module:** `shared/lyricsText.ts`

Basic Markdown syntax removal for ALARE. **Not** a full parser — regex pass over common markers. Current demo content does not use Markdown in lyrics; this is sufficient for Phase 1.

```ts
import { normalizeAlareLyricsText, stripMarkdownLyricsText } from '@shared/lyricsText';

stripMarkdownLyricsText('**Hello** world'); // → 'Hello world'
normalizeAlareLyricsText('[Verse]\n**Line** one'); // → 'Line one'
```

`normalizeAlareLyricsText` = `stripBracketedLyricsText` then `stripMarkdownLyricsText`. Use for ALARE analysis and display; never write back to stored lyrics.

See [ALARE.md](./ALARE.md) §4.7.

---

## Playback time — `formatPlaybackTime`

**Module:** `shared/formatPlaybackTime.ts`

```ts
formatPlaybackTime(125); // → '2:05'
formatPlaybackTime(-1);  // → '0:00' (invalid input)
```

Used for elapsed/remaining and song-length VC slots via `shared/vcMode/contentResolution.ts`.

---

## Markdown — `renderMarkdownToHtml`

**Module:** `shared/markdown.ts`

GFM markdown → **sanitized** HTML for compiled static pages and trusted in-app previews. Allowed tags/schemes are locked down for guest-facing output.

```ts
import { renderMarkdownToHtml } from '@shared/markdown';

const html = renderMarkdownToHtml(song.about);
```

In-app React previews often use `src/lib/markdownPreview.ts` (lighter path for designer). **Compiled artist pages** use `renderMarkdownToHtml` from `compiler/`.

---

## Related modules (not function catalogs)

| Area | Location | Doc |
|------|----------|-----|
| VC content resolution | `shared/vcMode/contentResolution.ts` | [vc-mode-architecture.md](./vc-mode-architecture.md) |
| Assignment overrides | `shared/vcMode/assignmentSettings.ts` | [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md) |
| Host content helpers | `shared/hostContent/*` | [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md) |
| CSP / app mode constants | `shared/siteCsp.ts`, `shared/appClient.ts` | [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) |
