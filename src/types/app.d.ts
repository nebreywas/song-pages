export type AppMode = 'listener' | 'artist' | 'developer' | 'about';

/** In-memory cache analytics event from the main process ring buffer. */
export type CacheEventRow = {
  id: number;
  at: string;
  type: string;
  source?: string;
  songId?: number;
  songTitle?: string;
  artistId?: number;
  cacheId?: string;
  manifestRevision?: string;
  cachedRevision?: string;
  currentRevision?: string;
  totalBytes?: number;
  segmentCount?: number;
  durationMs?: number;
  reason?: string;
  entryCount?: number;
  error?: string;
};

export type ArtistRow = {
  id: number;
  site_url: string;
  site_root_normalized: string;
  artist_slug: string | null;
  artist_name: string;
  artist_photo_url: string | null;
  artist_bio: string | null;
  artist_social_json: string | null;
  build_version: string | null;
  last_fetched_at: string | null;
  created_at: string;
  song_count: number;
};

export type ArtistSocialIds = {
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  soundcloud: string;
};

export type SongRow = {
  id: number;
  artist_id: number;
  external_id: string;
  slug: string;
  title: string;
  album: string | null;
  year: string | null;
  caption: string | null;
  cover_url: string | null;
  page_url: string;
  playback_url: string;
  song_manifest_url: string | null;
  playback_scope: string | null;
  playback_quality: string | null;
  duration_seconds: number | null;
  sort_order: number;
  artist_name?: string;
  site_root_normalized?: string;
  /** Liked Songs row metadata */
  liked_id?: number;
  unavailable?: number | null;
};

export type SubscribeResult = {
  artist: ArtistRow;
  songs: SongRow[];
  siteRootWarning: string | null;
};

declare global {
  interface Window {
    app: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>;
      openFile: (options?: Record<string, unknown>) => Promise<string | null>;
      getSettings: (key: string) => Promise<unknown>;
      saveSettings: (key: string, value: unknown) => Promise<boolean>;
      exportLogs: () => Promise<unknown>;
      onNavigate: (callback: (mode: AppMode) => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      listener: {
        listArtists: () => Promise<ArtistRow[]>;
        listSongs: (artistId?: number) => Promise<SongRow[]>;
        subscribe: (siteUrl: string) => Promise<{ ok: boolean; data?: SubscribeResult; error?: string }>;
        refreshArtist: (artistId: number) => Promise<{ ok: boolean; data?: SubscribeResult; error?: string }>;
        refreshAll: () => Promise<unknown>;
        removeArtist: (artistId: number) => Promise<boolean>;
        ensureArtistManifest: (
          artistId: number,
        ) => Promise<{ ok: boolean; data?: ArtistRow; error?: string }>;
        fetchSongManifest: (url: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
        bindSongPageGuest: (
          guestWebContentsId: number,
          allowedPageUrl: string,
        ) => Promise<{ ok: boolean; error?: string }>;
        updateSongDuration: (songId: number, durationSeconds: number) => Promise<boolean>;
        countLikedSongs: () => Promise<number>;
        listLikedSongIds: () => Promise<number[]>;
        isSongLiked: (songId: number) => Promise<boolean>;
        toggleLikeSong: (songId: number) => Promise<{ ok: boolean; data?: { liked: boolean; count: number }; error?: string }>;
        setLikedSongAvailability: (songId: number, unavailable: boolean | null) => Promise<boolean>;
        probeSongAvailability: (
          pageUrl: string,
          playbackUrl: string,
        ) => Promise<{ ok: boolean; data?: { ok: boolean; pageAvailable: boolean; playbackAvailable: boolean }; error?: string }>;
        resolveSongAccess: (
          songId: number,
          source?: string,
        ) => Promise<{
          ok: boolean;
          data?: { pageUrl: string; playbackUrl: string; fromCache: boolean };
          error?: string;
        }>;
        cacheStats: () => Promise<{
          ok: boolean;
          data?: { entryCount: number; totalBytes: number; maxEntries: number };
          error?: string;
        }>;
        cacheEvents: (limit?: number) => Promise<{
          ok: boolean;
          data?: CacheEventRow[];
          error?: string;
        }>;
        cacheClearEvents: () => Promise<{ ok: boolean; error?: string }>;
      };
      artist: {
        pickAudio: () => Promise<string | null>;
        pickImage: () => Promise<string | null>;
        pickOutputFolder: () => Promise<string | null>;
        compile: (payload: unknown) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
        openOutputFolder: (folderPath: string) => Promise<boolean>;
        loadProjects: () => Promise<unknown>;
        saveProjects: (state: unknown) => Promise<boolean>;
        loadDraft: () => Promise<unknown>;
        saveDraft: (draft: unknown) => Promise<boolean>;
        checkFfmpeg: () => Promise<{ ok: boolean; error?: string }>;
        readMp3Bytes: (filePath: string) => Promise<{
          ok: boolean;
          data?: Uint8Array;
          error?: string;
        }>;
      };
      visualizer: {
        open: (options?: { fullscreen?: boolean; displayId?: number | null }) => Promise<{ ok: boolean; error?: string }>;
        close: () => Promise<{ ok: boolean; error?: string }>;
        setFullScreen: (fullscreen: boolean) => Promise<{ ok: boolean; error?: string }>;
        status: () => Promise<{
          ok: boolean;
          data?: { open: boolean; fullscreen: boolean };
          error?: string;
        }>;
        listDisplays: () => Promise<{
          ok: boolean;
          data?: Array<{ id: number; label: string; primary: boolean; bounds: { x: number; y: number; width: number; height: number } }>;
          error?: string;
        }>;
        sendConfig: (payload: import('@shared/visualizerMessages').VisualizerStreamConfig) => void;
        sendFrame: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void;
        onConfig: (callback: (payload: import('@shared/visualizerMessages').VisualizerStreamConfig) => void) => () => void;
        onFrame: (callback: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void) => () => void;
        onOpened: (callback: () => void) => () => void;
        onClosed: (callback: () => void) => () => void;
        onFullScreenChanged: (callback: (fullscreen: boolean) => void) => () => void;
        onRequestSync?: (callback: () => void) => () => void;
      };
      vc: {
        open: (options?: { fullscreen?: boolean }) => Promise<{ ok: boolean; error?: string }>;
        close: () => Promise<{ ok: boolean; error?: string }>;
        setFullScreen: (fullscreen: boolean) => Promise<{ ok: boolean; error?: string }>;
        status: () => Promise<{
          ok: boolean;
          data?: { open: boolean; fullscreen: boolean };
          error?: string;
        }>;
        sendState: (payload: import('@shared/vcModeTypes').VcStatePayload) => void;
        sendFrame: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void;
        sendPlaybackStatus: (payload: { active: boolean }) => void;
        onState: (callback: (payload: import('@shared/vcModeTypes').VcStatePayload) => void) => () => void;
        onFrame: (callback: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void) => () => void;
        onHotkey: (callback: (payload: { action: import('@shared/vcModeTypes').VcHotkeyAction }) => void) => () => void;
        onOpened: (callback: () => void) => () => void;
        onClosed: (callback: () => void) => () => void;
        onRequestSync: (callback: () => void) => () => void;
        onPlaybackStatus: (callback: (payload: { active: boolean }) => void) => () => void;
      };
      hostContent: {
        pickAndImportMedia: (payload: {
          kind: 'graphic' | 'video';
          itemId?: string;
        }) => Promise<
          | { ok: true; mediaPath: string; widthPx: number; heightPx: number; fileSizeBytes: number }
          | { ok: false; canceled?: boolean; error?: string }
        >;
        resolveMediaUrl: (relativePath: string) => Promise<string | null>;
        deleteMedia: (relativePath: string) => Promise<boolean>;
      };
    };
  }
}

export {};
