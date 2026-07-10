#!/usr/bin/env node
/**
 * Quiesced backup of the Song Pages SQLite database.
 *
 * Quit the app before running so WAL can checkpoint cleanly.
 * Copies app.db + sidecars, then verifies the backup via the sqlite3 CLI:
 * quick_check, journal_mode, user_version, and row counts.
 *
 * Usage:
 *   node scripts/backup-database.mjs
 *   node scripts/backup-database.mjs --out ./backups/database
 *
 * @see documentation/settings-and-persistence.md — backup procedure
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TABLE_ROW_COUNTS = [
  'settings',
  'artists',
  'songs',
  'liked_songs',
  'user_playlists',
  'user_playlist_songs',
  'suno_demo_playlists',
  'suno_demo_songs',
  'playlist_custom_orders',
  'catalog_song_skips',
  'song_cache',
  'song_cache_assets',
];

function defaultUserDataDir() {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'song-pages');
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'song-pages');
    default:
      return path.join(home, '.config', 'song-pages');
  }
}

function parseArgs(argv) {
  let outDir = path.join(__dirname, '..', 'backups', 'database');
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--out' && argv[i + 1]) {
      outDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node scripts/backup-database.mjs [--out <directory>]

Quits-required: close Song Pages before backing up.

Default source: {userData}/database/app.db
Default output:  <repo>/backups/database/<timestamp>/`);
      process.exit(0);
    }
  }
  return { outDir };
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dest);
  return true;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function sqlite3Query(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim();
}

function verifyBackup(dbPath) {
  const quickCheck = sqlite3Query(dbPath, 'PRAGMA quick_check;');
  if (quickCheck !== 'ok') {
    throw new Error(`quick_check failed: ${quickCheck}`);
  }

  const rowCounts = {};
  for (const table of TABLE_ROW_COUNTS) {
    try {
      rowCounts[table] = Number(sqlite3Query(dbPath, `SELECT COUNT(*) FROM ${table};`));
    } catch {
      rowCounts[table] = null;
    }
  }

  return {
    quickCheck,
    rowCounts,
    journalMode: sqlite3Query(dbPath, 'PRAGMA journal_mode;'),
    userVersion: sqlite3Query(dbPath, 'PRAGMA user_version;'),
    sqliteVersion: sqlite3Query(dbPath, 'SELECT sqlite_version();'),
  };
}

function main() {
  const { outDir } = parseArgs(process.argv);
  const userData = process.env.SONG_PAGES_USER_DATA || defaultUserDataDir();
  const dbDir = path.join(userData, 'database');
  const srcDb = path.join(dbDir, 'app.db');

  if (!fs.existsSync(srcDb)) {
    console.error(`Database not found: ${srcDb}`);
    console.error('Set SONG_PAGES_USER_DATA if your userData path differs.');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destDir = path.join(outDir, stamp);
  fs.mkdirSync(destDir, { recursive: true });

  const destDb = path.join(destDir, 'app.db');
  copyIfExists(srcDb, destDb);
  const copiedWal = copyIfExists(`${srcDb}-wal`, `${destDb}-wal`);
  const copiedShm = copyIfExists(`${srcDb}-shm`, `${destDb}-shm`);

  const manifest = {
    createdAt: new Date().toISOString(),
    source: {
      userData,
      dbDir,
      files: {
        db: fs.statSync(srcDb).size,
        wal: copiedWal ? fs.statSync(`${srcDb}-wal`).size : 0,
        shm: copiedShm ? fs.statSync(`${srcDb}-shm`).size : 0,
      },
    },
    destination: destDir,
  };

  console.log('Song Pages database backup');
  console.log('─'.repeat(48));
  console.log(`Source:      ${srcDb}`);
  console.log(`Destination: ${destDir}`);
  console.log(
    `Copied:      app.db (${formatBytes(manifest.source.files.db)})` +
      (copiedWal ? `, wal (${formatBytes(manifest.source.files.wal)})` : ', no wal') +
      (copiedShm ? `, shm (${formatBytes(manifest.source.files.shm)})` : ', no shm'),
  );

  if (copiedWal) {
    console.warn('\nNote: WAL sidecar was copied. For cleanest backup, quit Song Pages first.');
  }

  const verification = verifyBackup(destDb);
  manifest.verification = verification;

  console.log('\nVerification');
  console.log(`  quick_check:   ${verification.quickCheck}`);
  console.log(`  journal_mode:  ${verification.journalMode}`);
  console.log(`  user_version:  ${verification.userVersion}`);
  console.log(`  sqlite:        ${verification.sqliteVersion}`);
  console.log('  row counts:');
  for (const table of TABLE_ROW_COUNTS) {
    const count = verification.rowCounts[table];
    if (count != null) {
      console.log(`    ${table.padEnd(24)} ${count}`);
    }
  }

  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nManifest:    ${path.join(destDir, 'manifest.json')}`);
  console.log('Backup complete.');
}

main();
