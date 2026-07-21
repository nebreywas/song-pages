/**
 * Artist 2.0 mode — catalog sidebar + object editor workspace.
 * Leaves Artist 1.0 (ArtistMode) untouched until cutover.
 */

import { useEffect, useMemo, useState } from 'react';

import type { Artist2CatalogObject, Artist2CompileBuildResult, Artist2DeleteImpact } from '@shared/artist2';
import {
  createArtworkEntry,
  ensureSinglePrimaryArtwork,
  legacyArtworkFromEntries,
  normalizeSongArtwork,
} from '@shared/artist2';

import { ArtistEditor } from './ArtistEditor';
import { CatalogSidebar } from './CatalogSidebar';
import {
  CompileReadinessModal,
  type CompileResultSummary,
} from './CompileReadinessModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeletedItemsModal } from './DeletedItemsModal';
import { buildInsertContext, resolveInsertAction } from './insertContext';
import { AlbumEditor, ContentEditor, PlaylistEditor, SongEditor } from './ObjectEditors';
import { useArtist2Catalog } from './useArtist2Catalog';
import { getApp } from '../lib/bridge';
import './artist2.css';

export function Artist2Mode() {
  const catalog = useArtist2Catalog();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newArtistOpen, setNewArtistOpen] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<Artist2DeleteImpact | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [deletedModalOpen, setDeletedModalOpen] = useState(false);
  const [compileModalOpen, setCompileModalOpen] = useState(false);
  const [compilePreview, setCompilePreview] = useState<Artist2CompileBuildResult | null>(null);
  const [compilePreviewLoading, setCompilePreviewLoading] = useState(false);
  const [compileInFlight, setCompileInFlight] = useState(false);
  const [lastCompile, setLastCompile] = useState<CompileResultSummary | null>(null);
  const [songFormEpoch, setSongFormEpoch] = useState(0);

  const insertContext = useMemo(
    () =>
      buildInsertContext({
        selected: catalog.selected,
        albumDetail: catalog.albumDetail,
      }),
    [catalog.selected, catalog.albumDetail],
  );

  const objectById = useMemo(
    () => new Map(catalog.allObjects.map((row) => [row.id, row])),
    [catalog.allObjects],
  );

  async function submitNewArtist() {
    const name = newArtistName.trim();
    if (!name) return;
    try {
      await catalog.createArtist(name);
      setNewArtistName('');
      setNewArtistOpen(false);
      setStatusMessage(null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function requestDelete(id: string) {
    setPendingDeleteId(id);
  }

  useEffect(() => {
    if (!pendingDeleteId) {
      setDeleteImpact(null);
      setDeleteImpactLoading(false);
      return;
    }

    let cancelled = false;
    setDeleteImpactLoading(true);
    void (async () => {
      try {
        const impact = await catalog.getDeleteImpact(pendingDeleteId);
        if (!cancelled) {
          setDeleteImpact(impact);
          setStatusMessage(null);
        }
      } catch (err) {
        if (!cancelled) {
          setStatusMessage(err instanceof Error ? err.message : String(err));
          setPendingDeleteId(null);
        }
      } finally {
        if (!cancelled) setDeleteImpactLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalog.getDeleteImpact, pendingDeleteId]);

  function cancelDelete() {
    setPendingDeleteId(null);
    setDeleteImpact(null);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setDeleteInFlight(true);
    try {
      const result = await catalog.deleteObject(id);
      cancelDelete();
      if (result.reportId) {
        setStatusMessage('Deleted. See Deletion reports in Deleted items to repair references.');
      } else {
        setStatusMessage(null);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteInFlight(false);
    }
  }

  async function refreshCompilePreview() {
    if (!catalog.activeArtistId) return;
    setCompilePreviewLoading(true);
    try {
      const preview = await catalog.getCompilePreview(catalog.activeArtistId);
      setCompilePreview(preview);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setCompilePreviewLoading(false);
    }
  }

  async function openCompileModal() {
    if (!catalog.activeArtistId) return;
    setCompileModalOpen(true);
    await refreshCompilePreview();
  }

  async function handleCompile() {
    if (!catalog.activeArtistId) return;
    setCompileInFlight(true);
    try {
      const result = await catalog.compileCatalog(catalog.activeArtistId);
      if (result) {
        setLastCompile(result);
        const skipped =
          result.skippedSongs.length > 0
            ? ` (${result.skippedSongs.length} skipped)`
            : '';
        setStatusMessage(
          `Compiled ${result.songCount} song(s)${skipped}. Folder: ${result.outputFolder}`,
        );
        await refreshCompilePreview();
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setCompileInFlight(false);
    }
  }

  async function handleOpenCompileOutput(folderPath: string) {
    const opened = await getApp()?.artist?.openOutputFolder?.(folderPath);
    if (!opened) {
      setStatusMessage('Could not open output folder — it may not exist yet. Compile first.');
    }
  }

  async function handleCreate(
    kind: 'song' | 'album' | 'playlist' | 'image' | 'text' | 'video' | 'audio',
  ) {
    setCreateMenuOpen(false);
    try {
      if (kind === 'song') {
        await catalog.createObject({ kind: 'song', name: 'Untitled Song' });
      } else if (kind === 'album') {
        await catalog.createObject({ kind: 'album', name: 'Untitled Album' });
      } else if (kind === 'playlist') {
        await catalog.createObject({ kind: 'playlist', name: 'Untitled Playlist' });
      } else if (kind === 'image') {
        await catalog.createObject({
          kind: 'content',
          contentType: 'image',
          name: 'Untitled Image',
        });
      } else if (kind === 'video') {
        await catalog.createObject({
          kind: 'content',
          contentType: 'video',
          name: 'Untitled Video',
        });
      } else if (kind === 'audio') {
        await catalog.createObject({
          kind: 'content',
          contentType: 'audio',
          name: 'Untitled Audio',
        });
      } else {
        await catalog.createObject({
          kind: 'content',
          contentType: 'text',
          name: 'Untitled Text',
        });
      }
      setStatusMessage(null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleInsert(object: Artist2CatalogObject) {
    try {
      const action = resolveInsertAction(object, insertContext);
      if (action === 'container-track' && insertContext.containerTracks) {
        await catalog.insertSongIntoAlbum(insertContext.containerTracks.containerId, object.id);
        const label =
          insertContext.containerTracks.containerKind === 'playlist' ? 'playlist' : 'album';
        const slot =
          insertContext.containerTracks.containerKind === 'playlist' ? 'music' : 'tracks';
        setStatusMessage(`Inserted “${object.name}” into ${label} ${slot}.`);
        return;
      }
      if (action === 'related-song' && insertContext.relatedSongs) {
        await catalog.linkRelatedSongs({
          fromSongId: insertContext.relatedSongs.songId,
          toSongId: object.id,
          relation: insertContext.relatedSongs.defaultRelation,
        });
        setStatusMessage(`Related “${object.name}” as Sister Song (mirrored).`);
        return;
      }
      if (action === 'related-album' && insertContext.relatedAlbums) {
        await catalog.linkRelatedAlbums({
          fromAlbumId: insertContext.relatedAlbums.albumId,
          toAlbumId: object.id,
          relation: insertContext.relatedAlbums.defaultRelation,
        });
        setStatusMessage(`Related “${object.name}” as Sister Album (mirrored).`);
        return;
      }
      if (action === 'artwork' && insertContext.artwork && catalog.selected) {
        // Songs / Albums / Playlists keep a multi-image list — append Content.
        const entries = normalizeSongArtwork(
          catalog.selected.payload as Parameters<typeof normalizeSongArtwork>[0],
        );
        const maxOrder = entries.reduce((m, e) => Math.max(m, e.sortOrder), 0);
        const appended = ensureSinglePrimaryArtwork([
          ...entries,
          createArtworkEntry(
            { mode: 'contentRef', contentId: object.id },
            {
              role: entries.length === 0 ? 'primary_cover' : 'additional_image',
              sortOrder: maxOrder + 10,
            },
          ),
        ]);
        await catalog.updateObject(insertContext.artwork.objectId, {
          payload: {
            artworkEntries: appended,
            artwork: legacyArtworkFromEntries(appended),
          },
        });
        setStatusMessage(`Added Content “${object.name}” to artwork.`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function persistName(id: string, name: string) {
    try {
      await catalog.updateObject(id, { name });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function persistPayload(id: string, payload: Record<string, unknown>) {
    try {
      await catalog.updateObject(id, { payload });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function persistArtistName(name: string) {
    try {
      await catalog.updateArtist({ name });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function persistArtistPayload(payload: Record<string, unknown>) {
    try {
      await catalog.updateArtist({ payload });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    }
  }

  if (catalog.loading) {
    return <div className="a2-shell a2-loading">Loading Artist 2.0 catalog…</div>;
  }

  const selectedId = catalog.selection.type === 'object' ? catalog.selection.id : null;

  return (
    <div className="a2-shell">
      <header className="a2-toolbar">
        <h1 className="a2-toolbar-title">Song Pages: Artist 2.0</h1>

        {/* Artist switcher + compile stay flush right of the mode title. */}
        <div className="a2-toolbar-right">
          <label className="a2-artist-select">
            <span>Artist</span>
            <select
              value={catalog.activeArtistId ?? ''}
              onChange={(event) => catalog.setActiveArtistId(event.target.value || null)}
            >
              {catalog.artists.length === 0 ? <option value="">No artists yet</option> : null}
              {catalog.artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </label>
          {newArtistOpen ? (
            <form
              className="a2-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submitNewArtist();
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="Artist name"
                value={newArtistName}
                onChange={(event) => setNewArtistName(event.target.value)}
                aria-label="Artist name"
              />
              <button type="submit" disabled={!newArtistName.trim()}>
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewArtistOpen(false);
                  setNewArtistName('');
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewArtistOpen(true);
                setNewArtistName('');
              }}
            >
              New Artist
            </button>
          )}
          {catalog.activeArtistId ? (
            <button
              type="button"
              disabled={compileInFlight}
              onClick={() => void openCompileModal()}
            >
              Compile site…
            </button>
          ) : null}
        </div>
      </header>

      {(catalog.error || catalog.devWarning || statusMessage) && (
        <div className="a2-banner" role="status">
          {catalog.devWarning || catalog.error || statusMessage}
        </div>
      )}

      {pendingDeleteId ? (
        <DeleteConfirmModal
          open={Boolean(pendingDeleteId)}
          impact={deleteImpact}
          loading={deleteImpactLoading || deleteInFlight}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      ) : null}

      {catalog.activeArtist && deletedModalOpen ? (
        <DeletedItemsModal
          open={deletedModalOpen}
          artistName={catalog.activeArtist.name}
          deletedObjects={catalog.deletedObjects}
          deletionReports={catalog.deletionReports}
          loading={catalog.deletedPanelLoading}
          onClose={() => setDeletedModalOpen(false)}
          onRefresh={async () => {
            if (catalog.activeArtistId) {
              await catalog.refreshDeletedPanel(catalog.activeArtistId);
            }
          }}
          onRestore={async (id) => {
            try {
              await catalog.restoreObject(id);
              setStatusMessage('Restored. Album links and artwork references were not restored.');
            } catch (err) {
              setStatusMessage(err instanceof Error ? err.message : String(err));
            }
          }}
          onClearReport={async (reportId) => {
            try {
              await catalog.clearDeletionReport(reportId);
            } catch (err) {
              setStatusMessage(err instanceof Error ? err.message : String(err));
            }
          }}
          onClearAllReports={async () => {
            try {
              await catalog.clearAllDeletionReports();
            } catch (err) {
              setStatusMessage(err instanceof Error ? err.message : String(err));
            }
          }}
          onRepairRef={async (reportId, refIndex) => {
            try {
              await catalog.repairBrokenReference(reportId, refIndex);
              setStatusMessage('Re-linked Song into container from deletion report.');
            } catch (err) {
              setStatusMessage(err instanceof Error ? err.message : String(err));
            }
          }}
        />
      ) : null}

      {catalog.activeArtist && compileModalOpen ? (
        <CompileReadinessModal
          open={compileModalOpen}
          artistName={catalog.activeArtist.name}
          preview={compilePreview}
          lastCompile={lastCompile}
          loadingPreview={compilePreviewLoading}
          compiling={compileInFlight}
          onClose={() => setCompileModalOpen(false)}
          onRefresh={() => void refreshCompilePreview()}
          onCompile={() => void handleCompile()}
          onOpenOutput={(folder) => void handleOpenCompileOutput(folder)}
          onSelectSong={(songId) => {
            setCompileModalOpen(false);
            catalog.selectObject(songId);
          }}
        />
      ) : null}

      {!catalog.activeArtistId ? (
        <div className="a2-empty-state">
          <h2>Create an Artist to begin</h2>
          <p>
            The Artist is the root of the catalog. Songs, Albums, and Content all live under one
            Artist at a time.
          </p>
          {!newArtistOpen ? (
            <button
              type="button"
              onClick={() => {
                setNewArtistOpen(true);
                setNewArtistName('');
              }}
            >
              New Artist
            </button>
          ) : null}
        </div>
      ) : (
        <div className="a2-workspace">
          <CatalogSidebar
            objects={catalog.allObjects}
            objectById={objectById}
            albumTrackSummaries={catalog.albumTrackSummaries}
            selectedId={selectedId}
            filter={catalog.filter}
            search={catalog.search}
            insertContext={insertContext}
            artistProfileActive={catalog.selection.type === 'artist'}
            createMenuOpen={createMenuOpen}
            onFilterChange={catalog.setFilter}
            onSearchChange={catalog.setSearch}
            onSelect={catalog.selectObject}
            onInsert={(obj) => void handleInsert(obj)}
            onOpenArtistProfile={() => catalog.selectArtist()}
            onOpenDeletedItems={() => setDeletedModalOpen(true)}
            onToggleCreateMenu={() => setCreateMenuOpen((open) => !open)}
            onCreate={(kind) => void handleCreate(kind)}
          />

          <main className="a2-main">
            {catalog.selection.type === 'artist' && catalog.activeArtist ? (
              <ArtistEditor
                artist={catalog.activeArtist}
                onChangeName={(name) => void persistArtistName(name)}
                onPatchPayload={(payload) => void persistArtistPayload(payload)}
              />
            ) : !catalog.selected ? (
              <div className="a2-empty-state">
                <h2>Select or create an object</h2>
                <p>Find or create on the left. Define and connect on the right.</p>
              </div>
            ) : catalog.selected.kind === 'song' ? (
              <SongEditor
                key={`${catalog.selected.id}-${songFormEpoch}`}
                object={catalog.selected}
                contentById={catalog.contentById}
                songById={objectById}
                artistName={catalog.activeArtist?.name ?? 'Artist'}
                onChangeName={(name) => void persistName(catalog.selected!.id, name)}
                onPatchPayload={(payload) => void persistPayload(catalog.selected!.id, payload)}
                onDelete={() => requestDelete(catalog.selected!.id)}
                onOpenContent={(contentId) => catalog.selectObject(contentId)}
                onOpenSong={(songId) => catalog.selectObject(songId)}
                onRelateSong={async (toSongId, relation) => {
                  try {
                    await catalog.linkRelatedSongs({
                      fromSongId: catalog.selected!.id,
                      toSongId,
                      relation,
                    });
                    setStatusMessage('Related Song updated (mirrored both ways).');
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onUnrelateSong={async (toSongId) => {
                  try {
                    await catalog.unlinkRelatedSongs(catalog.selected!.id, toSongId);
                    setStatusMessage('Related Song unlinked.');
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onImportSuno={async (rawInput) => {
                  const result = await catalog.importSunoIntoSong(catalog.selected!.id, rawInput);
                  if (!result) throw new Error('Suno import failed.');
                  // Remount editor after state has the imported payload.
                  setSongFormEpoch((n) => n + 1);
                  if (result.coverWarning) {
                    setStatusMessage(`Suno metadata imported; cover skipped: ${result.coverWarning}`);
                  } else if (result.coverImported) {
                    setStatusMessage('Suno metadata and static cover imported. Attach MP3 separately.');
                  } else {
                    setStatusMessage('Suno metadata imported. Attach MP3 and cover if needed.');
                  }
                }}
                onPromoteArtwork={async (name) => {
                  try {
                    const result = await catalog.promoteArtwork(catalog.selected!.id, name);
                    if (result) {
                      setStatusMessage(
                        `Promoted artwork to Content “${result.content.name}”. Song now references it.`,
                      );
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onRenameCover={async () => {
                  try {
                    const result = await catalog.renameCoverForObject(catalog.selected!.id);
                    if (!result) throw new Error('Rename failed.');
                    if (result.renamed) {
                      setStatusMessage(`Cover renamed to ${result.filename}`);
                    } else {
                      setStatusMessage(`Cover already named ${result.filename}`);
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                    throw err;
                  }
                }}
              />
            ) : catalog.selected.kind === 'album' ? (
              <AlbumEditor
                object={catalog.selected}
                detail={catalog.albumDetail}
                contentById={catalog.contentById}
                albumById={objectById}
                onChangeName={(name) => void persistName(catalog.selected!.id, name)}
                onPatchPayload={(payload) => void persistPayload(catalog.selected!.id, payload)}
                onDelete={() => requestDelete(catalog.selected!.id)}
                onRemoveTrack={(membershipId) => void catalog.removeTrack(membershipId)}
                onMoveTrack={(memberId, direction) =>
                  void catalog.moveTrack(catalog.selected!.id, memberId, direction)
                }
                onOpenContent={(contentId) => catalog.selectObject(contentId)}
                onOpenAlbum={(albumId) => catalog.selectObject(albumId)}
                onRelateAlbum={async (toAlbumId, relation) => {
                  try {
                    await catalog.linkRelatedAlbums({
                      fromAlbumId: catalog.selected!.id,
                      toAlbumId,
                      relation,
                    });
                    setStatusMessage('Related Album updated (mirrored both ways).');
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onUnrelateAlbum={async (toAlbumId) => {
                  try {
                    await catalog.unlinkRelatedAlbums(catalog.selected!.id, toAlbumId);
                    setStatusMessage('Related Album unlinked.');
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onPromoteArtwork={async (name) => {
                  try {
                    const result = await catalog.promoteArtwork(catalog.selected!.id, name);
                    if (result) {
                      setStatusMessage(
                        `Promoted artwork to Content “${result.content.name}”. Album now references it.`,
                      );
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onRenameCover={async () => {
                  try {
                    const result = await catalog.renameCoverForObject(catalog.selected!.id);
                    if (!result) throw new Error('Rename failed.');
                    if (result.renamed) {
                      setStatusMessage(`Cover renamed to ${result.filename}`);
                    } else {
                      setStatusMessage(`Cover already named ${result.filename}`);
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                    throw err;
                  }
                }}
              />
            ) : catalog.selected.kind === 'playlist' ? (
              <PlaylistEditor
                object={catalog.selected}
                detail={catalog.albumDetail}
                contentById={catalog.contentById}
                onChangeName={(name) => void persistName(catalog.selected!.id, name)}
                onPatchPayload={(payload) => void persistPayload(catalog.selected!.id, payload)}
                onDelete={() => requestDelete(catalog.selected!.id)}
                onRemoveTrack={(membershipId) => void catalog.removeTrack(membershipId)}
                onMoveTrack={(memberId, direction) =>
                  void catalog.moveTrack(catalog.selected!.id, memberId, direction)
                }
                onOpenContent={(contentId) => catalog.selectObject(contentId)}
                onPromoteArtwork={async (name) => {
                  try {
                    const result = await catalog.promoteArtwork(catalog.selected!.id, name);
                    if (result) {
                      setStatusMessage(
                        `Promoted artwork to Content “${result.content.name}”. Playlist now references it.`,
                      );
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                  }
                }}
                onRenameCover={async () => {
                  try {
                    const result = await catalog.renameCoverForObject(catalog.selected!.id);
                    if (!result) throw new Error('Rename failed.');
                    if (result.renamed) {
                      setStatusMessage(`Cover renamed to ${result.filename}`);
                    } else {
                      setStatusMessage(`Cover already named ${result.filename}`);
                    }
                  } catch (err) {
                    setStatusMessage(err instanceof Error ? err.message : String(err));
                    throw err;
                  }
                }}
              />
            ) : (
              <ContentEditor
                object={catalog.selected}
                onChangeName={(name) => void persistName(catalog.selected!.id, name)}
                onPatchPayload={(payload) => void persistPayload(catalog.selected!.id, payload)}
                onDelete={() => requestDelete(catalog.selected!.id)}
                onRenameCover={
                  catalog.selected.contentType === 'image'
                    ? async () => {
                        try {
                          const result = await catalog.renameCoverForObject(catalog.selected!.id);
                          if (!result) throw new Error('Rename failed.');
                          if (result.renamed) {
                            setStatusMessage(`Cover renamed to ${result.filename}`);
                          } else {
                            setStatusMessage(`Cover already named ${result.filename}`);
                          }
                        } catch (err) {
                          setStatusMessage(err instanceof Error ? err.message : String(err));
                          throw err;
                        }
                      }
                    : undefined
                }
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
