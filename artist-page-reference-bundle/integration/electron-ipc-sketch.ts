/**
 * Sketch — not runnable standalone. Shows how to replace HTTP with IPC in Electron main.
 *
 * npm i electron
 * Bundle ffmpeg or ensure ffmpeg on PATH.
 */
import { ipcMain, dialog } from "electron";
import path from "node:path";

// import { compileArtistPage } from "../server/artistPageCompileService";
// import type { CompileArtistManifest, CompileFileMap } from "../server/artistPageCompileService";

const projectRoot = path.resolve(__dirname, "..");

ipcMain.handle("artist-page:pick-audio", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "MP3", extensions: ["mp3"] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle(
  "artist-page:compile",
  async (_event, manifest: unknown /* CompileArtistManifest */, fileMapEntries: [string, string][]) => {
    const files: CompileFileMap = new Map(fileMapEntries);
    return compileArtistPage({
      projectRoot,
      manifest: manifest as CompileArtistManifest,
      files,
      uploadsDir: path.join(projectRoot, "artist-page-compile", ".uploads"),
    });
  },
);

// Preload (contextBridge):
// compile: (manifest, fileMap) => ipcRenderer.invoke("artist-page:compile", manifest, fileMap)
