/**
 * Pretty Lyrics Lab — standalone prototype harness.
 * Song Pages menu → Pretty Lyrics Lab. Does not touch Listener / VC / playback.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  buildPrettyLyricsExport,
  compileLyricTypography,
  DEFAULT_PRETTY_LYRICS_OPTIONS,
  getPrettyLyricsFont,
  getPrettyLyricsThemeMeta,
  HARMONY_MODE_IDS,
  parsePrettyLyricsExportJson,
  prettyLyricsExportToJson,
  PRETTY_LYRICS_FONT_IDS,
  PRETTY_LYRICS_FONTS,
  PRETTY_LYRICS_PRESET_IDS,
  PRETTY_LYRICS_PRESETS,
  PRETTY_LYRICS_THEME_IDS,
  resolvePrettyLyricsPalette,
  SAMPLE_PRETTY_LYRICS,
  SAMPLE_PRETTY_LYRICS_DENSE,
  SAMPLE_PRETTY_LYRICS_SPARSE,
  type HarmonyMode,
  type PrettyLyricsCompileOptions,
  type TypographyToken,
} from '@shared/prettyLyrics';

import { downloadPrettyLyricsPng } from './downloadPrettyLyricsPng';
import { LyricTypographyView } from './LyricTypographyView';
import {
  deletePrettyLyricsNamedConfig,
  listPrettyLyricsNamedConfigs,
  savePrettyLyricsNamedConfig,
} from './namedConfigs';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="pretty-lab-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="pretty-lab-slider">
      <span>
        {label} <strong>{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PrettyLyricsLab() {
  const [lyrics, setLyrics] = useState(SAMPLE_PRETTY_LYRICS);
  const [options, setOptions] = useState<PrettyLyricsCompileOptions>({
    ...DEFAULT_PRETTY_LYRICS_OPTIONS,
  });
  const [showComposed, setShowComposed] = useState(true);
  const [showJson, setShowJson] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TypographyToken | null>(null);
  const [namedConfigs, setNamedConfigs] = useState(() => listPrettyLyricsNamedConfigs());
  const [configName, setConfigName] = useState('');
  const [importText, setImportText] = useState('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [pngBusy, setPngBusy] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const lyricsCanvasRef = useRef<HTMLDivElement>(null);

  const patch = <K extends keyof PrettyLyricsCompileOptions>(
    key: K,
    value: PrettyLyricsCompileOptions[K],
  ) => setOptions((prev) => ({ ...prev, [key]: value }));

  const manifest = useMemo(() => compileLyricTypography(lyrics, options), [lyrics, options]);

  // Dismiss the PNG context menu on outside click / Escape.
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const downloadPreviewPng = async () => {
    const node = lyricsCanvasRef.current;
    if (!node || pngBusy) return;
    setCtxMenu(null);
    setPngBusy(true);
    setExportStatus('Rendering PNG…');
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadPrettyLyricsPng(
        node,
        `pretty-lyrics-${options.themeId}-${stamp}.png`,
        manifest.palette.background,
      );
      setExportStatus('Downloaded PNG of lyrics canvas.');
    } catch (err) {
      console.error(err);
      setExportStatus('PNG export failed — check the console.');
    } finally {
      setPngBusy(false);
    }
  };

  const activePalette = useMemo(
    () =>
      resolvePrettyLyricsPalette({
        themeId: options.themeId,
        harmonyHue: options.harmonyHue,
        harmonyMode: options.harmonyMode,
        harmonySurface: options.harmonySurface,
        monochrome: options.monochrome,
      }),
    [
      options.themeId,
      options.harmonyHue,
      options.harmonyMode,
      options.harmonySurface,
      options.monochrome,
    ],
  );

  const themeMeta = getPrettyLyricsThemeMeta(options.themeId);
  const fontMeta = getPrettyLyricsFont(options.fontId);

  const saveConfig = () => {
    if (!configName.trim()) return;
    savePrettyLyricsNamedConfig(configName, options);
    setNamedConfigs(listPrettyLyricsNamedConfigs());
    setConfigName('');
  };

  const exportBundle = () => {
    const name = configName.trim() || 'pretty-lyrics-default';
    const json = prettyLyricsExportToJson(buildPrettyLyricsExport(options, name));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^\w.-]+/g, '-').toLowerCase() || 'pretty-lyrics'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus(`Downloaded ${a.download}`);
  };

  const copyExport = async () => {
    const name = configName.trim() || 'pretty-lyrics-default';
    const json = prettyLyricsExportToJson(buildPrettyLyricsExport(options, name));
    try {
      await navigator.clipboard.writeText(json);
      setExportStatus('Copied export JSON to clipboard.');
    } catch {
      setExportStatus('Clipboard blocked — use Download instead.');
    }
  };

  const applyImport = () => {
    const parsed = parsePrettyLyricsExportJson(importText);
    if (!parsed.ok) {
      setExportStatus(parsed.error);
      return;
    }
    setOptions({ ...parsed.config.options });
    if (parsed.config.name) setConfigName(parsed.config.name);
    setExportStatus(`Imported “${parsed.config.name}”.`);
  };

  return (
    <div className="panel pretty-lab">
      <div className="pretty-lab-header">
        <div>
          <h2>Pretty Lyrics Lab</h2>
          <p className="pretty-lab-lede">
            Plain lyric sheets → textual analysis → composed typography. Prototype only — not wired
            into VC Mode or the compiler yet.
          </p>
        </div>
        <div className="pretty-lab-metrics">
          <span>{manifest.metrics.compileMs} ms</span>
          <span>{manifest.metrics.lineCount} lines</span>
          <span>{manifest.metrics.tokenCount} words</span>
          <span>{manifest.metrics.excludedMetadataLines} meta dropped</span>
          <span className="mono">{manifest.sourceHash.slice(0, 12)}</span>
          <span className="mono">seed {manifest.trackSeed}</span>
        </div>
      </div>

      <div className="pretty-lab-grid">
        <section className="pretty-lab-col pretty-lab-editor">
          <div className="pretty-lab-toolbar">
            <button type="button" onClick={() => setLyrics(SAMPLE_PRETTY_LYRICS)}>
              Sample (repeat-heavy)
            </button>
            <button type="button" onClick={() => setLyrics(SAMPLE_PRETTY_LYRICS_SPARSE)}>
              Sparse
            </button>
            <button type="button" onClick={() => setLyrics(SAMPLE_PRETTY_LYRICS_DENSE)}>
              Dense
            </button>
            <label className="pretty-lab-toggle">
              <input
                type="checkbox"
                checked={showComposed}
                onChange={(e) => setShowComposed(e.target.checked)}
              />
              <span>Composed</span>
            </label>
          </div>
          <textarea
            className="pretty-lab-textarea"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            spellCheck={false}
            aria-label="Raw lyrics"
          />
        </section>

        <section
          className="pretty-lab-col pretty-lab-preview"
          style={
            showComposed
              ? {
                  // Paint theme on the scrollport so elastic/overscroll never flashes the lab panel color.
                  background: manifest.palette.background,
                  color: manifest.palette.base,
                  ['--pretty-bg' as string]: manifest.palette.background,
                }
              : undefined
          }
          onContextMenu={(e) => {
            if (!showComposed) return;
            e.preventDefault();
            setCtxMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {showComposed ? (
            <>
              <div ref={lyricsCanvasRef} className="pretty-lab-lyrics-capture">
                <LyricTypographyView
                  manifest={manifest}
                  selectedTokenId={selectedToken?.id ?? null}
                  onSelectToken={setSelectedToken}
                />
              </div>
              {ctxMenu ? (
                <div
                  className="pretty-lab-ctx-menu"
                  style={{ left: ctxMenu.x, top: ctxMenu.y }}
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pngBusy}
                    onClick={() => void downloadPreviewPng()}
                  >
                    {pngBusy ? 'Rendering…' : 'Download PNG'}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <pre className="pretty-lab-plain">{lyrics}</pre>
          )}
        </section>

        <aside className="pretty-lab-col pretty-lab-controls">
          <h3>Layout preset</h3>
          <select
            value={options.presetId}
            onChange={(e) => {
              const presetId = e.target.value;
              const suggested =
                PRETTY_LYRICS_PRESETS[presetId as keyof typeof PRETTY_LYRICS_PRESETS]
                  ?.defaultThemeId;
              setOptions((prev) => ({
                ...prev,
                presetId,
                // Only nudge theme if still on the previous preset's default.
                ...(suggested &&
                prev.themeId ===
                  PRETTY_LYRICS_PRESETS[prev.presetId as keyof typeof PRETTY_LYRICS_PRESETS]
                    ?.defaultThemeId
                  ? { themeId: suggested }
                  : {}),
              }));
            }}
          >
            {PRETTY_LYRICS_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {PRETTY_LYRICS_PRESETS[id].label}
              </option>
            ))}
          </select>
          <p className="pretty-lab-hint">
            {PRETTY_LYRICS_PRESETS[options.presetId as keyof typeof PRETTY_LYRICS_PRESETS]
              ?.description ?? ''}
          </p>

          <h3>Color theme</h3>
          <select value={options.themeId} onChange={(e) => patch('themeId', e.target.value)}>
            {PRETTY_LYRICS_THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {getPrettyLyricsThemeMeta(id).label}
              </option>
            ))}
          </select>
          <p className="pretty-lab-hint">{themeMeta.description}</p>
          <Toggle
            label="Monochrome (strip hue)"
            checked={options.monochrome}
            onChange={(v) => patch('monochrome', v)}
          />
          <div className="pretty-lab-swatches" aria-label="Theme swatches">
            <span style={{ background: activePalette.background }} title="background" />
            <span style={{ background: activePalette.base }} title="base" />
            <span style={{ background: activePalette.quiet }} title="quiet" />
            {activePalette.motifs.slice(0, 5).map((c, i) => (
              <span key={`${c}-${i}`} style={{ background: c }} title={`motif ${i + 1}`} />
            ))}
          </div>

          <h3>Font</h3>
          <select value={options.fontId} onChange={(e) => patch('fontId', e.target.value)}>
            {PRETTY_LYRICS_FONT_IDS.map((id) => (
              <option key={id} value={id}>
                {PRETTY_LYRICS_FONTS[id].label}
              </option>
            ))}
          </select>
          <p className="pretty-lab-hint">{fontMeta.description}</p>
          <p
            className="pretty-lab-font-sample"
            style={{ fontFamily: fontMeta.fontFamily, letterSpacing: `${fontMeta.letterSpacingEm ?? 0}em` }}
          >
            With open eyes
          </p>

          {options.themeId === 'harmony' ? (
            <div className="pretty-lab-harmony">
              <label>
                Mode
                <select
                  value={options.harmonyMode}
                  onChange={(e) => patch('harmonyMode', e.target.value as HarmonyMode)}
                >
                  {HARMONY_MODE_IDS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Surface
                <select
                  value={options.harmonySurface}
                  onChange={(e) =>
                    patch('harmonySurface', e.target.value as 'dark' | 'light')
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <Slider
                label="Seed hue"
                value={options.harmonyHue}
                min={0}
                max={359}
                step={1}
                onChange={(v) => patch('harmonyHue', v)}
              />
              <div
                className="pretty-lab-hue-bar"
                style={{
                  background:
                    'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                }}
                aria-hidden
              />
            </div>
          ) : null}

          <h3>Signals</h3>
          <Toggle
            label="Exact / near line recurrence"
            checked={options.enableExactLineRecurrence}
            onChange={(v) => patch('enableExactLineRecurrence', v)}
          />
          <Toggle
            label="Repeated phrases"
            checked={options.enableRepeatedPhrases}
            onChange={(v) => patch('enableRepeatedPhrases', v)}
          />
          <Toggle
            label="Repeated openings / endings"
            checked={options.enableRepeatedOpeningsEndings}
            onChange={(v) => patch('enableRepeatedOpeningsEndings', v)}
          />
          <Toggle
            label="Heuristic POS"
            checked={options.enableHeuristicPos}
            onChange={(v) => patch('enableHeuristicPos', v)}
          />
          <Toggle
            label="Density layout"
            checked={options.enableDensity}
            onChange={(v) => patch('enableDensity', v)}
          />
          <Toggle
            label="Pivot words"
            checked={options.enablePivotWords}
            onChange={(v) => patch('enablePivotWords', v)}
          />
          <Toggle
            label="Parallel structure (via openings)"
            checked={options.enableParallelStructure}
            onChange={(v) => patch('enableParallelStructure', v)}
          />
          <Toggle
            label="Alliteration (initial pairs)"
            checked={options.enableAlliteration}
            onChange={(v) => patch('enableAlliteration', v)}
          />
          <Toggle
            label="Phonetic tails (Double Metaphone)"
            checked={options.enablePhoneticTails}
            onChange={(v) => patch('enablePhoneticTails', v)}
          />
          <Toggle
            label="Underlines (border-bottom; usually skip)"
            checked={options.enableUnderlines}
            onChange={(v) => patch('enableUnderlines', v)}
          />
          <Slider
            label="Near-duplicate threshold"
            value={options.nearDuplicateThreshold}
            min={0.7}
            max={0.98}
            step={0.01}
            onChange={(v) => {
              // Keep related band strictly below near so the two gates don't collapse.
              setOptions((prev) => ({
                ...prev,
                nearDuplicateThreshold: v,
                relatedThreshold: Math.min(prev.relatedThreshold, v - 0.01),
              }));
            }}
          />
          <Slider
            label="Related-line threshold"
            value={options.relatedThreshold}
            min={0.5}
            max={0.9}
            step={0.01}
            onChange={(v) =>
              patch(
                'relatedThreshold',
                Math.min(v, options.nearDuplicateThreshold - 0.01),
              )
            }
          />

          <h3>Ornaments (lab)</h3>
          <p className="pretty-lab-hint">
            Semantic Canvas experiments — try here before VC. Italics, glow, and
            analysis-mapped sibling faces (extra expressiveness, not a full face swap).
          </p>
          <Toggle
            label="Italics (long unique accents)"
            checked={options.enableItalics}
            onChange={(v) => patch('enableItalics', v)}
          />
          <Toggle
            label="Glow (sparse analysis peaks)"
            checked={options.enableGlow}
            onChange={(v) => patch('enableGlow', v)}
          />
          {options.enableGlow ? (
            <Slider
              label="Glow intensity"
              value={options.glowIntensity}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(v) => patch('glowIntensity', v)}
            />
          ) : null}
          <Toggle
            label="Font mix (analysis → sibling face)"
            checked={options.enableFontMix}
            onChange={(v) => patch('enableFontMix', v)}
          />
          {options.enableFontMix ? (
            <Slider
              label="Font-mix strength"
              value={options.fontMixStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => patch('fontMixStrength', v)}
            />
          ) : null}

          <h3>Emphasis budget</h3>
          <Slider
            label="Max anchors / line"
            value={options.maxAnchorsPerLine}
            min={0}
            max={3}
            step={1}
            onChange={(v) => patch('maxAnchorsPerLine', v)}
          />
          <Slider
            label="Max accents / line"
            value={options.maxAccentsPerLine}
            min={0}
            max={5}
            step={1}
            onChange={(v) => patch('maxAccentsPerLine', v)}
          />
          <Slider
            label="Min standard/quiet ratio"
            value={options.minimumStandardTokenRatio}
            min={0.3}
            max={0.9}
            step={0.05}
            onChange={(v) => patch('minimumStandardTokenRatio', v)}
          />

          <h3>Scale & spacing</h3>
          <Slider
            label="Size variance (measurement → scale)"
            value={options.sizeVariance}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => patch('sizeVariance', v)}
          />
          <Slider
            label="Center drift ±%"
            value={options.centerDriftPct}
            min={0}
            max={18}
            step={1}
            onChange={(v) => patch('centerDriftPct', v)}
          />
          <Slider
            label="Base scale"
            value={options.baseFontScale}
            min={0.8}
            max={1.4}
            step={0.02}
            onChange={(v) => patch('baseFontScale', v)}
          />
          <Slider
            label="Short-line scale"
            value={options.shortLineBoost}
            min={1}
            max={1.5}
            step={0.02}
            onChange={(v) => patch('shortLineBoost', v)}
          />
          <Slider
            label="Long/dense-line scale"
            value={options.denseLineTighten}
            min={0.7}
            max={1.15}
            step={0.01}
            onChange={(v) => patch('denseLineTighten', v)}
          />
          <Slider
            label="Anchor max scale"
            value={options.anchorMaxScale}
            min={1.1}
            max={1.9}
            step={0.02}
            onChange={(v) => patch('anchorMaxScale', v)}
          />
          <Slider
            label="Motif max scale"
            value={options.motifMaxScale}
            min={1.05}
            max={1.7}
            step={0.02}
            onChange={(v) => patch('motifMaxScale', v)}
          />
          <Slider
            label="Block spacing"
            value={options.blockSpacing}
            min={0.4}
            max={2.5}
            step={0.05}
            onChange={(v) => patch('blockSpacing', v)}
          />
          <Slider
            label="Line spacing"
            value={options.lineSpacing}
            min={0.2}
            max={1.4}
            step={0.05}
            onChange={(v) => patch('lineSpacing', v)}
          />
          <Slider
            label="Word spacing (em)"
            value={options.wordSpacingEm}
            min={-0.05}
            max={0.45}
            step={0.01}
            onChange={(v) => patch('wordSpacingEm', v)}
          />

          <h3>Named configs</h3>
          <div className="pretty-lab-named">
            <input
              type="text"
              placeholder="Config name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
            />
            <button type="button" onClick={saveConfig}>
              Save
            </button>
          </div>
          <div className="pretty-lab-export-row">
            <button type="button" onClick={exportBundle}>
              Download JSON
            </button>
            <button type="button" onClick={() => void copyExport()}>
              Copy JSON
            </button>
          </div>
          <p className="pretty-lab-hint">
            Export ships the full options envelope (`songpages.pretty-lyrics-config`) for VC hand-off.
          </p>
          <textarea
            className="pretty-lab-import"
            placeholder="Paste export JSON here to import…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          <button type="button" onClick={applyImport}>
            Import JSON
          </button>
          {exportStatus ? <p className="pretty-lab-hint">{exportStatus}</p> : null}
          <ul className="pretty-lab-named-list">
            {namedConfigs.map((cfg) => (
              <li key={cfg.id}>
                <button type="button" onClick={() => setOptions({ ...cfg.options })}>
                  {cfg.name}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    deletePrettyLyricsNamedConfig(cfg.id);
                    setNamedConfigs(listPrettyLyricsNamedConfigs());
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <h3>Diagnostics</h3>
          {selectedToken ? (
            <div className="pretty-lab-diag">
              <div className="pretty-lab-diag-word">{selectedToken.rawText}</div>
              <div>
                Role: <strong>{selectedToken.typography.role}</strong>
              </div>
              <div>
                Lexical: {selectedToken.lexicalRole} · scale {selectedToken.typography.scale.toFixed(2)} ·
                weight {selectedToken.typography.weight}
              </div>
              <div>Color: {selectedToken.typography.colorRole}</div>
              <ul>
                {selectedToken.reasons.map((r, i) => (
                  <li key={`${r.rule}-${i}`}>
                    {r.rule}
                    {r.detail ? ` — ${r.detail}` : ''}
                    {r.score != null ? ` (${r.score.toFixed(2)})` : ''}
                  </li>
                ))}
              </ul>
              <pre className="pretty-lab-evidence">
                {JSON.stringify(selectedToken.evidence, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="pretty-lab-hint">Click a styled word to see why it looks that way.</p>
          )}

          <div className="pretty-lab-summary">
            <div>Motifs: {manifest.phraseMotifs.length}</div>
            <div>Repetition groups: {manifest.repetitionGroups.length}</div>
            <ul>
              {manifest.phraseMotifs.slice(0, 8).map((m) => (
                <li key={m.id}>
                  “{m.phrase}” ×{m.count}
                </li>
              ))}
            </ul>
          </div>

          <Toggle label="Show manifest JSON" checked={showJson} onChange={setShowJson} />
          {showJson ? (
            <pre className="pretty-lab-json">{JSON.stringify(manifest, null, 2)}</pre>
          ) : null}

          <button
            type="button"
            onClick={() => setOptions({ ...DEFAULT_PRETTY_LYRICS_OPTIONS })}
          >
            Reset options
          </button>
        </aside>
      </div>
    </div>
  );
}
