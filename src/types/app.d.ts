export type AppMode = 'listener' | 'artist' | 'artist2' | 'developer' | 'about' | 'pretty-lyrics';

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
  /** Custom playlist rows — last metadata or track-list change. */
  updated_at?: string | null;
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
  /** Subscribed catalog row — user skipped (still listed, not auto-played). */
  skipped?: number | null;
  /** Custom playlist junction row id (main process only). */
  user_playlist_entry_id?: number;
  library_song_id?: number | null;
  /** When the row was added to a virtual playlist (liked / custom / suno). */
  added_at?: string | null;
  /**
   * Provider-specific JSON blob (e.g. normalized Suno Studio clip metadata).
   * Prefer the synthetic song manifest `providerMetadata` for display.
   */
  provider_metadata_json?: string | null;
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
          songRef:
            | number
            | Pick<SongRow, 'id' | 'library_song_id' | 'page_url' | 'playback_url'>,
          source?: string,
        ) => Promise<{
          ok: boolean;
          data?: { pageUrl: string; playbackUrl: string; fromCache: boolean };
          error?: string;
        }>;
        countSunoDemoSongs: (playlistId?: number) => Promise<number>;
        listSunoDemoPlaylists: () => Promise<
          Array<{ id: number; name: string; created_at: string; song_count: number }>
        >;
        createSunoDemoPlaylist: () => Promise<{
          ok: boolean;
          data?: { id: number; name: string; created_at: string; song_count: number; artist_id: number };
          error?: string;
        }>;
        removeSunoDemoPlaylist: (
          playlistId: number,
        ) => Promise<{
          ok: boolean;
          data?: { artist_id: number; name: string; song_count: number };
          error?: string;
        }>;
        renameSunoDemoPlaylist: (
          playlistId: number,
          name: string,
        ) => Promise<{
          ok: boolean;
          data?: { id: number; name: string; created_at: string; song_count: number; artist_id: number };
          error?: string;
        }>;
        listUserPlaylists: () => Promise<
          Array<{
            id: number;
            name: string;
            about: string | null;
            created_at: string;
            updated_at: string;
            song_count: number;
          }>
        >;
        createUserPlaylist: (
          name?: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            id: number;
            name: string;
            about: string | null;
            created_at: string;
            updated_at: string;
            song_count: number;
            artist_id: number;
          };
          error?: string;
        }>;
        updateUserPlaylist: (
          playlistId: number,
          patch: { name: string; about: string },
        ) => Promise<{
          ok: boolean;
          data?: {
            id: number;
            name: string;
            about: string | null;
            created_at: string;
            updated_at: string;
            song_count: number;
            artist_id: number;
          };
          error?: string;
        }>;
        renameUserPlaylist: (
          playlistId: number,
          name: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            id: number;
            name: string;
            about: string | null;
            created_at: string;
            updated_at: string;
            song_count: number;
            artist_id: number;
          };
          error?: string;
        }>;
        removeUserPlaylist: (
          playlistId: number,
        ) => Promise<{
          ok: boolean;
          data?: { artist_id: number; name: string; song_count: number };
          error?: string;
        }>;
        addSongToUserPlaylist: (
          playlistId: number,
          song: SongRow,
        ) => Promise<{
          ok: boolean;
          data?: { duplicate: boolean; song: SongRow; count: number };
          error?: string;
        }>;
        addExternalSongToUserPlaylist: (
          playlistId: number,
          input: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            duplicate: boolean;
            song: SongRow;
            count: number;
            intakeNotice?: string | null;
            provider?: string;
          };
          error?: string;
        }>;
        addYoutubeSongToUserPlaylist: (
          playlistId: number,
          input: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            duplicate: boolean;
            song: SongRow;
            count: number;
            intakeNotice?: string | null;
          };
          error?: string;
        }>;
        addFlowSongToUserPlaylist: (
          playlistId: number,
          input: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            duplicate: boolean;
            song: SongRow;
            count: number;
          };
          error?: string;
        }>;
        addSoundcloudSongToUserPlaylist: (
          playlistId: number,
          input: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            duplicate: boolean;
            song: SongRow;
            count: number;
            intakeNotice?: string | null;
          };
          error?: string;
        }>;
        moveSongToUserPlaylist: (payload: {
          sourceArtistId: number;
          destPlaylistId: number;
          song: SongRow;
        }) => Promise<{
          ok: boolean;
          data?: { duplicate: boolean; song: SongRow; count: number };
          error?: string;
        }>;
        removeUserPlaylistSong: (
          songId: number,
        ) => Promise<{ ok: boolean; data?: { count: number; playlist_id?: number }; error?: string }>;
        addSunoDemoSong: (
          input: string,
          playlistId?: number,
        ) => Promise<{
          ok: boolean;
          data?: { song: SongRow; duplicate: boolean; count: number };
          error?: string;
        }>;
        getPlaylistOrderState: (
          playlistKey: string,
          currentSongIds: number[],
        ) => Promise<{
          ok: boolean;
          data?: { hasCustomOrder: boolean; songIds: number[] };
          error?: string;
        }>;
        savePlaylistCustomOrder: (
          playlistKey: string,
          orderedSongIds: number[],
        ) => Promise<{ ok: boolean; error?: string }>;
        clearPlaylistCustomOrder: (playlistKey: string) => Promise<{ ok: boolean; error?: string }>;
        setCatalogSongSkipped: (
          artistId: number,
          externalId: string,
          skipped: boolean,
        ) => Promise<{ ok: boolean; error?: string }>;
        setUserPlaylistSongSkipped: (
          entryId: number,
          skipped: boolean,
        ) => Promise<{ ok: boolean; error?: string }>;
        setLikedSongSkipped: (payload: {
          songId: number;
          likedId?: number | null;
          skipped: boolean;
        }) => Promise<{ ok: boolean; error?: string }>;
        removeLikedSong: (payload: {
          songId: number;
          likedId?: number | null;
        }) => Promise<{ ok: boolean; data?: { count: number }; error?: string }>;
        removeSunoDemoSong: (
          songId: number,
        ) => Promise<{ ok: boolean; data?: { count: number }; error?: string }>;
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
        cacheClearAll: () => Promise<{
          ok: boolean;
          data?: { entryCount: number; totalBytes: number; maxEntries: number };
          error?: string;
        }>;
        onPlaybackCommand: (
          callback: (payload: import('@shared/listener/playbackCommands').ListenerPlaybackCommand) => void,
        ) => () => void;
        onSubmissionPlaylistUpdated: (callback: (playlistId: number) => void) => () => void;
        setChromeMinified: (payload: {
          minified: boolean;
          contentWidth?: number;
          contentHeight?: number;
        }) => Promise<{ ok: boolean; error?: string }>;
        recordSongHistoryStart: (input: {
          songId: number;
          songTitle: string;
          artistName?: string | null;
          playlistId?: number | null;
          playlistName?: string | null;
          playbackType?: 'normal' | 'on-deck' | 'play-now';
          interruptedPrevious?: boolean;
          vcMode?: boolean;
          vcModeLabel?: string | null;
          durationSeconds?: number | null;
        }) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
        updateSongHistoryEntry: (
          entryId: number,
          patch: {
            completed?: boolean;
            playbackSeconds?: number;
            durationSeconds?: number | null;
            interrupted?: boolean;
          },
        ) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
        listSongHistory: (limit?: number) => Promise<unknown[]>;
        clearSongHistory: () => Promise<{ ok: boolean; error?: string }>;
      };
      artist: {
        pickAudio: () => Promise<string | null>;
        pickVideo: () => Promise<string | null>;
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
      artist2: {
        listArtists: () => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2Artist[];
          error?: string;
        }>;
        createArtist: (payload: { name: string }) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2Artist;
          error?: string;
        }>;
        updateArtist: (
          id: string,
          patch: { name?: string; payload?: Record<string, unknown> },
        ) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2Artist;
          error?: string;
        }>;
        listObjects: (
          artistId: string,
          options?: { kind?: string; search?: string },
        ) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject[];
          error?: string;
        }>;
        listMembershipCounts: (artistId: string) => Promise<{
          ok: boolean;
          data?: Record<string, number>;
          error?: string;
        }>;
        listAlbumTrackSummaries: (artistId: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2AlbumTrackSummaries;
          error?: string;
        }>;
        getObject: (id: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject | null;
          error?: string;
        }>;
        createObject: (payload: {
          artistId: string;
          kind: import('@shared/artist2').Artist2CatalogKind;
          contentType?: import('@shared/artist2').Artist2ContentType | null;
          name: string;
          payload?: Record<string, unknown>;
        }) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject;
          error?: string;
        }>;
        updateObject: (
          id: string,
          patch: {
            name?: string;
            status?: import('@shared/artist2').Artist2ObjectStatus;
            payload?: Record<string, unknown>;
          },
        ) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject;
          error?: string;
        }>;
        deleteObject: (id: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2DeleteResult;
          error?: string;
        }>;
        getDeleteImpact: (id: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2DeleteImpact;
          error?: string;
        }>;
        listDeletedObjects: (artistId: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject[];
          error?: string;
        }>;
        restoreObject: (id: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CatalogObject;
          error?: string;
        }>;
        listDeletionReports: (
          artistId: string,
          options?: { includeCleared?: boolean },
        ) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2DeletionReport[];
          error?: string;
        }>;
        clearDeletionReport: (reportId: string) => Promise<{
          ok: boolean;
          data?: { ok: boolean; cleared: boolean };
          error?: string;
        }>;
        clearAllDeletionReports: (artistId: string) => Promise<{
          ok: boolean;
          data?: { ok: boolean; clearedCount: number };
          error?: string;
        }>;
        getCompilePreview: (artistId: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2CompileBuildResult;
          error?: string;
        }>;
        compile: (artistId: string) => Promise<{
          ok: boolean;
          data?: {
            slug: string;
            previewUrl: string;
            outputFolder: string;
            songCount: number;
            buildVersion: string;
            generatedAt: string;
            warnings: string[];
            skippedSongs: Array<{ id: string; name: string; reason: string }>;
          };
          error?: string;
        }>;
        importSunoIntoSong: (
          objectId: string,
          rawInput: string,
        ) => Promise<{
          ok: boolean;
          data?: {
            object: import('@shared/artist2').Artist2CatalogObject;
            coverImported: boolean;
            coverWarning: string | null;
            clipId: string;
          };
          error?: string;
        }>;
        resolveLocalFileUrl: (filePath: string) => Promise<{
          ok: boolean;
          data?: string | null;
          error?: string;
        }>;
        renameCoverForObject: (objectId: string) => Promise<{
          ok: boolean;
          data?: {
            object: import('@shared/artist2').Artist2CatalogObject;
            content: import('@shared/artist2').Artist2CatalogObject | null;
            path: string;
            renamed: boolean;
            filename: string;
          };
          error?: string;
        }>;
        getAlbumDetail: (albumId: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2AlbumDetail;
          error?: string;
        }>;
        addMembership: (payload: {
          containerId: string;
          memberId: string;
        }) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2AlbumDetail;
          error?: string;
        }>;
        removeMembership: (membershipId: string) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2AlbumDetail | null;
          error?: string;
        }>;
        reorderMemberships: (
          containerId: string,
          orderedMemberIds: string[],
        ) => Promise<{
          ok: boolean;
          data?: import('@shared/artist2').Artist2AlbumDetail;
          error?: string;
        }>;
        promoteArtwork: (payload: {
          objectId: string;
          name?: string;
        }) => Promise<{
          ok: boolean;
          data?: {
            object: import('@shared/artist2').Artist2CatalogObject;
            content: import('@shared/artist2').Artist2CatalogObject;
          };
          error?: string;
        }>;
        linkRelatedSongs: (payload: {
          fromSongId: string;
          toSongId: string;
          relation?: import('@shared/artist2').Artist2SongRelationKind;
          note?: string;
        }) => Promise<{
          ok: boolean;
          data?: {
            from: import('@shared/artist2').Artist2CatalogObject;
            to: import('@shared/artist2').Artist2CatalogObject;
          };
          error?: string;
        }>;
        unlinkRelatedSongs: (payload: {
          fromSongId: string;
          toSongId: string;
        }) => Promise<{
          ok: boolean;
          data?: {
            from: import('@shared/artist2').Artist2CatalogObject;
            to: import('@shared/artist2').Artist2CatalogObject | null;
          };
          error?: string;
        }>;
        repairBrokenReference: (payload: {
          reportId: string;
          refIndex: number;
        }) => Promise<{
          ok: boolean;
          data?: { repaired: boolean; kind: string; detail?: unknown };
          error?: string;
        }>;
      };
      visualizer: {
        open: (options?: {
          fullscreen?: boolean;
          displayId?: number | null;
          width?: number;
          height?: number;
        }) => Promise<{ ok: boolean; error?: string }>;
        close: () => Promise<{ ok: boolean; error?: string }>;
        setTitle: (title: string) => Promise<{ ok: boolean; error?: string }>;
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
        open: (options?: {
          fullscreen?: boolean;
          projectionWindow?: import('@shared/vcModeTypes').VcProjectionWindowBounds;
        }) => Promise<{ ok: boolean; error?: string }>;
        close: () => Promise<{ ok: boolean; error?: string }>;
        setFullScreen: (fullscreen: boolean) => Promise<{ ok: boolean; error?: string }>;
        status: () => Promise<{
          ok: boolean;
          data?: { open: boolean; fullscreen: boolean };
          error?: string;
        }>;
        sendState: (payload: import('@shared/vcModeTypes').VcStatePayload) => void;
        sendFrame: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void;
        sendPerformanceEffect: (
          payload: import('@shared/vcMode/performanceEffect').VcPerformanceEffectCommand,
        ) => void;
        sendPlaybackStatus: (payload: { active: boolean }) => void;
        sendTransport: (payload: import('@shared/vcMode/vcTransport').VcTransportCommand) => void;
        updateSurface: (patch: Partial<import('@shared/vcModeTypes').VcSurfaceConfig>) => void;
        commitSurface: (surface: import('@shared/vcModeTypes').VcSurfaceConfig) => void;
        requestVisualizerRotate: () => void;
        reportActiveVisualizer: (id: string) => void;
        syncActiveVisualizer: (id: string) => void;
        switchSurface: (designId: string) => void;
        onState: (callback: (payload: import('@shared/vcModeTypes').VcStatePayload) => void) => () => void;
        onFrame: (callback: (payload: import('@shared/visualizerMessages').VisualizerStreamFrame) => void) => () => void;
        onPerformanceEffect: (
          callback: (payload: import('@shared/vcMode/performanceEffect').VcPerformanceEffectCommand) => void,
        ) => () => void;
        onHotkey: (callback: (payload: { action: import('@shared/vcModeTypes').VcHotkeyAction }) => void) => () => void;
        onOpened: (callback: () => void) => () => void;
        onClosed: (callback: () => void) => () => void;
        onRequestSync: (callback: () => void) => () => void;
        onPlaybackStatus: (callback: (payload: { active: boolean }) => void) => () => void;
        onTransport: (callback: (payload: import('@shared/vcMode/vcTransport').VcTransportCommand) => void) => () => void;
        onSurfacePatch: (
          callback: (patch: Partial<import('@shared/vcModeTypes').VcSurfaceConfig>) => void,
        ) => () => void;
        onSurfaceCommit: (
          callback: (surface: import('@shared/vcModeTypes').VcSurfaceConfig) => void,
        ) => () => void;
        onProjectionWindowChanged: (
          callback: (bounds: import('@shared/vcModeTypes').VcProjectionWindowBounds) => void,
        ) => () => void;
        onVisualizerRotateRequest: (callback: () => void) => () => void;
        onActiveVisualizerReport: (callback: (id: string) => void) => () => void;
        onSyncActiveVisualizer: (callback: (id: string) => void) => () => void;
        onSwitchSurface: (callback: (designId: string) => void) => () => void;
        togglePlayLock: () => void;
        togglePlayLockReleaseOnNext: () => void;
        setPlayLockReleaseOnNext: (enabled: boolean) => void;
        notifySubmissionPlaylistUpdated: (playlistId: number) => void;
        resolveMeme: (
          rawInput: string,
        ) => Promise<
          | { ok: true; media: import('@shared/memes/types').ResolvedMeme }
          | { ok: false; error: string }
        >;
        showMeme: (media: import('@shared/memes/types').ResolvedMeme) => void;
        clearMeme: () => void;
        onTogglePlayLock: (callback: () => void) => () => void;
        onTogglePlayLockReleaseOnNext: (callback: () => void) => () => void;
        onSetPlayLockReleaseOnNext: (callback: (enabled: boolean) => void) => () => void;
        onShowMeme: (
          callback: (media: import('@shared/memes/types').ResolvedMeme) => void,
        ) => () => void;
        onClearMeme: (callback: () => void) => () => void;
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
      commands: {
        getState: () => Promise<{ ok: boolean; data?: import('@shared/commands').CommandMappingState; error?: string }>;
        saveState: (
          state: import('@shared/commands').CommandMappingState,
        ) => Promise<{ ok: boolean; data?: import('@shared/commands').CommandMappingState; error?: string }>;
        dispatch: (invocation: import('@shared/commands').CommandInvocation) => Promise<{
          ok: boolean;
          result?: string;
          error?: string;
        }>;
        sendGatedKey: (
          input:
            | string
            | {
                type?: string;
                key: string;
                alt?: boolean;
                meta?: boolean;
                control?: boolean;
                shift?: boolean;
              },
        ) => Promise<{ ok: boolean; reason?: string }>;
        onMappingState: (
          callback: (state: import('@shared/commands').CommandMappingState) => void,
        ) => () => void;
        onGateState: (callback: (state: { open: boolean; timeoutMs: number; openedAt?: number | null }) => void) => () => void;
        onGateEvent: (
          callback: (event: { type: string; key?: string; reason?: string }) => void,
        ) => () => void;
        onInvoke: (
          callback: (payload: {
            commandId: string;
            kudoPresetId?: string;
            surfaceDesignId?: string;
            source?: string;
            binding?: string;
            result?: string;
            timestamp?: number;
          }) => void,
        ) => () => void;
        setRuntimeContext: (context: import('@shared/commands').CommandRuntimeContext) => void;
        getRuntimeContext: () => Promise<{
          ok: boolean;
          data?: import('@shared/commands').CommandRuntimeContext;
          error?: string;
        }>;
        onRuntimeContext: (
          callback: (context: import('@shared/commands').CommandRuntimeContext) => void,
        ) => () => void;
        onRegistrationStatus: (
          callback: (payload: {
            failures: Array<{ accelerator?: string; commandId?: string; reason: string }>;
            registered: number;
          }) => void,
        ) => () => void;
      };
      controller: {
        open: () => Promise<{ ok: boolean; error?: string }>;
        close: () => Promise<{ ok: boolean; error?: string }>;
        status: () => Promise<{
          ok: boolean;
          data?: { open: boolean; alwaysOnTop?: boolean };
          error?: string;
        }>;
        setAlwaysOnTop: (enabled: boolean) => Promise<{
          ok: boolean;
          data?: { alwaysOnTop: boolean };
          error?: string;
        }>;
      };
    };
  }
}

export {};
