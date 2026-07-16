5. Source parsing and normalization
Preserve two versions of every unit:
interface SourceText {
  raw: string;
  normalized: string;
}
raw is rendered. normalized is analyzed.
Normalization should:

Convert line endings to \n.
Apply Unicode normalization.
Trim outer whitespace.
Preserve original line boundaries.
Preserve blank lines as block boundaries.
Exclude standalone bracket-metadata lines.
Collapse repeated internal whitespace for analysis.
Lowercase analysis text.
Remove non-meaningful punctuation from similarity keys.
Preserve apostrophes inside words such as tryin', I'm, and wouldn't.
Preserve hyphenated words as one token where practical.
Do not silently rewrite the rendered lyrics.
6. Textual evidence pipeline
Stage A: Blocks and line shape
Blank lines define initial blocks. They are not assumed to be verses or choruses.
Each block receives observable features:

interface BlockFeatures {
  lineCount: number;
  wordCount: number;
  characterCount: number;
  meanLineLength: number;
  lineLengthVariance: number;
  repeatedLineRatio: number;
  repeatedPhraseRatio: number;
  densityScore: number;
}
Possible non-semantic block classifications:
type BlockShape =
  | 'standard'
  | 'sparse'
  | 'dense'
  | 'repeated'
  | 'parallel'
  | 'transition';
These are typography inputs, not claims about song structure.
Stage B: Exact recurrence
Create maps for:
normalized lines
normalized words
line-start phrases
line-end phrases
Record exact recurrence before any fuzzy matching.
Examples:

High in paradise
High in paradise
These share a line-recurrence group.
I can finally see paradise
With open eyes

I can finally see paradise
With open eyes
These form both line-recurrence and repeated-block groups.
Exact recurrence is the highest-confidence lyrical signal in the system.

Stage C: Repeated phrase detection
Generate normalized n-grams of two through five words.
Reject a candidate when:

it appears only once
it consists entirely of stop words
it is contained entirely within a longer recurring phrase with the same occurrences
it crosses a line boundary in V1
it contains only punctuation
Score candidates using:
phraseScore =
  lengthWeight *
  occurrenceWeight *
  contentWordRatio *
  coverageWeight;
This should detect phrases such as:
high in paradise
with open eyes
just tryin
help myself
never enough
Repeated phrases become motifs. Every occurrence of a motif should retain some visual identity.
Stage D: Near-repeated line detection
Do not compare every possible line pair indiscriminately.
First reject pairs where:

either line has fewer than three meaningful tokens
word-count ratio is outside a reasonable range
character-count difference is extreme
the lines have no content-word overlap
For remaining pairs:
tokenSimilarity = diceCoefficient(tokensA, tokensB);

editSimilarity =
  1 -
  levenshteinDistance(normalizedA, normalizedB) /
  Math.max(normalizedA.length, normalizedB.length);

combinedSimilarity =
  tokenSimilarity * 0.6 +
  editSimilarity * 0.4;
Initial experiment thresholds:
exact: 1.0
nearDuplicate: >= 0.84
related: >= 0.72
unrelated: < 0.72
Treat these thresholds as tuneable demo values, not established truths.
Stage E: Anaphora and epistrophe
These are especially useful for lyric typography.
Anaphora
Detect consecutive or nearby lines beginning with the same one-to-three meaningful tokens:
I can't believe my eyes
I'm high in paradise
I'm high...
Epistrophe
Detect lines ending with the same one-to-three meaningful tokens:
With open eyes
I can't believe my eyes
Repeated starts and ends can create consistent visual treatment even when the whole lines differ.
Stage F: Lexical features
Use part-of-speech data to classify words broadly:
type LexicalRole =
  | 'proper-noun'
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'connector'
  | 'determiner'
  | 'unknown';
Do not make every noun large or every verb colorful. POS is one ingredient in visual salience.
Recommended base content weights:

const POS_CONTENT_WEIGHT: Record<LexicalRole, number> = {
  'proper-noun': 1.0,
  noun: 0.9,
  verb: 0.85,
  adjective: 0.8,
  adverb: 0.55,
  unknown: 0.45,
  pronoun: 0.2,
  connector: 0.1,
  determiner: 0.05,
};
Maintain an internal stop-word list. A stop word can still be promoted when it belongs to a repeated phrase or repeated opening. It should not be permanently forbidden from treatment.
Stage G: Textual density
Calculate:
word count
character count
syllable estimate
average word length
punctuation count
content-word ratio
Do not call this syllables per beat or performed density.
interface LineDensity {
  wordCount: number;
  syllableEstimate: number;
  characterCount: number;
  averageWordLength: number;
  contentWordRatio: number;
  normalizedDensity: number;
}
Normalize line measurements using percentiles across the song rather than raw min/max. One unusually long line should not flatten every other result.
Short lines can usually tolerate larger typography. Dense lines require tighter typography. This is a layout calculation, not inferred emotional importance.

Stage H: Phonetic tail groups
Take the final meaningful word of each line and calculate its Double Metaphone codes.
Group terminal words when:

their primary codes match, or
one primary code matches the other's secondary code
the group occurs at least twice
the terminal words are not identical solely because of exact line repetition
Output:
interface PhoneticFamily {
  id: string;
  tokenIds: string[];
  confidence: 'low' | 'medium';
}
Keep confidence capped. Double Metaphone indicates likely pronunciation similarity, not poetic rhyme. Use it for restrained treatments such as matching terminal underlines or accent hues—not as a reason to make words enormous.
7. Additional high-value lyrical algorithms
These are more valuable than general sentiment analysis.
Parallel-line detection
Generate a simplified POS skeleton:
PRONOUN VERB NOUN
PRONOUN VERB NOUN
Lines with similar skeletons and comparable length can share a layout pattern.
Pivot-word detection
Maintain a small explicit list:
const PIVOT_WORDS = new Set([
  'but',
  'then',
  'now',
  'before',
  'after',
  'still',
  'finally',
  'until',
  'when',
  'yet',
  'instead',
]);
These words often organize the textual movement of lyrics. A pivot can influence line spacing or create a local color transition. It should not automatically become the largest word.
Internal recurrence
Detect repeated content words within one line:
Paradise, paradise, paradise
The recurrence itself is useful evidence. All occurrences can share a motif treatment while one receives anchor status according to a fixed compositional rule.
Alliteration
Detect nearby content words beginning with the same consonant sound or letter:
stand still
spread myself
In the first demo, use spelling-based initials. Phonetic initial matching can come later.
Alliteration can justify a shared color family or underline style.

Contrast in line shape
Detect abrupt changes:
long line followed by a one-word line
dense block followed by sparse block
repeated block followed by novel block
punctuation-heavy line following punctuation-free lines
These transitions can drive spacing and layout changes without interpreting meaning.
8. Visual salience
Every token receives separate evidence scores:
interface TokenEvidenceScores {
  content: number;
  motif: number;
  rarity: number;
  phraseMembership: number;
  lineTerminal: number;
  pivot: number;
  phoneticFamily: number;
  localRepetition: number;
}
Initial visual-salience formula:
visualSalience =
  content * 0.28 +
  motif * 0.26 +
  phraseMembership * 0.16 +
  rarity * 0.10 +
  localRepetition * 0.08 +
  lineTerminal * 0.05 +
  pivot * 0.04 +
  phoneticFamily * 0.03;
This is intentionally weighted toward lexical content and recurrence.
Sentiment is absent.

Important distinction
A word can be visually interesting in two different ways:
Distinctive: unusual, vivid, or structurally prominent
Motivic: recurring and visually unifying
Do not reduce both to one frequency score.
For example:

mountains might score strongly as distinctive.
paradise might score strongly as a motif.
the should usually remain quiet.
I may become important when it starts many parallel lines.
9. Typographic roles
Resolve scores into a small vocabulary:
type TokenTypographyRole =
  | 'quiet'
  | 'standard'
  | 'accent'
  | 'anchor'
  | 'motif'
  | 'phonetic-tail';
Quiet
Connectors and low-salience words. Smaller or lower-contrast, but always readable.
Standard
Most words.
Accent
A content word with meaningful evidence.
Anchor
The strongest compositional word or phrase in a line.
Motif
A recurring word or phrase whose treatment remains recognizable across the song.
Phonetic tail
A restrained line-ending connection, usually expressed through underline or color identity.
10. Emphasis budget
This is essential to avoiding visual noise.
Default limits:

interface EmphasisBudget {
  maxAnchorsPerLine: 1;
  maxAccentsPerLine: 2;
  maxUnderlinedGroupsPerLine: 1;
  maxStrongTreatmentsPerBlock: number;
  minimumStandardTokenRatio: 0.6;
}
Recommended global target:
60–75% standard or quiet
15–30% accent
5–10% anchor or motif-heavy
no more than one major scale jump in most lines
An entire repeated phrase may count as one treatment.
The composer must run a final enforceEmphasisBudget() pass after assigning candidate styles.

11. Visual rules
Font size
Line size begins with line shape:
lineScale =
  baseScale *
  shortLineAdjustment *
  blockAdjustment;
Token scale then applies within a narrow range:
quiet:    0.82–0.94
standard: 1.00
accent:   1.05–1.18
anchor:   1.20–1.52
motif:    1.08–1.35
Avoid extreme word-size differences until the first demos prove they remain readable.
Weight
Use weight before size whenever possible:
quiet: 400
standard: 500
accent: 600
anchor: 700–800
motif: 600–800
Color
Each preset should use a curated palette with semantic roles:
interface TypographyPalette {
  background: string;
  base: string;
  quiet: string;
  accents: readonly string[];
  motifs: readonly string[];
  underline: readonly string[];
}
Color assignment rules:
recurring motif groups retain a stable color identity
anchor words receive an accent color
phonetic families may share underline color
quiet words use a restrained neutral
ordinary words remain base-colored
different motifs should avoid adjacent identical colors
palette choice is seeded per track
color choice within a motif is deterministic
Do not color every word separately.
Underlines
Underlines must mean one of:
repeated phrase membership
recurring line-ending family
strong parallel phrase
explicit author styling in a future version
They should not be randomly assigned.
Alignment
Possible rules:
strongly repeated blocks: centered or consistently aligned
dense unique blocks: left aligned
sparse blocks: centered or narrower
parallel blocks: shared indentation pattern
one-line transition blocks: isolated with extra space
These are preset rules, not hardcoded universal behavior.
Spacing
Use blank lines, block boundaries, and line-shape transitions.
Avoid arbitrary vertical gaps based only on the seed.

12. Determinism and explainability
Every manifest must be reproducible from:
compilerVersion +
styleVersion +
trackIdOrLyricsHash +
presetId
No Math.random().
Seeded variation may decide:

which equivalent accent color a motif receives
which of two valid line-layout templates is used
whether an anchor uses weight-first or size-first treatment
tie-breaking between equally scored tokens
It may not decide:
which low-salience word becomes an anchor
whether a word is a motif
whether two lines are related
whether an underline exists without textual evidence
Every styled token should carry reasons:
interface StyleReason {
  rule:
    | 'repeated-phrase'
    | 'repeated-line'
    | 'line-anchor'
    | 'content-word'
    | 'parallel-opening'
    | 'phonetic-tail'
    | 'pivot'
    | 'line-shape'
    | 'seeded-tiebreak';

  evidenceId?: string;
  score?: number;
}
The developer view should be able to explain:
mountains
Role: anchor
Reasons:
- noun/content score: 0.90
- distinctive within song: 0.84
- strongest eligible token on line
Color: accent-2
Scale: 1.36
That diagnostic view will be extremely important while determining whether the system is genuinely “on point” or merely attractive.
13. Manifest model
interface LyricTypographyManifest {
  compilerVersion: number;
  styleVersion: number;
  sourceHash: string;
  presetId: string;
  trackSeed: number;

  metrics: {
    compileMs: number;
    lineCount: number;
    tokenCount: number;
    excludedMetadataLines: number;
  };

  blocks: TypographyBlock[];
  repetitionGroups: RepetitionGroup[];
  phraseMotifs: PhraseMotif[];
  phoneticFamilies: PhoneticFamily[];
}

interface TypographyBlock {
  id: string;
  sourceIndex: number;
  shape: BlockShape;
  features: BlockFeatures;
  layout: BlockLayout;
  lines: TypographyLine[];
}

interface TypographyLine {
  id: string;
  rawText: string;
  normalizedText: string;
  features: LineFeatures;
  layout: LineLayout;
  tokens: TypographyToken[];
}

interface TypographyToken {
  id: string;
  rawText: string;
  normalizedText: string;
  lexicalRole: LexicalRole;
  evidence: TokenEvidenceScores;

  typography: {
    role: TokenTypographyRole;
    colorRole: string;
    scale: number;
    weight: number;
    underline: boolean;
    opacity: number;
  };

  reasons: StyleReason[];
}
14. React rendering architecture
function LyricTypographyView({
  manifest,
}: {
  manifest: LyricTypographyManifest;
}) {
  return (
    <div className={`lyric-typography preset-${manifest.presetId}`}>
      {manifest.blocks.map((block) => (
        <TypographyBlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
Each line should be memoized:
const TypographyLineView = memo(function TypographyLineView({
  line,
}: {
  line: TypographyLine;
}) {
  return (
    <div
      className={`typography-line layout-${line.layout.kind}`}
      style={{
        '--line-scale': line.layout.scale,
        '--space-before': `${line.layout.spaceBefore}rem`,
        '--space-after': `${line.layout.spaceAfter}rem`,
      } as React.CSSProperties}
    >
      {line.tokens.map((token) => (
        <span
          key={token.id}
          className={`typography-token role-${token.typography.role}`}
          style={{
            '--token-scale': token.typography.scale,
            '--token-weight': token.typography.weight,
            '--token-opacity': token.typography.opacity,
            '--token-color': `var(--${token.typography.colorRole})`,
          } as React.CSSProperties}
          data-token-id={token.id}
        >
          {token.rawText}
        </span>
      ))}
    </div>
  );
});
Do not recalculate the manifest on scroll. Scrolling is ordinary document scrolling.
15. Performance plan
Performance targets
Set project targets rather than vague “fast” requirements:
Scenario	Target
Cold compiler initialization and first song	Under 1,000 ms
Warm compile, ordinary song	Under 100 ms
Warm compile, large lyric file	Under 250 ms
Cache hit	Under 10 ms
Network requests	0
Render-time analysis	0
Define an ordinary song as approximately:
up to 250 lines
up to 2,500 word tokens
These are generous limits for normal lyrics.
Loading
Use a dynamic import for the compiler bundle:
const compilerModule = await import(
  './typography/compiler/compileLyricTypography'
);
Preload it quietly after the main Song Pages UI becomes idle so it is likely warm before the user opens lyrics.
Caching
Cache by:
sourceHash : compilerVersion : styleVersion : presetId
Store the manifest in memory first. Persisting it can come after the demos.
Main thread versus Web Worker
Begin with the compiler as a pure synchronous function and benchmark it.
Move compilation into a worker only when:

P95 warm compilation exceeds the target
profiling reveals a visible renderer hitch
a larger language model is introduced
A worker protects responsiveness but does not inherently reduce total compile time. Do not complicate Demo 1 before evidence says it is necessary.
Similarity optimization
Line comparison is potentially quadratic. Keep it fast by:
grouping lines by approximate word count
rejecting extreme length differences
requiring content-word overlap before Levenshtein
skipping metadata and empty lines
memoizing normalized strings
calculating exact matches first
comparing blocks only after line-level fingerprints exist
Rendering
The output is static. Avoid:
component state per word
runtime observers per token
animation frames
scroll-triggered recalculation
measuring every word through the DOM
layout changes after initial render
16. Demo sequence
The purpose of the demos is to determine which analyses visibly earn their complexity.
Demo 0 — Composition shell
Build:
source parser
bracket-line removal
blocks and lines
deterministic palettes
static scroll renderer
diagnostics panel
compile timer
plain/composed toggle
Use only:
line length
word length
fixed stop words
deterministic tie-breaking
This validates the visual architecture, not the NLP.
Demo 1 — Recurrence engine
Add:
exact repeated lines
two-to-five-word repeated phrases
repeated openings
repeated endings
block repetition
motif identity
This is likely to create the largest initial quality gain.
The diagnostic panel should let you disable each recurrence signal independently.

Demo 2 — Lexical composition
Add:
compromise/two
part-of-speech roles
content-word scoring
anchor selection
emphasis budgets
parallel POS skeletons
pivot words
This tests whether text-aware emphasis materially improves the typography.
Demo 3 — Density and sound
Add:
syllable
double-metaphone
terminal sound-family treatments
line-density normalization
short-line and dense-line layout behavior
initial alliteration detection
Phonetic treatments should be independently toggleable because they may be helpful on some songs and noisy on others.
Demo 4 — Preset comparison
Keep one compiler manifest and create three composers:
Editorial Neon
Closest to the screenshots:
dark background
multiple accent hues
underlines
strong motif colors
moderate scale variance
Poster
fewer colors
stronger size hierarchy
more centered repeated blocks
larger block spacing
Dense Magazine
mostly left aligned
restrained size variance
strong weight and underline logic
suited to rap and word-dense material
The important test is whether the same evidence produces three coherent outputs without changing the analysis.
17. Developer test harness
Add a developer page with:
raw lyric editor
preset selector
plain/composed comparison
compile-time display
source-hash display
seed display
signal toggles
token diagnostics
manifest JSON viewer
viewport-width controls
screenshot capture
golden-song selector
Signal toggles:
[x] Exact line recurrence
[x] Repeated phrases
[x] Repeated openings/endings
[x] POS classification
[x] Syllable density
[x] Phonetic tails
[x] Pivot words
[x] Parallel line structure
Clicking a styled word should show exactly why it looks that way.
18. Test corpus
Use at least these cases:
Repetition-heavy club song
Verse-heavy song with little repetition
Dense rap lyrics
Sparse ballad
Lyrics with no blank lines
Lyrics containing many bracket labels
Repeated one-word lines
Near-duplicate refrains with changed words
Lyrics with contractions and dropped endings
Nonsense words and vocalizations
Very long lines
Non-English lyrics
Mixed-language lyrics
All-uppercase lyrics
Poorly formatted pasted lyrics
Non-English lyrics should still receive universal analysis:
recurrence
token frequency
line shape
punctuation
repeated phrases
English-only enrichment should be marked unavailable rather than producing confident nonsense.
19. Acceptance criteria
V1 is successful when:
The same input, preset, and compiler version produce the same manifest.
Standalone bracket metadata is not displayed.
No visual treatment depends on playback or audio.
Every anchor, motif, underline, and accent has an evidence reason.
Most tokens remain restrained and readable.
Repeated phrases have consistent visual identity.
Dense lines remain within their container.
The renderer works from phone width through full-screen desktop.
Ordinary songs compile comfortably within the warm performance target.
The page scrolls using the existing lyric mechanism without recalculation.
Each analysis provider can be disabled independently.
Visual output still works when all English-specific providers are unavailable.
The compiler and renderer are independently testable.
The whole feature can be removed without disturbing playback architecture.
Recommended implementation order
The coding agent should work in this sequence:
1. Manifest types and pure compiler boundary
2. Source parser and metadata exclusion
3. Static renderer and developer harness
4. Exact recurrence
5. Repeated phrase motifs
6. Emphasis budget
7. POS-based lexical salience
8. Density analysis
9. Phonetic families
10. Three composer presets
11. Profiling and cache
12. Visual regression corpus
Do not begin by installing every algorithm and attempting the final design in one pass.
The first serious checkpoint should be Demo 1: recurrence-driven typography. If that already produces something compelling, every subsequent provider must prove that it improves the result rather than merely making the engine more sophisticated.

---

## Implementation status (prototype)

**Lab entry:** Song Pages menu → **Pretty Lyrics Lab** (`CmdOrCtrl+4`). Mode id: `pretty-lyrics`.

| Area | Status |
|------|--------|
| Manifest + pure compiler | ✅ `shared/prettyLyrics/` |
| Source parser + bracket metadata exclusion | ✅ |
| Developer harness (editor, presets, toggles, diagnostics, named configs) | ✅ `src/pretty-lyrics/` |
| Exact / near line recurrence + phrase motifs + openings/endings | ✅ Demo 1 |
| Emphasis budget + heuristic POS + density + pivots | ✅ Demo 2-lite (no `compromise` yet) |
| Lab ornaments: italics / glow / sibling font-mix | ✅ toggles in Pretty Lyrics Lab (off by default; Semantic Canvas experiments) |
| Phonetic / Double Metaphone | ⏳ reserved toggle; families empty |
| Three composers (Editorial Neon, Poster, Dense Magazine) | ✅ |
| VC Mode / static site compiler / song pages | Stub: lyrics **Lyric typography** Plain \| Pretty (Sample 1); ALARE only; transparent bg |

Named configs persist in `localStorage` (`songpages:pretty-lyrics-named-configs`) so you can tune knobs and reload looks later.

### Lab export for VC hand-off

In Pretty Lyrics Lab → **Named configs**:

1. Optionally name the config.
2. **Download JSON** or **Copy JSON**.
3. Paste back via **Import JSON** to reload.

Envelope format:

```json
{
  "format": "songpages.pretty-lyrics-config",
  "formatVersion": 1,
  "name": "my-default",
  "exportedAt": "…",
  "compilerVersion": 1,
  "styleVersion": 1,
  "options": { …PrettyLyricsCompileOptions }
}
```

Send / drop these files when you want a particular look baked into VC. **Sample 1** is checked in as `PRETTY_LYRICS_SAMPLE_1` / `DEFAULT_VC_PRETTY_LYRICS_OPTIONS`.

---

## VC Mode integration (stub)

1. Lyrics assignment **Lyric typography**: Plain | Pretty (Sample 1). Separate from **Lyric presentation** (Beat Pulse, etc.).
2. Pretty path: `compileLyricTypography(text, DEFAULT_VC_PRETTY_LYRICS_OPTIONS)` once per lyrics change → `VcPrettyAlareTrack`.
3. **Transparent background** in VC — `palette.background` is never painted; theme token colors still apply. Palette pickers in content settings can come later.
4. **Container font fit** — ALARE base size is derived from cell width/height + target visible lines (`resolveAlareContainerFontPx`). Host Font size is a bias, not a fixed px lock. Pretty leaves headroom for anchor scales.
5. **Pretty soft breaks** (optional, lyrics content settings) — long/dense lines may soft-return after a mid-clause `,`/`;` (else mid word). Forced soft-return rows use ~35% of natural line spacing so they read as one line; natural lyric-line gaps stay full. ALARE timeline index stays one line. With soft breaks on, container font fit uses shortened row widths (size up) and taller slot geometry for ALARE fade/scroll estimates. Default off until tuned.
6. Scroll still uses uniform ALARE line slots (temporary). Pixel-height ALARE is next when typography variance is tuned.

Do **not** recompile every RAF. Compile on lyrics/options change only.

---

## Pixel-space ALARE (yes — preferred for Pretty Lyrics)

Today ALARE assumes roughly uniform line slots:

`time → fractional line index → alareScrollOffsetPx(uniform line height)`.

Pretty Lyrics breaks that assumption: anchors/motifs and density change **measured height** per line. Uniform line indexing will feel like the spotlight races through short sparse lines and stalls on tall motif lines.

### Recommended model

1. Compile Pretty Lyrics → get DOM (or estimate) **cumulative Y** for each line/block.
2. Build a height map: `lineStartY[i]`, `totalHeight`.
3. ALARE timeline still allocates **time windows** to lyric units (lines or blocks) — that evidence doesn’t change.
4. Scroll mapping becomes:

```
progress = f(time)           // existing ALARE cue / trim / nudge
yFocus   = sampleHeightMap(progress)   // pixels through layout
translateY = viewportCenter - yFocus
```

So ALARE answers “where are we in the **song text**?” and the layout answers “where is that in **pixels**?”

### Practical notes

- Prefer **measured** heights after first paint (`ResizeObserver` / line getBoundingClientRect) over pure estimates; scales + wrapping differ by font/viewport.
- Keep a cheap estimate path (base line height × lineScale × spacing) for first frame, then reconcile to measured.
- Fade/opacity can stay line-index based; only the **scroll transform** needs pixel space.
- For Simple Scroll + Pretty, map `currentTime/duration → y / totalHeight` the same way — even without ALARE.

This is the right “more cowbell” for VC: typography owns pixels, ALARE owns time.
