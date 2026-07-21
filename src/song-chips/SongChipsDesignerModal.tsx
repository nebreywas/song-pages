/**
 * Song Chips designer — type families + limited structure + live preview.
 *
 * Separate from Song Cards: chips reference a song; cards present it.
 */

import { useEffect, useState } from 'react';

import type { Artist2SongPayload } from '@shared/artist2';
import {
  SONG_CHIP_TYPE_IDS,
  SONG_CHIP_TYPE_META,
  structureForChipType,
  type SongChipChromeState,
  type SongChipCoverShape,
  type SongChipMetaField,
  type SongChipStructure,
  type SongChipTypeId,
} from '@shared/songChips';

import { getApp } from '../lib/bridge';
import { buildSongChipViewModel } from './buildSongChipViewModel';
import { SongChip } from './SongChip';

import './song-chips.css';

type SongChipsDesignerModalProps = {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  artistName: string;
  payload: Artist2SongPayload;
  coverPath: string | null;
};

export function SongChipsDesignerModal({
  open,
  onClose,
  songTitle,
  artistName,
  payload,
  coverPath,
}: SongChipsDesignerModalProps) {
  const [structure, setStructure] = useState<SongChipStructure>(() =>
    structureForChipType('compact'),
  );
  const [chrome, setChrome] = useState<SongChipChromeState>('default');
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

  const song = buildSongChipViewModel({
    title: songTitle,
    artistName,
    payload,
    coverUrl,
  });

  const patch = (partial: Partial<SongChipStructure>) => {
    setStructure((prev) => ({ ...prev, ...partial }));
  };

  const meta = SONG_CHIP_TYPE_META[structure.typeId];
  // Themes deferred — light paper stage until a shared theme system lands.
  const paperLight = true;

  return (
    <div className="a2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="a2-modal a2-song-chips-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-song-chips-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="a2-modal-header">
          <div>
            <h2 id="a2-song-chips-title">Song Chips</h2>
            <p className="a2-modal-subtitle">
              Lightweight references · preview with “{songTitle || 'Untitled'}”
              · not saved yet
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

        <div className="a2-modal-body a2-song-chips-body">
          <aside className="schip-designer-options" aria-label="Chip options">
            <section className="schip-designer-section">
              <h3 className="schip-designer-heading">Chip type</h3>
              <div className="schip-type-grid" role="listbox" aria-label="Chip type">
                {SONG_CHIP_TYPE_IDS.map((id) => {
                  const item = SONG_CHIP_TYPE_META[id];
                  const active = structure.typeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`schip-type-tile${active ? ' is-active' : ''}`}
                      title={item.blurb}
                      onClick={() =>
                        setStructure(structureForChipType(id as SongChipTypeId))
                      }
                    >
                      <span className="schip-type-tile-num">{item.number}</span>
                      <span className="schip-type-tile-name">{item.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="schip-designer-blurb">{meta.blurb}</p>
            </section>

            <section className="schip-designer-section">
              <h3 className="schip-designer-heading">Structure</h3>
              <p className="schip-designer-note">
                Keep it light — chips reference, cards present. Themes wait
                until all UI primitives are stubbed.
              </p>

              {(structure.typeId === 'compact' ||
                structure.typeId === 'row' ||
                structure.typeId === 'artwork') && (
                <>
                  <p className="schip-designer-subhead">Cover</p>
                  <div className="a2-segmented">
                    {(
                      [
                        ['none', 'None'],
                        ['square', 'Square'],
                        ['rounded', 'Rounded'],
                        ['circle', 'Circle'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          structure.coverShape === id ? 'is-active' : undefined
                        }
                        onClick={() =>
                          patch({ coverShape: id as SongChipCoverShape })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {structure.typeId === 'artwork' ? (
                <>
                  <p className="schip-designer-subhead">Artwork size</p>
                  <div className="a2-segmented">
                    {(
                      [
                        ['sm', 'S'],
                        ['md', 'M'],
                        ['lg', 'L'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          structure.artworkSize === id ? 'is-active' : undefined
                        }
                        onClick={() => patch({ artworkSize: id })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {structure.typeId === 'compact' ? (
                <>
                  <p className="schip-designer-subhead">
                    One metadata field
                  </p>
                  <div className="a2-segmented">
                    {(
                      [
                        ['none', 'None'],
                        ['artist', 'Artist'],
                        ['length', 'Length'],
                        ['genre', 'Genre'],
                        ['date', 'Date'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          structure.metaField === id ? 'is-active' : undefined
                        }
                        onClick={() =>
                          patch({ metaField: id as SongChipMetaField })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {(structure.typeId === 'inline-mention' ||
                structure.typeId === 'mention-badge') && (
                <>
                  <p className="schip-designer-subhead">Surface</p>
                  <div className="a2-segmented">
                    {(
                      [
                        ['fill', 'Fill'],
                        ['outline', 'Outline'],
                        ['text', 'Text'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          structure.surface === id ? 'is-active' : undefined
                        }
                        onClick={() => patch({ surface: id })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {structure.typeId !== 'mention-badge' &&
              structure.typeId !== 'artwork' ? (
                <label className="a2-chip-check">
                  <input
                    type="checkbox"
                    checked={structure.showPlay}
                    onChange={(e) => patch({ showPlay: e.target.checked })}
                  />
                  Play action
                </label>
              ) : null}

              {(structure.typeId === 'row' ||
                structure.typeId === 'play' ||
                structure.typeId === 'artwork') && (
                <label className="a2-chip-check">
                  <input
                    type="checkbox"
                    checked={structure.showArtist}
                    onChange={(e) => patch({ showArtist: e.target.checked })}
                  />
                  Show artist
                </label>
              )}

              {(structure.typeId === 'row' || structure.typeId === 'play') && (
                <label className="a2-chip-check">
                  <input
                    type="checkbox"
                    checked={structure.showLength}
                    onChange={(e) => patch({ showLength: e.target.checked })}
                  />
                  Show length
                </label>
              )}

              {structure.typeId === 'row' ? (
                <>
                  <label className="a2-chip-check">
                    <input
                      type="checkbox"
                      checked={structure.showMenu}
                      onChange={(e) => patch({ showMenu: e.target.checked })}
                    />
                    Menu bug
                  </label>
                  <label className="a2-chip-check">
                    <input
                      type="checkbox"
                      checked={structure.showExplicit}
                      onChange={(e) =>
                        patch({ showExplicit: e.target.checked })
                      }
                    />
                    Explicit bug
                  </label>
                  <label className="a2-chip-check">
                    <input
                      type="checkbox"
                      checked={structure.showLike}
                      onChange={(e) => patch({ showLike: e.target.checked })}
                    />
                    Like
                  </label>
                </>
              ) : null}
            </section>

            <section className="schip-designer-section">
              <h3 className="schip-designer-heading">Preview state</h3>
              <div className="a2-segmented">
                {(
                  [
                    ['default', 'Default'],
                    ['selected', 'Selected'],
                    ['playing', 'Playing'],
                    ['disabled', 'Disabled'],
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
                Demo fallbacks when song data is empty
              </label>
            </section>
          </aside>

          <div className="schip-designer-preview" aria-label="Chip preview">
            <div
              className={[
                'schip-designer-preview-stage',
                paperLight ? 'schip-designer-preview-stage--light-paper' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <p className="schip-preview-label">Live preview</p>
              <div className="schip-preview-stack">
                <SongChip
                  structure={structure}
                  song={song}
                  chrome={chrome}
                  demoFallbacks={demoFallbacks}
                />
                {structure.typeId === 'compact' ||
                structure.typeId === 'row' ? (
                  <SongChip
                    structure={{
                      ...structure,
                      metaField:
                        structure.typeId === 'compact' ? 'genre' : structure.metaField,
                      showExplicit:
                        structure.typeId === 'row' ? true : structure.showExplicit,
                    }}
                    song={song}
                    chrome={chrome}
                    demoFallbacks={demoFallbacks}
                  />
                ) : null}
              </div>
            </div>
            <p className="schip-designer-preview-hint">
              {meta.number}. {meta.name}
            </p>
          </div>
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
