export type SongPlaybackQuality = "high" | "degraded";
export type SongPlaybackScope = "full" | "preview";
export type SongPlaybackPreviewSeconds = 30 | 45 | 60;

export type SongPlaybackSettings = {
  quality: SongPlaybackQuality;
  scope: SongPlaybackScope;
  previewSeconds: SongPlaybackPreviewSeconds;
};

export type ArtistSocialIds = {
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  soundcloud: string;
};

export type SongStreamLinks = {
  youtube: string;
  spotify: string;
  soundcloud: string;
};

/** Text metadata for one song slot — binary assets live in IndexedDB. */
export type ArtistSongDraft = {
  id: string;
  slug: string;
  title: string;
  album: string;
  year: string;
  caption: string;
  about: string;
  lyrics: string;
  links: SongStreamLinks;
  playback: SongPlaybackSettings;
  /** Saved local disk path (dev) — pointer only in localStorage, file linked on server. */
  audioLocalPath: string | null;
  coverLocalPath: string | null;
  extraImageLocalPath: string | null;
};

export type ArtistPageDraft = {
  version: 1;
  artistSlug: string;
  artistName: string;
  artistBio: string;
  social: ArtistSocialIds;
  artistPhotoFileName: string | null;
  artistPhotoLocalPath: string | null;
  songs: ArtistSongDraft[];
  updatedAt: string;
};

export const MAX_SONGS = 12;
export const MAX_CAPTION = 120;
export const MAX_ABOUT = 1000;
export const MAX_ARTIST_BIO = 5000;
export const SONG_IMAGE_MAX_EDGE = 1000;
export const ARTIST_PHOTO_MAX_EDGE = 500;

export const DRAFT_STORAGE_KEY = "voluminous-artist-page-draft";

export function assetKey(kind: "audio" | "cover" | "extra", songId: string): string {
  return `${kind}:${songId}`;
}

export const ARTIST_PHOTO_KEY = "artist-photo";

export function createEmptySong(index: number): ArtistSongDraft {
  return {
    id: crypto.randomUUID(),
    slug: "",
    title: `Song ${index + 1}`,
    album: "",
    year: "",
    caption: "",
    about: "",
    lyrics: "",
    links: { youtube: "", spotify: "", soundcloud: "" },
    playback: { quality: "high", scope: "full", previewSeconds: 60 },
    audioFileName: null,
    coverFileName: null,
    extraImageFileName: null,
    audioLocalPath: null,
    coverLocalPath: null,
    extraImageLocalPath: null,
  };
}

export function createEmptyDraft(): ArtistPageDraft {
  return {
    version: 1,
    artistSlug: "",
    artistName: "",
    artistBio: "",
    social: { instagram: "", tiktok: "", youtube: "", spotify: "", soundcloud: "" },
    artistPhotoFileName: null,
    artistPhotoLocalPath: null,
    songs: Array.from({ length: MAX_SONGS }, (_, i) => createEmptySong(i)),
    updatedAt: new Date().toISOString(),
  };
}

export function slugifyDraftText(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "untitled";
}
