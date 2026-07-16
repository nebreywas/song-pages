/**
 * Launch Electron for local development.
 *
 * Some environments (including Cursor's integrated terminal) set
 * ELECTRON_RUN_AS_NODE=1, which makes require('electron') return a path
 * string instead of the app API. Strip that variable before spawning.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const electronBinary = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ['.'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

console.log('[song-pages] Launching Electron dev shell from', projectRoot);
console.log('[song-pages] Renderer should load http://localhost:5173 (title: "Song Pages (Dev)")');
console.log('[song-pages] If UI looks stale, quit all Electron windows and re-run npm run dev');
console.log('[song-pages] Main-process changes (electron/*.js) require a full Electron restart — Vite HMR does not reload them.');

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
