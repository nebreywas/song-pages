/**
 * How the parent Voluminous app wires the dev compile server into Vite.
 * In Electron: delete this — call compileArtistPage() from main via IPC instead.
 */
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { devArtistPageCompilePlugin } from "../server/artistPageCompileApi";

const projectRoot = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [
    react(),
    devArtistPageCompilePlugin(projectRoot),
  ],
  server: {
    fs: { allow: [projectRoot] },
  },
});
