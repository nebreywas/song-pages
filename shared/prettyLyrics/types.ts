/**
 * Pretty Lyrics — typography-from-text analysis (Demo 0–1+ prototype).
 * No playback / audio / timing. Deterministic from source + options + preset.
 */

export const PRETTY_LYRICS_COMPILER_VERSION = 1;
export const PRETTY_LYRICS_STYLE_VERSION = 1;

export type SourceText = {
  raw: string;
  normalized: string;
};

export type BlockShape =
  | 'standard'
  | 'sparse'
  | 'dense'
  | 'repeated'
  | 'parallel'
  | 'transition';

export type LexicalRole =
  | 'proper-noun'
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'connector'
  | 'determiner'
  | 'unknown';

export type TokenTypographyRole =
  | 'quiet'
  | 'standard'
  | 'accent'
  | 'anchor'
  | 'motif'
  | 'phonetic-tail';

export type StyleReasonRule =
  | 'repeated-phrase'
  | 'repeated-line'
  | 'related-line'
  | 'track-repetition'
  | 'line-anchor'
  | 'content-word'
  | 'parallel-opening'
  | 'parallel-ending'
  | 'phonetic-tail'
  | 'pivot'
  | 'line-shape'
  | 'seeded-tiebreak'
  | 'local-repetition'
  | 'alliteration'
  | 'density-scale';

export type StyleReason = {
  rule: StyleReasonRule;
  evidenceId?: string;
  score?: number;
  detail?: string;
};

export type BlockFeatures = {
  lineCount: number;
  wordCount: number;
  characterCount: number;
  meanLineLength: number;
  lineLengthVariance: number;
  repeatedLineRatio: number;
  densityScore: number;
};

export type LineDensity = {
  wordCount: number;
  syllableEstimate: number;
  characterCount: number;
  averageWordLength: number;
  contentWordRatio: number;
  normalizedDensity: number;
};

export type LineFeatures = {
  density: LineDensity;
  isRepeatedLine: boolean;
  /** Cousin lines in the relatedThreshold–nearDuplicateThreshold band. */
  isRelatedLine: boolean;
  openingKey: string | null;
  endingKey: string | null;
};

export type TokenEvidenceScores = {
  content: number;
  motif: number;
  rarity: number;
  phraseMembership: number;
  lineTerminal: number;
  pivot: number;
  phoneticFamily: number;
  localRepetition: number;
};

export type TypographyPalette = {
  id: string;
  label: string;
  background: string;
  base: string;
  quiet: string;
  accents: readonly string[];
  motifs: readonly string[];
  underline: readonly string[];
};

export type BlockLayout = {
  align: 'left' | 'center';
  maxWidthEm: number;
  spaceBefore: number;
  spaceAfter: number;
};

export type LineLayout = {
  kind: 'standard' | 'sparse' | 'dense' | 'transition';
  scale: number;
  spaceBefore: number;
  spaceAfter: number;
  /**
   * Horizontal drift as % of the block width (signed).
   * Applied on centered blocks so repeated/sparse lines don't stack as a rigid pillar.
   */
  offsetPct: number;
};

export type TypographyToken = {
  id: string;
  rawText: string;
  normalizedText: string;
  isWord: boolean;
  lexicalRole: LexicalRole;
  evidence: TokenEvidenceScores;
  typography: {
    role: TokenTypographyRole;
    colorRole: string;
    scale: number;
    weight: number;
    underline: boolean;
    opacity: number;
    /** Lab ornament — italics on selective accents / long content words. */
    italic: boolean;
    /** Lab ornament — Semantic Canvas repeat punch (soft text-shadow + slight scale). */
    glow: boolean;
    /**
     * Sibling face drawn from the active pack when enableFontMix maps analysis
     * (salience / motif / rarity / phrase…) into typographic variance.
     * Not a blunt role→font swap — most tokens stay primary.
     */
    fontFace: 'primary' | 'display' | 'alt';
  };
  reasons: StyleReason[];
};

export type TypographyLine = {
  id: string;
  rawText: string;
  normalizedText: string;
  features: LineFeatures;
  layout: LineLayout;
  tokens: TypographyToken[];
};

export type TypographyBlock = {
  id: string;
  sourceIndex: number;
  shape: BlockShape;
  features: BlockFeatures;
  layout: BlockLayout;
  lines: TypographyLine[];
};

export type RepetitionGroup = {
  id: string;
  kind: 'line' | 'related' | 'opening' | 'ending' | 'block';
  key: string;
  count: number;
  lineIds: string[];
};

export type PhraseMotif = {
  id: string;
  phrase: string;
  count: number;
  score: number;
  lineIds: string[];
  /** Stable color slot index into palette.motifs */
  colorIndex: number;
};

export type PhoneticFamily = {
  id: string;
  tokenIds: string[];
  confidence: 'low' | 'medium';
};

export type LyricTypographyManifest = {
  compilerVersion: number;
  styleVersion: number;
  sourceHash: string;
  presetId: string;
  themeId: string;
  fontId: string;
  fontFamily: string;
  letterSpacingEm: number;
  /** Extra space between words (CSS word-spacing), in em. 0 = browser default. */
  wordSpacingEm: number;
  /** Glow halo strength for tokens with typography.glow (lab). */
  glowIntensity: number;
  monochrome: boolean;
  /** Resolved palette used for this compile (curated or harmony-generated). */
  palette: TypographyPalette;
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
};

/** Tunable analysis / composition knobs for the lab harness. */
export type PrettyLyricsCompileOptions = {
  presetId: string;
  /** Color theme — independent of layout preset. */
  themeId: string;
  /** Font pack id (editorial, mono, poster, …). */
  fontId: string;
  /**
   * Monochrome overlay — strips hue from whatever theme is active,
   * keeping luminance roles (bg / quiet / base / accents).
   */
  monochrome: boolean;
  /** Seed hue (0–360) when themeId === 'harmony'. */
  harmonyHue: number;
  harmonyMode: 'analogous' | 'triadic' | 'complementary' | 'split-complementary';
  harmonySurface: 'dark' | 'light';
  /** Optional seed override; default derived from lyrics hash. */
  seed?: number;

  enableExactLineRecurrence: boolean;
  enableRepeatedPhrases: boolean;
  enableRepeatedOpeningsEndings: boolean;
  enableHeuristicPos: boolean;
  enableDensity: boolean;
  enablePivotWords: boolean;
  enableParallelStructure: boolean;
  /** Spelling-initial alliteration on neighboring content words. */
  enableAlliteration: boolean;
  /**
   * When off (default), motifs use color/weight only.
   * When on, uses border-bottom (safer than text-decoration underline).
   */
  enableUnderlines: boolean;
  /**
   * Lab ornament — italics on long unique accents / content words (Semantic Canvas idea).
   * Off by default; experiment in Pretty Lyrics Lab before VC.
   */
  enableItalics: boolean;
  /**
   * Lab ornament — sparse single/double word glow (word-level repeats or lone
   * peaks). Not for motif/phrase groupings.
   */
  enableGlow: boolean;
  /**
   * Visual strength of glow when enableGlow is on (0 = barely there, 1 = default
   * Semantic Canvas halo, >1 = hotter). Does not change which tokens glow.
   */
  glowIntensity: number;
  /**
   * Lab ornament — use sibling faces from the active pack as an extra expressive
   * axis mapped from lyric analysis (salience, motif, rarity, phrase), not a
   * blunt role→font replacement. Most tokens stay on the primary face.
   */
  enableFontMix: boolean;
  /**
   * How strongly analysis scores map into sibling-face promotion (0 ≈ rare,
   * 1 = default, >1 = more tokens pick display/alt). Only used when enableFontMix.
   */
  fontMixStrength: number;
  /**
   * Terminal Double Metaphone families — matching line-end hues/underlines,
   * not size bumps. Off by default; toggle in Lab Signals.
   */
  enablePhoneticTails: boolean;

  phraseMinLength: number;
  phraseMaxLength: number;
  /** Exact near-duplicates — also mark lines as repeated (shape + scale). */
  nearDuplicateThreshold: number;
  /**
   * Softer "cousin" line band (relatedThreshold ≤ sim < nearDuplicateThreshold).
   * Mild evidence only — does not force repeated block shape.
   */
  relatedThreshold: number;

  maxAnchorsPerLine: number;
  maxAccentsPerLine: number;
  minimumStandardTokenRatio: number;

  baseFontScale: number;
  /**
   * How strongly measurement scores (salience, density, rarity, motif) map into size.
   * 0 ≈ almost flat; 1 = default expressive; >1 = more cowbell.
   */
  sizeVariance: number;
  shortLineBoost: number;
  denseLineTighten: number;
  anchorMaxScale: number;
  motifMaxScale: number;
  accentMaxScale: number;

  blockSpacing: number;
  lineSpacing: number;
  /**
   * Extra CSS word-spacing between tokens on a line (em). 0 = default glue.
   * Lab knob for tightening/loosening the horizontal rhythm of a line.
   */
  wordSpacingEm: number;
  /**
   * Max ±% horizontal drift from center for centered blocks (0 = rigid column).
   * Seeded per line so output stays deterministic.
   */
  centerDriftPct: number;
};

export const DEFAULT_PRETTY_LYRICS_OPTIONS: PrettyLyricsCompileOptions = {
  presetId: 'editorial-neon',
  themeId: 'coastal-dusk',
  fontId: 'editorial',
  monochrome: false,
  harmonyHue: 210,
  harmonyMode: 'analogous',
  harmonySurface: 'dark',
  enableExactLineRecurrence: true,
  enableRepeatedPhrases: true,
  enableRepeatedOpeningsEndings: true,
  enableHeuristicPos: true,
  enableDensity: true,
  enablePivotWords: true,
  enableParallelStructure: true,
  enableAlliteration: true,
  enableUnderlines: false,
  enableItalics: false,
  enableGlow: false,
  glowIntensity: 1,
  enableFontMix: false,
  fontMixStrength: 1,
  enablePhoneticTails: false,
  phraseMinLength: 2,
  phraseMaxLength: 5,
  nearDuplicateThreshold: 0.84,
  relatedThreshold: 0.72,
  maxAnchorsPerLine: 1,
  maxAccentsPerLine: 2,
  minimumStandardTokenRatio: 0.55,
  baseFontScale: 1,
  sizeVariance: 1.15,
  shortLineBoost: 1.22,
  denseLineTighten: 0.88,
  anchorMaxScale: 1.55,
  motifMaxScale: 1.38,
  accentMaxScale: 1.2,
  blockSpacing: 1.35,
  lineSpacing: 0.55,
  wordSpacingEm: 0,
  centerDriftPct: 8,
};
