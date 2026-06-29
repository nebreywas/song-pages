/**
 * Structured logging for the main process.
 *
 * Development builds log verbosely to the console. Production builds keep
 * console output minimal while persisting logs to disk so they can be
 * exported for debugging.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let logDir = null;
let logFilePath = null;
let minLevel = 'info';

/**
 * Initialize the logger once Electron paths are available.
 */
function initLogger() {
  const isDev = !app.isPackaged;
  minLevel = isDev ? 'debug' : 'info';

  logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  logFilePath = path.join(logDir, `app-${stamp}.log`);
}

function formatEntry(level, message, meta) {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}\n`;
}

function write(level, message, meta) {
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) {
    return;
  }

  const entry = formatEntry(level, message, meta);

  // Production keeps the console quiet; development mirrors everything.
  if (!app.isPackaged || level === 'warn' || level === 'error') {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(entry.trim());
  }

  if (logFilePath) {
    fs.appendFileSync(logFilePath, entry, 'utf8');
  }
}

const logger = {
  initLogger,
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),

  /**
   * Collect recent log files into a single export bundle for support.
   */
  exportLogs() {
    if (!logDir || !fs.existsSync(logDir)) {
      return { ok: false, error: 'Log directory not found' };
    }

    const files = fs
      .readdirSync(logDir)
      .filter((name) => name.endsWith('.log'))
      .sort()
      .slice(-7);

    const combined = files
      .map((name) => {
        const content = fs.readFileSync(path.join(logDir, name), 'utf8');
        return `--- ${name} ---\n${content}`;
      })
      .join('\n');

    const exportPath = path.join(logDir, `export-${Date.now()}.log`);
    fs.writeFileSync(exportPath, combined, 'utf8');

    return { ok: true, path: exportPath };
  },
};

module.exports = logger;
