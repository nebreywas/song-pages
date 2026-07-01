# Guest Rendering Security

Song Pages treats remote Song Page HTML as **untrusted web content**, even when produced by our compiler. Artists are trusted to create interesting presentation; they are not trusted with application privileges.

## Trust model

| Trusted | Not trusted |
|---------|-------------|
| Electron app shell (React + preload + main) | Remote Song Page HTML/CSS/JS |
| SQLite, IPC, filesystem (main only) | Guest webview content |
| Compiler output structure | Modified or compromised hosted sites |

## Guest webview configuration

Each Song Page loads in an isolated `<webview>` with:

| Setting | Value |
|---------|--------|
| Partition | `persist:songpages-guest` (hardened session) |
| `nodeIntegration` | `false` |
| `contextIsolation` | `true` |
| `sandbox` | `true` |
| Preload | none |
| Popups | denied |

The main application window may use different settings (e.g. `webSecurity: false` for HLS in the app player). **Guest pages never inherit those relaxations.**

## Main-process guest session

Configured once at startup (`electron/listener/guestSession.js`):

- Deny all permission requests (camera, microphone, location, notifications, …)
- Block downloads from guest content

## Per-page guest binding

When a webview is ready, the renderer sends the guest `webContentsId` and allowed page URL to main (`listener:bindSongPageGuest`). Main attaches:

- **`will-navigate` / `will-redirect`** — allow only same-origin + same pathname (hash/query changes OK). Other URLs open in the system browser.
- **`setWindowOpenHandler`** — deny new windows; open target URL externally.

External stream links (Spotify, YouTube, etc.) open in the user's default browser.

## App presentation mode (`?songpagesApp=1`)

Listener Mode appends `songpagesApp=1` when loading a canonical song page.

**The Electron app does not inject CSS or JavaScript into guest documents.** Presentation is controlled by compiled templates:

- Head script adds `songpages-app-client` class when the query param is present
- CSS hides `[data-songpages-client-chrome]` (footer player, home, inline play buttons)
- `site-player.js` exits early in app mode

Legacy param `songpagesEmbed=1` is still recognized by templates during transition.

## Content Security Policy

Every compiled HTML page includes a CSP meta tag (injected in `finalizeStaticHtml`):

- Scripts, styles, media, and connections limited to `'self'`
- `form-action 'none'` — no form submission
- `frame-src 'none'` — no embedded frames
- `object-src 'none'`

This reduces risk from compromised or hand-edited sites loading third-party resources.

## Reader-mode restrictions

| Feature | Guest behavior |
|---------|----------------|
| Forms | CSP `form-action 'none'` + navigation blocked |
| File upload | Not available in static templates; permissions denied |
| Downloads | Session `will-download` prevented |
| Popups / `window.open` | Denied; URL opened externally |
| Permissions | Denied |

Rich presentation (HTML, CSS, JS, SVG, canvas, lyrics, artwork) continues to work within CSP bounds.

## Recompile requirement

Sites deployed before app presentation mode and CSP require **recompile and re-upload** for full template-side chrome hiding and CSP. Security binding in Electron applies to all remote URLs regardless.
