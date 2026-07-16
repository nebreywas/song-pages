# Settings and Persistence

Registry of where Song Pages stores configuration, library data, and media on disk. Use this when adding new settings or debugging “it didn’t save after restart” issues.

**Index:** [README.md](./README.md) · **Deferred work:** [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)

**Persistence philosophy:** [persistence-philosophy.md](./persistence-philosophy.md) — Snapshot-First principle, relationship classes, FK guidance.

**Store mechanism:** SQLite `settings` table via `electron/database.js`, exposed to renderer as `window.app.getSettings` / `saveSettings` (`electron/preload.js` → `settings:get` / `settings:save`).

**Audit reference:** [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) (closed 2026-07-10 — guidance only, not an active backlog)

---

## SQLite settings keys

| Key | Constant | Written by | Purpose |
|-----|----------|------------|---------|
| `ui.theme` | `THEME_SETTING_KEY` in `src/lib/themes.ts` | `useAppTheme` | App light/dark theme |
| `ui.listenerSidebarCollapsed` | `SIDEBAR_COLLAPSED_KEY` in `ListenerSidebar.tsx` | `ListenerMode` | Listener sidebar collapsed state |
| `ui.listenerSidebarWidth` | `SIDEBAR_WIDTH_KEY` in `ListenerSidebar.tsx` | `ListenerMode` | Listener sidebar width (px) |
| `ui.listenerSidebarOrder` | `SIDEBAR_LIBRARY_ORDER_KEY` in `shared/listener/sidebarLibraryOrder.ts` | `useListenerSidebarLibraryLayout` | Manual sidebar row order (artist ids) |
| `ui.listenerSidebarSort` | `SIDEBAR_LIBRARY_SORT_KEY` in `shared/listener/sidebarLibraryOrder.ts` | `useListenerSidebarLibraryLayout` | Sidebar sort column + direction |
| `ui.listenerPlayer` | `LISTENER_PLAYER_SETTINGS_KEY` in `shared/listener/playerSettings.ts` | `useListenerPlayerSettings` | Listener player chrome (seek time label mode) |
| `ui.listenerLyrics` | `LISTENER_LYRICS_DISPLAY_SETTINGS_KEY` in `shared/listener/lyricsDisplaySettings.ts` | `useListenerLyricsDisplaySettings` | Lyrics display options (e.g. remove brackets) |
| `ui.liveDebug` | `LIVE_DEBUG_SETTINGS_KEY` in `shared/liveDebug/settings.ts` | `useLiveDebugSettings` | Live Debug HUD toggle (mirrored to VC state) |
| `vc.lastConfig` | `VC_SETTINGS_KEY` in `shared/vcModeTypes.ts` | `useAutoSaveVcConfig`, designer flush on close | Active VC surface layout, assignments, grid design |
| `vc.surfaceDesigns` | `VC_SURFACE_DESIGNS_KEY` in `shared/vcSurfaceDesigns/constants.ts` | `vcSurfaceDesignStore`, `VcModeModal` | Saved VC surface design catalog (version 1) |
| `vc.hostContent` | `HOST_CONTENT_SETTINGS_KEY` in `shared/hostContent/constants.ts` | `useHostContentCatalog` (designer) | Host content catalog (metadata; media on disk) |
| `kudos.presets` | `KUDOS_SETTINGS_KEY` in `shared/kudos/constants.ts` | `useKudoPresets`, `ControllerWindowApp`, `KeyBindingsPanel` | Kudo preset catalog + defaults |
| `commands.mappings` | `COMMAND_MAPPINGS_SETTINGS_KEY` in `shared/commands/constants.ts` | `useCommandMappings`, `commandService` (main) | VC command bindings v2 |
| `visualizer.activeExperienceId` | `VISUALIZER_ACTIVE_EXPERIENCE_KEY` | `useVisualizerManager` | Active visualizer experience |
| `visualizer.activePluginId` | `VISUALIZER_LEGACY_PLUGIN_KEY` | *(read fallback only)* | Legacy plugin id |
| `visualizer.preference.mainPlayer` | `VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY` | `useVisualizerManager` | Main player visualizer preference |
| `visualizer.settings.{id}` | `visualizerSettingsKey()` in `src/visualizers/settings/persistence/keys.ts` | `settings/persistence/store.ts` | Per-experience visualizer settings |
| `artist:projects` | — | `electron/ipc.js` | Artist workspace (v2 multi-project) |
| `artist:draft` | — | *(migration read only)* | Legacy single draft → migrated to projects |
| `cache.maxSongEntries` | `CACHE_MAX_ENTRIES_KEY` in `electron/listener/cache/constants.js` | Cache settings UI / `cacheManager` | HLS/song cache LRU entry cap |

### Malformed-value behavior (summary)

| Key family | On bad/missing data |
|------------|---------------------|
| `ui.listener*` | `normalize*` helpers in shared modules → safe defaults |
| `vc.lastConfig` | `migrateVcConfig` + `normalizeVcConfig` |
| `vc.surfaceDesigns` | `migrateVcSurfaceDesignCatalog` → default catalog |
| `vc.hostContent` | `migrateHostContentCatalog` |
| `kudos.presets` | `migrateKudosState` → starter presets |
| `commands.mappings` | Main: warn + defaults; renderer: `migrateMappingState` |
| `visualizer.*` | Fallback chain in `useVisualizerManager` |
| Generic IPC | `getSetting` returns `defaultValue` if missing; JSON parse failure returns raw string |

---

## Database backup

Before schema or persistence changes, back up the development database:

```bash
# Quit Song Pages first
npm run backup:db
```

Output: `backups/database/<timestamp>/` with `app.db`, sidecars when present, `manifest.json`, and verification results (`quick_check`, row counts).

**Verify catalog upsert atomicity (temp DB only):** `npm run test:db`

---

## Filesystem paths (Electron `userData`)

| Path | Purpose |
|------|---------|
| `{userData}/database/app.db` | SQLite database (+ `-wal`, `-shm` when WAL active) |
| `{userData}/host-content/media/` | Host graphic/video files (`electron/hostContent.js`) |
| `{userData}/artistpages/{slug}/` | Compiled artist static sites + manifests |
| `{userData}/cache/{opaqueId}/` | Cached song assets (HLS, pages) |

Host media files are referenced by path in the `vc.hostContent` catalog blob; deleting catalog entries should eventually orphan-clean media (verify when implementing cleanup).

---

## SQLite library (not settings table)

Listener library uses dedicated tables in the same SQLite database (`electron/listener/library.js`):

- `artists`, `songs` — **local catalog mirror** (ownership; replaced on refresh/unsubscribe)
- `liked_songs` — hybrid snapshot + optional live link (`song_id`)
- `user_playlists`, `user_playlist_songs` — **user snapshots** (see [persistence-philosophy.md](./persistence-philosophy.md))
- `suno_demo_playlists`, `suno_demo_songs` — demo imports (self-contained snapshots)
- `playlist_custom_orders` — derived order overlay
- `catalog_song_skips` — derived skip flags (survives catalog refresh via `external_id`)
- `song_cache`, `song_cache_assets` — regenerable cache metadata (bytes on disk)

---

## Session / ephemeral storage

| Location | Key / mechanism | Purpose |
|----------|-----------------|---------|
| Guest webview partition | `persist:songpages-guest` (`shared/appClient.ts`) | Isolated guest session for song pages |
| Compiled site (browser) | `sessionStorage` `artist-site-player-v1` | Site footer player state — not used in Electron app mode |
| Dev-only localStorage | `songpages:audio-debug`, `songpages:audio-debug-panel` | Audio debug panel |
| Dev-only localStorage | `songpages:effects-lab-panel` | Effects lab panel visibility |
| Dev-only localStorage | `songpages:meyda-lab-panel` | Meyda Lab panel visibility |

---

## Migration entry points

When changing persisted JSON shapes, update **all** load paths:

| Domain | Migrate function | File |
|--------|------------------|------|
| VC config | `migrateVcConfig()` | `shared/vcSurface/migrate.ts` |
| VC surface designs | `migrateVcSurfaceDesignCatalog()` | `shared/vcSurfaceDesigns/migrate.ts` |
| Host catalog | `migrateHostContentCatalog()` | `shared/hostContent/migrate.ts` |
| VC cells (legacy content strings) | `migrateCellContent()` | `shared/vcModeTypes.ts` |
| Artist draft → projects | `loadProjects` migration | `electron/ipc.js` |
| Command mappings v1 → v2 | `migrateCommandMappingState()` | `shared/commands/migrate.ts` (+ `electron/commands/bindingCodec.js` mirror) |
| Kudos | `migrateKudosState()` | `shared/kudos/migrate.ts` |
| Visualizer plugin → experience | read fallback chain | `useVisualizerManager.ts` |
| Sidebar library order/sort | `normalizeSidebarLibraryOrder`, `normalizeSidebarLibrarySort` | `shared/listener/sidebarLibraryOrder.ts` |
| Listener lyrics display | `normalizeListenerLyricsDisplaySettings` | `shared/listener/lyricsDisplaySettings.ts` |

**Rule:** `normalizeVcConfig()` / `normalizeHostContentCatalog()` run after migrate on save. Missing fields in `migrateVcConfig` (e.g. `gridDesign`) are dropped silently.

---

## Designer auto-save behavior

| Feature | Debounce | Key | Notes |
|---------|----------|-----|-------|
| VC surface config | 500ms | `vc.lastConfig` | `useAutoSaveVcConfig`; flush on modal close |
| VC surface designs | on CRUD | `vc.surfaceDesigns` | `vcSurfaceDesignStore` |
| Host content catalog | immediate on CRUD | `vc.hostContent` | `useHostContentCatalog` in designer |

Do not re-fetch `vc.lastConfig` on every config edit — see [vc-mode-architecture.md](./vc-mode-architecture.md) persistence pitfalls.

---

## Related reading

- [persistence-philosophy.md](./persistence-philosophy.md) — Snapshot-First; ownership vs convenience references
- [Song Pages SQLite and Data Layer Audit.md](./Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) — schema, deletion semantics (closed audit)
- [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md) — deferred persistence/security items
- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC config shape and IPC
- [archive/specs/Host-content-design.md](./archive/specs/Host-content-design.md) — host catalog product rules (archived spec)
- [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) — guest partition vs app shell
