import { FormEvent, useCallback, useEffect, useState } from "react";

import { deleteAsset, hasAsset, saveAsset } from "./artistPageAssetDb";
import { requestArtistPageCompile } from "./compileArtistPage";
import { linkLocalFile } from "./linkLocalFile";
import { draftHasLinkedAudio, loadDraftFromStorage, saveDraftToStorage } from "./artistPageDraftStore";
import { readMp3Metadata } from "./readMp3Metadata";
import {
  ARTIST_PHOTO_KEY,
  ARTIST_PHOTO_MAX_EDGE,
  assetKey,
  createEmptyDraft,
  MAX_ABOUT,
  MAX_ARTIST_BIO,
  MAX_CAPTION,
  MAX_SONGS,
  SONG_IMAGE_MAX_EDGE,
  slugifyDraftText,
  type ArtistPageDraft,
  type ArtistSongDraft,
  type SongPlaybackPreviewSeconds,
  type SongPlaybackQuality,
  type SongPlaybackScope,
} from "./types";
import { validateImageFile } from "./validateImage";
import "./artistPageEditor.css";

/**
 * Dev-only local editor for artist static sites. Route: /artist-page-editor
 * Draft text → localStorage; MP3/images → IndexedDB. Compile → artistpages/{slug}/
 */
export function ArtistPageEditor() {
  const [draft, setDraft] = useState<ArtistPageDraft>(() => loadDraftFromStorage());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compileResult, setCompileResult] = useState<{ previewUrl: string; outputFolder: string } | null>(null);
  const [assetHints, setAssetHints] = useState<Record<string, boolean>>({});

  const isDev = import.meta.env.DEV;

  const refreshAssetHints = useCallback(async (nextDraft: ArtistPageDraft) => {
    const hints: Record<string, boolean> = {};
    hints[ARTIST_PHOTO_KEY] =
      Boolean(nextDraft.artistPhotoLocalPath?.trim()) || (await hasAsset(ARTIST_PHOTO_KEY));
    for (const song of nextDraft.songs) {
      hints[assetKey("audio", song.id)] =
        Boolean(song.audioLocalPath?.trim()) || (await hasAsset(assetKey("audio", song.id)));
      hints[assetKey("cover", song.id)] =
        Boolean(song.coverLocalPath?.trim()) || (await hasAsset(assetKey("cover", song.id)));
      hints[assetKey("extra", song.id)] =
        Boolean(song.extraImageLocalPath?.trim()) || (await hasAsset(assetKey("extra", song.id)));
    }
    setAssetHints(hints);
  }, []);

  useEffect(() => {
    void refreshAssetHints(draft);
  }, [draft, refreshAssetHints]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveDraftToStorage(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft]);

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

  const handleMp3 = async (songId: string, file: File | null) => {
    if (!file) return;
    if (!file.type.includes("audio") && !file.name.toLowerCase().endsWith(".mp3")) {
      setError("Please choose an MP3 file.");
      return;
    }

    await saveAsset(assetKey("audio", songId), file, file.name);
    const linked = await linkLocalFile(`audio-${songId}`, file);

    const meta = await readMp3Metadata(file);

    updateSong(songId, {
      audioFileName: file.name,
      audioLocalPath: linked.ok ? linked.localPath : null,
      title: meta.title || file.name.replace(/\.[^.]+$/, ""),
      album: meta.album,
      year: meta.year,
      slug: slugifyDraftText(meta.title || file.name.replace(/\.[^.]+$/, "")),
    });

    if (meta.coverBlob && meta.coverFileName) {
      await saveAsset(assetKey("cover", songId), meta.coverBlob, meta.coverFileName);
      const coverFile = new File([meta.coverBlob], meta.coverFileName, { type: meta.coverBlob.type });
      const coverLinked = await linkLocalFile(`cover-${songId}`, coverFile);
      updateSong(songId, {
        coverFileName: meta.coverFileName,
        coverLocalPath: coverLinked.ok ? coverLinked.localPath : null,
      });
    }

    setDraft((prev) => {
      void refreshAssetHints(prev);
      return prev;
    });
  };

  const handleArtistPhoto = async (file: File | null) => {
    if (!file) return;
    const check = await validateImageFile(file, ARTIST_PHOTO_MAX_EDGE);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    await saveAsset(ARTIST_PHOTO_KEY, file, file.name);
    const linked = await linkLocalFile(ARTIST_PHOTO_KEY, file);
    updateDraft({
      artistPhotoFileName: file.name,
      artistPhotoLocalPath: linked.ok ? linked.localPath : null,
    });
    setDraft((prev) => {
      void refreshAssetHints(prev);
      return prev;
    });
  };

  const handleImageForSong = async (
    songId: string,
    kind: "cover" | "extra",
    file: File | null,
    maxEdge: number,
  ) => {
    if (!file) return;
    const key = assetKey(kind, songId);
    const check = await validateImageFile(file, maxEdge);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    await saveAsset(key, file, file.name);
    const linked = await linkLocalFile(key, file);
    const pathField = kind === "cover" ? "coverLocalPath" : "extraImageLocalPath";
    const nameField = kind === "cover" ? "coverFileName" : "extraImageFileName";
    updateSong(songId, {
      [nameField]: file.name,
      [pathField]: linked.ok ? linked.localPath : null,
    } as Partial<ArtistSongDraft>);
    setDraft((prev) => {
      void refreshAssetHints(prev);
      return prev;
    });
  };

  const handleCompile = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setCompileResult(null);

    if (!draft.artistSlug.trim() || !draft.artistName.trim()) {
      setError("Artist site slug and name are required.");
      return;
    }

    const activeCount = await Promise.all(
      draft.songs.map(
        (s) => Boolean(s.audioLocalPath?.trim()) || hasAsset(assetKey("audio", s.id)),
      ),
    );
    if (!activeCount.some(Boolean)) {
      setError("Add at least one MP3 before compiling.");
      return;
    }

    const confirmed = window.confirm(
      `Compile site to artistpages/${slugifyDraftText(draft.artistSlug)}/?\n\nThis wipes any previous build for that slug and rebuilds from scratch.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await requestArtistPageCompile(draft);
      if (!result.ok) throw new Error(result.error);
      setCompileResult({ previewUrl: result.previewUrl, outputFolder: result.outputFolder });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compile failed");
    } finally {
      setBusy(false);
    }
  };

  if (!isDev) {
    return (
      <div className="artist-editor-page">
        <main className="artist-editor-shell">
          <h1>Artist Page Editor</h1>
          <p className="artist-editor-lead">Dev-only prototype. Run npm run dev locally.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="artist-editor-page">
      <main className="artist-editor-shell">
        <p className="artist-editor-kicker">Local prototype · not on Vercel</p>
        <h1>Artist Page Editor</h1>
        <p className="artist-editor-lead">
          Fill in artist + up to {MAX_SONGS} songs, then compile a static site under{" "}
          <code>artistpages/your-slug/</code>. Text + file paths save to localStorage; files link once on disk.
        </p>
        <p className="editor-status">Draft auto-saved · last update {new Date(draft.updatedAt).toLocaleString()}</p>

        <form onSubmit={handleCompile}>
          <section className="editor-panel">
            <h2>Artist identity</h2>
            <div className="editor-grid-2">
              <label className="editor-field">
                <span>Site slug (folder name)</span>
                <input
                  value={draft.artistSlug}
                  placeholder="sawyerhousemusic"
                  onChange={(e) => updateDraft({ artistSlug: e.target.value })}
                />
              </label>
              <label className="editor-field">
                <span>Artist name</span>
                <input
                  value={draft.artistName}
                  onChange={(e) => updateDraft({ artistName: e.target.value })}
                />
              </label>
            </div>
            <label className="editor-field">
              <span>Artist bio (max {MAX_ARTIST_BIO} chars)</span>
              <textarea
                maxLength={MAX_ARTIST_BIO}
                value={draft.artistBio}
                onChange={(e) => updateDraft({ artistBio: e.target.value })}
              />
            </label>
            <label className="editor-field">
              <span>Artist photo (max {ARTIST_PHOTO_MAX_EDGE}×{ARTIST_PHOTO_MAX_EDGE}px, PNG/JPG — cropped square at compile)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={(e) => void handleArtistPhoto(e.target.files?.[0] ?? null)}
              />
              {draft.artistPhotoFileName ? (
                <span className="editor-hint editor-path">
                  Linked: {draft.artistPhotoFileName}
                  {draft.artistPhotoLocalPath ? (
                    <>
                      <br />
                      <code>{draft.artistPhotoLocalPath}</code>
                    </>
                  ) : null}
                </span>
              ) : null}
            </label>
            <label className="editor-field">
              <span>Or paste local path (saved pointer)</span>
              <input
                type="text"
                value={draft.artistPhotoLocalPath ?? ""}
                placeholder="/Users/you/Pictures/artist.jpg"
                onChange={(e) => updateDraft({ artistPhotoLocalPath: e.target.value || null })}
              />
            </label>

            <h2 style={{ marginTop: "1rem", fontSize: "0.95rem" }}>Social IDs / handles</h2>
            <div className="editor-grid-2">
              {(["instagram", "tiktok", "youtube", "spotify", "soundcloud"] as const).map((platform) => (
                <label key={platform} className="editor-field">
                  <span>{platform}</span>
                  <input
                    value={draft.social[platform]}
                    placeholder={platform === "youtube" ? "@channel or UC…" : "@handle"}
                    onChange={(e) =>
                      updateDraft({ social: { ...draft.social, [platform]: e.target.value } })
                    }
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
                  <span className="song-slot-meta">
                    {assetHints[assetKey("audio", song.id)] ? " · audio ✓" : " · no audio"}
                  </span>
                </summary>
                <div className="song-slot-body">
                  <label className="editor-field">
                    <span>MP3 file</span>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,.mp3"
                      onChange={(e) => void handleMp3(song.id, e.target.files?.[0] ?? null)}
                    />
                    {song.audioFileName ? (
                      <span className="editor-hint editor-path">
                        Linked: {song.audioFileName}
                        {song.audioLocalPath ? (
                          <>
                            <br />
                            <code>{song.audioLocalPath}</code>
                          </>
                        ) : null}
                      </span>
                    ) : null}
                  </label>
                  <label className="editor-field">
                    <span>Or paste MP3 path (saved pointer)</span>
                    <input
                      type="text"
                      value={song.audioLocalPath ?? ""}
                      placeholder="/Users/you/Music/track.mp3"
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
                      <input
                        value={song.slug}
                        onChange={(e) => updateSong(song.id, { slug: e.target.value })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Album (from ID3)</span>
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
                  <label className="editor-field">
                    <span>About this song (max {MAX_ABOUT})</span>
                    <textarea
                      maxLength={MAX_ABOUT}
                      value={song.about}
                      onChange={(e) => updateSong(song.id, { about: e.target.value })}
                    />
                  </label>
                  <label className="editor-field">
                    <span>Lyrics (plain text)</span>
                    <textarea value={song.lyrics} onChange={(e) => updateSong(song.id, { lyrics: e.target.value })} />
                  </label>

                  <div className="editor-grid-2">
                    <label className="editor-field">
                      <span>Cover image (max {SONG_IMAGE_MAX_EDGE}px)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          void handleImageForSong(song.id, "cover", e.target.files?.[0] ?? null, SONG_IMAGE_MAX_EDGE)
                        }
                      />
                      {song.coverFileName ? (
                        <span className="editor-hint">{song.coverFileName}</span>
                      ) : null}
                      <input
                        type="text"
                        value={song.coverLocalPath ?? ""}
                        placeholder="Local path (optional)"
                        onChange={(e) => updateSong(song.id, { coverLocalPath: e.target.value || null })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>Extra image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          void handleImageForSong(song.id, "extra", e.target.files?.[0] ?? null, SONG_IMAGE_MAX_EDGE)
                        }
                      />
                      {song.extraImageFileName ? (
                        <span className="editor-hint">{song.extraImageFileName}</span>
                      ) : null}
                      <input
                        type="text"
                        value={song.extraImageLocalPath ?? ""}
                        placeholder="Local path (optional)"
                        onChange={(e) => updateSong(song.id, { extraImageLocalPath: e.target.value || null })}
                      />
                    </label>
                  </div>

                  <div className="editor-grid-2">
                    <label className="editor-field">
                      <span>YouTube song URL</span>
                      <input
                        value={song.links.youtube}
                        onChange={(e) =>
                          updateSong(song.id, { links: { ...song.links, youtube: e.target.value } })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>Spotify song URL</span>
                      <input
                        value={song.links.spotify}
                        onChange={(e) =>
                          updateSong(song.id, { links: { ...song.links, spotify: e.target.value } })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>SoundCloud song URL</span>
                      <input
                        value={song.links.soundcloud}
                        onChange={(e) =>
                          updateSong(song.id, { links: { ...song.links, soundcloud: e.target.value } })
                        }
                      />
                    </label>
                  </div>

                  <fieldset className="editor-field" style={{ border: 0, padding: 0 }}>
                    <span>HLS output (per song)</span>
                    <div className="editor-grid-2">
                      <label className="editor-field">
                        <span>Quality</span>
                        <select
                          value={song.playback.quality}
                          onChange={(e) =>
                            updateSong(song.id, {
                              playback: { ...song.playback, quality: e.target.value as SongPlaybackQuality },
                            })
                          }
                        >
                          <option value="high">High — 192kbps AAC stereo</option>
                          <option value="degraded">Degraded — 96kbps AAC mono</option>
                        </select>
                      </label>
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
                      {song.playback.scope === "preview" ? (
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

                  <div className="editor-actions">
                    <button
                      type="button"
                      className="editor-btn"
                      onClick={() =>
                        void (async () => {
                          await deleteAsset(assetKey("audio", song.id));
                          await deleteAsset(assetKey("cover", song.id));
                          await deleteAsset(assetKey("extra", song.id));
                          updateSong(song.id, {
                            audioFileName: null,
                            coverFileName: null,
                            extraImageFileName: null,
                            audioLocalPath: null,
                            coverLocalPath: null,
                            extraImageLocalPath: null,
                          });
                          void refreshAssetHints(draft);
                        })()
                      }
                    >
                      Clear song files
                    </button>
                  </div>
                </div>
              </details>
            ))}
          </section>

          <div className="editor-actions">
            <button type="submit" className="editor-btn editor-btn-primary" disabled={busy}>
              {busy ? "Compiling…" : "Compile static site"}
            </button>
            <button
              type="button"
              className="editor-btn"
              onClick={() => {
                if (!window.confirm("Reset all form fields? (IndexedDB assets remain until cleared per song)")) return;
                setDraft(createEmptyDraft());
                setCompileResult(null);
                setError(null);
              }}
            >
              Reset form text
            </button>
          </div>
        </form>

        {error ? <p className="editor-error">{error}</p> : null}

        {compileResult ? (
          <div className="editor-success">
            <p>
              <strong>Site compiled.</strong> Preview:{" "}
              <a href={compileResult.previewUrl} target="_blank" rel="noreferrer">
                {compileResult.previewUrl}
              </a>
            </p>
            <p>
              Folder: <code>{compileResult.outputFolder}</code> — upload this directory to your static host.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
