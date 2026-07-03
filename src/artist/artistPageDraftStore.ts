import {
  createEmptyDraft,
  createEmptyProjectsState,
  type ArtistPageDraft,
  type ArtistProjectsState,
  type ArtistSongDraft,
} from './types';

function normalizeSong(song: Partial<ArtistSongDraft> & { id: string }): ArtistSongDraft {
  return {
    id: song.id,
    slug: song.slug ?? '',
    title: song.title ?? '',
    album: song.album ?? '',
    year: song.year ?? '',
    caption: song.caption ?? '',
    about: song.about ?? '',
    lyrics: song.lyrics ?? '',
    links: song.links ?? { youtube: '', spotify: '', soundcloud: '' },
    playback: song.playback ?? { quality: 'standard', scope: 'full', previewSeconds: 60 },
    audioLocalPath: song.audioLocalPath ?? null,
    coverLocalPath: song.coverLocalPath ?? null,
    extraImageLocalPath: song.extraImageLocalPath ?? null,
  };
}

function normalizeDraft(raw: Partial<ArtistPageDraft>): ArtistPageDraft {
  const base = createEmptyDraft();
  return {
    ...base,
    ...raw,
    projectId: raw.projectId?.trim() || crypto.randomUUID(),
    deploySiteUrl: raw.deploySiteUrl ?? '',
    artistPhotoLocalPath: raw.artistPhotoLocalPath ?? null,
    social: { ...base.social, ...(raw.social ?? {}) },
    songs: Array.isArray(raw.songs)
      ? raw.songs.map((s) => normalizeSong(s as ArtistSongDraft))
      : base.songs,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeProjectsState(raw: unknown): ArtistProjectsState {
  if (!raw || typeof raw !== 'object') return createEmptyProjectsState();

  const parsed = raw as Partial<ArtistProjectsState>;
  if (parsed.version !== 2 || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
    return createEmptyProjectsState();
  }

  const projects = parsed.projects.map((p) => normalizeDraft(p));
  const activeProjectId =
    projects.find((p) => p.projectId === parsed.activeProjectId)?.projectId ?? projects[0].projectId;

  return { version: 2, activeProjectId, projects };
}

/** Wrap a legacy single-draft blob as a one-project workspace. */
export function migrateLegacyDraft(raw: unknown): ArtistProjectsState {
  if (!raw || typeof raw !== 'object') return createEmptyProjectsState();
  const parsed = raw as Partial<ArtistPageDraft>;
  if (parsed.version !== 1 || !Array.isArray(parsed.songs)) return createEmptyProjectsState();
  const draft = normalizeDraft(parsed);
  return { version: 2, activeProjectId: draft.projectId, projects: [draft] };
}

/** Load all artist projects from SQLite via main process. */
export async function loadProjectsFromStorage(): Promise<ArtistProjectsState> {
  try {
    const raw = await window.app.artist.loadProjects();
    if (raw == null) return createEmptyProjectsState();
    return normalizeProjectsState(raw);
  } catch {
    return createEmptyProjectsState();
  }
}

/** Persist the full projects workspace to SQLite. */
export async function saveProjectsToStorage(state: ArtistProjectsState): Promise<void> {
  const stamped: ArtistProjectsState = {
    ...state,
    projects: state.projects.map((p) => ({ ...p, updatedAt: p.updatedAt || new Date().toISOString() })),
  };
  await window.app.artist.saveProjects(stamped);
}

export function getActiveDraft(state: ArtistProjectsState): ArtistPageDraft {
  return (
    state.projects.find((p) => p.projectId === state.activeProjectId) ??
    state.projects[0] ??
    createEmptyDraft()
  );
}

export function replaceDraftInState(state: ArtistProjectsState, draft: ArtistPageDraft): ArtistProjectsState {
  const exists = state.projects.some((p) => p.projectId === draft.projectId);
  const projects = exists
    ? state.projects.map((p) => (p.projectId === draft.projectId ? draft : p))
    : [...state.projects, draft];
  return { ...state, projects };
}

export function setActiveProject(state: ArtistProjectsState, projectId: string): ArtistProjectsState {
  if (!state.projects.some((p) => p.projectId === projectId)) return state;
  return { ...state, activeProjectId: projectId };
}

export function addEmptyProject(state: ArtistProjectsState): ArtistProjectsState {
  const draft = createEmptyDraft();
  return {
    version: 2,
    activeProjectId: draft.projectId,
    projects: [...state.projects, draft],
  };
}

/** Deep-clone a project with new ids — for spinning up alter-ego catalogs from a template. */
export function duplicateProject(state: ArtistProjectsState, sourceProjectId: string): ArtistProjectsState {
  const source = state.projects.find((p) => p.projectId === sourceProjectId);
  if (!source) return state;

  const projectId = crypto.randomUUID();
  const copy: ArtistPageDraft = {
    ...source,
    projectId,
    artistName: source.artistName.trim() ? `${source.artistName.trim()} (copy)` : '',
    artistSlug: source.artistSlug.trim() ? `${source.artistSlug.trim()}-copy` : '',
    songs: source.songs.map((song) => ({
      ...song,
      id: crypto.randomUUID(),
    })),
    updatedAt: new Date().toISOString(),
  };

  return {
    version: 2,
    activeProjectId: projectId,
    projects: [...state.projects, copy],
  };
}

export function removeProject(state: ArtistProjectsState, projectId: string): ArtistProjectsState {
  if (state.projects.length <= 1) return state;
  const projects = state.projects.filter((p) => p.projectId !== projectId);
  const activeProjectId =
    state.activeProjectId === projectId ? projects[0].projectId : state.activeProjectId;
  return { version: 2, activeProjectId, projects };
}

function hasLocalPath(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Build compile manifest from draft — Electron uses local disk paths only. */
export function buildCompileManifest(draft: ArtistPageDraft): {
  artistSlug: string;
  artistName: string;
  artistBio: string;
  deploySiteUrl: string;
  social: ArtistPageDraft['social'];
  artistPhotoLocalPath: string | null;
  songs: Array<
    ArtistPageDraft['songs'][number] & {
      hasAudio: boolean;
      hasCover: boolean;
      hasExtraImage: boolean;
    }
  >;
  hasArtistPhoto: boolean;
} {
  const songs = draft.songs.map((song) => ({
    ...song,
    slug: song.slug || song.title,
    hasAudio: hasLocalPath(song.audioLocalPath),
    hasCover: hasLocalPath(song.coverLocalPath),
    hasExtraImage: hasLocalPath(song.extraImageLocalPath),
  }));

  return {
    artistSlug: draft.artistSlug,
    artistName: draft.artistName,
    artistBio: draft.artistBio,
    deploySiteUrl: draft.deploySiteUrl,
    social: draft.social,
    artistPhotoLocalPath: draft.artistPhotoLocalPath,
    songs,
    hasArtistPhoto: hasLocalPath(draft.artistPhotoLocalPath),
  };
}

export function draftHasLinkedAudio(draft: ArtistPageDraft): boolean {
  return draft.songs.some((s) => hasLocalPath(s.audioLocalPath));
}
