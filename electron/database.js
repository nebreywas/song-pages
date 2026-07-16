/**
 * SQLite persistence layer (main process only).
 *
 * SQLite is the canonical local store for settings, caches, and metadata.
 * Large binary assets should remain on the filesystem, not in the database.
 *
 * @see documentation/persistence-philosophy.md — Snapshot-First, relationship classes
 * @see documentation/settings-and-persistence.md — keys, paths, backup/test commands
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');
const logger = require('./logger');

let db = null;

/**
 * Open (or create) the application database under userData.
 */
function initDatabase() {
  const dbDir = path.join(app.getPath('userData'), 'database');
  fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'app.db');
  db = new Database(dbPath);

  // WAL mode is a safe default for desktop apps with concurrent reads.
  db.pragma('journal_mode = WAL');
  // Ownership-only FK enablement is deferred — see documentation/persistence-philosophy.md

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Listener Mode tables (artists, songs) — see electron/listener/library.js
  const { initListenerSchema } = require('./listener/library');
  initListenerSchema();

  // Artist 2.0 catalog (authoring) — separate from Listener subscribe mirrors
  const { initArtist2Schema } = require('./artist2/schema');
  initArtist2Schema(db);

  logger.info('SQLite database ready', { path: dbPath });
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

function getSetting(key, defaultValue = null) {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) {
    return defaultValue;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

function setSetting(key, value) {
  const serialized = JSON.stringify(value);
  getDatabase()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, serialized);
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
}

/** Close without logging — for electron/listener/*.test.js hooks. */
function closeTestDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Opens an isolated database file for automated tests (electron/listener/*.test.js).
 * Not used by the packaged app.
 */
function openTestDatabase(dbPath) {
  if (db) {
    db.close();
    db = null;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const { initListenerSchema } = require('./listener/library');
  initListenerSchema();

  const { initArtist2Schema } = require('./artist2/schema');
  initArtist2Schema(db);
  return db;
}

module.exports = {
  initDatabase,
  getDatabase,
  getSetting,
  setSetting,
  closeDatabase,
  openTestDatabase,
  closeTestDatabase,
};
