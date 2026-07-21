/**
 * Right-pane object editors — wireframe fields for Song / Album / Content.
 */

import { type ReactNode, useEffect, useRef, useState } from 'react';

import type {
  Artist2AlbumDetail,
  Artist2AlbumPayload,
  Artist2AlbumRelation,
  Artist2AlbumRelationKind,
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
  albumCreationDate,
  albumIncompleteHints,
  albumRelationLabel,
  clearCreationProcess,
  ARTIST2_ALBUM_RELATION_KINDS,
  ARTIST2_SONG_RELATION_KINDS,
  ARTIST2_VIDEO_KIND_LABELS,
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
  MUSICAL_ENSEMBLE_LABELS,
  MUSICAL_ENSEMBLES,
  newAiModelId,
  newAiPromptId,
  newSongRecordingId,
  normalizeAlbumRelations,
  normalizeCreationProcessState,
  normalizeSongArtwork,
  normalizeSongLinks,
  normalizeSongRecordings,
  normalizeSongRelations,
  normalizeSongVideos,
  PERFORMED_CONTEXT_LABELS,
  PERFORMED_CONTEXTS,
  playlistAbout,
  playlistProducerCredit,
  PRIMARY_VOCAL_PRESENTATION_LABELS,
  PRIMARY_VOCAL_PRESENTATIONS,
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
  songPrimaryLanguage,
  songRelationLabel,
  SONG_PAGES_STATE_LABELS,
  todayMmDdYyyy,
  updateCreationProcess,
  ADAPTATION_TYPE_LABELS,
  ADAPTATION_TYPES,
  ADAPTED_PARTY_ROLE_LABELS,
  ADAPTED_PARTY_ROLES,
  ORIGINAL_COPYRIGHT_STATUS_LABELS,
  ORIGINAL_COPYRIGHT_STATUSES,
  patchAdaptedWork,
  songAdaptedWork,
  SOURCE_MATERIAL_HELP,
  SOURCE_MATERIAL_KINDS,
  SOURCE_MATERIAL_LABELS,
  toggleAdaptedWorkListValue,
  type Artist2AdaptedWork,
} from '@shared/artist2';

import { ArtworkRefView } from './ArtworkRefView';
import { ArtworkFileMeta } from './ArtworkFileMeta';
import { ArtworkThumbnail, resolveArtworkFilePath } from './ArtworkThumbnail';
import { CollapsibleSection } from './CollapsibleSection';
import { useDebouncedCallback } from './useDebouncedCallback';
import { useAlbumSectionCollapse } from './useAlbumSectionCollapse';
import { usePlaylistSectionCollapse } from './usePlaylistSectionCollapse';
import { useSongSectionCollapse } from './useSongSectionCollapse';
import { SongCardsDesignerModal } from '../song-cards/SongCardsDesignerModal';
import { SongChipsDesignerModal } from '../song-chips/SongChipsDesignerModal';
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
// Public credit / copyright lines are single-line catch-alls; caps are soft and
// only surface a gentle counter warning (the value is never truncated).
const COPYRIGHT_SOFT_MAX = 250;
const CREDIT_SOFT_MAX = 300;
/** Artist-chosen lyric excerpt for cards / publisher — hard-capped in the editor. */
const LYRIC_QUOTE_HARD_MAX = 500;

function parseGenreToken(raw: string): string {
  return raw.replace(/,/g, '').trim();
}

/**
 * Freeform tag pills — commit on comma / Enter / Tab / blur, remove with × or
 * Backspace. Used for genres, languages, and Themes / Keywords; `noun` labels
 * the "Add …" placeholder and aria-label.
 */
function TagsInput({
  genres,
  onChange,
  placeholder,
  noun = 'genre',
}: {
  genres: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  noun?: string;
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
        placeholder={tags.length === 0 ? placeholder : `Add ${noun}…`}
        aria-label={`Additional ${noun} tag`}
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
  /** Active artist display name — Song Cards preview + credits. */
  artistName?: string;
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

type SectionCollapseControl = {
  collapsed: boolean;
  onToggle: () => void;
};

function SongLinksSection({
  payload,
  onPatchPayload,
  collapsed,
  onToggle,
  entityNoun = 'song',
  /** Defaults to the full Song/Album set; Playlists omit streaming + distribution. */
  allowedKinds = ['song_pages', 'streaming', 'web', 'social', 'distribution'],
}: {
  payload: { linkEntries?: Artist2SongLink[]; links?: Artist2SongPayload['links'] };
  onPatchPayload: (payload: Record<string, unknown>) => void;
  /** Used in empty-state copy — Album / Playlist reuse this section. */
  entityNoun?: 'song' | 'album' | 'playlist';
  allowedKinds?: Artist2SongLinkKind[];
} & SectionCollapseControl) {
  const entries = normalizeSongLinks(payload);
  const kindAllowed = (kind: Artist2SongLinkKind) => allowedKinds.includes(kind);

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
    if (!kindAllowed(kind)) return;
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

  const songPages = kindAllowed('song_pages')
    ? entries.find((e) => e.kind === 'song_pages')
    : undefined;
  const streamingLinks = kindAllowed('streaming')
    ? entries.filter((e) => e.kind === 'streaming')
    : [];
  const webLinks = kindAllowed('web') ? entries.filter((e) => e.kind === 'web') : [];
  const socialLinks = kindAllowed('social') ? entries.filter((e) => e.kind === 'social') : [];
  const distributionLinks = kindAllowed('distribution')
    ? entries.filter((e) => e.kind === 'distribution')
    : [];

  // A streaming provider may only appear once — used to disable duplicate picks.
  const streamingProviderInUse = (providerId: string, exceptRowId: string): boolean =>
    entries.some(
      (e) => e.kind === 'streaming' && e.id !== exceptRowId && e.providerId === providerId,
    );

  const streamingProviders = providersByCapability('streaming');
  const socialProviders = providersByCapability('social');
  const distributionProviders = providersByCapability('distribution');
  const songPagesState = songPages?.songPagesState ?? 'not_published';
  const sectionTitle = kindAllowed('streaming') || kindAllowed('distribution')
    ? 'Links, Distribution, and Social Media'
    : 'Links and Social Media';

  return (
    <CollapsibleSection
      title={sectionTitle}
      collapsed={collapsed}
      onToggle={onToggle}
    >
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

      {kindAllowed('streaming') ? (
        <div className="a2-links-group">
          <h4 className="a2-streaming-heading">Streaming Services</h4>
          {streamingLinks.length === 0 ? (
            <p className="a2-empty-note">
              You have not listed any streaming service URLs for this {entityNoun} yet.
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
      ) : null}

      {kindAllowed('web') ? (
        <div className="a2-links-group">
          <h4 className="a2-streaming-heading">Web Links</h4>
          {webLinks.length === 0 ? (
            <p className="a2-empty-note">
              You have not added any web links for this {entityNoun} yet.
            </p>
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
      ) : null}

      {kindAllowed('social') && socialLinks.length > 0 ? (
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

      {kindAllowed('distribution') && distributionLinks.length > 0 ? (
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
        {kindAllowed('streaming') ? (
          <button type="button" className="a2-secondary" onClick={() => addRow('streaming')}>
            Add Streaming Service
          </button>
        ) : null}
        {kindAllowed('web') ? (
          <button type="button" className="a2-secondary" onClick={() => addRow('web')}>
            Add Web Link
          </button>
        ) : null}
        {kindAllowed('social') ? (
          <button type="button" className="a2-secondary" onClick={() => addRow('social')}>
            Add Social Post
          </button>
        ) : null}
        {kindAllowed('distribution') ? (
          <button type="button" className="a2-secondary" onClick={() => addRow('distribution')}>
            Add Distribution Provider
          </button>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

function CreationProcessSection({
  payload,
  onPatchPayload,
  collapsed,
  onToggle,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (payload: Record<string, unknown>) => void;
} & SectionCollapseControl) {
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
    <CollapsibleSection title="Creation Process" collapsed={collapsed} onToggle={onToggle}>
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
            <div className="a2-process-head-actions">
              {/* AI Vocals only: mirror toggle lives beside Clear on one line. */}
              {effectiveType === 'ai_generation' && effectiveTarget === 'vocals'
                ? (() => {
                    const musicAi = findCreationProcess(processes, 'music_mix', 'ai_generation');
                    const canMirrorMusic = Boolean(musicAi);
                    const sameAsMusic = Boolean(activeCell.sameAsMusic);
                    return (
                      <label
                        className="a2-same-as-music-inline"
                        title={
                          canMirrorMusic
                            ? 'Copy Music / Mix AI models and commentary'
                            : 'Enable AI Generation · Music / Mix first'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={sameAsMusic}
                          disabled={!canMirrorMusic && !sameAsMusic}
                          onChange={(event) => {
                            if (event.target.checked && !canMirrorMusic) return;
                            commitProcesses(
                              setAiVocalsSameAsMusic(processes, event.target.checked),
                            );
                          }}
                        />
                        <span>Same as music</span>
                      </label>
                    );
                  })()
                : null}
              <ConfirmActionButton
                label="Clear"
                className="a2-process-clear"
                confirmMessage={`Clear all ${CREATION_PROCESS_TYPE_LABELS[effectiveType]} · ${CREATION_PROCESS_TARGET_LABELS[effectiveTarget]} information?`}
                onConfirm={() =>
                  commitProcesses(clearCreationProcess(processes, effectiveTarget, effectiveType))
                }
              />
            </div>
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
    </CollapsibleSection>
  );
}

function VideoAndAnimationSection({
  payload,
  collapsed,
  onToggle,
}: {
  payload: Artist2SongPayload;
} & SectionCollapseControl) {
  // Stub only — do not wire pickers / promote yet; keep payload shape reserved.
  const entries = normalizeSongVideos(payload.videoEntries);

  return (
    <CollapsibleSection
      title="Video and Animation"
      className="a2-section--stub"
      collapsed={collapsed}
      onToggle={onToggle}
    >
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
      </div>
    </CollapsibleSection>
  );
}

function RelatedSongsSection({
  object,
  songById,
  onRelateSong,
  onUnrelateSong,
  onOpenSong,
  collapsed,
  onToggle,
}: {
  object: Artist2CatalogObject;
  songById?: Map<string, Artist2CatalogObject>;
  onRelateSong?: (
    toSongId: string,
    relation: Artist2SongRelationKind,
  ) => Promise<void>;
  onUnrelateSong?: (toSongId: string) => Promise<void>;
  onOpenSong?: (songId: string) => void;
} & SectionCollapseControl) {
  const payload = object.payload as Artist2SongPayload;
  const relations = normalizeSongRelations(payload.relatedSongs);

  return (
    <CollapsibleSection title="Related Songs" collapsed={collapsed} onToggle={onToggle}>
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
                </div>
                {/* Relation type + Unlink group flush right; dropdown sits just left of Unlink. */}
                <div className="a2-related-actions">
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
                  {onUnrelateSong ? (
                    <button
                      type="button"
                      className="a2-secondary"
                      onClick={() => void onUnrelateSong(rel.songId)}
                    >
                      Unlink
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsibleSection>
  );
}

function RelatedAlbumsSection({
  object,
  albumById,
  onRelateAlbum,
  onUnrelateAlbum,
  onOpenAlbum,
  collapsed,
  onToggle,
}: {
  object: Artist2CatalogObject;
  albumById?: Map<string, Artist2CatalogObject>;
  onRelateAlbum?: (
    toAlbumId: string,
    relation: Artist2AlbumRelationKind,
  ) => Promise<void>;
  onUnrelateAlbum?: (toAlbumId: string) => Promise<void>;
  onOpenAlbum?: (albumId: string) => void;
} & SectionCollapseControl) {
  const payload = object.payload as Artist2AlbumPayload;
  const relations = normalizeAlbumRelations(payload.relatedAlbums);

  return (
    <CollapsibleSection title="Related Albums" collapsed={collapsed} onToggle={onToggle}>
      <p className="a2-help">
        Link another Album as a sister / deluxe / reissue — it stays its own Album. With this Album
        selected, use → on another Album in the catalog (adds as Sister; change the type below).
      </p>
      {relations.length === 0 ? (
        <p className="a2-muted">No related Albums yet.</p>
      ) : (
        <ul className="a2-related-list">
          {relations.map((rel: Artist2AlbumRelation) => {
            const target = albumById?.get(rel.albumId);
            const missing = !target;
            return (
              <li key={rel.albumId} className="a2-related-row">
                <div className="a2-related-main">
                  {onOpenAlbum && target ? (
                    <button
                      type="button"
                      className="a2-linkish"
                      onClick={() => onOpenAlbum(rel.albumId)}
                    >
                      {target.name}
                    </button>
                  ) : (
                    <strong>{target?.name ?? 'Missing Album'}</strong>
                  )}
                  {missing ? <span className="a2-muted"> (not in active catalog)</span> : null}
                </div>
                <div className="a2-related-actions">
                  <select
                    className="a2-related-type"
                    value={rel.relation}
                    disabled={!onRelateAlbum || missing}
                    aria-label={`Relation type for ${target?.name ?? rel.albumId}`}
                    onChange={(event) => {
                      if (!onRelateAlbum) return;
                      void onRelateAlbum(
                        rel.albumId,
                        event.target.value as Artist2AlbumRelationKind,
                      );
                    }}
                  >
                    {ARTIST2_ALBUM_RELATION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {albumRelationLabel(kind)}
                      </option>
                    ))}
                  </select>
                  {onUnrelateAlbum ? (
                    <button
                      type="button"
                      className="a2-secondary"
                      onClick={() => void onUnrelateAlbum(rel.albumId)}
                    >
                      Unlink
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsibleSection>
  );
}

function RecordingsSection({
  payload,
  onPatchPayload,
  collapsed,
  onToggle,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (payload: Record<string, unknown>) => void;
} & SectionCollapseControl) {
  const recordings = normalizeSongRecordings(payload);

  const commit = (next: Artist2SongRecording[]) => {
    const ensured = ensureSinglePrimary(next);
    onPatchPayload({
      recordings: ensured,
      recording: legacyRecordingFromList(ensured),
    });
  };

  return (
    <CollapsibleSection title="Recordings" collapsed={collapsed} onToggle={onToggle}>
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
                        of recordings may be published at once. The button shows the
                        action it performs: green "Publish" when unpublished, red
                        "Unpublish" when published. */}
                    <button
                      type="button"
                      className={`a2-vis-toggle ${rec.published ? 'a2-publish-toggle--unpublish' : 'a2-publish-toggle--publish'}`}
                      aria-pressed={Boolean(rec.published)}
                      title={rec.published ? 'Published — click to unpublish' : 'Not published — click to publish'}
                      onClick={() =>
                        commit(
                          recordings.map((r) =>
                            r.id === rec.id ? { ...r, published: !r.published } : r,
                          ),
                        )
                      }
                    >
                      {rec.published ? 'Unpublish' : 'Publish'}
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
    </CollapsibleSection>
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
  collapsed,
  onToggle,
}: {
  objectName: string;
  /** Song and Album share the multi-image artworkEntries model. */
  payload: {
    artworkEntries?: Artist2ArtworkEntry[];
    artwork?: Artist2SongPayload['artwork'];
  };
  contentById: Map<string, Artist2CatalogObject>;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onRenameCover?: () => Promise<void>;
} & SectionCollapseControl) {
  const entries = normalizeSongArtwork(payload);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteName, setPromoteName] = useState(`${objectName} Artwork`);
  const [renameBusy, setRenameBusy] = useState(false);

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

  const pickImageForEntry = async (entryId: string) => {
    const path = await getApp()?.artist?.pickImage?.();
    if (!path) return;
    updateEntry(entryId, { source: { mode: 'inline', path } });
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
    <CollapsibleSection title="Artwork" collapsed={collapsed} onToggle={onToggle}>
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
            const inlinePath =
              entry.source.mode === 'inline' ? entry.source.path : null;
            const fileLabel = basename(inlinePath);
            const hasImage = Boolean(thumbPath);

            return (
              <li key={entry.id} className="a2-artwork-entry">
                <div className="a2-artwork-layout">
                  <div className="a2-artwork-thumb-col">
                    <button
                      type="button"
                      className="a2-artwork-thumb-hit"
                      title={hasImage ? 'Change image' : 'Add image'}
                      aria-label={hasImage ? 'Change image' : 'Add image'}
                      onClick={() => void pickImageForEntry(entry.id)}
                    >
                      <ArtworkThumbnail
                        filePath={thumbPath}
                        alt={entry.name || entry.description || `${objectName} artwork`}
                      />
                    </button>
                    <span className="a2-artwork-thumb-hint">
                      {hasImage ? 'Press to change image' : 'Press to add image'}
                    </span>
                  </div>

                  <div className="a2-artwork-controls">
                    <div className="a2-field-row a2-artwork-name-type-row">
                      <label className="a2-field a2-field--artwork-name">
                        <span>Name</span>
                        <input
                          value={entry.name ?? ''}
                          placeholder="Optional label"
                          onChange={(event) =>
                            updateEntry(entry.id, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className="a2-field a2-field--artwork-type">
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
                    </div>

                    <label className="a2-field a2-field--full">
                      <span>Caption/Description</span>
                      <input
                        value={entry.description ?? ''}
                        placeholder="Back cover, session photo…"
                        onChange={(event) =>
                          updateEntry(entry.id, { description: event.target.value })
                        }
                      />
                      <span
                        className={`a2-field-meta${
                          descLen > ARTWORK_DESCRIPTION_SOFT_MAX ? ' a2-char-warn' : ''
                        }`}
                      >
                        {descLen}/{ARTWORK_DESCRIPTION_SOFT_MAX}
                      </span>
                    </label>

                    <label className="a2-field a2-field--full">
                      <span>Commentary</span>
                      <textarea
                        rows={3}
                        value={entry.commentary ?? ''}
                        placeholder="Optional longer notes about this image"
                        onChange={(event) =>
                          updateEntry(entry.id, { commentary: event.target.value })
                        }
                      />
                      <span
                        className={`a2-field-meta${
                          commentaryLen > ARTWORK_COMMENTARY_SOFT_MAX ? ' a2-char-warn' : ''
                        }`}
                      >
                        {commentaryLen}/{ARTWORK_COMMENTARY_SOFT_MAX}
                      </span>
                    </label>

                    {contentRef ? (
                      <ArtworkRefView
                        content={resolvedContent}
                        onClear={() =>
                          updateEntry(entry.id, { source: { mode: 'inline', path: null } })
                        }
                        onChooseInline={async () => {
                          await pickImageForEntry(entry.id);
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
                      <div className="a2-artwork-file-block">
                        <div className="a2-file-row a2-file-row--artwork">
                          <code className="a2-filename-truncate" title={inlinePath || undefined}>
                            {fileLabel}
                          </code>
                          {canRename ? (
                            <button
                              type="button"
                              className="a2-secondary a2-rename-flush"
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
                        </div>
                        <ArtworkFileMeta filePath={inlinePath} />
                      </div>
                    )}

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
                  </div>
                </div>

                <DeleteIconButton
                  className="a2-artwork-remove"
                  label="Remove artwork"
                  confirmMessage="Remove this image from the Song?"
                  onConfirm={() => commit(entries.filter((row) => row.id !== entry.id))}
                />
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={() => void addInlineImage()}>
        Add image…
      </button>
    </CollapsibleSection>
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
              <div className="a2-artwork-file-block">
                <div className="a2-file-row">
                  <code className="a2-filename-truncate" title={inlinePath || undefined}>
                    {basename(inlinePath)}
                  </code>
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
                <ArtworkFileMeta filePath={inlinePath} />
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

/**
 * Adapted Work & Provenance — expands when the author marks the song as adapted.
 * Cataloging only (not legal advice). Spec: Additional-fields-adaptive-works.md.
 */
function AdaptedWorkSection({
  payload,
  onPatchPayload,
  collapsed,
  onToggle,
  fieldKey,
}: {
  payload: Artist2SongPayload;
  onPatchPayload: (patch: Partial<Artist2SongPayload>) => void;
  collapsed: boolean;
  onToggle: () => void;
  fieldKey: (part: string) => string;
}) {
  const adapted = songAdaptedWork(payload);
  const adaptedRef = useRef(adapted);
  adaptedRef.current = adapted;

  const debouncedAdapted = useDebouncedCallback((patch: Partial<Artist2AdaptedWork>) => {
    onPatchPayload({ adaptedWork: patchAdaptedWork(adaptedRef.current, patch) });
  }, 400);

  const commitAdapted = (patch: Partial<Artist2AdaptedWork>) => {
    const next = patchAdaptedWork(adaptedRef.current, patch);
    adaptedRef.current = next;
    onPatchPayload({ adaptedWork: next });
  };

  const pickProvenanceFile = async () => {
    const path = await getApp()?.openFile?.({
      filters: [
        { name: 'Documents & images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'webp'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (!path) return;
    commitAdapted({ provenanceFilePath: path });
  };

  return (
    <CollapsibleSection
      title="Adapted Work & Provenance"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <label className="a2-chip-check a2-adapted-enable">
        <input
          type="checkbox"
          checked={Boolean(adapted.enabled)}
          onChange={(event) => commitAdapted({ enabled: event.target.checked })}
        />
        This song is adapted from a pre-existing work
      </label>

      {adapted.enabled ? (
        <div className="a2-adapted-body">
          <p className="a2-adapted-note">
            Catalog provenance only — not a copyright determination. You remain responsible for
            confirming public-domain or license status.
          </p>

          <h4 className="a2-adapted-subhead">Adaptation</h4>

          <label className="a2-field">
            <span>Name of original work</span>
            <input
              defaultValue={adapted.originalWorkName ?? ''}
              key={fieldKey('adapted-original-name')}
              placeholder="Freeform title of the earlier work"
              onChange={(event) => debouncedAdapted({ originalWorkName: event.target.value })}
            />
          </label>

          <fieldset className="a2-chip-fieldset">
            <legend>Adaptation type</legend>
            <div className="a2-adapted-radio-grid">
              {ADAPTATION_TYPES.map((value) => (
                <label key={value} className="a2-chip-check">
                  <input
                    type="radio"
                    name={fieldKey('adaptation-type')}
                    checked={adapted.adaptationType === value}
                    onChange={() => commitAdapted({ adaptationType: value })}
                  />
                  {ADAPTATION_TYPE_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="a2-field">
            <span>Adapted by</span>
            <div className="a2-segmented" role="group" aria-label="Adapted by">
              {ADAPTED_PARTY_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={adapted.adaptedBy === role ? 'is-active' : undefined}
                  onClick={() =>
                    commitAdapted({
                      adaptedBy: role,
                      adapterName: role === 'me' ? '' : adapted.adapterName,
                    })
                  }
                >
                  {ADAPTED_PARTY_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {adapted.adaptedBy === 'someone_else' ? (
            <label className="a2-field">
              <span>Adapter name</span>
              <input
                defaultValue={adapted.adapterName ?? ''}
                key={fieldKey('adapted-adapter-name')}
                placeholder="Who created this adaptation"
                onChange={(event) => debouncedAdapted({ adapterName: event.target.value })}
              />
            </label>
          ) : null}

          <div className="a2-field">
            <span>Original creator</span>
            <div className="a2-segmented" role="group" aria-label="Original creator">
              {ADAPTED_PARTY_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={adapted.originalCreator === role ? 'is-active' : undefined}
                  onClick={() => commitAdapted({ originalCreator: role })}
                >
                  {ADAPTED_PARTY_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="a2-chip-fieldset">
            <legend>
              Source material used
              <HelpPopover label="Source material help">
                <strong>Existing Music</strong> — composition, independent of a recording.
                <br />
                <strong>Existing Performance</strong> — a recording or performance used or sampled.
                <br />
                <strong>Existing Lyrics</strong> — written lyrical content.
              </HelpPopover>
            </legend>
            <div className="a2-adapted-check-row">
              {SOURCE_MATERIAL_KINDS.map((kind) => {
                const checked = Boolean(adapted.sourceMaterial?.includes(kind));
                return (
                  <label key={kind} className="a2-chip-check" title={SOURCE_MATERIAL_HELP[kind]}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        commitAdapted({
                          sourceMaterial: toggleAdaptedWorkListValue(
                            adapted.sourceMaterial,
                            kind,
                            event.target.checked,
                          ),
                        })
                      }
                    />
                    {SOURCE_MATERIAL_LABELS[kind]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="a2-field a2-field--date">
            <span>Original publication date</span>
            <input
              className="a2-field-date"
              defaultValue={adapted.originalPublicationDate ?? ''}
              key={fieldKey('adapted-orig-pub')}
              placeholder="Year or full date"
              onChange={(event) =>
                debouncedAdapted({ originalPublicationDate: event.target.value })
              }
            />
          </label>

          <fieldset className="a2-chip-fieldset">
            <legend>Original copyright status</legend>
            <div className="a2-adapted-check-row">
              {ORIGINAL_COPYRIGHT_STATUSES.map((status) => {
                const checked = Boolean(adapted.originalCopyrightStatus?.includes(status));
                return (
                  <label key={status} className="a2-chip-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        commitAdapted({
                          originalCopyrightStatus: toggleAdaptedWorkListValue(
                            adapted.originalCopyrightStatus,
                            status,
                            event.target.checked,
                          ),
                        })
                      }
                    />
                    {ORIGINAL_COPYRIGHT_STATUS_LABELS[status]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <h4 className="a2-adapted-subhead">Provenance</h4>

          <label className="a2-field">
            <span>Original performer(s)</span>
            <input
              defaultValue={adapted.originalPerformers ?? ''}
              key={fieldKey('adapted-orig-performers')}
              onChange={(event) => debouncedAdapted({ originalPerformers: event.target.value })}
            />
          </label>
          <label className="a2-field">
            <span>Original music</span>
            <input
              defaultValue={adapted.originalMusic ?? ''}
              key={fieldKey('adapted-orig-music')}
              placeholder="Composer(s) or musical creator(s)"
              onChange={(event) => debouncedAdapted({ originalMusic: event.target.value })}
            />
          </label>
          <label className="a2-field">
            <span>Original words</span>
            <input
              defaultValue={adapted.originalWords ?? ''}
              key={fieldKey('adapted-orig-words')}
              placeholder="Lyricist(s) or author(s)"
              onChange={(event) => debouncedAdapted({ originalWords: event.target.value })}
            />
          </label>
          <label className="a2-field">
            <span>Original copyright holder</span>
            <input
              defaultValue={adapted.originalCopyrightHolder ?? ''}
              key={fieldKey('adapted-orig-holder')}
              onChange={(event) =>
                debouncedAdapted({ originalCopyrightHolder: event.target.value })
              }
            />
          </label>
          <label className="a2-field a2-field--full">
            <span>Primary provenance link</span>
            <input
              defaultValue={adapted.primaryProvenanceLink ?? ''}
              key={fieldKey('adapted-provenance-url')}
              placeholder="https://…"
              onChange={(event) =>
                debouncedAdapted({ primaryProvenanceLink: event.target.value })
              }
            />
          </label>

          <div className="a2-field">
            <span>Provenance file</span>
            <div className="a2-file-row">
              <code>{basename(adapted.provenanceFilePath) || '—'}</code>
              <button type="button" className="a2-secondary" onClick={() => void pickProvenanceFile()}>
                Choose…
              </button>
              {adapted.provenanceFilePath ? (
                <button
                  type="button"
                  className="a2-secondary"
                  onClick={() => commitAdapted({ provenanceFilePath: null })}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <span className="a2-field-meta">
              Research scans, Archive.org downloads, registrations — stored as a file pointer for now.
            </span>
          </div>

          <label className="a2-field a2-field--full">
            <span>Notes</span>
            <textarea
              rows={3}
              defaultValue={adapted.provenanceNotes ?? ''}
              key={fieldKey('adapted-provenance-notes')}
              placeholder="Catch-all notes about the original work"
              onChange={(event) => debouncedAdapted({ provenanceNotes: event.target.value })}
            />
          </label>

          <h4 className="a2-adapted-subhead">Changes made</h4>
          <label className="a2-field a2-field--full">
            <span className="a2-sr-only">Changes made</span>
            <textarea
              rows={4}
              defaultValue={adapted.changesMade ?? ''}
              key={fieldKey('adapted-changes')}
              placeholder="e.g. modernized lyrics, country arrangement, translated to Spanish, parody rewrite…"
              onChange={(event) => debouncedAdapted({ changesMade: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </CollapsibleSection>
  );
}

export function SongEditor({
  object,
  contentById,
  songById,
  artistName = 'Artist',
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
  const [songCardsOpen, setSongCardsOpen] = useState(false);
  const [songChipsOpen, setSongChipsOpen] = useState(false);
  // Slug stays derived until the author opts into “Edit URL slug”.
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [aboutMode, setAboutMode] = useState<'write' | 'preview'>('write');
  const [aboutDraft, setAboutDraft] = useState(payload.about ?? '');
  const [lyricsMode, setLyricsMode] = useState<'write' | 'preview'>('write');
  const [lyricsDraft, setLyricsDraft] = useState(payload.lyrics ?? '');
  const [lyricQuoteLen, setLyricQuoteLen] = useState((payload.lyricQuote ?? '').length);
  const [captionLen, setCaptionLen] = useState((payload.caption ?? '').length);
  const [aboutLen, setAboutLen] = useState((payload.about ?? '').length);
  // Soft character counters for the public credit / copyright lines.
  const [copyrightLen, setCopyrightLen] = useState((payload.copyrightNotice ?? '').length);
  const [musicCreditLen, setMusicCreditLen] = useState((payload.musicCredit ?? '').length);
  const [lyricsCreditLen, setLyricsCreditLen] = useState((payload.lyricsCredit ?? '').length);
  const fieldKey = (part: string) => `${part}-${object.id}`;
  const headerArtPath = resolvePrimaryArtworkPath(payload, contentById);
  const effectiveSlug = resolveSongSlug({ name: object.name, slug: payload.slug });
  // Per-song section open/closed flags (SQLite settings — not on the Song payload).
  const { isCollapsed, toggle } = useSongSectionCollapse(object.id);

  return (
    <div className="a2-editor">
      {/* Big section heading with primary actions, divided from the form below. */}
      <header className="a2-editor-topbar">
        <h2 className="a2-editor-heading">Edit Song</h2>
        <div className="a2-editor-header-actions a2-editor-header-actions--inline">
          <button
            type="button"
            className="a2-secondary"
            onClick={() => setSongCardsOpen(true)}
          >
            Song Cards…
          </button>
          <button
            type="button"
            className="a2-secondary"
            onClick={() => setSongChipsOpen(true)}
          >
            Song Chips…
          </button>
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
            {/* Themes live with the public-facing copy (moved from Musical Details). */}
            <label className="a2-field">
              <span className="a2-song-field-label">Themes / Keywords</span>
              <TagsInput
                key={fieldKey('song-themes')}
                genres={payload.themes ?? []}
                noun="keyword"
                placeholder="e.g. memory, nightlife, Texas — Enter or comma"
                onChange={(themes) => debouncedPayload({ themes })}
              />
            </label>
          </section>

      {songCardsOpen ? (
        <SongCardsDesignerModal
          open={songCardsOpen}
          onClose={() => setSongCardsOpen(false)}
          songTitle={object.name}
          artistName={artistName}
          payload={payload}
          coverPath={headerArtPath}
        />
      ) : null}

      {songChipsOpen ? (
        <SongChipsDesignerModal
          open={songChipsOpen}
          onClose={() => setSongChipsOpen(false)}
          songTitle={object.name}
          artistName={artistName}
          payload={payload}
          coverPath={headerArtPath}
        />
      ) : null}

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

      <CollapsibleSection
        title="Musical Details"
        collapsed={isCollapsed('musicalDetails')}
        onToggle={() => toggle('musicalDetails')}
      >
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
          <TagsInput
            key={fieldKey('song-addl-genres')}
            genres={payload.additionalGenres ?? []}
            placeholder="Type a genre, then Enter or comma"
            onChange={(additionalGenres) => debouncedPayload({ additionalGenres })}
          />
        </label>
        {/* Primary language + additional languages + explicit lyrics on one row. */}
        <div className="a2-field-row a2-field-row--languages">
          <label className="a2-field a2-field--language">
            <span>Primary language</span>
            <input
              defaultValue={songPrimaryLanguage(payload)}
              key={fieldKey('song-primary-language')}
              placeholder="Primary language of the lyrics"
              autoComplete="off"
              onChange={(event) =>
                debouncedPayload({
                  primaryLanguage: event.target.value,
                  language: undefined,
                })
              }
            />
          </label>
          <label className="a2-field a2-field--languages-extra">
            <span>Additional languages</span>
            <TagsInput
              key={fieldKey('song-addl-languages')}
              genres={payload.additionalLanguages ?? []}
              noun="language"
              placeholder="Type a language, then Enter or comma"
              onChange={(additionalLanguages) => debouncedPayload({ additionalLanguages })}
            />
          </label>
          {/*
            Author-declared only — we never detect explicit content. Suno import
            may seed this; the artist can clear or set it here.
            Empty label span keeps the pill on the same baseline as the language inputs.
          */}
          <div className="a2-field a2-field--explicit">
            <span className="a2-explicit-pill-spacer" aria-hidden="true">
              &nbsp;
            </span>
            {/* Checkbox outside; purple “explicit” badge is the label, not a chip around the input. */}
            <label
              className={`a2-explicit-toggle${payload.explicit ? ' is-checked' : ''}`}
              title="Mark this song as having explicit lyrics"
            >
              <input
                type="checkbox"
                checked={Boolean(payload.explicit)}
                key={fieldKey('song-explicit')}
                onChange={(event) => onPatchPayload({ explicit: event.target.checked })}
              />
              <span className="a2-explicit-pill">explicit</span>
            </label>
          </div>
        </div>
        <label className="a2-field a2-field--half">
          <span>Primary vocal presentation</span>
          <select
            defaultValue={payload.primaryVocalPresentation ?? ''}
            key={fieldKey('song-vocal-presentation')}
            onChange={(event) =>
              onPatchPayload({
                primaryVocalPresentation: event.target.value || '',
              })
            }
          >
            <option value="">—</option>
            {PRIMARY_VOCAL_PRESENTATIONS.map((value) => (
              <option key={value} value={value}>
                {PRIMARY_VOCAL_PRESENTATION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="a2-field a2-field--full">
          <span>Additional vocals</span>
          <textarea
            rows={3}
            defaultValue={payload.additionalVocals ?? ''}
            key={fieldKey('song-addl-vocals')}
            placeholder="Backing, guest, or other vocal notes"
            onChange={(event) => debouncedPayload({ additionalVocals: event.target.value })}
          />
        </label>
        {/* Musical ensemble with BPM to its right on one row. */}
        <div className="a2-field-row a2-field-row--ensemble">
          <label className="a2-field a2-field--half">
            <span>Musical ensemble</span>
            <select
              defaultValue={payload.musicalEnsemble ?? ''}
              key={fieldKey('song-musical-ensemble')}
              onChange={(event) =>
                onPatchPayload({
                  musicalEnsemble: event.target.value || '',
                })
              }
            >
              <option value="">—</option>
              {MUSICAL_ENSEMBLES.map((value) => (
                <option key={value} value={value}>
                  {MUSICAL_ENSEMBLE_LABELS[value]}
                </option>
              ))}
            </select>
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
        </div>
      </CollapsibleSection>

      <AdaptedWorkSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        collapsed={isCollapsed('adaptedWork')}
        onToggle={() => toggle('adaptedWork')}
        fieldKey={fieldKey}
      />

      <SongLinksSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        collapsed={isCollapsed('links')}
        onToggle={() => toggle('links')}
      />

      <CreationProcessSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        collapsed={isCollapsed('creationProcess')}
        onToggle={() => toggle('creationProcess')}
      />

      <CollapsibleSection
        title="Lyrics"
        titleClassName="a2-lyrics-heading"
        collapsed={isCollapsed('lyrics')}
        onToggle={() => toggle('lyrics')}
        headerTrailing={
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
        }
      >
        <div className="a2-field a2-field--lyrics">
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
        {/*
          Artist-chosen excerpt for Song Cards / publisher lyric-quote UI.
          We don’t auto-detect chorus — leave it to the author (hard max 500).
        */}
        <label className="a2-field a2-field--lyric-quote">
          <span>Lyric quote</span>
          <textarea
            rows={3}
            defaultValue={payload.lyricQuote ?? ''}
            key={fieldKey('song-lyric-quote')}
            maxLength={LYRIC_QUOTE_HARD_MAX}
            placeholder="A short excerpt for cards and quotes — chorus, hook, or favorite line"
            onChange={(event) => {
              const next = event.target.value.slice(0, LYRIC_QUOTE_HARD_MAX);
              if (next !== event.target.value) event.target.value = next;
              setLyricQuoteLen(next.length);
              debouncedPayload({ lyricQuote: next });
            }}
          />
          <span className="a2-field-meta">
            {lyricQuoteLen}/{LYRIC_QUOTE_HARD_MAX}
          </span>
        </label>
      </CollapsibleSection>

      <RecordingsSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        collapsed={isCollapsed('recordings')}
        onToggle={() => toggle('recordings')}
      />

      <RelatedSongsSection
        object={object}
        songById={songById}
        onRelateSong={onRelateSong}
        onUnrelateSong={onUnrelateSong}
        onOpenSong={onOpenSong}
        collapsed={isCollapsed('relatedSongs')}
        onToggle={() => toggle('relatedSongs')}
      />

      <VideoAndAnimationSection
        payload={payload}
        collapsed={isCollapsed('videoAndAnimation')}
        onToggle={() => toggle('videoAndAnimation')}
      />

      <SongArtworkSection
        objectName={object.name}
        payload={payload}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
        collapsed={isCollapsed('artwork')}
        onToggle={() => toggle('artwork')}
      />

      {/*
        Credits & Rights — public-facing catch-all lines kept together at the
        bottom of the editor. Single-line, non-required, soft-capped (never
        truncated). Later these can expand into structured rights/credits.
      */}
      <CollapsibleSection
        title="Credits & Rights"
        className="a2-section--credits"
        collapsed={isCollapsed('creditsRights')}
        onToggle={() => toggle('creditsRights')}
      >
        <label className="a2-field">
          <span>Music credit</span>
          <input
            defaultValue={payload.musicCredit ?? ''}
            key={fieldKey('song-music-credit')}
            maxLength={600}
            placeholder="e.g. Music by Ben Sawyer"
            onChange={(event) => {
              setMusicCreditLen(event.target.value.length);
              debouncedPayload({ musicCredit: event.target.value });
            }}
          />
          <span className={`a2-field-meta${musicCreditLen > CREDIT_SOFT_MAX ? ' a2-char-warn' : ''}`}>
            {musicCreditLen}/{CREDIT_SOFT_MAX}
          </span>
        </label>
        <label className="a2-field">
          <span>Lyrics credit</span>
          <input
            defaultValue={payload.lyricsCredit ?? ''}
            key={fieldKey('song-lyrics-credit')}
            maxLength={600}
            placeholder="e.g. Lyrics by Ben Sawyer"
            onChange={(event) => {
              setLyricsCreditLen(event.target.value.length);
              debouncedPayload({ lyricsCredit: event.target.value });
            }}
          />
          <span className={`a2-field-meta${lyricsCreditLen > CREDIT_SOFT_MAX ? ' a2-char-warn' : ''}`}>
            {lyricsCreditLen}/{CREDIT_SOFT_MAX}
          </span>
        </label>
        <label className="a2-field">
          <span>Copyright</span>
          <input
            defaultValue={payload.copyrightNotice ?? ''}
            key={fieldKey('song-copyright')}
            maxLength={500}
            placeholder="e.g. © 2026 Sawyer House. All rights reserved."
            onChange={(event) => {
              setCopyrightLen(event.target.value.length);
              debouncedPayload({ copyrightNotice: event.target.value });
            }}
          />
          <span className={`a2-field-meta${copyrightLen > COPYRIGHT_SOFT_MAX ? ' a2-char-warn' : ''}`}>
            {copyrightLen}/{COPYRIGHT_SOFT_MAX}
          </span>
        </label>
      </CollapsibleSection>

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
  /** Catalog albums for Related Albums (Album editor only). */
  albumById?: Map<string, Artist2CatalogObject>;
  onChangeName: (name: string) => void;
  onPatchPayload: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
  onRemoveTrack: (membershipId: string) => void;
  onMoveTrack: (memberId: string, direction: -1 | 1) => void;
  onPromoteArtwork: (name: string) => void;
  onOpenContent?: (contentId: string) => void;
  onRenameCover?: () => Promise<void>;
  onRelateAlbum?: (
    toAlbumId: string,
    relation: Artist2AlbumRelationKind,
  ) => Promise<void>;
  onUnrelateAlbum?: (toAlbumId: string) => Promise<void>;
  onOpenAlbum?: (albumId: string) => void;
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
  albumById,
  onChangeName,
  onPatchPayload,
  onDelete,
  onRemoveTrack,
  onMoveTrack,
  onPromoteArtwork,
  onOpenContent,
  onRenameCover,
  onRelateAlbum,
  onUnrelateAlbum,
  onOpenAlbum,
}: ContainerEditorProps) {
  const payload = object.payload as Artist2AlbumPayload;
  const tracks = detail?.tracks ?? [];
  const memberships = detail?.memberships ?? [];
  const debouncedName = useDebouncedCallback(onChangeName, 400);
  const debouncedPayload = useDebouncedCallback(onPatchPayload, 400);
  const [aboutMode, setAboutMode] = useState<'write' | 'preview'>('write');
  // Prefer about; fall back to legacy description for existing albums.
  const aboutValue = payload.about ?? payload.description ?? '';
  const [aboutDraft, setAboutDraft] = useState(aboutValue);
  const [captionLen, setCaptionLen] = useState((payload.caption ?? '').length);
  const [aboutLen, setAboutLen] = useState(aboutValue.length);
  const [copyrightLen, setCopyrightLen] = useState((payload.copyrightNotice ?? '').length);
  const [producerCreditLen, setProducerCreditLen] = useState(
    (payload.producerCredit ?? '').length,
  );
  const fieldKey = (part: string) => `${part}-${object.id}`;
  const headerArtPath = resolvePrimaryArtworkPath(payload, contentById);
  const { isCollapsed, toggle } = useAlbumSectionCollapse(object.id);

  return (
    <div className="a2-editor">
      <header className="a2-editor-topbar">
        <h2 className="a2-editor-heading">Edit Album</h2>
        <div className="a2-editor-header-actions a2-editor-header-actions--inline">
          <button type="button" className="a2-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>

      {/* Cover sits directly right of the title — same pattern as Song. */}
      <div className="a2-editor-title-row">
        <div className="a2-editor-title-block">
          <p className="a2-song-field-label">Album title</p>
          <input
            className="a2-title-input a2-title-input--song"
            defaultValue={object.name}
            key={fieldKey('album-name')}
            onChange={(event) => debouncedName(event.target.value)}
            aria-label="Album title"
          />
        </div>
        <ArtworkThumbnail
          filePath={headerArtPath}
          alt={`${object.name} cover`}
          className="a2-artwork-thumb--header"
        />
      </div>

      <IncompleteBadges hints={albumIncompleteHints(object, tracks.length)} />

      {/* Identity block mirrors Song: subtitle / caption / about / themes / creation date. */}
      <section className="a2-section a2-section--song-identity">
        <label className="a2-field a2-field--song">
          <span className="a2-song-field-label">Subtitle</span>
          <input
            defaultValue={payload.subtitle ?? ''}
            key={fieldKey('album-subtitle')}
            placeholder="Optional secondary line (edition, feature, …)"
            onChange={(event) => debouncedPayload({ subtitle: event.target.value })}
          />
        </label>
        <label className="a2-field a2-field--song">
          <span className="a2-song-field-label">Caption</span>
          <textarea
            rows={2}
            defaultValue={payload.caption ?? ''}
            key={fieldKey('album-caption')}
            placeholder="Short public line for cards / featured"
            onChange={(event) => {
              setCaptionLen(event.target.value.length);
              debouncedPayload({ caption: event.target.value });
            }}
          />
          <span className={`a2-field-meta${captionLen > CAPTION_SOFT_MAX ? ' a2-char-warn' : ''}`}>
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
              defaultValue={aboutValue}
              key={fieldKey('album-about')}
              placeholder="Primary public description (Markdown)"
              onChange={(event) => {
                const value = event.target.value;
                setAboutDraft(value);
                setAboutLen(value.length);
                // Write to about; clear legacy description so About stays canonical.
                debouncedPayload({ about: value, description: '' });
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
        <label className="a2-field">
          <span className="a2-song-field-label">Themes / Keywords</span>
          <TagsInput
            key={fieldKey('album-themes')}
            genres={payload.themes ?? []}
            noun="keyword"
            placeholder="e.g. memory, nightlife, Texas — Enter or comma"
            onChange={(themes) => debouncedPayload({ themes })}
          />
        </label>
        <label className="a2-field a2-field--date">
          <span className="a2-label-with-help">
            <span className="a2-song-field-label">Creation date</span>
            <HelpPopover label="Creation date format help">
              Digits only — day/month optional (<code>2025</code>, <code>07/2025</code>, or{' '}
              <code>16/07/2025</code>).
            </HelpPopover>
          </span>
          <input
            className="a2-field-date"
            defaultValue={albumCreationDate(payload)}
            key={fieldKey('album-created')}
            placeholder="DD/MM/YYYY"
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => {
              const next = sanitizeCreationDateInput(event.target.value);
              event.target.value = next;
              // Prefer creationDate; clear legacy releaseDate on edit.
              debouncedPayload({ creationDate: next, releaseDate: '' });
            }}
          />
        </label>
        <p className="a2-help">
          Genre, vocal presentation, musical ensemble, and creation process will be derived from
          the Songs on this Album later — they are not edited here.
        </p>
      </section>

      <ContainerTrackList
        containerWord="Album"
        tracks={tracks}
        memberships={memberships}
        onRemoveTrack={onRemoveTrack}
        onMoveTrack={onMoveTrack}
      />

      <SongLinksSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        entityNoun="album"
        collapsed={isCollapsed('links')}
        onToggle={() => toggle('links')}
      />

      <RelatedAlbumsSection
        object={object}
        albumById={albumById}
        onRelateAlbum={onRelateAlbum}
        onUnrelateAlbum={onUnrelateAlbum}
        onOpenAlbum={onOpenAlbum}
        collapsed={isCollapsed('relatedAlbums')}
        onToggle={() => toggle('relatedAlbums')}
      />

      <SongArtworkSection
        objectName={object.name}
        payload={payload}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
        collapsed={isCollapsed('artwork')}
        onToggle={() => toggle('artwork')}
      />

      <CollapsibleSection
        title="Credits & Rights"
        className="a2-section--credits"
        collapsed={isCollapsed('creditsRights')}
        onToggle={() => toggle('creditsRights')}
      >
        <label className="a2-field">
          <span>Producer</span>
          <input
            defaultValue={payload.producerCredit ?? ''}
            key={fieldKey('album-producer')}
            maxLength={600}
            placeholder="e.g. Produced by Ben Sawyer"
            onChange={(event) => {
              setProducerCreditLen(event.target.value.length);
              debouncedPayload({ producerCredit: event.target.value });
            }}
          />
          <span
            className={`a2-field-meta${producerCreditLen > CREDIT_SOFT_MAX ? ' a2-char-warn' : ''}`}
          >
            {producerCreditLen}/{CREDIT_SOFT_MAX}
          </span>
        </label>
        <label className="a2-field">
          <span>Copyright</span>
          <input
            defaultValue={payload.copyrightNotice ?? ''}
            key={fieldKey('album-copyright')}
            maxLength={500}
            placeholder="e.g. © 2026 Sawyer House. All rights reserved."
            onChange={(event) => {
              setCopyrightLen(event.target.value.length);
              debouncedPayload({ copyrightNotice: event.target.value });
            }}
          />
          <span className={`a2-field-meta${copyrightLen > COPYRIGHT_SOFT_MAX ? ' a2-char-warn' : ''}`}>
            {copyrightLen}/{COPYRIGHT_SOFT_MAX}
          </span>
        </label>
      </CollapsibleSection>

      <section className="a2-section">
        <div className="a2-field a2-field--notes">
          <div className="a2-notes-heading-row">
            <h3 className="a2-notes-heading">Notes</h3>
            <span className="a2-private-pill">Private</span>
          </div>
          <textarea
            rows={3}
            defaultValue={payload.notes ?? ''}
            key={fieldKey('album-notes')}
            onChange={(event) => debouncedPayload({ notes: event.target.value })}
          />
        </div>
      </section>
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
  const [aboutMode, setAboutMode] = useState<'write' | 'preview'>('write');
  // Prefer about; fall back to legacy description for existing playlists.
  const aboutValue = playlistAbout(payload);
  const [aboutDraft, setAboutDraft] = useState(aboutValue);
  const [captionLen, setCaptionLen] = useState((payload.caption ?? '').length);
  const [aboutLen, setAboutLen] = useState(aboutValue.length);
  const producerSeed = playlistProducerCredit(payload);
  const [producerCreditLen, setProducerCreditLen] = useState(producerSeed.length);
  const fieldKey = (part: string) => `${part}-${object.id}`;
  const headerArtPath = resolvePrimaryArtworkPath(payload, contentById);
  const { isCollapsed, toggle } = usePlaylistSectionCollapse(object.id);

  return (
    <div className="a2-editor">
      <header className="a2-editor-topbar">
        <h2 className="a2-editor-heading">Edit Playlist</h2>
        <div className="a2-editor-header-actions a2-editor-header-actions--inline">
          <button type="button" className="a2-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </header>

      {/* Cover sits directly right of the title — same pattern as Song / Album. */}
      <div className="a2-editor-title-row">
        <div className="a2-editor-title-block">
          <p className="a2-song-field-label">Playlist title</p>
          <input
            className="a2-title-input a2-title-input--song"
            defaultValue={object.name}
            key={fieldKey('playlist-name')}
            onChange={(event) => debouncedName(event.target.value)}
            aria-label="Playlist title"
          />
          <p className="a2-muted a2-help" style={{ marginTop: '0.35rem' }}>
            Informal collection — Songs and Albums by reference. Compile still uses Album
            membership for a song’s “album” field (not playlists).
          </p>
        </div>
        <ArtworkThumbnail
          filePath={headerArtPath}
          alt={`${object.name} cover`}
          className="a2-artwork-thumb--header"
        />
      </div>

      <IncompleteBadges hints={albumIncompleteHints(object, tracks.length)} />

      <section className="a2-section a2-section--song-identity">
        <label className="a2-field a2-field--song">
          <span className="a2-song-field-label">Subtitle</span>
          <input
            defaultValue={payload.subtitle ?? ''}
            key={fieldKey('playlist-subtitle')}
            placeholder="Optional secondary line (edition, feature, …)"
            onChange={(event) => debouncedPayload({ subtitle: event.target.value })}
          />
        </label>
        <label className="a2-field a2-field--song">
          <span className="a2-song-field-label">Caption</span>
          <textarea
            rows={2}
            defaultValue={payload.caption ?? ''}
            key={fieldKey('playlist-caption')}
            placeholder="Short public line for cards / featured"
            onChange={(event) => {
              setCaptionLen(event.target.value.length);
              debouncedPayload({ caption: event.target.value });
            }}
          />
          <span className={`a2-field-meta${captionLen > CAPTION_SOFT_MAX ? ' a2-char-warn' : ''}`}>
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
              defaultValue={aboutValue}
              key={fieldKey('playlist-about')}
              placeholder="Primary public description (Markdown)"
              onChange={(event) => {
                const value = event.target.value;
                setAboutDraft(value);
                setAboutLen(value.length);
                debouncedPayload({ about: value, description: '' });
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
        <label className="a2-field">
          <span className="a2-song-field-label">Themes / Keywords</span>
          <TagsInput
            key={fieldKey('playlist-themes')}
            genres={payload.themes ?? []}
            noun="keyword"
            placeholder="e.g. late night, road trip — Enter or comma"
            onChange={(themes) => debouncedPayload({ themes })}
          />
        </label>
        <div className="a2-field-row a2-field-row--dates">
          <label className="a2-field a2-field--date">
            <span className="a2-label-with-help">
              <span className="a2-song-field-label">Created date</span>
              <HelpPopover label="Created date format help">
                Digits only — day/month optional (<code>2025</code>, <code>07/2025</code>, or{' '}
                <code>16/07/2025</code>).
              </HelpPopover>
            </span>
            <input
              className="a2-field-date"
              defaultValue={payload.creationDate ?? ''}
              key={fieldKey('playlist-created')}
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
          <label className="a2-field a2-field--date">
            <span className="a2-label-with-help">
              <span className="a2-song-field-label">Last updated</span>
              <HelpPopover label="Last updated format help">
                Digits only — day/month optional. Use this when the playlist gains or loses music.
              </HelpPopover>
            </span>
            <input
              className="a2-field-date"
              defaultValue={payload.updateDate ?? ''}
              key={fieldKey('playlist-updated')}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => {
                const next = sanitizeCreationDateInput(event.target.value);
                event.target.value = next;
                debouncedPayload({ updateDate: next });
              }}
            />
          </label>
        </div>
      </section>

      <PlaylistMusicList
        tracks={tracks}
        memberships={memberships}
        onRemoveTrack={onRemoveTrack}
        onMoveTrack={onMoveTrack}
      />

      <SongLinksSection
        payload={payload}
        onPatchPayload={onPatchPayload}
        entityNoun="playlist"
        // Playlists push out informally — no streaming / distribution destinations.
        allowedKinds={['song_pages', 'web', 'social']}
        collapsed={isCollapsed('links')}
        onToggle={() => toggle('links')}
      />

      <SongArtworkSection
        objectName={object.name}
        payload={payload}
        contentById={contentById}
        onPatchPayload={onPatchPayload}
        onPromoteArtwork={onPromoteArtwork}
        onOpenContent={onOpenContent}
        onRenameCover={onRenameCover}
        collapsed={isCollapsed('artwork')}
        onToggle={() => toggle('artwork')}
      />

      <CollapsibleSection
        title="Credits"
        className="a2-section--credits"
        collapsed={isCollapsed('creditsRights')}
        onToggle={() => toggle('creditsRights')}
      >
        <label className="a2-field">
          <span>Curator / Producer</span>
          <input
            defaultValue={producerSeed}
            key={fieldKey('playlist-producer')}
            maxLength={600}
            placeholder="e.g. Curated by Ben Sawyer"
            onChange={(event) => {
              setProducerCreditLen(event.target.value.length);
              // Prefer producerCredit; clear legacy curator on edit.
              debouncedPayload({ producerCredit: event.target.value, curator: '' });
            }}
          />
          <span
            className={`a2-field-meta${producerCreditLen > CREDIT_SOFT_MAX ? ' a2-char-warn' : ''}`}
          >
            {producerCreditLen}/{CREDIT_SOFT_MAX}
          </span>
        </label>
        <p className="a2-help">
          Playlists themselves aren’t copyrighted works — credit who put the list together here.
        </p>
      </CollapsibleSection>

      <section className="a2-section">
        <div className="a2-field a2-field--notes">
          <div className="a2-notes-heading-row">
            <h3 className="a2-notes-heading">Notes</h3>
            <span className="a2-private-pill">Private</span>
          </div>
          <textarea
            rows={3}
            defaultValue={payload.notes ?? ''}
            key={fieldKey('playlist-notes')}
            onChange={(event) => debouncedPayload({ notes: event.target.value })}
          />
        </div>
      </section>
    </div>
  );
}

/** Flat Music list for playlists — Songs and Albums, never nested playlists. */
function PlaylistMusicList({
  tracks,
  memberships,
  onRemoveTrack,
  onMoveTrack,
}: {
  tracks: Artist2CatalogObject[];
  memberships: Artist2AlbumDetail['memberships'];
  onRemoveTrack: (membershipId: string) => void;
  onMoveTrack: (memberId: string, direction: -1 | 1) => void;
}) {
  return (
    <section className="a2-section">
      <h3>Music</h3>
      <p className="a2-help">
        Use → on Songs or Albums in the catalog sidebar to insert references here. Playlists stay
        one level deep — other playlists can’t be nested.
      </p>
      {tracks.length === 0 ? (
        <div className="a2-drop-zone">Insert songs or albums via → from the catalog</div>
      ) : (
        <ol className="a2-track-list">
          {tracks.map((track, index) => {
            const membership = memberships.find((m) => m.memberId === track.id);
            const kindLabel = track.kind === 'album' ? 'Album' : 'Song';
            return (
              <li key={track.id} className="a2-track-row">
                <span className="a2-track-pos">{index + 1}</span>
                <span className="a2-track-name">
                  {track.name}
                  <span className="a2-muted"> · {kindLabel}</span>
                </span>
                <div className="a2-track-actions">
                  <button
                    type="button"
                    onClick={() => onMoveTrack(track.id, -1)}
                    disabled={index === 0}
                  >
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

        {/*
          Proportional ~300px preview of the chosen image, beneath the core
          fields. Uses the shared thumbnail (resolves the local path to a file
          URL) with a content-preview modifier so it shows the full image at its
          natural aspect ratio rather than the square-cropped catalog thumb.
        */}
        {isImage && payload.filePath ? (
          <ArtworkThumbnail
            filePath={payload.filePath}
            alt={`${object.name} preview`}
            className="a2-artwork-thumb--content-preview"
          />
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
