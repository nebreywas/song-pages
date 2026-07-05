# Settings and Persistence

Registry of where Song Pages stores configuration, library data, and media on disk. Use this when adding new settings or debugging “it didn’t save after restart” issues.

**Store mechanism:** SQLite `settings` table via `electron/database.js`, exposed to renderer as `window.app.getSettings` / `saveSettings` (`electron/preload.js` → `settings:get` / `settings:save`).

---

## SQLite settings keys

| Key | Constant | Written by | Purpose |
|-----|----------|------------|---------|
| `vc.lastConfig` | `VC_SETTINGS_KEY` in `shared/vcModeTypes.ts` | `useAutoSaveVcConfig`, designer flush on close | VC surface layout, cell/float assignments, grid design, visualizer id |
| `vc.hostContent` | `HOST_CONTENT_SETTINGS_KEY` in `shared/hostContent/constants.ts` | `useHostContentCatalog` (designer) | Host content catalog (metadata; media on disk) |
| `visualizer.activeExperienceId` | `VISUALIZER_ACTIVE_EXPERIENCE_KEY` | `useVisualizerManager` | Active visualizer experience |
| `visualizer.activePluginId` | `VISUALIZER_LEGACY_PLUGIN_KEY` | *(read fallback only)* | Legacy plugin id |
| `visualizer.preference.mainPlayer` | `VISUALIZER_MAIN_PLAYER_PREFERENCE_KEY` | `useVisualizerManager` | Main player visualizer preference |
| `visualizer.settings.{id}` | `visualizerSettingsKey()` | `settings/persistence/store.ts` | Per-experience visualizer settings |
| `ui.theme` | `THEME_SETTING_KEY` in `src/lib/themes.ts` | `useAppTheme` | App light/dark theme |
| `ui.listenerSidebarCollapsed` | `SIDEBAR_COLLAPSED_KEY` in `ListenerSidebar.tsx` | `ListenerMode` | Listener sidebar state |
| `artist:projects` | — | `electron/ipc.js` | Artist workspace (v2 multi-project) |
| `artist:draft` | — | *(migration read only)* | Legacy single draft → migrated to projects |
| `cache.maxSongEntries` | `CACHE_MAX_ENTRIES_KEY` in `electron/listener/cache/constants.js` | Cache settings UI | HLS/song cache size cap |

---

## Filesystem paths (Electron `userData`)

| Path | Purpose |
|------|---------|
| `{userData}/host-content/media/` | Host graphic/video files (`electron/hostContent.js`) |
| `{userData}/artistpages/{slug}/` | Compiled artist static sites + manifests |
| Listener cache | Managed under userData by `electron/listener/cache/*` (custom protocol for cached HLS) |

Host media files are referenced by path in the `vc.hostContent` catalog blob; deleting catalog entries should eventually orphan-clean media (verify when implementing cleanup).

---

## SQLite library (not settings table)

Listener library uses dedicated tables in the same SQLite database (`electron/listener/library.js`):

- Artists, songs, likes, subscribe metadata
- Separate from the key/value `settings` table

---

## Session / ephemeral storage

| Location | Key / mechanism | Purpose |
|----------|-----------------|---------|
| Guest webview partition | `persist:songpages-guest` (`shared/appClient.ts`) | Isolated guest session for song pages |
| Compiled site (browser) | `sessionStorage` `artist-site-player-v1` | Site footer player state — not used in Electron app mode |
| Reference bundle only | `localStorage` draft | `artist-page-reference-bundle/` — not the live Electron app |

---

## Migration entry points

When changing persisted JSON shapes, update **all** load paths:

| Domain | Migrate function | File |
|--------|------------------|------|
| VC config | `migrateVcConfig()` | `shared/vcSurface/migrate.ts` |
| Host catalog | `migrateHostContentCatalog()` | `shared/hostContent/migrate.ts` |
| VC cells (legacy content strings) | `migrateCellContent()` | `shared/vcModeTypes.ts` |
| Artist draft → projects | `loadProjects` migration | `electron/ipc.js` |
| Visualizer plugin → experience | read fallback chain | `useVisualizerManager.ts` |

**Rule:** `normalizeVcConfig()` / `normalizeHostContentCatalog()` run after migrate on save. Missing fields in `migrateVcConfig` (e.g. `gridDesign`) are dropped silently.

---

## Designer auto-save behavior

| Feature | Debounce | Key | Notes |
|---------|----------|-----|-------|
| VC surface config | 500ms | `vc.lastConfig` | `useAutoSaveVcConfig`; flush on modal close |
| Host content catalog | immediate on CRUD | `vc.hostContent` | `useHostContentCatalog` in designer |

Do not re-fetch `vc.lastConfig` on every config edit — see [vc-mode-architecture.md](./vc-mode-architecture.md) persistence pitfalls.

---

## Related reading

- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC config shape and IPC
- [Host-content-design.md](./Host-content-design.md) — host catalog product rules
- [security-model-and-completed-actions.md](./security-model-and-completed-actions.md) — guest partition vs app shell
