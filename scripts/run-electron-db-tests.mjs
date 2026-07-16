#!/usr/bin/env node
/**
 * Run electron/listener database tests under Electron's Node (better-sqlite3 ABI).
 *
 * @see documentation/settings-and-persistence.md — npm run test:db
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const electronBinary = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
);

const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };

const result = spawnSync(
  electronBinary,
  ['--test', 'electron/listener/libraryUpsert.test.js', 'electron/listener/convenienceFkMigration.test.js', 'electron/listener/userPlaylists.integration.test.js', 'electron/artist2/catalog.test.js'],
  { cwd: projectRoot, env, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
