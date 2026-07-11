import { FormEvent, useEffect, useState } from 'react';

import { MarkdownField } from './MarkdownField';
import { requestArtistPageCompile } from './compileArtistPage';
import {
  addEmptyProject,
  buildCompileManifest,
  duplicateProject,
  getActiveDraft,
  loadProjectsFromStorage,
  removeProject,
  replaceDraftInState,
  saveProjectsToStorage,
  setActiveProject,
} from './artistPageDraftStore';
import { readMp3MetadataFromPath } from './readMp3Metadata';
import {
  createEmptyDraft,
  formatProjectSongCount,
  MAX_ABOUT,
  MAX_ARTIST_BIO,
  MAX_CAPTION,
  MAX_SONGS,
  projectDisplayName,
  slugifyDraftText,
  type ArtistPageDraft,
  type ArtistProjectsState,
  type ArtistSongDraft,
  type SongPlaybackPreviewSeconds,
  type SongPlaybackScope,
} from './types';
import './artistPageEditor.css';

function basenameFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

export function ArtistPageEditor() {
  const [projectsState, setProjectsState] = useState<ArtistProjectsState | null>(null);
  const [draft, setDraft] = useState<ArtistPageDraft>(() => createEmptyDraft());
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ffmpegStatus, setFfmpegStatus] = useState<string | null>(null);
  const [compileResult, setCompileResult] = useState<{ outputFolder: string; songCount: number } | null>(null);

  useEffect(() => {
    void loadProjectsFromStorage().then((loaded) => {
      setProjectsState(loaded);
      setDraft(getActiveDraft(loaded));
      setDraftLoaded(true);
    });
    void window.app.artist.checkFfmpeg().then((result) => {
      setFfmpegStatus(result.ok ? null : result.error || 'ffmpeg not found');
    });
  }, []);

  // Debounced save — merges current draft into workspace then persists.
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = window.setTimeout(() => {
      setProjectsState((prev) => {
        if (!prev) return prev;
        const next = replaceDraftInState(prev, { ...draft, updatedAt: new Date().toISOString() });
        void saveProjectsToStorage(next);
        return next;
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, draftLoaded]);

  const commitDraftToState = (nextDraft: ArtistPageDraft) => {
    setDraft(nextDraft);
    if (!projectsState) return;
    setProjectsState(replaceDraftInState(projectsState, nextDraft));
  };

  const selectProject = (projectId: string) => {
    if (!projectsState || projectId === projectsState.activeProjectId) return;
    const merged = replaceDraftInState(projectsState, { ...draft, updatedAt: new Date().toISOString() });
    const next = setActiveProject(merged, projectId);
    setProjectsState(next);
    setDraft(getActiveDraft(next));
    setCompileResult(null);
    setError(null);
    void saveProjectsToStorage(next);
  };

  const handleNewProject = () => {
    if (!projectsState) return;
    const merged = replaceDraftInState(projectsState, { ...draft, updatedAt: new Date().toISOString() });
    const next = addEmptyProject(merged);
    setProjectsState(next);
    setDraft(getActiveDraft(next));
    setCompileResult(null);
    setError(null);
    void saveProjectsToStorage(next);
  };

  const handleDuplicateProject = () => {
    if (!projectsState) return;
    const merged = replaceDraftInState(projectsState, { ...draft, updatedAt: new Date().toISOString() });
    const next = duplicateProject(merged, projectsState.activeProjectId);
    setProjectsState(next);
    setDraft(getActiveDraft(next));
    setCompileResult(null);
    setError(null);
    void saveProjectsToStorage(next);
  };

  const handleDeleteProject = () => {
    if (!projectsState || projectsState.projects.length <= 1) return;
    const name = projectDisplayName(draft);
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    const next = removeProject(projectsState, projectsState.activeProjectId);
    setProjectsState(next);
    setDraft(getActiveDraft(next));
    setCompileResult(null);
    setError(null);
    void saveProjectsToStorage(next);
  };

  const updateDraft = (patch: Partial<ArtistPageDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setCompileResult(null);
    setError(null);
  };

  const updateSong = (songId: string, patch: Partial<ArtistSongDraft>) => {
    setDraft((prev) => ({
      ...prev,
      songs: prev.songs.map((s) => (s.id === songId ? { ...s, ...patch } : s)),
    }));
    setCompileResult(null);
    setError(null);
  };

  const pickMp3ForSong = async (songId: string) => {
    const filePath = await window.app.artist.pickAudio();
    if (!filePath) return;

    const baseName = basenameFromPath(filePath).replace(/\.[^.]+$/, '');
    const meta = await readMp3MetadataFromPath(filePath);

    updateSong(songId, {
      audioLocalPath: filePath,
      title: meta.title || baseName,
      album: meta.album || '',
      year: meta.year || '',
      slug: slugifyDraftText(meta.title || baseName),
    });
  };

  const pickArtistPhoto = async () => {
    const filePath = await window.app.artist.pickImage();
    if (!filePath) return;
    updateDraft({ artistPhotoLocalPath: filePath });
  };

  const pickSongImage = async (songId: string, kind: 'cover' | 'extra') => {
    const filePath = await window.app.artist.pickImage();
    if (!filePath) return;
    if (kind === 'cover') {
      updateSong(songId, { coverLocalPath: filePath });
    } else {
      updateSong(songId, { extraImageLocalPath: filePath });
    }
  };

  const handleCompile = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setCompileResult(null);

    if (ffmpegStatus) {
      setError(ffmpegStatus);
      return;
    }

    if (!draft.artistSlug.trim() || !draft.artistName.trim()) {
      setError('Artist site slug and name are required.');
      return;
    }

    const manifest = buildCompileManifest(draft);
    if (!manifest.songs.some((s) => s.hasAudio)) {
      setError('Add at least one MP3 before compiling.');
      return;
    }

    const slug = slugifyDraftText(draft.artistSlug);
    const deployHint = draft.deploySiteUrl.trim()
      ? `\nDeploy URL: ${draft.deploySiteUrl.trim()}`
      : '';
    const confirmed = window.confirm(
      `Compile Song Pages site for "${draft.artistName}"?\n\nOutput: ~/Library/Application Support/song-pages/artistpages/${slug}/${deployHint}\n\nThis wipes any previous build for that slug.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await requestArtistPageCompile(draft);
      if (!result.ok) throw new Error(result.error);
      setCompileResult({ outputFolder: result.outputFolder, songCount: result.songCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compile failed');
    } finally {
      setBusy(false);
    }
  };

  const activeProjectId = projectsState?.activeProjectId ?? draft.projectId;
  const canDeleteProject = (projectsState?.projects.length ?? 0) > 1;
  // Merge in-memory draft so sidebar labels update while typing.
  const projectsForList = (projectsState?.projects ?? []).map((project) =>
    project.projectId === draft.projectId ? draft : project,
  );

  return (
    <div className="artist-editor-layout">
      <aside className="artist-editor-sidebar">
        <div className="artist-editor-sidebar-brand panel">
          <h2 className="artist-editor-sidebar-title">Artist sites</h2>
          <p className="artist-editor-sidebar-hint">One catalog per project — compile and upload separately.</p>
        </div>

        <section className="panel artist-projects-panel">
          <div className="panel-header">
            <h2>Projects</h2>
            <div className="panel-actions panel-actions-end">
              <button
                type="button"
                className="btn icon-btn"
                onClick={handleNewProject}
                disabled={!draftLoaded}
                title="New project"
                aria-label="New project"
              >
                +
              </button>
            </div>
          </div>
          <ul className="artist-list">
            {(projectsForList).map((project) => (
              <li key={project.projectId}>
                <button
                  type="button"
                  className={`artist-item${activeProjectId === project.projectId ? ' active' : ''}`}
                  onClick={() => selectProject(project.projectId)}
                >
                  <span className="artist-name">{projectDisplayName(project)}</span>
                  <span className="artist-song-count">{formatProjectSongCount(project)}</span>
                </button>
              </li>
            ))}
            {!projectsState?.projects.length ? <li className="empty">No projects yet.</li> : null}
          </ul>
          <div className="artist-project-actions">
            <button type="button" className="btn" onClick={handleDuplicateProject} disabled={!draftLoaded}>
              Duplicate
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={handleDeleteProject}
              disabled={!canDeleteProject}
            >
              Delete
            </button>
          </div>
        </section>
      </aside>

      <div className="artist-editor-main">
        <main className="artist-editor-shell">
          <p className="artist-editor-kicker">Song Pages · Artist Mode</p>
          <h1>{projectDisplayName(draft)}</h1>
          <p className="artist-editor-lead">
            Fill in artist + up to {MAX_SONGS} songs, then compile a static site with Song Pages manifests.
            Upload the output folder to your static host (Bunny, GitHub Pages, etc.).
          </p>
          {ffmpegStatus ? <p className="editor-error">{ffmpegStatus}</p> : null}
          <p className="editor-status">Draft auto-saved · last update {new Date(draft.updatedAt).toLocaleString()}</p>

          <form onSubmit={handleCompile}>
            <section className="editor-panel">
              <h2>Artist identity</h2>
              <div className="editor-grid-2">
                <label className="editor-field">
                  <span>Site slug (folder name)</span>
                  <input
                    value={draft.artistSlug}
                    placeholder="sawyerhouse-genres"
                    onChange={(e) => updateDraft({ artistSlug: e.target.value })}
                  />
                </label>
                <label className="editor-field">
                  <span>Artist name</span>
                  <input value={draft.artistName} onChange={(e) => updateDraft({ artistName: e.target.value })} />
                </label>
              </div>
              <label className="editor-field">
                <span>Deploy site URL (optional — baked into manifest siteRoot)</span>
                <input
                  value={draft.deploySiteUrl}
                  placeholder="https://sawyerhouse-music.b-cdn.net"
                  onChange={(e) => updateDraft({ deploySiteUrl: e.target.value })}
                />
              </label>
              <MarkdownField
                label={`Artist bio (max ${MAX_ARTIST_BIO} chars)`}
                maxLength={MAX_ARTIST_BIO}
                rows={8}
                value={draft.artistBio}
                onChange={(artistBio) => updateDraft({ artistBio })}
                placeholder="Write your artist bio in Markdown…"
              />
              <div className="editor-actions">
                <button type="button" className="editor-btn" onClick={() => void pickArtistPhoto()}>
                  Pick artist photo
                </button>
                {draft.artistPhotoLocalPath ? (
                  <code className="editor-path">{draft.artistPhotoLocalPath}</code>
                ) : null}
              </div>
              <label className="editor-field">
                <span>Or paste local path</span>
                <input
                  type="text"
                  value={draft.artistPhotoLocalPath ?? ''}
                  onChange={(e) => updateDraft({ artistPhotoLocalPath: e.target.value || null })}
                />
              </label>

              <h2 style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Social IDs / handles</h2>
              <div className="editor-grid-2">
                {(['instagram', 'tiktok', 'youtube', 'spotify', 'soundcloud'] as const).map((platform) => (
                  <label key={platform} className="editor-field">
                    <span>{platform}</span>
                    <input
                      value={draft.social[platform]}
                      onChange={(e) => updateDraft({ social: { ...draft.social, [platform]: e.target.value } })}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="editor-panel">
              <h2>Songs ({MAX_SONGS} slots)</h2>
              {draft.songs.map((song, index) => (
                <details key={song.id} className="song-slot" open={index === 0}>
                  <summary>
                    {song.title || `Song ${index + 1}`}
                    <span className="song-slot-meta">{song.audioLocalPath ? ' · audio ✓' : ' · no audio'}</span>
                  </summary>
                  <div className="song-slot-body">
                    <div className="editor-actions">
                      <button type="button" className="editor-btn" onClick={() => void pickMp3ForSong(song.id)}>
                        Pick MP3
                      </button>
                      {song.audioLocalPath ? <code className="editor-path">{song.audioLocalPath}</code> : null}
                    </div>
                    <label className="editor-field">
                      <span>Or paste MP3 path</span>
                      <input
                        value={song.audioLocalPath ?? ''}
                        onChange={(e) => updateSong(song.id, { audioLocalPath: e.target.value || null })}
                      />
                    </label>

                    <div className="editor-grid-2">
                      <label className="editor-field">
                        <span>Title</span>
                        <input
                          value={song.title}
                          onChange={(e) => updateSong(song.id, { title: e.target.value })}
                          onBlur={() => {
                            if (!song.slug.trim()) {
                              updateSong(song.id, { slug: slugifyDraftText(song.title) });
                            }
                          }}
                        />
                      </label>
                      <label className="editor-field">
                        <span>URL slug</span>
                        <input value={song.slug} onChange={(e) => updateSong(song.id, { slug: e.target.value })} />
                      </label>
                      <label className="editor-field">
                        <span>Album</span>
                        <input value={song.album} onChange={(e) => updateSong(song.id, { album: e.target.value })} />
                      </label>
                      <label className="editor-field">
                        <span>Year</span>
                        <input value={song.year} onChange={(e) => updateSong(song.id, { year: e.target.value })} />
                      </label>
                    </div>

                    <label className="editor-field">
                      <span>Caption (max {MAX_CAPTION})</span>
                      <input
                        maxLength={MAX_CAPTION}
                        value={song.caption}
                        onChange={(e) => updateSong(song.id, { caption: e.target.value })}
                      />
                    </label>
                    <MarkdownField
                      label={`About (max ${MAX_ABOUT})`}
                      maxLength={MAX_ABOUT}
                      rows={6}
                      value={song.about}
                      onChange={(about) => updateSong(song.id, { about })}
                      placeholder="Song story, credits, context…"
                    />
                    <MarkdownField
                      label="Lyrics"
                      rows={12}
                      value={song.lyrics}
                      onChange={(lyrics) => updateSong(song.id, { lyrics })}
                      placeholder="Lyrics with optional Markdown formatting…"
                      lyricsPreview
                    />

                    <div className="editor-grid-2">
                      <div className="editor-field">
                        <span>Cover image</span>
                        <button type="button" className="editor-btn" onClick={() => void pickSongImage(song.id, 'cover')}>
                          Pick cover
                        </button>
                        {song.coverLocalPath ? <code className="editor-path">{song.coverLocalPath}</code> : null}
                      </div>
                      <div className="editor-field">
                        <span>Extra image</span>
                        <button type="button" className="editor-btn" onClick={() => void pickSongImage(song.id, 'extra')}>
                          Pick extra
                        </button>
                        {song.extraImageLocalPath ? (
                          <code className="editor-path">{song.extraImageLocalPath}</code>
                        ) : null}
                      </div>
                    </div>

                    <div className="editor-grid-2">
                      {(['youtube', 'spotify', 'soundcloud'] as const).map((platform) => (
                        <label key={platform} className="editor-field">
                          <span>{platform} URL</span>
                          <input
                            value={song.links[platform]}
                            onChange={(e) =>
                              updateSong(song.id, { links: { ...song.links, [platform]: e.target.value } })
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <fieldset className="editor-field" style={{ border: 0, padding: 0 }}>
                      <span>HLS output</span>
                      <p className="editor-hls-profile">
                        Standard profile — AAC-LC stereo, 96 kbps, 6s segments. Source sample rate kept at
                        44.1 or 48 kHz when present; no loudness or EQ changes.
                      </p>
                      <div className="editor-grid-2">
                        <label className="editor-field">
                          <span>Scope</span>
                          <select
                            value={song.playback.scope}
                            onChange={(e) =>
                              updateSong(song.id, {
                                playback: { ...song.playback, scope: e.target.value as SongPlaybackScope },
                              })
                            }
                          >
                            <option value="full">Full track</option>
                            <option value="preview">Preview capped</option>
                          </select>
                        </label>
                        {song.playback.scope === 'preview' ? (
                          <label className="editor-field">
                            <span>Preview length</span>
                            <select
                              value={song.playback.previewSeconds}
                              onChange={(e) =>
                                updateSong(song.id, {
                                  playback: {
                                    ...song.playback,
                                    previewSeconds: Number(e.target.value) as SongPlaybackPreviewSeconds,
                                  },
                                })
                              }
                            >
                              <option value={30}>30 seconds</option>
                              <option value={45}>45 seconds</option>
                              <option value={60}>60 seconds</option>
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </fieldset>
                  </div>
                </details>
              ))}
            </section>

            <div className="editor-actions">
              <button type="submit" className="editor-btn editor-btn-primary" disabled={busy}>
                {busy ? 'Compiling…' : 'Compile static site'}
              </button>
              <button
                type="button"
                className="editor-btn"
                onClick={() => {
                  if (!window.confirm('Reset all fields in this project?')) return;
                  const reset = createEmptyDraft();
                  commitDraftToState({ ...reset, projectId: draft.projectId });
                  setCompileResult(null);
                  setError(null);
                }}
              >
                Reset project
              </button>
            </div>
          </form>

          {error ? <p className="editor-error">{error}</p> : null}

          {compileResult ? (
            <div className="editor-success">
              <p>
                <strong>Site compiled.</strong> {compileResult.songCount} songs.
              </p>
              <p>
                Folder: <code>{compileResult.outputFolder}</code>
              </p>
              <button
                type="button"
                className="editor-btn"
                onClick={() => void window.app.artist.openOutputFolder(compileResult.outputFolder)}
              >
                Open output folder
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
