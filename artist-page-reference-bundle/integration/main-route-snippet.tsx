/**
 * How the parent Voluminous app mounts the editor (unlinked dev route).
 * In Electron: mount <ArtistPageEditor /> as the root window or a dedicated route.
 */
import { ArtistPageEditor } from "../src/artistPageEditor/ArtistPageEditor";

const pathname = window.location.pathname.replace(/\/$/, "") || "/";
const isArtistPageEditor = pathname === "/artist-page-editor";

function DevPrototypeRoot() {
  if (isArtistPageEditor) return <ArtistPageEditor />;
  // ... main app ...
}
