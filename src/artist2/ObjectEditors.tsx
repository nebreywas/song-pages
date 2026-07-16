/**
 * Right-pane object editors — wireframe fields for Song / Album / Content.
 */

import { type ReactNode, useEffect, useRef, useState } from 'react';

import type {
  Artist2AlbumDetail,
  Artist2AlbumPayload,
  Artist2AiPromptEntry,
  Artist2ArtworkEntry,
  Artist2ArtworkRole,
  Artist2CatalogObject,
  Artist2ContentPayload,
  Artist2CreationProcess,
  Artist2CreationProcessTarget,
  Artist2CreationProcessType,
  Artist2PlaylistPayload,
  Artist2SongLink,
  Artist2SongLinkKind,
  Artist2SongLinkVisibility,
  Artist2SongPagesPublishState,
  Artist2SongPayload,
  Artist2SongRecording,
  Artist2SongRelation,
  Artist2SongRelationKind,
} from '@shared/artist2';
import {
  AI_NEGATIVE_PROMPT_SOFT_MAX,
  AI_PROMPT_SOFT_MAX,
  albumIncompleteHints,
  clearCreationProcess,
  ARTIST2_SONG_RELATION_KINDS,
  ARTIST2_VIDEO_KIND_LABELS,
  ARTIST2_VIDEO_KINDS,
  ARTWORK_COMMENTARY_SOFT_MAX,
  ARTWORK_DESCRIPTION_SOFT_MAX,
  ARTWORK_ROLE_LABELS,
  CREATION_PROCESS_TARGET_LABELS,
  CREATION_PROCESS_TARGETS,
  CREATION_PROCESS_TYPE_LABELS,
  CREATION_PROCESS_TYPES,
  createArtworkEntry,
  createEmptyLinkRow,
  ensureSinglePrimary,
  ensureSinglePrimaryArtwork,
  ensureSinglePrimaryModel,
  ensureSinglePrimaryPrompt,
  findCreationProcess,
  isStructurallyValidUrl,
  legacyArtworkFromEntries,
  legacyRecordingFromList,
  newAiModelId,
  newAiPromptId,
  newSongRecordingId,
  normalizeCreationProcessState,
  normalizeSongArtwork,
  normalizeSongLinks,
  normalizeSongRecordings,
  normalizeSongRelations,
  normalizeSongVideos,
  PERFORMED_CONTEXT_LABELS,
  PERFORMED_CONTEXTS,
  providersByCapability,
  resolveArtworkEntryPath,
  resolvePrimaryArtworkPath,
  resolveSongSlug,
  sanitizeBpmInput,
  sanitizeCreationDateInput,
  setAiVocalsSameAsMusic,
  setPrimaryArtwork,
  slugifySongName,
  songCreationDate,
  songIncompleteHints,
  songRelationLabel,
  SONG_PAGES_STATE_LABELS,
  todayMmDdYyyy,
  updateCreationProcess,
} from '@shared/artist2';

import { ArtworkRefView } from './ArtworkRefView';
import { ArtworkThumbnail, resolveArtworkFilePath } from './ArtworkThumbnail';
import { useDebouncedCallback } from './useDebouncedCallback';
import { getApp } from '../lib/bridge';
import appIcon from '../assets/images/app-icon.png';

/**
 * Small inline "?" popover for field hints.
 * Click toggles; click again (or the ✕) closes. Kept local — no portal needed.
 */
function HelpPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="a2-help-popover">
      <button
        type="button"
        className="a2-help-toggle"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open ? (
        <span className="a2-help-bubble" role="note">
          {children}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Public / Private pill that toggles on click.
 * Shared by Web / Social / Distribution link boxes.
 */
/** Public / Private status pill that toggles on click. */
function LinkStatusToggle({
  visibility,
  onToggle,
}: {
  visibility: Artist2SongLinkVisibility;
  onToggle: (next: Artist2SongLinkVisibility) => void;
}) {
  const isPublic = visibility === 'public';
  return (
    <button
      type="button"
      className={`a2-vis-toggle ${isPublic ? 'is-public' : 'is-private'}`}
      aria-pressed={isPublic}
      title="Toggle public / private"
      onClick={() => onToggle(isPublic ? 'private' : 'public')}
    >
      {isPublic ? 'Public' : 'Private'}
    </button>
  );
}

/** Trash button that opens a confirmation popover anchored to the icon. */
function DeleteIconButton({
  label,
  onConfirm,
  confirmMessage = 'Delete this link?',
  className,
}: {
  label: string;
  onConfirm: () => void;
  confirmMessage?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <span className={`a2-delete-anchor${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="a2-icon-danger"
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={confirming}
        onClick={() => setConfirming((v) => !v)}
      >
        🗑
      </button>
      {confirming ? (
        <>
          {/* Backdrop closes the popover on outside click. */}
          <span
            className="a2-delete-backdrop"
            role="presentation"
            onClick={() => setConfirming(false)}
          />
          <span className="a2-delete-popover" role="dialog" aria-label={label}>
            <span className="a2-delete-popover-msg">{confirmMessage}</span>
            <span className="a2-delete-popover-actions">
              <button
                type="button"
                className="a2-danger"
                onClick={() => {
                  setConfirming(false);
                  onConfirm();
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="a2-ghost"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * Text button with a confirm popover (same pattern as DeleteIconButton, but a
 * labelled button rather than a trash icon). Used for "Clear" area actions.
 */
function ConfirmActionButton({
  label,
  confirmMessage,
  confirmLabel = 'Clear',
  onConfirm,
  className,
}: {
  label: string;
  confirmMessage: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <span className={`a2-delete-anchor${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="a2-ghost a2-clear-btn"
        aria-haspopup="dialog"
        aria-expanded={confirming}
        onClick={() => setConfirming((v) => !v)}
      >
        {label}
      </button>
      {confirming ? (
        <>
          <span
            className="a2-delete-backdrop"
            role="presentation"
            onClick={() => setConfirming(false)}
          />
          <span className="a2-delete-popover" role="dialog" aria-label={label}>
            <span className="a2-delete-popover-msg">{confirmMessage}</span>
            <span className="a2-delete-popover-actions">
              <button
                type="button"
                className="a2-danger"
                onClick={() => {
                  setConfirming(false);
                  onConfirm();
                }}
              >
                {confirmLabel}
              </button>
              <button type="button" className="a2-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}

/** Play / pause a local audio file; resolves the path to a playable URL on demand. */
function RecordingPlayButton({ audioPath }: { audioPath: string | null | undefined }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop and release the element on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // If the file path changes, drop the cached element so we reload the new source.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }, [audioPath]);

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    const path = audioPath?.trim();
    if (!path) return;
    const result = await getApp()?.artist2?.resolveLocalFileUrl?.(path);
    const url = result && result.ok && typeof result.data === 'string' ? result.data : null;
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onpause = () => setPlaying(false);
    }
    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      className="a2-icon-btn"
      title={playing ? 'Pause' : 'Play'}
      aria-label={playing ? 'Pause' : 'Play'}
      disabled={!audioPath?.trim()}
      onClick={toggle}
    >
      {playing ? '⏸' : '▶'}
    </button>
  );
}

/**
 * Shared link table (streaming / web / social / distribution).
 * `renderFirstCell` supplies the leading column — a provider <select> or an
 * editable Name input — so every link type stays visually consistent.
 */
function LinkTable({
  firstColLabel,
  rows,
  renderFirstCell,
  onUpdate,
  onRemove,
  deleteLabel,
}: {
  firstColLabel: string;
  rows: Artist2SongLink[];
  renderFirstCell: (row: Artist2SongLink) => ReactNode;
  onUpdate: (id: string, patch: Partial<Artist2SongLink>) => void;
  onRemove: (id: string) => void;
  deleteLabel: string;
}) {
  return (
    <table className="a2-link-table">
      <thead>
        <tr>
          <th scope="col">{firstColLabel}</th>
          <th scope="col">URL</th>
          <th scope="col">Date Added</th>
          <th scope="col">Status</th>
          <th scope="col">
            <span className="a2-sr-only">Remove</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const urlInvalid =
            Boolean(row.url?.trim()) && !isStructurallyValidUrl(row.url ?? '');
          return (
            <tr key={row.id}>
              <td>{renderFirstCell(row)}</td>
              <td>
                <input
                  className="a2-streaming-url"
                  value={row.url ?? ''}
                  placeholder="https://"
                  aria-label="URL"
                  onChange={(event) => onUpdate(row.id, { url: event.target.value })}
                />
                {urlInvalid ? (
                  <span className="a2-char-warn">Enter a valid http(s) URL</span>
                ) : null}
              </td>
              <td className="a2-date-added">
                {/* Read-only timestamp of when the link was added — not editable. */}
                {row.dateAdded ?? '—'}
              </td>
              <td className="a2-status-cell">
                <LinkStatusToggle
                  visibility={row.visibility}
                  onToggle={(visibility) => onUpdate(row.id, { visibility })}
                />
              </td>
              <td>
                <DeleteIconButton label={deleteLabel} onConfirm={() => onRemove(row.id)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Soft guidance only — do not hard-block save. */
const CAPTION_SOFT_MAX = 120;
const ABOUT_SOFT_MAX = 1000;

function parseGenreToken(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

/** Additional genres: commit to pills on comma / Enter / blur. */
function GenreTagsInput({
  genres,
  onChange,
  placeholder,
}: {
  genres: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  // Local pills so tags appear immediately while parent patch may debounce.
  const [tags, setTags] = useState(genres);
  const [draft, setDraft] = useState('');

  const apply = (next: string[]) => {
    setTags(next);
    onChange(next);
  };

  const commitToken = (raw: string) => {
    const token = parseGenreToken(raw);
    if (!token) {
      setDraft('');
      return;
    }
    const exists = tags.some((g) => g.toLowerCase() === token.toLowerCase());
    if (!exists) apply([...tags, token]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    apply(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="a2-tag-input">
      {tags.map((genre, index) => (
        <span key={`${genre}-${index}`} className="a2-pill">
          {genre}
          <button
            type="button"
            className="a2-pill-remove"
            aria-label={`Remove ${genre}`}
            onClick={() => removeAt(index)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="a2-tag-input-field"
        value={draft}
        placeholder={tags.length === 0 ? placeholder : 'Add genre…'}
        aria-label="Additional genre tag"
        onChange={(event) => {
          const value = event.target.value;
          if (value.includes(',')) {
            const [head, ...rest] = value.split(',');
            commitToken(head);
            setDraft(rest.join(',').replace(/^\s+/, ''));
            return;
          }
          setDraft(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Tab') {
            if (draft.trim()) {
              event.preventDefault();
              commitToken(draft);
            }
          } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
            removeAt(tags.length - 1);
          }
        }}
        onBlur={() => {
          if (draft.trim()) commitToken(draft);
        }}
      />
    </div>
  );
}

type SharedEditorProps = {
  object: Artist2CatalogObject;
  contentById: Map<string, Artist2CatalogObject>;
  songById?: Map<string, Artist2CatalogObject>;
  onChangeName: (name: string) => void;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onImportSuno?: (rawInput: string) => Promise<void>;
  /** Rename on-disk cover to `{slug}-COVER[.n].{ext}` using this object's name. */
  onRenameCover?: () => Promise<void>;
  onRelateSong?: (
    toSongId: string,
    relation: Artist2SongRelationKind,
  ) => Promise<void>;
  onUnrelateSong?: (toSongId: string) => Promise<void>;
  onOpenSong?: (songId: string) => void;
};

function basename(path: string | null | undefined): string {
  if (!path) return 'None';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function IncompleteBadges({ hints }: { hints: Array<{ label: string }> }) {
  if (hints.length === 0) return null;
  return (
    <div className="a2-incomplete-row" aria-label="Incomplete hints">
      {hints.map((hint) => (
        <span key={hint.label} className="a2-incomplete-badge">
          {hint.label}
        </span>
      ))}
    </div>
  );
}

function SongLinksSection({
  payload,
  onPatchPayload,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (payload: Record<string, unknown>) => void;
}) {
  const entries = normalizeSongLinks(payload);

  const commit = (next: Artist2SongLink[]) => {
    // Cutover: persist structured rows only — catalog clears deprecated flat links.
    onPatchPayload({ linkEntries: next });
  };

  const updateEntry = (id: string, patch: Partial<Artist2SongLink>) => {
    commit(entries.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeEntry = (id: string) => {
    commit(entries.filter((row) => row.id !== id || row.kind === 'song_pages'));
  };

  const addRow = (
    kind: Exclude<Artist2SongLinkKind, 'song_pages'>,
    providerId?: string,
  ) => {
    const maxOrder = entries.reduce((m, e) => Math.max(m, e.sortOrder), 0);
    commit([
      ...entries,
      createEmptyLinkRow(kind, {
        providerId,
        sortOrder: maxOrder + 10,
        dateAdded: todayMmDdYyyy(),
      }),
    ]);
  };

  const songPages = entries.find((e) => e.kind === 'song_pages');
  const streamingLinks = entries.filter((e) => e.kind === 'streaming');
  const webLinks = entries.filter((e) => e.kind === 'web');
  const socialLinks = entries.filter((e) => e.kind === 'social');

  // A streaming provider may only appear once — used to disable duplicate picks.
  const streamingProviderInUse = (providerId: string, exceptRowId: string): boolean =>
    entries.some(
      (e) => e.kind === 'streaming' && e.id !== exceptRowId && e.providerId === providerId,
    );

  const distributionLinks = entries.filter((e) => e.kind === 'distribution');
  const streamingProviders = providersByCapability('streaming');
  const socialProviders = providersByCapability('social');
  const distributionProviders = providersByCapability('distribution');
  const songPagesState = songPages?.songPagesState ?? 'not_published';

  return (
    <section className="a2-section">
      <h3>Links, Distribution, and Social Media</h3>

      {songPages ? (
        <div className="a2-song-pages-card">
          <img className="a2-song-pages-icon" src={appIcon} alt="Song Pages" />
          <div className="a2-song-pages-body">
            <span className="a2-song-pages-label">Song Pages</span>
            <div className="a2-song-pages-detail">
              <a
                className="a2-song-pages-url"
                href="http://www.somesongpages.url"
                onClick={(event) => event.preventDefault()}
              >
                http://www.somesongpages.url
              </a>
              <span className="a2-song-pages-status-wrap">
                <span className="a2-song-pages-status-label">Status</span>
                <span className={`a2-status-box a2-status-box--${songPagesState}`}>
                  {SONG_PAGES_STATE_LABELS[songPagesState]}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="a2-links-group">
        <h4 className="a2-streaming-heading">Streaming Services</h4>
        {streamingLinks.length === 0 ? (
          <p className="a2-empty-note">
            You have not listed any streaming service URLs for this song yet.
          </p>
        ) : (
          <LinkTable
            firstColLabel="Provider"
            rows={streamingLinks}
            deleteLabel="Remove streaming service"
            onUpdate={updateEntry}
            onRemove={removeEntry}
            renderFirstCell={(row) => (
              <select
                value={row.providerId ?? ''}
                aria-label="Streaming provider"
                onChange={(event) => {
                  const providerId = event.target.value || null;
                  // Block picking a provider another streaming row already uses.
                  if (providerId && streamingProviderInUse(providerId, row.id)) return;
                  updateEntry(row.id, { providerId });
                }}
              >
                <option value="">Select…</option>
                {streamingProviders.map((provider) => {
                  const taken = streamingProviderInUse(provider.id, row.id);
                  return (
                    <option key={provider.id} value={provider.id} disabled={taken}>
                      {provider.name}
                      {taken ? ' (added)' : ''}
                    </option>
                  );
                })}
              </select>
            )}
          />
        )}
      </div>

      <div className="a2-links-group">
        <h4 className="a2-streaming-heading">Web Links</h4>
        {webLinks.length === 0 ? (
          <p className="a2-empty-note">You have not added any web links for this song yet.</p>
        ) : (
          <LinkTable
            firstColLabel="Name"
            rows={webLinks}
            deleteLabel="Delete web link"
            onUpdate={updateEntry}
            onRemove={removeEntry}
            renderFirstCell={(row) => (
              <input
                className="a2-link-name-input"
                value={row.label ?? ''}
                placeholder="Web Link"
                aria-label="Link name"
                onChange={(event) => updateEntry(row.id, { label: event.target.value })}
              />
            )}
          />
        )}
      </div>

      {socialLinks.length > 0 ? (
        <div className="a2-links-group">
          <h4 className="a2-streaming-heading">Social Posts</h4>
          <LinkTable
            firstColLabel="Provider"
            rows={socialLinks}
            deleteLabel="Delete social post"
            onUpdate={updateEntry}
            onRemove={removeEntry}
            renderFirstCell={(row) => (
              <select
                value={row.providerId ?? ''}
                aria-label="Social provider"
                onChange={(event) =>
                  updateEntry(row.id, { providerId: event.target.value || null })
                }
              >
                <option value="">Select…</option>
                {socialProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      ) : null}

      {distributionLinks.length > 0 ? (
        <div className="a2-links-group">
          <h4 className="a2-streaming-heading">Distribution</h4>
          <LinkTable
            firstColLabel="Provider"
            rows={distributionLinks}
            deleteLabel="Delete distribution link"
            onUpdate={updateEntry}
            onRemove={removeEntry}
            renderFirstCell={(row) => (
              <select
                value={row.providerId ?? ''}
                aria-label="Distribution provider"
                onChange={(event) =>
                  updateEntry(row.id, { providerId: event.target.value || null })
                }
              >
                <option value="">Select…</option>
                {distributionProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      ) : null}

      <div className="a2-link-add-menu">
        <button type="button" className="a2-secondary" onClick={() => addRow('streaming')}>
          Add Streaming Service
        </button>
        <button type="button" className="a2-secondary" onClick={() => addRow('web')}>
          Add Web Link
        </button>
        <button type="button" className="a2-secondary" onClick={() => addRow('social')}>
          Add Social Post
        </button>
        <button type="button" className="a2-secondary" onClick={() => addRow('distribution')}>
          Add Distribution Provider
        </button>
      </div>
    </section>
  );
}

function CreationProcessSection({
  payload,
  onPatchPayload,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (payload: Record<string, unknown>) => void;
}) {
  const { processes, aiPrompts } = normalizeCreationProcessState(payload);
  // Primary prompt is always shown first; the rest keep their existing order.
  const sortedPrompts = [...aiPrompts].sort(
    (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || a.sortOrder - b.sortOrder,
  );

  // Which process-type tab / target sub-tab is currently open. Both fall back to
  // the first option so the view is always valid.
  const [activeType, setActiveType] = useState<Artist2CreationProcessType | null>(null);
  const [activeTarget, setActiveTarget] = useState<Artist2CreationProcessTarget | null>(null);

  // All four process types are always shown as tabs (matrix order), each with
  // Music / Mix + Vocals sub-tabs. There's no longer a checkbox table.
  const visibleTypes = CREATION_PROCESS_TYPES;
  const targetsForType = CREATION_PROCESS_TARGETS;
  const effectiveType =
    activeType && visibleTypes.includes(activeType) ? activeType : visibleTypes[0];
  const effectiveTarget =
    activeTarget && targetsForType.includes(activeTarget) ? activeTarget : targetsForType[0];

  // Stable placeholder so a tab always has a backing cell to edit. Its data is
  // only persisted once the author actually types something (see patchCell).
  const buildPlaceholderCell = (
    processType: Artist2CreationProcessType,
    target: Artist2CreationProcessTarget,
  ): Artist2CreationProcess => ({
    id: `cp-new-${processType}-${target}`,
    processType,
    target,
    available: true,
    ...(processType === 'ai_generation'
      ? { aiModels: [{ id: `aim-new-${processType}-${target}`, primary: true }] }
      : {}),
  });

  const activeCell =
    findCreationProcess(processes, effectiveTarget, effectiveType) ??
    buildPlaceholderCell(effectiveType, effectiveTarget);

  const commitProcesses = (next: Artist2CreationProcess[]) => {
    onPatchPayload({ creationProcesses: next });
  };

  const commitPrompts = (next: Artist2AiPromptEntry[]) => {
    onPatchPayload({ aiPrompts: ensureSinglePrimaryPrompt(next) });
  };

  // Upsert: update an existing cell, or lazily append one (from the placeholder)
  // the first time a not-yet-persisted tab is edited.
  const patchCell = (id: string, patch: Partial<Artist2CreationProcess>) => {
    if (processes.some((p) => p.id === id)) {
      commitProcesses(updateCreationProcess(processes, id, patch));
      return;
    }
    const seeded = activeCell.id === id ? activeCell : buildPlaceholderCell(effectiveType, effectiveTarget);
    commitProcesses(updateCreationProcess([...processes, seeded], id, patch));
  };

  const renderPanelBody = (cell: Artist2CreationProcess) => {
    if (cell.processType === 'performed') return renderPerformedPanel(cell);
    if (cell.processType === 'electronic_daw') return renderDawPanel(cell);
    if (cell.processType === 'ai_generation') return renderAiPanel(cell);
    return renderOtherPanel(cell);
  };

  const renderPerformedPanel = (cell: Artist2CreationProcess) => (
    <div key={cell.id} className="a2-process-panel">
      <fieldset className="a2-chip-fieldset">
        <legend>Recording context</legend>
        {PERFORMED_CONTEXTS.map((ctx) => {
          const checked = Boolean(cell.performedContexts?.includes(ctx));
          return (
            <label key={ctx} className="a2-chip-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const set = new Set(cell.performedContexts ?? []);
                  if (event.target.checked) set.add(ctx);
                  else set.delete(ctx);
                  patchCell(cell.id, { performedContexts: [...set] });
                }}
              />
              {PERFORMED_CONTEXT_LABELS[ctx]}
            </label>
          );
        })}
      </fieldset>
      <label className="a2-field">
        <span>Performed recording notes</span>
        <textarea
          rows={3}
          value={cell.performedNotes ?? ''}
          onChange={(event) => patchCell(cell.id, { performedNotes: event.target.value })}
        />
      </label>
    </div>
  );

  const renderDawPanel = (cell: Artist2CreationProcess) => (
    <div key={cell.id} className="a2-process-panel">
      <label className="a2-field">
        <span>Primary tool</span>
        <input
          value={cell.primaryTool ?? ''}
          placeholder="Ableton Live, Logic Pro, FL Studio…"
          onChange={(event) => patchCell(cell.id, { primaryTool: event.target.value })}
        />
      </label>
      <label className="a2-field">
        <span>Additional tools</span>
        <input
          value={(cell.additionalTools ?? []).join(', ')}
          placeholder="Comma-separated — Serum, Kontakt…"
          onChange={(event) =>
            patchCell(cell.id, {
              additionalTools: event.target.value
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label className="a2-field">
        <span>Commentary</span>
        <textarea
          rows={3}
          value={cell.dawCommentary ?? ''}
          onChange={(event) => patchCell(cell.id, { dawCommentary: event.target.value })}
        />
      </label>
    </div>
  );

  const renderAiPanel = (cell: Artist2CreationProcess) => {
    const models = cell.aiModels ?? [];
    const isVocals = cell.target === 'vocals';
    const musicAi = findCreationProcess(processes, 'music_mix', 'ai_generation');
    const sameAsMusic = Boolean(isVocals && cell.sameAsMusic);
    const canMirrorMusic = Boolean(musicAi);

    return (
      <div key={cell.id} className="a2-process-panel">
        {isVocals ? (
          <label className="a2-field a2-field-checkbox a2-same-as-music">
            <span>Same as music</span>
            <input
              type="checkbox"
              checked={sameAsMusic}
              disabled={!canMirrorMusic && !sameAsMusic}
              title={
                canMirrorMusic
                  ? 'Copy Music / Mix AI models and commentary'
                  : 'Enable AI Generation · Music / Mix first'
              }
              onChange={(event) => {
                if (event.target.checked && !canMirrorMusic) return;
                commitProcesses(setAiVocalsSameAsMusic(processes, event.target.checked));
              }}
            />
          </label>
        ) : null}

        {sameAsMusic ? (
          <div className="a2-same-as-music-summary">
            <p className="a2-muted">
              Mirrors Music / Mix
              {!canMirrorMusic ? ' — enable Music / Mix AI to keep this in sync.' : '.'}
            </p>
            {(models.length > 0 ? models : musicAi?.aiModels ?? []).map((model) => (
              <p key={model.id} className="a2-same-as-music-line">
                {[model.provider, model.modelName, model.version].filter(Boolean).join(' · ') ||
                  'Untitled model'}
                {model.primary ? ' · Primary' : ''}
              </p>
            ))}
            {(cell.aiCommentary ?? musicAi?.aiCommentary)?.trim() ? (
              <p className="a2-same-as-music-line a2-muted">
                Commentary: {(cell.aiCommentary ?? musicAi?.aiCommentary)?.trim()}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {/* Catch-all notes for the whole model set — sits above the table. */}
            <label className="a2-field">
              <span>Commentary</span>
              <textarea
                rows={3}
                value={cell.aiCommentary ?? ''}
                placeholder="Notes on how generations were selected, combined, or edited…"
                onChange={(event) => patchCell(cell.id, { aiCommentary: event.target.value })}
              />
            </label>

            <table className="a2-ai-model-table">
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Model name</th>
                  <th scope="col">Version</th>
                  <th scope="col">{isVocals ? 'Persona' : 'Primary'}</th>
                  <th scope="col">
                    <span className="a2-sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id}>
                    <td>
                      <input
                        value={model.provider ?? ''}
                        placeholder="Suno"
                        aria-label="Provider"
                        onChange={(event) => {
                          const next = models.map((m) =>
                            m.id === model.id ? { ...m, provider: event.target.value } : m,
                          );
                          patchCell(cell.id, { aiModels: next });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={model.modelName ?? ''}
                        aria-label="Model name"
                        onChange={(event) => {
                          const next = models.map((m) =>
                            m.id === model.id ? { ...m, modelName: event.target.value } : m,
                          );
                          patchCell(cell.id, { aiModels: next });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        value={model.version ?? ''}
                        aria-label="Version"
                        onChange={(event) => {
                          const next = models.map((m) =>
                            m.id === model.id ? { ...m, version: event.target.value } : m,
                          );
                          patchCell(cell.id, { aiModels: next });
                        }}
                      />
                    </td>
                    {isVocals ? (
                      <td>
                        <input
                          value={model.persona ?? ''}
                          placeholder="Persona / voice"
                          aria-label="Persona"
                          onChange={(event) => {
                            const next = models.map((m) =>
                              m.id === model.id ? { ...m, persona: event.target.value } : m,
                            );
                            patchCell(cell.id, { aiModels: next });
                          }}
                        />
                      </td>
                    ) : (
                      <td className="a2-ai-primary-cell">
                        <input
                          type="checkbox"
                          checked={Boolean(model.primary)}
                          aria-label="Primary / Final"
                          onChange={() => {
                            const next = ensureSinglePrimaryModel(
                              models.map((m) => ({ ...m, primary: m.id === model.id })),
                            );
                            patchCell(cell.id, { aiModels: next });
                          }}
                        />
                      </td>
                    )}
                    <td>
                      {!isVocals || models.length > 1 ? (
                        <button
                          type="button"
                          className="a2-icon-danger"
                          title="Remove model"
                          aria-label="Remove model"
                          onClick={() =>
                            patchCell(cell.id, {
                              aiModels: ensureSinglePrimaryModel(
                                models.filter((m) => m.id !== model.id),
                              ),
                            })
                          }
                        >
                          🗑
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isVocals ? (
              <button
                type="button"
                className="a2-secondary a2-ai-add-model"
                onClick={() =>
                  patchCell(cell.id, {
                    aiModels: ensureSinglePrimaryModel([
                      ...models,
                      { id: newAiModelId(), primary: models.length === 0 },
                    ]),
                  })
                }
              >
                Add model
              </button>
            ) : null}
          </>
        )}
      </div>
    );
  };

  const renderOtherPanel = (cell: Artist2CreationProcess) => (
    <div key={cell.id} className="a2-process-panel">
      <label className="a2-field">
        <span>Process name</span>
        <input
          value={cell.otherProcessName ?? ''}
          onChange={(event) => patchCell(cell.id, { otherProcessName: event.target.value })}
        />
      </label>
      <label className="a2-field">
        <span>Commentary</span>
        <textarea
          rows={3}
          value={cell.otherCommentary ?? ''}
          onChange={(event) => patchCell(cell.id, { otherCommentary: event.target.value })}
        />
      </label>
    </div>
  );

  return (
    <section className="a2-section">
      <h3>Creation Process</h3>
      <p className="a2-help a2-process-help">Detail the underlying processes that helped create this song.</p>

      {/* Tabbed process areas — one tab per process type (matrix order), each with
          Music / Mix + Vocals target sub-tabs. */}
      <div className="a2-process-tabs-wrap">
        <div className="a2-process-tabs" role="tablist" aria-label="Creation process sections">
          {visibleTypes.map((processType) => (
            <button
              key={processType}
              type="button"
              role="tab"
              aria-selected={processType === effectiveType}
              className={`a2-process-tab${processType === effectiveType ? ' is-active' : ''}`}
              onClick={() => setActiveType(processType)}
            >
              {CREATION_PROCESS_TYPE_LABELS[processType]}
            </button>
          ))}
        </div>

        <div className="a2-process-active">
          <div className="a2-process-active-head">
            <div
              className="a2-process-subtabs"
              role="tablist"
              aria-label={`${CREATION_PROCESS_TYPE_LABELS[effectiveType]} target`}
            >
              {targetsForType.map((target) => (
                <button
                  key={target}
                  type="button"
                  role="tab"
                  aria-selected={target === effectiveTarget}
                  className={`a2-process-subtab${target === effectiveTarget ? ' is-active' : ''}`}
                  onClick={() => setActiveTarget(target)}
                >
                  {CREATION_PROCESS_TARGET_LABELS[target]}
                </button>
              ))}
            </div>
            <ConfirmActionButton
              label="Clear"
              className="a2-process-clear"
              confirmMessage={`Clear all ${CREATION_PROCESS_TYPE_LABELS[effectiveType]} · ${CREATION_PROCESS_TARGET_LABELS[effectiveTarget]} information?`}
              onConfirm={() =>
                commitProcesses(clearCreationProcess(processes, effectiveTarget, effectiveType))
              }
            />
          </div>
          {renderPanelBody(activeCell)}
        </div>
      </div>

      {/* Prompt Information belongs to AI Generation — show it only while that tab is open. */}
      {effectiveType === 'ai_generation' ? (
        <div className="a2-process-panel">
          <h4>Prompt Information</h4>
          {aiPrompts.length === 0 ? <p className="a2-muted">No prompts yet.</p> : null}
          <ul className="a2-prompt-list">
            {sortedPrompts.map((prompt) => {
              const isNegative = prompt.promptType === 'negative';
              const softMax = isNegative ? AI_NEGATIVE_PROMPT_SOFT_MAX : AI_PROMPT_SOFT_MAX;
              const len = (prompt.text ?? '').length;
              return (
                <li key={prompt.id} className="a2-prompt-row">
                  <div className="a2-prompt-controls">
                    <label className="a2-field a2-field-compact">
                      <span>Type</span>
                      <select
                        value={prompt.target}
                        onChange={(event) => {
                          const target = event.target.value as Artist2AiPromptEntry['target'];
                          commitPrompts(
                            aiPrompts.map((p) => (p.id === prompt.id ? { ...p, target } : p)),
                          );
                        }}
                      >
                        <option value="general">General</option>
                        <option value="music_mix">Music / Mix</option>
                        <option value="vocals">Vocals</option>
                      </select>
                    </label>
                    {/* Positive (green +) by default; click to make it a negative (red −) prompt. */}
                    <button
                      type="button"
                      className={`a2-sign-bug ${isNegative ? 'is-negative' : 'is-positive'}`}
                      aria-pressed={isNegative}
                      title={isNegative ? 'Negative prompt — click for positive' : 'Positive prompt — click for negative'}
                      onClick={() => {
                        const promptType = isNegative ? 'prompt' : 'negative';
                        commitPrompts(
                          aiPrompts.map((p) =>
                            p.id === prompt.id ? { ...p, promptType } : p,
                          ),
                        );
                      }}
                    >
                      {isNegative ? '−' : '+'}
                    </button>
                    {/* Primary bug (independent of positive/negative). */}
                    {prompt.primary ? (
                      <span className="a2-primary-bug is-primary">Primary</span>
                    ) : (
                      <button
                        type="button"
                        className="a2-primary-bug"
                        onClick={() =>
                          commitPrompts(
                            ensureSinglePrimaryPrompt(
                              aiPrompts.map((p) => ({
                                ...p,
                                primary: p.id === prompt.id,
                              })),
                            ),
                          )
                        }
                      >
                        Make primary
                      </button>
                    )}
                    <DeleteIconButton
                      label="Remove prompt"
                      confirmMessage="Delete this prompt?"
                      className="a2-prompt-remove"
                      onConfirm={() =>
                        commitPrompts(aiPrompts.filter((p) => p.id !== prompt.id))
                      }
                    />
                  </div>
                  <label className="a2-field">
                    <span>Prompt text</span>
                    <textarea
                      rows={3}
                      value={prompt.text ?? ''}
                      onChange={(event) =>
                        commitPrompts(
                          aiPrompts.map((p) =>
                            p.id === prompt.id ? { ...p, text: event.target.value } : p,
                          ),
                        )
                      }
                    />
                    <span className={`a2-field-meta${len > softMax ? ' a2-char-warn' : ''}`}>
                      {len}/{softMax}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="a2-secondary"
            onClick={() =>
              commitPrompts([
                ...aiPrompts,
                {
                  id: newAiPromptId(),
                  promptType: 'prompt',
                  text: '',
                  primary: aiPrompts.filter((p) => p.promptType === 'prompt').length === 0,
                  target: 'general',
                  sortOrder: (aiPrompts.length + 1) * 10,
                },
              ])
            }
          >
            Add prompt
          </button>
        </div>
      ) : null}
    </section>
  );
}

function VideoAndAnimationSection({
  payload,
}: {
  payload: Artist2SongPayload;
}) {
  // Stub only — do not wire pickers / promote yet; keep payload shape reserved.
  const entries = normalizeSongVideos(payload.videoEntries);

  return (
    <section className="a2-section a2-section--stub">
      <h3>Video and Animation</h3>
        <p className="a2-help">
          Reserved for music videos, lyric videos, visualizers, live clips, animated covers, and
          related media attached to this Song. You can already create reusable{' '}
          <strong>Content · Video</strong> in the catalog library; wiring those into this Song
          section comes next.
        </p>
      {entries.length === 0 ? (
        <p className="a2-muted">No videos yet.</p>
      ) : (
        <ul className="a2-video-stub-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              {ARTIST2_VIDEO_KIND_LABELS[entry.kind] || entry.kind}
              {entry.label ? ` — ${entry.label}` : ''}
            </li>
          ))}
        </ul>
      )}
      <div className="a2-stub-actions">
        <button type="button" disabled title="Video attach / Content-ref UX comes later">
          Add video… (coming soon)
        </button>
        <p className="a2-muted">
          Planned kinds:{' '}
          {ARTIST2_VIDEO_KINDS.map((kind) => ARTIST2_VIDEO_KIND_LABELS[kind]).join(' · ')}
        </p>
      </div>
    </section>
  );
}

function RelatedSongsSection({
  object,
  songById,
  onRelateSong,
  onUnrelateSong,
  onOpenSong,
}: {
  object: Artist2CatalogObject;
  songById?: Map<string, Artist2CatalogObject>;
  onRelateSong?: (
    toSongId: string,
    relation: Artist2SongRelationKind,
  ) => Promise<void>;
  onUnrelateSong?: (toSongId: string) => Promise<void>;
  onOpenSong?: (songId: string) => void;
}) {
  const payload = object.payload as Artist2SongPayload;
  const relations = normalizeSongRelations(payload.relatedSongs);

  return (
    <section className="a2-section">
      <h3>Related Songs</h3>
      <p className="a2-help">
        Link another Song as a sister / remix / adaptation — it stays its own Song. With this Song
        selected, use → on another Song in the catalog (adds as Sister; change the type below).
        Format variants of the same cut belong under Recordings, not here.
      </p>
      {relations.length === 0 ? (
        <p className="a2-muted">No related Songs yet.</p>
      ) : (
        <ul className="a2-related-list">
          {relations.map((rel: Artist2SongRelation) => {
            const target = songById?.get(rel.songId);
            const missing = !target;
            return (
              <li key={rel.songId} className="a2-related-row">
                <div className="a2-related-main">
                  {onOpenSong && target ? (
                    <button
                      type="button"
                      className="a2-linkish"
                      onClick={() => onOpenSong(rel.songId)}
                    >
                      {target.name}
                    </button>
                  ) : (
                    <strong>{target?.name ?? 'Missing Song'}</strong>
                  )}
                  {missing ? <span className="a2-muted"> (not in active catalog)</span> : null}
                  <select
                    className="a2-related-type"
                    value={rel.relation}
                    disabled={!onRelateSong || missing}
                    aria-label={`Relation type for ${target?.name ?? rel.songId}`}
                    onChange={(event) => {
                      if (!onRelateSong) return;
                      void onRelateSong(
                        rel.songId,
                        event.target.value as Artist2SongRelationKind,
                      );
                    }}
                  >
                    {ARTIST2_SONG_RELATION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {songRelationLabel(kind)}
                      </option>
                    ))}
                  </select>
                </div>
                {onUnrelateSong ? (
                  <button
                    type="button"
                    className="a2-secondary"
                    onClick={() => void onUnrelateSong(rel.songId)}
                  >
                    Unlink
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecordingsSection({
  payload,
  onPatchPayload,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (payload: Record<string, unknown>) => void;
}) {
  const recordings = normalizeSongRecordings(payload);

  const commit = (next: Artist2SongRecording[]) => {
    const ensured = ensureSinglePrimary(next);
    onPatchPayload({
      recordings: ensured,
      recording: legacyRecordingFromList(ensured),
    });
  };

  return (
    <section className="a2-section">
      <h3>Recordings</h3>
      <div className="a2-recordings">
        {recordings.length === 0 ? (
          <p className="a2-muted">No recordings yet.</p>
        ) : (
          <table className="a2-recording-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th className="a2-recording-publish-col">Publish</th>
                <th className="a2-recording-primary-col">Primary</th>
                <th className="a2-recording-actions-col">
                  <span className="a2-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => (
                <tr key={rec.id}>
                  <td className="a2-recording-name">
                    <code>{basename(rec.audioPath) || '—'}</code>
                  </td>
                  <td className="a2-recording-publish-col">
                    {/* Publish is an independent, per-recording flag — any number
                        of recordings may be published at once. */}
                    <button
                      type="button"
                      className={`a2-vis-toggle ${rec.published ? 'is-public' : 'is-private'}`}
                      aria-pressed={Boolean(rec.published)}
                      title={rec.published ? 'Published' : 'Not published'}
                      onClick={() =>
                        commit(
                          recordings.map((r) =>
                            r.id === rec.id ? { ...r, published: !r.published } : r,
                          ),
                        )
                      }
                    >
                      {rec.published ? 'Published' : 'Publish'}
                    </button>
                  </td>
                  <td className="a2-recording-primary-col">
                    {/* Exactly one primary — the canonical cut used for compile /
                        site audio. Independent of the publish flag. */}
                    {rec.primary ? (
                      <span className="a2-primary-bug is-primary">Primary</span>
                    ) : (
                      <button
                        type="button"
                        className="a2-primary-bug"
                        onClick={() =>
                          commit(
                            ensureSinglePrimary(
                              recordings.map((r) => ({ ...r, primary: r.id === rec.id })),
                            ),
                          )
                        }
                      >
                        Make primary
                      </button>
                    )}
                  </td>
                  <td className="a2-recording-actions-col">
                    <div className="a2-recording-actions">
                      <button
                        type="button"
                        className="a2-icon-btn"
                        title="Choose file…"
                        aria-label="Choose audio file"
                        onClick={async () => {
                          const path = await getApp()?.artist?.pickAudio?.();
                          if (!path) return;
                          commit(
                            recordings.map((r) =>
                              r.id === rec.id ? { ...r, audioPath: path } : r,
                            ),
                          );
                        }}
                      >
                        📁
                      </button>
                      <RecordingPlayButton audioPath={rec.audioPath} />
                      <DeleteIconButton
                        label="Remove recording"
                        confirmMessage="Delete this recording?"
                        onConfirm={() => commit(recordings.filter((r) => r.id !== rec.id))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          className="a2-secondary a2-add-recording"
          onClick={async () => {
            const path = await getApp()?.artist?.pickAudio?.();
            if (!path) return;
            commit([
              ...recordings,
              {
                id: newSongRecordingId(),
                audioPath: path,
                label: recordings.length === 0 ? 'Main' : `Recording ${recordings.length + 1}`,
                published: true,
                primary: recordings.length === 0,
              },
            ]);
          }}
        >
          Add recording…
        </button>
      </div>
    </section>
  );
}

function SongArtworkSection({
  objectName,
  payload,
  contentById,
  onPatchPayload,
  onPromoteArtwork,
  onOpenContent,
  onRenameCover,
}: {
  objectName: string;
  payload: Artist2SongPayload;
  contentById: Map<string, Artist2CatalogObject>;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onRenameCover?: () => Promise<void>;
}) {
  const entries = normalizeSongArtwork(payload);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteName, setPromoteName] = useState(`${objectName} Artwork`);
  const [renameBusy, setRenameBusy] = useState(false);
  const [expandedCommentaryId, setExpandedCommentaryId] = useState<string | null>(null);

  const commit = (next: Artist2ArtworkEntry[]) => {
    const ensured = ensureSinglePrimaryArtwork(next);
    onPatchPayload({
      artworkEntries: ensured,
      artwork: legacyArtworkFromEntries(ensured),
    });
  };

  const updateEntry = (id: string, patch: Partial<Artist2ArtworkEntry>) => {
    commit(entries.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addInlineImage = async () => {
    const path = await getApp()?.artist?.pickImage?.();
    if (!path) return;
    const maxOrder = entries.reduce((m, e) => Math.max(m, e.sortOrder), 0);
    const role: Artist2ArtworkRole =
      entries.length === 0 ? 'primary_cover' : 'additional_image';
    commit([
      ...entries,
      createArtworkEntry({ mode: 'inline', path }, { role, sortOrder: maxOrder + 10 }),
    ]);
  };

  return (
    <section className="a2-section">
      <h3>Artwork</h3>
      <p className="a2-help">
        Multiple images are allowed. Exactly one may be the Primary Cover — it mirrors next to the
        Song title and is used for compile.
      </p>

      {entries.length === 0 ? (
        <p className="a2-muted">No artwork yet.</p>
      ) : (
        <ul className="a2-artwork-list">
          {entries.map((entry) => {
            const thumbPath = resolveArtworkEntryPath(entry, contentById);
            const contentRef =
              entry.source.mode === 'contentRef' ? entry.source.contentId : null;
            const resolvedContent = contentRef ? contentById.get(contentRef) ?? null : null;
            const descLen = (entry.description ?? '').length;
            const commentaryLen = (entry.commentary ?? '').length;
            const isPrimary = entry.role === 'primary_cover';
            const canRename = Boolean(thumbPath && onRenameCover && isPrimary);

            return (
              <li key={entry.id} className="a2-artwork-entry">
                <div className="a2-artwork-layout">
                  <ArtworkThumbnail
                    filePath={thumbPath}
                    alt={entry.description || `${objectName} artwork`}
                  />
                  <div className="a2-artwork-controls">
                    <div className="a2-field-row">
                      <label className="a2-field a2-field-compact">
                        <span>Artwork type</span>
                        <select
                          value={entry.role}
                          onChange={(event) => {
                            const role = event.target.value as Artist2ArtworkRole;
                            if (role === 'primary_cover') {
                              commit(setPrimaryArtwork(entries, entry.id));
                              return;
                            }
                            updateEntry(entry.id, {
                              role:
                                role === 'additional_cover'
                                  ? 'additional_cover'
                                  : 'additional_image',
                            });
                          }}
                        >
                          {(Object.keys(ARTWORK_ROLE_LABELS) as Artist2ArtworkRole[]).map(
                            (role) => (
                              <option key={role} value={role}>
                                {ARTWORK_ROLE_LABELS[role]}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      {!isPrimary ? (
                        <button
                          type="button"
                          className="a2-ghost"
                          onClick={() => commit(setPrimaryArtwork(entries, entry.id))}
                        >
                          Make Primary Cover
                        </button>
                      ) : (
                        <span className="a2-vis-public">Primary</span>
                      )}
                    </div>

                    <label className="a2-field">
                      <span>Description</span>
                      <input
                        value={entry.description ?? ''}
                        placeholder="Back cover, session photo…"
                        onChange={(event) =>
                          updateEntry(entry.id, { description: event.target.value })
                        }
                      />
                      <span
                        className={
                          descLen > ARTWORK_DESCRIPTION_SOFT_MAX ? 'a2-char-warn' : 'a2-muted'
                        }
                      >
                        {descLen}/{ARTWORK_DESCRIPTION_SOFT_MAX}
                      </span>
                    </label>

                    {contentRef ? (
                      <ArtworkRefView
                        content={resolvedContent}
                        onClear={() =>
                          updateEntry(entry.id, { source: { mode: 'inline', path: null } })
                        }
                        onChooseInline={async () => {
                          const path = await getApp()?.artist?.pickImage?.();
                          if (!path) return;
                          updateEntry(entry.id, { source: { mode: 'inline', path } });
                        }}
                        onOpenContent={
                          onOpenContent && contentRef && resolvedContent
                            ? () => onOpenContent(contentRef)
                            : undefined
                        }
                        onRenameCover={
                          canRename
                            ? async () => {
                                setRenameBusy(true);
                                try {
                                  await onRenameCover!();
                                } finally {
                                  setRenameBusy(false);
                                }
                              }
                            : undefined
                        }
                        renameBusy={renameBusy}
                      />
                    ) : (
                      <div className="a2-file-row">
                        <code>{basename(entry.source.mode === 'inline' ? entry.source.path : null)}</code>
                        <button
                          type="button"
                          onClick={async () => {
                            const path = await getApp()?.artist?.pickImage?.();
                            if (!path) return;
                            updateEntry(entry.id, { source: { mode: 'inline', path } });
                          }}
                        >
                          Choose image…
                        </button>
                      </div>
                    )}

                    {canRename && entry.source.mode === 'inline' ? (
                      <button
                        type="button"
                        className="a2-secondary"
                        disabled={renameBusy}
                        title="Rename Tool: rewrite the filename using this Song’s name"
                        onClick={() => {
                          setRenameBusy(true);
                          void onRenameCover!()
                            .catch(() => undefined)
                            .finally(() => setRenameBusy(false));
                        }}
                      >
                        {renameBusy ? 'Renaming…' : 'Rename Tool'}
                      </button>
                    ) : null}

                    {isPrimary && entry.source.mode === 'inline' && entry.source.path ? (
                      promoteOpen ? (
                        <form
                          className="a2-inline-form a2-promote-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            onPromoteArtwork(promoteName.trim() || `${objectName} Artwork`);
                            setPromoteOpen(false);
                          }}
                        >
                          <input
                            value={promoteName}
                            onChange={(event) => setPromoteName(event.target.value)}
                            aria-label="Content name"
                            placeholder="Content name"
                          />
                          <button type="submit">Create Content</button>
                          <button type="button" onClick={() => setPromoteOpen(false)}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="a2-secondary"
                          onClick={() => {
                            setPromoteName(`${objectName} Artwork`);
                            setPromoteOpen(true);
                          }}
                        >
                          Promote to Content
                        </button>
                      )
                    ) : null}

                    <button
                      type="button"
                      className="a2-ghost"
                      onClick={() =>
                        setExpandedCommentaryId(
                          expandedCommentaryId === entry.id ? null : entry.id,
                        )
                      }
                    >
                      {expandedCommentaryId === entry.id ? 'Hide commentary' : 'Commentary…'}
                    </button>
                    {expandedCommentaryId === entry.id ? (
                      <label className="a2-field">
                        <span>Commentary</span>
                        <textarea
                          rows={3}
                          value={entry.commentary ?? ''}
                          onChange={(event) =>
                            updateEntry(entry.id, { commentary: event.target.value })
                          }
                        />
                        <span
                          className={
                            commentaryLen > ARTWORK_COMMENTARY_SOFT_MAX
                              ? 'a2-char-warn'
                              : 'a2-muted'
                          }
                        >
                          {commentaryLen}/{ARTWORK_COMMENTARY_SOFT_MAX}
                        </span>
                      </label>
                    ) : null}

                    <button
                      type="button"
                      className="a2-secondary"
                      onClick={() => commit(entries.filter((row) => row.id !== entry.id))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={() => void addInlineImage()}>
        Add image…
      </button>
    </section>
  );
}

function ArtworkSection({
  objectName,
  artwork,
  contentById,
  onPatchPayload,
  onPromoteArtwork,
  onOpenContent,
  onRenameCover,
}: {
  objectName: string;
  artwork: Artist2SongPayload['artwork'];
  contentById: Map<string, Artist2CatalogObject>;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onRenameCover?: () => Promise<void>;
}) {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteName, setPromoteName] = useState(`${objectName} Artwork`);
  const [renameBusy, setRenameBusy] = useState(false);
  const inlinePath = artwork?.mode === 'inline' ? artwork.path : null;
  const contentRef = artwork?.mode === 'contentRef' ? artwork.contentId : null;
  const resolvedContent = contentRef ? contentById.get(contentRef) ?? null : null;
  const thumbPath = resolveArtworkFilePath(artwork, contentById);
  const canRename = Boolean(thumbPath && onRenameCover);

  return (
    <section className="a2-section">
      <h3>Artwork</h3>
      <div className="a2-artwork-layout">
        <ArtworkThumbnail filePath={thumbPath} alt={`${objectName} artwork`} />
        <div className="a2-artwork-controls">
          {contentRef ? (
            <ArtworkRefView
              content={resolvedContent}
              onClear={() => onPatchPayload({ artwork: { mode: 'inline', path: null } })}
              onChooseInline={async () => {
                const path = await getApp()?.artist?.pickImage?.();
                if (!path) return;
                onPatchPayload({ artwork: { mode: 'inline', path } });
              }}
              onOpenContent={
                onOpenContent && contentRef && resolvedContent
                  ? () => onOpenContent(contentRef)
                  : undefined
              }
              onRenameCover={
                canRename
                  ? async () => {
                      setRenameBusy(true);
                      try {
                        await onRenameCover!();
                      } finally {
                        setRenameBusy(false);
                      }
                    }
                  : undefined
              }
              renameBusy={renameBusy}
            />
          ) : (
            <>
              <div className="a2-file-row">
                <code>{basename(inlinePath)}</code>
                <button
                  type="button"
                  onClick={async () => {
                    const path = await getApp()?.artist?.pickImage?.();
                    if (!path) return;
                    onPatchPayload({ artwork: { mode: 'inline', path } });
                  }}
                >
                  Choose image…
                </button>
              </div>
              {canRename ? (
                <button
                  type="button"
                  className="a2-secondary"
                  disabled={!inlinePath || renameBusy}
                  title="Rename Tool: rewrite the filename using this object’s name ({name}-COVER.{ext})"
                  onClick={() => {
                    setRenameBusy(true);
                    void onRenameCover!()
                      .catch(() => undefined)
                      .finally(() => setRenameBusy(false));
                  }}
                >
                  {renameBusy ? 'Renaming…' : 'Rename Tool'}
                </button>
              ) : null}
              {promoteOpen ? (
                <form
                  className="a2-inline-form a2-promote-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onPromoteArtwork(promoteName.trim() || `${objectName} Artwork`);
                    setPromoteOpen(false);
                  }}
                >
                  <input
                    value={promoteName}
                    onChange={(event) => setPromoteName(event.target.value)}
                    aria-label="Content name"
                    placeholder="Content name"
                  />
                  <button type="submit" disabled={!inlinePath}>
                    Create Content
                  </button>
                  <button type="button" onClick={() => setPromoteOpen(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="a2-secondary"
                  disabled={!inlinePath}
                  onClick={() => {
                    setPromoteName(`${objectName} Artwork`);
                    setPromoteOpen(true);
                  }}
                >
                  Promote to Content
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function SongEditor({
  object,
  contentById,
  songById,
  onChangeName,
  onPatchPayload,
  onDelete,
  onPromoteArtwork,
  onOpenContent,
  onImportSuno,
  onRenameCover,
  onRelateSong,
  onUnrelateSong,
  onOpenSong,
}: SharedEditorProps) {
  const payload = object.payload as Artist2SongPayload;
  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(onPatchPayload, 400);
  const [sunoInput, setSunoInput] = useState('');
  const [sunoBusy, setSunoBusy] = useState(false);
  const [sunoMessage, setSunoMessage] = useState<string | null>(null);
  const [sunoImportOpen, setSunoImportOpen] = useState(false);
  // Slug stays derived until the author opts into “Edit URL slug”.
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [aboutMode, setAboutMode] = useState<'write' | 'preview'>('write');
  const [aboutDraft, setAboutDraft] = useState(payload.about ?? '');
  const [lyricsMode, setLyricsMode] = useState<'write' | 'preview'>('write');
  const [lyricsDraft, setLyricsDraft] = useState(payload.lyrics ?? '');
  const [captionLen, setCaptionLen] = useState((payload.caption ?? '').length);
  const [aboutLen, setAboutLen] = useState((payload.about ?? '').length);
  const fieldKey = (part: string) => `${part}-${object.id}`;
  const headerArtPath = resolvePrimaryArtworkPath(payload, contentById);
  const effectiveSlug = resolveSongSlug({ name: object.name, slug: payload.slug });

  return (
    <div className="a2-editor">
      {/* Big section heading with primary actions, divided from the form below. */}
      <header className="a2-editor-topbar">
        <h2 className="a2-editor-heading">Edit Song</h2>
        <div className="a2-editor-header-actions a2-editor-header-actions--inline">
          {onImportSuno ? (
            <button
              type="button"
              className="a2-secondary"
              onClick={() => {
                setSunoMessage(null);
                setSunoImportOpen(true);
              }}
            >
              Import
            </button>
          ) : null}
          <button type="button" className="a2-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>

      {/* Cover sits directly right of the title + slug block and spans their height. */}
      <div className="a2-editor-title-row">
        <div className="a2-editor-title-block">
          <p className="a2-song-field-label">Song title</p>
          <input
            className="a2-title-input a2-title-input--song"
            defaultValue={object.name}
            key={fieldKey('song-name')}
            onChange={(event) => {
              const name = event.target.value;
              debouncedName(name);
              // Keep URL slug in sync with the public label unless manually locked.
              if (!payload.slugManual) {
                debouncedPayload({ slug: slugifySongName(name) });
              }
            }}
            aria-label="Song title"
          />
          <div className="a2-slug-row a2-slug-row--header">
            {editingSlug ? (
              <div className="a2-inline-form">
                <input
                  value={slugDraft}
                  onChange={(event) => setSlugDraft(event.target.value)}
                  aria-label="URL slug"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = slugifySongName(slugDraft);
                    onPatchPayload({ slug: next, slugManual: true });
                    setEditingSlug(false);
                  }}
                >
                  Save slug
                </button>
                <button type="button" className="a2-ghost" onClick={() => setEditingSlug(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p className="a2-muted a2-slug-line">
                  URL slug: <code>{effectiveSlug}</code>
                  {payload.slugManual ? ' · manual' : ' · derived from Song label'}
                </p>
                <button
                  type="button"
                  className="a2-ghost a2-slug-edit"
                  onClick={() => {
                    setSlugDraft(effectiveSlug);
                    setEditingSlug(true);
                  }}
                >
                  Edit URL slug
                </button>
              </>
            )}
          </div>
        </div>
        <ArtworkThumbnail
          filePath={headerArtPath}
          alt={`${object.name} cover`}
          className="a2-artwork-thumb--header"
        />
      </div>

      {/* Subtitle / Caption / About stretch to the full editor width. */}
      <section className="a2-section a2-section--song-identity">
            <label className="a2-field a2-field--song">
              <span className="a2-song-field-label">Subtitle</span>
              <input
                defaultValue={payload.subtitle ?? ''}
                key={fieldKey('song-subtitle')}
                placeholder="Optional secondary line (edition, feature, …)"
                onChange={(event) => debouncedPayload({ subtitle: event.target.value })}
              />
            </label>
            <label className="a2-field a2-field--song">
              <span className="a2-song-field-label">Caption</span>
              <textarea
                rows={2}
                defaultValue={payload.caption ?? ''}
                key={fieldKey('song-caption')}
                placeholder="Short public line for cards / featured"
                onChange={(event) => {
                  setCaptionLen(event.target.value.length);
                  debouncedPayload({ caption: event.target.value });
                }}
              />
              <span
                className={`a2-field-meta${captionLen > CAPTION_SOFT_MAX ? ' a2-char-warn' : ''}`}
              >
                {captionLen}/{CAPTION_SOFT_MAX}
                {captionLen > CAPTION_SOFT_MAX ? ' — prefer a shorter caption' : ''}
              </span>
            </label>
            <div className="a2-field a2-field--song">
              <div className="a2-field-heading-row a2-field-heading-row--song">
                <span className="a2-song-field-label">About</span>
                <div className="a2-segmented" role="group" aria-label="About editor mode">
                  <button
                    type="button"
                    className={aboutMode === 'write' ? 'is-active' : undefined}
                    onClick={() => setAboutMode('write')}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={aboutMode === 'preview' ? 'is-active' : undefined}
                    onClick={() => setAboutMode('preview')}
                  >
                    Preview
                  </button>
                </div>
              </div>
              {aboutMode === 'write' ? (
                <textarea
                  rows={5}
                  defaultValue={payload.about ?? ''}
                  key={fieldKey('song-about')}
                  placeholder="Primary public description (Markdown)"
                  onChange={(event) => {
                    const value = event.target.value;
                    setAboutDraft(value);
                    setAboutLen(value.length);
                    debouncedPayload({ about: value });
                  }}
                />
              ) : (
                <pre className="a2-markdown-preview">
                  {aboutDraft.trim() || 'Nothing to preview yet.'}
                </pre>
              )}
              <span className={`a2-field-meta${aboutLen > ABOUT_SOFT_MAX ? ' a2-char-warn' : ''}`}>
                {aboutLen}/{ABOUT_SOFT_MAX}
                {aboutLen > ABOUT_SOFT_MAX ? ' — consider shortening for cards / mobile' : ''}
              </span>
            </div>
          </section>

      {sunoImportOpen && onImportSuno ? (
        <div
          className="a2-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!sunoBusy) setSunoImportOpen(false);
          }}
        >
          <div
            className="a2-modal a2-suno-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a2-suno-import-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="a2-modal-header">
              <h2 id="a2-suno-import-title">Import from Suno</h2>
              <button
                type="button"
                className="a2-modal-close"
                disabled={sunoBusy}
                onClick={() => setSunoImportOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="a2-modal-body">
              <p className="a2-help">
                Paste a suno.com link or clip ID. Imports title, lyrics, AI Creation Process (model +
                prompt from Studio tags), creation date, and the static cover — not the MP3 or any
                video.
              </p>
              <form
                className="a2-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = sunoInput.trim();
                  if (!value || sunoBusy) return;
                  setSunoBusy(true);
                  setSunoMessage(null);
                  void onImportSuno(value)
                    .then(() => {
                      setSunoInput('');
                      setSunoMessage(
                        'Imported metadata and static cover (if available). Attach MP3 separately.',
                      );
                    })
                    .catch((err: unknown) => {
                      setSunoMessage(err instanceof Error ? err.message : String(err));
                    })
                    .finally(() => setSunoBusy(false));
                }}
              >
                <input
                  type="text"
                  value={sunoInput}
                  onChange={(event) => setSunoInput(event.target.value)}
                  placeholder="https://suno.com/song/… or clip UUID"
                  aria-label="Suno URL or ID"
                  disabled={sunoBusy}
                  autoFocus
                />
                <button type="submit" disabled={sunoBusy || !sunoInput.trim()}>
                  {sunoBusy ? 'Importing…' : 'Import'}
                </button>
              </form>
              {payload.suno?.clipId ? (
                <p className="a2-muted">
                  Linked Suno clip: <code>{payload.suno.clipId}</code>
                  {payload.suno.modelBadge ? ` · ${payload.suno.modelBadge}` : ''}
                </p>
              ) : null}
              {sunoMessage ? <p className="a2-muted">{sunoMessage}</p> : null}
            </div>
            <footer className="a2-modal-footer">
              <button
                type="button"
                className="a2-ghost"
                disabled={sunoBusy}
                onClick={() => setSunoImportOpen(false)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <IncompleteBadges hints={songIncompleteHints(object)} />

      <section className="a2-section">
        <h3>Overview</h3>
        <label className="a2-field a2-field--date">
          <span className="a2-label-with-help">
            Creation date
            <HelpPopover label="Creation date format help">
              Digits only — day/month optional (<code>2025</code>, <code>07/2025</code>, or{' '}
              <code>16/07/2025</code>).
            </HelpPopover>
          </span>
          <input
            className="a2-field-date"
            defaultValue={songCreationDate(payload)}
            key={fieldKey('song-created')}
            placeholder="DD/MM/YYYY"
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => {
              const next = sanitizeCreationDateInput(event.target.value);
              event.target.value = next;
              debouncedPayload({ creationDate: next });
            }}
          />
        </label>
        <label className="a2-field a2-field--half">
          <span>Primary genre</span>
          <input
            defaultValue={payload.primaryGenre ?? ''}
            key={fieldKey('song-primary-genre')}
            placeholder="Freeform — e.g. folk"
            onChange={(event) => debouncedPayload({ primaryGenre: event.target.value })}
          />
        </label>
        <label className="a2-field">
          <span>Additional genres</span>
          <GenreTagsInput
            key={fieldKey('song-addl-genres')}
            genres={payload.additionalGenres ?? []}
            placeholder="Type a genre, then Enter or comma"
            onChange={(additionalGenres) => debouncedPayload({ additionalGenres })}
          />
        </label>
        <label className="a2-field a2-field--bpm">
          <span>BPM</span>
          <input
            className="a2-field-bpm"
            inputMode="numeric"
            defaultValue={payload.bpm ?? ''}
            key={fieldKey('song-bpm')}
            placeholder="0–1999"
            onChange={(event) => {
              const bpm = sanitizeBpmInput(event.target.value);
              event.target.value = bpm === null ? '' : String(bpm);
              debouncedPayload({ bpm });
            }}
          />
        </label>
      </section>

      <SongLinksSection payload={payload} onPatchPayload={onPatchPayload} />

      <CreationProcessSection payload={payload} onPatchPayload={onPatchPayload} />

      <section className="a2-section">
        <div className="a2-field a2-field--lyrics">
          {/* Heading row mirrors About: title left, Write/Preview toggle right. */}
          <div className="a2-field-heading-row">
            <h3 className="a2-lyrics-heading">Lyrics</h3>
            <div className="a2-segmented" role="group" aria-label="Lyrics editor mode">
              <button
                type="button"
                className={lyricsMode === 'write' ? 'is-active' : undefined}
                onClick={() => setLyricsMode('write')}
              >
                Write
              </button>
              <button
                type="button"
                className={lyricsMode === 'preview' ? 'is-active' : undefined}
                onClick={() => setLyricsMode('preview')}
              >
                Preview
              </button>
            </div>
          </div>
          {lyricsMode === 'write' ? (
            <textarea
              rows={8}
              defaultValue={payload.lyrics ?? ''}
              key={fieldKey('song-lyrics')}
              onChange={(event) => {
                setLyricsDraft(event.target.value);
                debouncedPayload({ lyrics: event.target.value });
              }}
            />
          ) : (
            <pre className="a2-markdown-preview a2-lyrics-preview">
              {lyricsDraft.trim() || 'Nothing to preview yet.'}
            </pre>
          )}
        </div>
      </section>

      <RecordingsSection payload={payload} onPatchPayload={onPatchPayload} />

      <RelatedSongsSection
        object={object}
        songById={songById}
        onRelateSong={onRelateSong}
        onUnrelateSong={onUnrelateSong}
        onOpenSong={onOpenSong}
      />

      <VideoAndAnimationSection payload={payload} />

      <SongArtworkSection
        objectName={object.name}
        payload={payload}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
      />

      <section className="a2-section">
        <div className="a2-field a2-field--notes">
          {/* Heading with a static "Private" status pill (informational, not a toggle). */}
          <div className="a2-notes-heading-row">
            <h3 className="a2-notes-heading">Notes</h3>
            <span className="a2-private-pill">Private</span>
          </div>
          <textarea
            rows={3}
            defaultValue={payload.notes ?? ''}
            key={fieldKey('song-notes')}
            onChange={(event) => debouncedPayload({ notes: event.target.value })}
          />
        </div>
      </section>
    </div>
  );
}

type ContainerEditorProps = {
  object: Artist2CatalogObject;
  detail: Artist2AlbumDetail | null;
  contentById: Map<string, Artist2CatalogObject>;
  onChangeName: (name: string) => void;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
  onRemoveTrack: (membershipId: string) => void;
  onMoveTrack: (memberId: string, direction: -1 | 1) => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onRenameCover?: () => Promise<void>;
};

function ContainerTrackList({
  containerWord,
  tracks,
  memberships,
  onRemoveTrack,
  onMoveTrack,
}: {
  containerWord: string;
  tracks: Artist2CatalogObject[];
  memberships: Artist2AlbumDetail['memberships'];
  onRemoveTrack: (membershipId: string) => void;
  onMoveTrack: (memberId: string, direction: -1 | 1) => void;
}) {
  return (
    <section className="a2-section">
      <h3>Tracks</h3>
      <p className="a2-help">
        Use → on Songs in the catalog sidebar to insert references here. Expand a {containerWord} in
        the sidebar to find Songs through it.
      </p>
      {tracks.length === 0 ? (
        <div className="a2-drop-zone">Insert songs via → from the catalog</div>
      ) : (
        <ol className="a2-track-list">
          {tracks.map((track, index) => {
            const membership = memberships.find((m) => m.memberId === track.id);
            return (
              <li key={track.id} className="a2-track-row">
                <span className="a2-track-pos">{index + 1}</span>
                <span className="a2-track-name">{track.name}</span>
                <div className="a2-track-actions">
                  <button type="button" onClick={() => onMoveTrack(track.id, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveTrack(track.id, 1)}
                    disabled={index === tracks.length - 1}
                  >
                    ↓
                  </button>
                  {membership ? (
                    <button type="button" onClick={() => onRemoveTrack(membership.id)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function AlbumEditor({
  object,
  detail,
  contentById,
  onChangeName,
  onPatchPayload,
  onDelete,
  onRemoveTrack,
  onMoveTrack,
  onPromoteArtwork,
  onOpenContent,
  onRenameCover,
}: ContainerEditorProps) {
  const payload = object.payload as Artist2AlbumPayload;
  const tracks = detail?.tracks ?? [];
  const memberships = detail?.memberships ?? [];
  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(onPatchPayload, 400);

  return (
    <div className="a2-editor">
      <header className="a2-editor-header">
        <div>
          <p className="a2-kicker">Album · Container</p>
          <input
            className="a2-title-input"
            defaultValue={object.name}
            key={`album-name-${object.id}`}
            onChange={(event) => debouncedName(event.target.value)}
            aria-label="Album name"
          />
        </div>
        <button type="button" className="a2-danger" onClick={onDelete}>
          Delete
        </button>
      </header>

      <IncompleteBadges hints={albumIncompleteHints(object, tracks.length)} />

      <section className="a2-section">
        <h3>Overview</h3>
        <label className="a2-field">
          <span>Release date</span>
          <input
            defaultValue={payload.releaseDate ?? ''}
            key={`album-date-${object.id}`}
            onChange={(event) => debouncedPayload({ releaseDate: event.target.value })}
          />
        </label>
        <label className="a2-field">
          <span>Description</span>
          <textarea
            rows={3}
            defaultValue={payload.description ?? ''}
            key={`album-desc-${object.id}`}
            onChange={(event) => debouncedPayload({ description: event.target.value })}
          />
        </label>
      </section>

      <ContainerTrackList
        containerWord="Album"
        tracks={tracks}
        memberships={memberships}
        onRemoveTrack={onRemoveTrack}
        onMoveTrack={onMoveTrack}
      />

      <ArtworkSection
        objectName={object.name}
        artwork={payload.artwork}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
      />
    </div>
  );
}

export function PlaylistEditor({
  object,
  detail,
  contentById,
  onChangeName,
  onPatchPayload,
  onDelete,
  onRemoveTrack,
  onMoveTrack,
  onPromoteArtwork,
  onOpenContent,
  onRenameCover,
}: ContainerEditorProps) {
  const payload = object.payload as Artist2PlaylistPayload;
  const tracks = detail?.tracks ?? [];
  const memberships = detail?.memberships ?? [];
  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(onPatchPayload, 400);

  return (
    <div className="a2-editor">
      <header className="a2-editor-header">
        <div>
          <p className="a2-kicker">Playlist · Container</p>
          <input
            className="a2-title-input"
            defaultValue={object.name}
            key={`playlist-name-${object.id}`}
            onChange={(event) => debouncedName(event.target.value)}
            aria-label="Playlist name"
          />
        </div>
        <button type="button" className="a2-danger" onClick={onDelete}>
          Delete
        </button>
      </header>

      <IncompleteBadges hints={albumIncompleteHints(object, tracks.length)} />

      <section className="a2-section">
        <h3>Overview</h3>
        <p className="a2-help">
          Playlists curate Songs by reference — same membership model as Albums, different editorial
          fields. Compile still uses Album membership for the song “album” field (not playlists).
        </p>
        <label className="a2-field">
          <span>Curator</span>
          <input
            defaultValue={payload.curator ?? ''}
            key={`playlist-curator-${object.id}`}
            onChange={(event) => debouncedPayload({ curator: event.target.value })}
          />
        </label>
        <label className="a2-field">
          <span>Purpose</span>
          <input
            defaultValue={payload.purpose ?? ''}
            key={`playlist-purpose-${object.id}`}
            placeholder="Listening session, set warm-up, …"
            onChange={(event) => debouncedPayload({ purpose: event.target.value })}
          />
        </label>
        <label className="a2-field">
          <span>Update date</span>
          <input
            defaultValue={payload.updateDate ?? ''}
            key={`playlist-updated-${object.id}`}
            placeholder="When you last curated this list"
            onChange={(event) => debouncedPayload({ updateDate: event.target.value })}
          />
        </label>
        <label className="a2-field">
          <span>Description</span>
          <textarea
            rows={3}
            defaultValue={payload.description ?? ''}
            key={`playlist-desc-${object.id}`}
            onChange={(event) => debouncedPayload({ description: event.target.value })}
          />
        </label>
      </section>

      <ContainerTrackList
        containerWord="Playlist"
        tracks={tracks}
        memberships={memberships}
        onRemoveTrack={onRemoveTrack}
        onMoveTrack={onMoveTrack}
      />

      <ArtworkSection
        objectName={object.name}
        artwork={payload.artwork}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
      />
    </div>
  );
}

export function ContentEditor({
  object,
  onChangeName,
  onPatchPayload,
  onDelete,
  onRenameCover,
}: Omit<SharedEditorProps, 'onPromoteArtwork' | 'contentById' | 'onOpenContent'>) {
  const payload = object.payload as Artist2ContentPayload;
  const contentType = object.contentType ?? 'image';
  const isImage = contentType === 'image';
  const isVideo = contentType === 'video';
  const isAudio = contentType === 'audio';
  const isText = contentType === 'text';
  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(onPatchPayload, 400);
  const [renameBusy, setRenameBusy] = useState(false);
  const body = payload.body ?? '';
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  const kicker =
    contentType === 'text'
      ? 'Content · Text'
      : contentType === 'video'
        ? 'Content · Video'
        : contentType === 'audio'
          ? 'Content · Audio'
          : 'Content · Image';

  return (
    <div className="a2-editor">
      <header className="a2-editor-header">
        <div>
          <p className="a2-kicker">{kicker}</p>
          <input
            className="a2-title-input"
            defaultValue={object.name}
            key={`content-name-${object.id}`}
            onChange={(event) => debouncedName(event.target.value)}
            aria-label="Content name"
          />
        </div>
        <button type="button" className="a2-danger" onClick={onDelete}>
          Delete
        </button>
      </header>

      {payload.promotedFrom ? (
        <p className="a2-ref-note">
          Promoted from object <code>{payload.promotedFrom.objectId.slice(0, 8)}…</code>
        </p>
      ) : null}

      {isVideo || isAudio ? (
        <p className="a2-help">
          Library asset for reuse across Songs and Pages. Prefer attaching publish audio under a
          Song’s <strong>Recordings</strong>
          {isVideo ? (
            <>
              {' '}
              and Song-facing clips under <strong>Video and Animation</strong> (attach UX next)
            </>
          ) : null}
          . Standalone Content is for shared / reusable media — not a second publish pipeline.
        </p>
      ) : null}

      <section className="a2-section">
        {isImage ? (
          <div className="a2-file-row">
            <code>{basename(payload.filePath)}</code>
            <button
              type="button"
              onClick={async () => {
                const path = await getApp()?.artist?.pickImage?.();
                if (!path) return;
                onPatchPayload({ filePath: path });
              }}
            >
              Choose image…
            </button>
            {onRenameCover && payload.filePath ? (
              <button
                type="button"
                className="a2-secondary"
                disabled={renameBusy}
                title="Rename Tool: rewrite the filename using this object’s name ({name}-COVER.{ext})"
                onClick={() => {
                  setRenameBusy(true);
                  void onRenameCover()
                    .catch(() => undefined)
                    .finally(() => setRenameBusy(false));
                }}
              >
                {renameBusy ? 'Renaming…' : 'Rename Tool'}
              </button>
            ) : null}
          </div>
        ) : null}

        {isVideo ? (
          <div className="a2-file-row">
            <code>{basename(payload.filePath)}</code>
            <button
              type="button"
              onClick={async () => {
                const path = await getApp()?.artist?.pickVideo?.();
                if (!path) return;
                onPatchPayload({ filePath: path });
              }}
            >
              Choose video…
            </button>
          </div>
        ) : null}

        {isAudio ? (
          <div className="a2-file-row">
            <code>{basename(payload.filePath)}</code>
            <button
              type="button"
              onClick={async () => {
                const path = await getApp()?.artist?.pickAudio?.();
                if (!path) return;
                onPatchPayload({ filePath: path });
              }}
            >
              Choose audio…
            </button>
          </div>
        ) : null}

        {isVideo || isAudio ? (
          <label className="a2-field">
            <span>Private notes</span>
            <textarea
              rows={3}
              defaultValue={payload.notes ?? ''}
              key={`content-notes-${object.id}`}
              placeholder="Optional — how this asset is meant to be reused"
              onChange={(event) => debouncedPayload({ notes: event.target.value })}
            />
          </label>
        ) : null}

        {isText ? (
          <>
            <p className="a2-help">
              Standalone written Content for Pages and embeds later. Prefer Markdown for structure;
              plain text is fine for short notes.
            </p>
            <label className="a2-field">
              <span>Format</span>
              <select
                defaultValue={payload.format ?? 'markdown'}
                key={`content-format-${object.id}`}
                onChange={(event) =>
                  debouncedPayload({
                    format: event.target.value === 'plain' ? 'plain' : 'markdown',
                  })
                }
              >
                <option value="markdown">Markdown</option>
                <option value="plain">Plain text</option>
              </select>
            </label>
            <label className="a2-field">
              <span>Summary</span>
              <input
                defaultValue={payload.summary ?? ''}
                key={`content-summary-${object.id}`}
                placeholder="Short blurb for lists / embeds"
                onChange={(event) => debouncedPayload({ summary: event.target.value })}
              />
            </label>
            <label className="a2-field">
              <span>Body</span>
              <textarea
                className="a2-text-body"
                rows={16}
                defaultValue={body}
                key={`content-body-${object.id}`}
                onChange={(event) => debouncedPayload({ body: event.target.value })}
              />
            </label>
            <p className="a2-muted a2-text-stats">
              {wordCount} word{wordCount === 1 ? '' : 's'} · {charCount} character
              {charCount === 1 ? '' : 's'}
            </p>
            <label className="a2-field">
              <span>Private notes</span>
              <textarea
                rows={3}
                defaultValue={payload.notes ?? ''}
                key={`content-notes-text-${object.id}`}
                onChange={(event) => debouncedPayload({ notes: event.target.value })}
              />
            </label>
          </>
        ) : null}
      </section>
    </div>
  );
}
