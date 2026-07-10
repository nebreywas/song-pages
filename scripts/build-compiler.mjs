/**
 * Bundle the Artist compile service for packaged Electron (main process = CommonJS).
 * marked v18+ is ESM-only; tsc output cannot require() it — esbuild inlines deps into one CJS file.
 *
 * @see documentation/manifest-schemas.md — compile output contracts
 * @see documentation/ffmpeg-compile-prerequisites.md — FFmpeg on PATH (not bundled)
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'electron', 'compiler-dist');
const outfile = path.join(outDir, 'bundle.cjs');

// Replace prior tsc output — packaged app only needs the single bundle.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'compiler', 'electronCompileExports.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  // Node built-ins only — npm deps (marked, sanitize-html) are bundled in.
  external: ['fs', 'path', 'child_process', 'util', 'node:fs', 'node:path', 'node:child_process', 'node:util'],
  logLevel: 'info',
});

console.log(`Compiler bundle written to ${path.relative(root, outfile)}`);
