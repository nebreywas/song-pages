/**
 * Song Cards designer — primitive switcher + structure options + live preview.
 *
 * Primitives: Portrait | Compact Rectangle | Wide.
 * Current user is the app designer — choices are session-only for now.
 */

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { Artist2SongPayload } from '@shared/artist2';
import {
  COMPACT_RECTANGLE_DESIGN_IDS,
  COMPACT_RECTANGLE_DESIGN_META,
  COVER_CORNER_BUG_OPTIONS,
  SONG_CARD_DESIGN_IDS,
  SONG_CARD_DESIGN_META,
  SONG_CARD_PRIMITIVE_IDS,
  SONG_CARD_PRIMITIVE_META,
  WIDE_SONG_CARD_DESIGN_IDS,
  WIDE_SONG_CARD_DESIGN_META,
  structureForCompactDesign,
  structureForDesign,
  structureForWideDesign,
  type CompactCoverSide,
  type CompactPlayPlacement,
  type CompactRectangleDesignId,
  type CompactRectangleStructure,
  type CoverCornerBug,
  type CoverCornerSlot,
  type FooterCenterItem,
  type SongCardChromeState,
  type SongCardDesignId,
  type SongCardPrimitiveId,
  type SongCardStructure,
  type WideCoverSize,
  type WideHighlightFeature,
  type WidePlayPlacement,
  type WideSongCardDesignId,
  type WideSongCardStructure,
} from '@shared/songCards';

import { getApp } from '../lib/bridge';
import { buildSongCardViewModel } from './buildSongCardViewModel';
import { SongCompactRectangleCard } from './SongCompactRectangleCard';
import { SongPortraitCard } from './SongPortraitCard';
import { SongWideCard } from './SongWideCard';

import './song-cards.css';

type SongCardsDesignerModalProps = {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  artistName: string;
  payload: Artist2SongPayload;
  coverPath: string | null;
};

const CORNER_ORDER: CoverCornerSlot[] = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
];

const CORNER_LABELS: Record<CoverCornerSlot, string> = {
  topLeft: 'Top left',
  topRight: 'Top right',
  bottomLeft: 'Bottom left',
  bottomRight: 'Bottom right',
};

const FOOTER_CENTER_OPTIONS: Array<{ id: FooterCenterItem; label: string }> = [
  { id: 'length', label: 'Length' },
  { id: 'creation-date', label: 'Creation date' },
  { id: 'bitrate', label: 'Bitrate / codec' },
  { id: 'main-genre', label: 'Main genre' },
];

function toggleFooterCenter(
  current: FooterCenterItem[],
  item: FooterCenterItem,
  max: number,
): FooterCenterItem[] {
  if (current.includes(item)) return current.filter((x) => x !== item);
  if (current.length >= max) return [...current.slice(1), item];
  return [...current, item];
}

export function SongCardsDesignerModal({
  open,
  onClose,
  songTitle,
  artistName,
  payload,
  coverPath,
}: SongCardsDesignerModalProps) {
  const [primitive, setPrimitive] = useState<SongCardPrimitiveId>('portrait');
  const [portrait, setPortrait] = useState<SongCardStructure>(() =>
    structureForDesign(1),
  );
  const [compact, setCompact] = useState<CompactRectangleStructure>(() =>
    structureForCompactDesign(1),
  );
  const [wide, setWide] = useState<WideSongCardStructure>(() =>
    structureForWideDesign(1),
  );
  const [chrome, setChrome] = useState<SongCardChromeState>('default');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [demoFallbacks, setDemoFallbacks] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const path = coverPath?.trim() || '';
    if (!path) {
      setCoverUrl(null);
      return;
    }
    void (async () => {
      const result = await getApp()?.artist2?.resolveLocalFileUrl?.(path);
      if (cancelled) return;
      if (result && result.ok && typeof result.data === 'string') {
        setCoverUrl(result.data);
      } else {
        setCoverUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coverPath]);

  if (!open) return null;

  const song = buildSongCardViewModel({
    title: songTitle,
    artistName,
    payload,
    coverUrl,
  });

  const isPortrait = primitive === 'portrait';
  const isCompact = primitive === 'compact-rectangle';
  const isWide = primitive === 'wide';
  const activeDesignLabel = isPortrait
    ? SONG_CARD_DESIGN_META[portrait.designId].name
    : isCompact
      ? COMPACT_RECTANGLE_DESIGN_META[compact.designId].name
      : WIDE_SONG_CARD_DESIGN_META[wide.designId].name;
  const activeDesignId = isPortrait
    ? portrait.designId
    : isCompact
      ? compact.designId
      : wide.designId;

  const preview = (
    <div className="spc-designer-preview" aria-label="Card preview">
      <div className="spc-designer-preview-stage">
        {isPortrait ? (
          <SongPortraitCard
            structure={portrait}
            song={song}
            chrome={chrome}
            demoFallbacks={demoFallbacks}
          />
        ) : isCompact ? (
          <SongCompactRectangleCard
            structure={compact}
            song={song}
            chrome={chrome}
            demoFallbacks={demoFallbacks}
          />
        ) : (
          <SongWideCard
            structure={wide}
            song={song}
            chrome={chrome}
            demoFallbacks={demoFallbacks}
          />
        )}
      </div>
      <p className="spc-designer-preview-hint">
        {SONG_CARD_PRIMITIVE_META[primitive].name} · Design {activeDesignId} ·{' '}
        {activeDesignLabel}
      </p>
    </div>
  );

  const options = (
    <aside className="spc-designer-options" aria-label="Card options">
      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Card primitive</h3>
        <label className="spc-designer-primitive">
          <span className="spc-designer-note">
            Shape family — skins and structure follow the primitive
          </span>
          <select
            value={primitive}
            onChange={(e) =>
              setPrimitive(e.target.value as SongCardPrimitiveId)
            }
            aria-label="Card primitive"
          >
            {SONG_CARD_PRIMITIVE_IDS.map((id) => (
              <option key={id} value={id}>
                {SONG_CARD_PRIMITIVE_META[id].name}
              </option>
            ))}
          </select>
        </label>
        <p className="spc-designer-blurb">
          {SONG_CARD_PRIMITIVE_META[primitive].blurb}
        </p>
      </section>

      {isPortrait ? (
        <PortraitDesignerOptions
          structure={portrait}
          setStructure={setPortrait}
        />
      ) : isCompact ? (
        <CompactDesignerOptions
          structure={compact}
          setStructure={setCompact}
        />
      ) : (
        <WideDesignerOptions structure={wide} setStructure={setWide} />
      )}

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Preview state</h3>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['default', 'Default'],
              ['selected', 'Selected'],
              ['playing', 'Playing'],
              ['disabled', 'Disabled'],
              ['loading', 'Loading'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chrome === id ? 'is-active' : undefined}
              onClick={() => setChrome(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={demoFallbacks}
            onChange={(e) => setDemoFallbacks(e.target.checked)}
          />
          Demo fallbacks (length, quote, album, etc. when song data is empty)
        </label>
      </section>
    </aside>
  );

  return (
    <div className="a2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={[
          'a2-modal',
          'a2-song-cards-modal',
          isCompact ? 'a2-song-cards-modal--compact' : '',
          isWide ? 'a2-song-cards-modal--wide' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-song-cards-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="a2-modal-header">
          <div>
            <h2 id="a2-song-cards-title">Song Cards</h2>
            <p className="a2-modal-subtitle">
              Preview with “{songTitle || 'Untitled'}” · designer tools — not
              saved yet
            </p>
          </div>
          <button
            type="button"
            className="a2-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Wide: preview spans full modal width on top; options flow underneath.
            Portrait / Compact keep the side-by-side options | preview grid. */}
        <div className="a2-modal-body a2-song-cards-body">
          {isWide ? (
            <>
              {preview}
              {options}
            </>
          ) : (
            <>
              {options}
              {preview}
            </>
          )}
        </div>

        <footer className="a2-modal-footer">
          <button type="button" className="a2-ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function PortraitDesignerOptions({
  structure,
  setStructure,
}: {
  structure: SongCardStructure;
  setStructure: Dispatch<SetStateAction<SongCardStructure>>;
}) {
  const patch = (partial: Partial<SongCardStructure>) => {
    setStructure((prev) => ({ ...prev, ...partial }));
  };
  const patchInfo = (partial: Partial<SongCardStructure['info']>) => {
    setStructure((prev) => ({ ...prev, info: { ...prev.info, ...partial } }));
  };
  const patchFooter = (partial: Partial<SongCardStructure['footer']>) => {
    setStructure((prev) => ({
      ...prev,
      footer: { ...prev.footer, ...partial },
    }));
  };
  const patchAnimated = (
    partial: Partial<SongCardStructure['animatedCover']>,
  ) => {
    setStructure((prev) => ({
      ...prev,
      animatedCover: { ...prev.animatedCover, ...partial },
    }));
  };
  const setCorner = (slot: CoverCornerSlot, bug: CoverCornerBug) => {
    setStructure((prev) => ({
      ...prev,
      corners: { ...prev.corners, [slot]: bug },
    }));
  };

  return (
    <>
      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Card Design</h3>
        <div className="spc-design-grid" role="listbox" aria-label="Card design">
          {SONG_CARD_DESIGN_IDS.map((id) => {
            const meta = SONG_CARD_DESIGN_META[id];
            const active = structure.designId === id;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                className={`spc-design-tile${active ? ' is-active' : ''}`}
                onClick={() => setStructure(structureForDesign(id as SongCardDesignId))}
                title={meta.blurb}
              >
                <span className="spc-design-tile-num">{id}</span>
                <span className="spc-design-tile-name">{meta.name}</span>
              </button>
            );
          })}
        </div>
        <p className="spc-designer-blurb">
          {SONG_CARD_DESIGN_META[structure.designId].blurb}
        </p>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Cover Zone</h3>
        <label className="spc-designer-label">
          Cover height
          <input
            type="range"
            min={35}
            max={72}
            value={Math.round(structure.coverHeightRatio * 100)}
            onChange={(e) =>
              patch({ coverHeightRatio: Number(e.target.value) / 100 })
            }
          />
          <span className="spc-designer-value">
            {Math.round(structure.coverHeightRatio * 100)}%
          </span>
        </label>

        <p className="spc-designer-subhead">Animated cover</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['prefer-animated', 'Prefer'],
              ['never', 'Never'],
              ['when-playing', 'When playing'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.animatedCover.preference === id
                  ? 'is-active'
                  : undefined
              }
              onClick={() => patchAnimated({ preference: id })}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="spc-designer-subhead">Cover corners (one bug each)</p>
        <div className="spc-corner-grid">
          {CORNER_ORDER.map((slot) => (
            <label key={slot} className="spc-corner-cell">
              <span>{CORNER_LABELS[slot]}</span>
              <select
                value={structure.corners[slot]}
                onChange={(e) =>
                  setCorner(slot, e.target.value as CoverCornerBug)
                }
              >
                {COVER_CORNER_BUG_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <p className="spc-designer-subhead">Bugs placement</p>
        <div className="a2-segmented spc-designer-seg">
          <button
            type="button"
            className={
              structure.coverBugsPlacement === 'overlay' ? 'is-active' : undefined
            }
            onClick={() => patch({ coverBugsPlacement: 'overlay' })}
          >
            Overlay on cover
          </button>
          <button
            type="button"
            className={
              structure.coverBugsPlacement === 'outside' ? 'is-active' : undefined
            }
            onClick={() => patch({ coverBugsPlacement: 'outside' })}
          >
            Outside frame
          </button>
        </div>

        <p className="spc-designer-subhead">Cover blend / border</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['light', 'Light'],
              ['middle', 'Middle'],
              ['dark', 'Dark'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={structure.coverBlend === id ? 'is-active' : undefined}
              onClick={() => patch({ coverBlend: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.coverBorder}
            onChange={(e) => patch({ coverBorder: e.target.checked })}
          />
          Cover border
        </label>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Information Zone</h3>
        <p className="spc-designer-note">Title + Artist always show.</p>
        {(
          [
            ['showSubtitle', 'Subtitle'],
            ['showCaption', 'Caption'],
            ['showGenres', 'Top genres'],
            ['showThemes', 'Top themes'],
            ['showLyricQuote', 'Lyric quote'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.info[key]}
              onChange={(e) => patchInfo({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <p className="spc-designer-subhead">Lyric quote overflow</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['clamp', 'Clamp'],
              ['fade', 'Fade'],
              ['scroll', 'Scroll'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.info.lyricQuoteOverflow === id
                  ? 'is-active'
                  : undefined
              }
              onClick={() => patchInfo({ lyricQuoteOverflow: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="spc-designer-subhead">Genre / theme render</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['text', 'Text'],
              ['pills-rect', 'Pills □'],
              ['pills-round', 'Pills ○'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.info.genreThemeRender === id ? 'is-active' : undefined
              }
              onClick={() => patchInfo({ genreThemeRender: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Footer Zone</h3>
        <p className="spc-designer-subhead">Left</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['track-number', 'Track #'],
              ['explicit', 'Explicit'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={structure.footer.left === id ? 'is-active' : undefined}
              onClick={() => patchFooter({ left: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="spc-designer-subhead">Center (pick up to two)</p>
        {FOOTER_CENTER_OPTIONS.map((opt) => (
          <label key={opt.id} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.footer.center.includes(opt.id)}
              onChange={() =>
                patchFooter({
                  center: toggleFooterCenter(structure.footer.center, opt.id, 2),
                })
              }
            />
            {opt.label}
          </label>
        ))}
        <p className="spc-designer-subhead">Menu bug</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['dots-h', '···'],
              ['dots-v', '⋮'],
              ['info', 'ⓘ'],
              ['hamburger', '☰'],
              ['flip', '↺'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.footer.menuStyle === id ? 'is-active' : undefined
              }
              onClick={() => patchFooter({ menuStyle: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.showSeparator}
            onChange={(e) => patchFooter({ showSeparator: e.target.checked })}
          />
          Footer separator
        </label>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.shadeFooter}
            onChange={(e) => patchFooter({ shadeFooter: e.target.checked })}
          />
          Shade footer
        </label>
      </section>
    </>
  );
}

function CompactDesignerOptions({
  structure,
  setStructure,
}: {
  structure: CompactRectangleStructure;
  setStructure: Dispatch<SetStateAction<CompactRectangleStructure>>;
}) {
  const patch = (partial: Partial<CompactRectangleStructure>) => {
    setStructure((prev) => ({ ...prev, ...partial }));
  };
  const patchInfo = (partial: Partial<CompactRectangleStructure['info']>) => {
    setStructure((prev) => ({ ...prev, info: { ...prev.info, ...partial } }));
  };
  const patchFooter = (
    partial: Partial<CompactRectangleStructure['footer']>,
  ) => {
    setStructure((prev) => ({
      ...prev,
      footer: { ...prev.footer, ...partial },
    }));
  };
  const patchBugs = (
    partial: Partial<CompactRectangleStructure['coverBugs']>,
  ) => {
    setStructure((prev) => ({
      ...prev,
      coverBugs: { ...prev.coverBugs, ...partial },
    }));
  };

  return (
    <>
      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Card Design</h3>
        <div className="spc-design-grid" role="listbox" aria-label="Card design">
          {COMPACT_RECTANGLE_DESIGN_IDS.map((id) => {
            const meta = COMPACT_RECTANGLE_DESIGN_META[id];
            const active = structure.designId === id;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                className={`spc-design-tile${active ? ' is-active' : ''}`}
                onClick={() =>
                  setStructure(structureForCompactDesign(id as CompactRectangleDesignId))
                }
                title={meta.blurb}
              >
                <span className="spc-design-tile-num">{id}</span>
                <span className="spc-design-tile-name">{meta.name}</span>
              </button>
            );
          })}
        </div>
        <p className="spc-designer-blurb">
          {COMPACT_RECTANGLE_DESIGN_META[structure.designId].blurb}
        </p>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Cover Zone</h3>
        <p className="spc-designer-subhead">Cover side</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['left', 'Left'],
              ['right', 'Right'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.coverSide === id ? 'is-active' : undefined
              }
              onClick={() => patch({ coverSide: id as CompactCoverSide })}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="spc-designer-subhead">Play overlay</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['lower-left', 'Lower left'],
              ['center', 'Center'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.playPlacement === id ? 'is-active' : undefined
              }
              onClick={() =>
                patch({ playPlacement: id as CompactPlayPlacement })
              }
            >
              {label}
            </button>
          ))}
        </div>

        <p className="spc-designer-subhead">Cover bugs</p>
        {(
          [
            ['like', 'Like'],
            ['length', 'Length'],
            ['explicit', 'Explicit'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.coverBugs[key]}
              onChange={(e) => patchBugs({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}

        <p className="spc-designer-subhead">Cover blend / border</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['light', 'Light'],
              ['middle', 'Middle'],
              ['dark', 'Dark'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={structure.coverBlend === id ? 'is-active' : undefined}
              onClick={() => patch({ coverBlend: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.coverBorder}
            onChange={(e) => patch({ coverBorder: e.target.checked })}
          />
          Cover border
        </label>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Information Zone</h3>
        <p className="spc-designer-note">Title + Artist always show.</p>
        {(
          [
            ['showAlbum', 'Album in byline'],
            ['showSubtitle', 'Subtitle'],
            ['showCaption', 'Caption'],
            ['showLyricQuote', 'Lyric quote'],
            ['showGenres', 'Top genres'],
            ['showThemes', 'Top themes'],
            ['showHeaderActions', 'Header like / menu'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.info[key]}
              onChange={(e) => patchInfo({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <p className="spc-designer-subhead">Genre / theme render</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['text', 'Text'],
              ['pills-rect', 'Pills □'],
              ['pills-round', 'Pills ○'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.info.genreThemeRender === id ? 'is-active' : undefined
              }
              onClick={() => patchInfo({ genreThemeRender: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Footer Zone</h3>
        <p className="spc-designer-note">
          Full-width footer — left · center meta · right actions
        </p>
        <p className="spc-designer-subhead">Left</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['track-number', 'Track #'],
              ['explicit', 'Explicit'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={structure.footer.left === id ? 'is-active' : undefined}
              onClick={() => patchFooter({ left: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="spc-designer-subhead">Center (pick up to four)</p>
        {FOOTER_CENTER_OPTIONS.map((opt) => (
          <label key={opt.id} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.footer.center.includes(opt.id)}
              onChange={() =>
                patchFooter({
                  center: toggleFooterCenter(structure.footer.center, opt.id, 4),
                })
              }
            />
            {opt.label}
          </label>
        ))}
        <p className="spc-designer-subhead">Right actions</p>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.showPlayLink}
            onChange={(e) => patchFooter({ showPlayLink: e.target.checked })}
          />
          Play Song link
        </label>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.showLikeAction}
            onChange={(e) => patchFooter({ showLikeAction: e.target.checked })}
          />
          Like
        </label>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.showAddAction}
            onChange={(e) => patchFooter({ showAddAction: e.target.checked })}
          />
          Add
        </label>
        <p className="spc-designer-subhead">Playing anim (left)</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['waveform', 'Wave'],
              ['freq-bars', 'Bars'],
              ['speaker', 'Speaker'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.footer.playingAnim === id ? 'is-active' : undefined
              }
              onClick={() => patchFooter({ playingAnim: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.showSeparator}
            onChange={(e) => patchFooter({ showSeparator: e.target.checked })}
          />
          Footer separator
        </label>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.footer.shadeFooter}
            onChange={(e) => patchFooter({ shadeFooter: e.target.checked })}
          />
          Shade footer
        </label>
      </section>
    </>
  );
}

function WideDesignerOptions({
  structure,
  setStructure,
}: {
  structure: WideSongCardStructure;
  setStructure: Dispatch<SetStateAction<WideSongCardStructure>>;
}) {
  const patch = (partial: Partial<WideSongCardStructure>) => {
    setStructure((prev) => ({ ...prev, ...partial }));
  };
  const patchInfo = (partial: Partial<WideSongCardStructure['info']>) => {
    setStructure((prev) => ({ ...prev, info: { ...prev.info, ...partial } }));
  };
  const patchHighlights = (
    partial: Partial<WideSongCardStructure['highlights']>,
  ) => {
    setStructure((prev) => ({
      ...prev,
      highlights: { ...prev.highlights, ...partial },
    }));
  };
  const patchTail = (partial: Partial<WideSongCardStructure['tail']>) => {
    setStructure((prev) => ({ ...prev, tail: { ...prev.tail, ...partial } }));
  };

  return (
    <>
      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Card Design</h3>
        <div className="spc-design-grid" role="listbox" aria-label="Card design">
          {WIDE_SONG_CARD_DESIGN_IDS.map((id) => {
            const meta = WIDE_SONG_CARD_DESIGN_META[id];
            const active = structure.designId === id;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                className={`spc-design-tile${active ? ' is-active' : ''}`}
                onClick={() =>
                  setStructure(structureForWideDesign(id as WideSongCardDesignId))
                }
                title={meta.blurb}
              >
                <span className="spc-design-tile-num">{id}</span>
                <span className="spc-design-tile-name">{meta.name}</span>
              </button>
            );
          })}
        </div>
        <p className="spc-designer-blurb">
          {WIDE_SONG_CARD_DESIGN_META[structure.designId].blurb}
        </p>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Cover Zone</h3>
        <p className="spc-designer-subhead">Cover size</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['sm', 'Small'],
              ['md', 'Medium'],
              ['lg', 'Large'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={structure.coverSize === id ? 'is-active' : undefined}
              onClick={() => patch({ coverSize: id as WideCoverSize })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="spc-designer-subhead">Play overlay</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['center', 'Center'],
              ['lower-right', 'Lower right'],
              ['tail', 'Tail'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.playPlacement === id ? 'is-active' : undefined
              }
              onClick={() =>
                patch({ playPlacement: id as WidePlayPlacement })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.showTrackNumber}
            onChange={(e) => patch({ showTrackNumber: e.target.checked })}
          />
          Track number
        </label>
        <label className="a2-chip-check">
          <input
            type="checkbox"
            checked={structure.coverBorder}
            onChange={(e) => patch({ coverBorder: e.target.checked })}
          />
          Cover border
        </label>
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Information Zone</h3>
        <p className="spc-designer-note">Title + Artist always show.</p>
        {(
          [
            ['showAlbum', 'Album in byline'],
            ['showSubtitle', 'Subtitle'],
            ['showCaption', 'Caption'],
            ['showLyricQuote', 'Inline lyric quote'],
            ['showGenres', 'Top genres'],
            ['showThemes', 'Top themes'],
            ['showExplicitBug', 'Explicit bug'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.info[key]}
              onChange={(e) => patchInfo({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Track Highlights</h3>
        <p className="spc-designer-note">One featured highlight at a time.</p>
        <div className="a2-segmented spc-designer-seg">
          {(
            [
              ['none', 'None'],
              ['waveform', 'Waveform'],
              ['lyric-quote', 'Lyric'],
              ['metadata-grid', 'Meta grid'],
              ['meta-inline', 'Meta inline'],
              ['engagement', 'Engagement'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                structure.highlights.feature === id ? 'is-active' : undefined
              }
              onClick={() =>
                patchHighlights({ feature: id as WideHighlightFeature })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="spc-designer-subhead">Highlight metadata (up to 3)</p>
        {FOOTER_CENTER_OPTIONS.map((opt) => (
          <label key={opt.id} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.highlights.metadata.includes(opt.id)}
              onChange={() =>
                patchHighlights({
                  metadata: toggleFooterCenter(
                    structure.highlights.metadata,
                    opt.id,
                    3,
                  ),
                })
              }
            />
            {opt.label}
          </label>
        ))}
      </section>

      <section className="spc-designer-section">
        <h3 className="spc-designer-heading">Tail Zone</h3>
        {(
          [
            ['showDate', 'Date'],
            ['showLength', 'Length'],
            ['showBitrate', 'Bitrate'],
            ['showLike', 'Like'],
            ['showAdd', 'Add'],
            ['showPlayNext', 'Play Next link'],
            ['showAddToPlaylist', 'Add to Playlist link'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="a2-chip-check">
            <input
              type="checkbox"
              checked={structure.tail[key]}
              onChange={(e) => patchTail({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>
    </>
  );
}
