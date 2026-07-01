import {
  ARTIST_PHOTO_KEY,
  assetKey,
  createEmptyDraft,
  DRAFT_STORAGE_KEY,
  type ArtistPageDraft,
  type ArtistSongDraft,
} from "./types";

function normalizeSong(song: Partial<ArtistSongDraft> & { id: string }): ArtistSongDraft {
  return {
    id: song.id,
    slug: song.slug ?? "",
    title: song.title ?? "",
    album: song.album ?? "",
    year: song.year ?? "",
    caption: song.caption ?? "",
    about: song.about ?? "",
    lyrics: song.lyrics ?? "",
    links: song.links ?? { youtube: "", spotify: "", soundcloud: "" },
    playback: song.playback ?? { quality: "high", scope: "full", previewSeconds: 60 },
    audioFileName: song.audioFileName ?? null,
    coverFileName: song.coverFileName ?? null,
    extraImageFileName: song.extraImageFileName ?? null,
    audioLocalPath: song.audioLocalPath ?? null,
    coverLocalPath: song.coverLocalPath ?? null,
    extraImageLocalPath: song.extraImageLocalPath ?? null,
  };
}

export function loadDraftFromStorage(): ArtistPageDraft {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw) as ArtistPageDraft;
    if (parsed.version !== 1 || !Array.isArray(parsed.songs)) {
      return createEmptyDraft();
    }
    return {
      ...parsed,
      artistPhotoLocalPath: parsed.artistPhotoLocalPath ?? null,
      songs: parsed.songs.map((s) => normalizeSong(s)),
    };
  } catch {
    return createEmptyDraft();
  }
}

export function saveDraftToStorage(draft: ArtistPageDraft): void {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
}

export function clearDraftStorage(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function hasLocalPath(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Build compile manifest — prefers saved local paths over IndexedDB blobs. */
export async function buildCompileManifest(
  draft: ArtistPageDraft,
  assetExists: (key: string) => Promise<boolean>,
): Promise<{
  artistSlug: string;
  artistName: string;
  artistBio: string;
  social: ArtistPageDraft["social"];
  artistPhotoLocalPath: string | null;
  songs: Array<
    ArtistPageDraft["songs"][number] & {
      hasAudio: boolean;
      hasCover: boolean;
      hasExtraImage: boolean;
    }
  >;
  hasArtistPhoto: boolean;
}> {
  const songs = await Promise.all(
    draft.songs.map(async (song) => {
      const hasAudio = hasLocalPath(song.audioLocalPath) || (await assetExists(assetKey("audio", song.id)));
      const hasCover = hasLocalPath(song.coverLocalPath) || (await assetExists(assetKey("cover", song.id)));
      const hasExtraImage =
        hasLocalPath(song.extraImageLocalPath) || (await assetExists(assetKey("extra", song.id)));

      return {
        ...song,
        slug: song.slug || song.title,
        hasAudio,
        hasCover,
        hasExtraImage,
      };
    }),
  );

  const hasArtistPhoto =
    hasLocalPath(draft.artistPhotoLocalPath) || (await assetExists(ARTIST_PHOTO_KEY));

  return {
    artistSlug: draft.artistSlug,
    artistName: draft.artistName,
    artistBio: draft.artistBio,
    social: draft.social,
    artistPhotoLocalPath: draft.artistPhotoLocalPath,
    songs,
    hasArtistPhoto,
  };
}

export function songHasLinkedAudio(song: ArtistSongDraft): boolean {
  return hasLocalPath(song.audioLocalPath);
}

export function draftHasLinkedAudio(draft: ArtistPageDraft): boolean {
  return draft.songs.some(songHasLinkedAudio);
}
