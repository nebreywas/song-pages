/**
 * Register-once tsx loader for the Electron MAIN process.
 *
 * Why this exists: `require('tsx/cjs/api').register()` is NOT idempotent — every
 * call wraps `Module._resolveFilename` / `Module._extensions` in a new layer and
 * returns an unregister function (which our call sites discarded). Calling it
 * per-operation (every meme submit, every catalog patch) did two bad things:
 *
 *   1. The first call synchronously loads esbuild and compiles shared .ts
 *      modules — a long, main-process-blocking stall. Because the main process
 *      routes all VC Mode IPC (16ms frame relays, 200ms state pushes), that
 *      stall froze every window and then "spat forward" the queued messages.
 *   2. Each later call permanently stacked another resolver wrapper, so every
 *      require() in the main process walked an ever-deepening chain.
 *
 * All main-process code that needs to require shared `.ts` modules must call
 * `ensureTsLoader()` instead of registering tsx directly. The guard makes
 * repeat calls free; the one-time cost is paid on the first .ts-needing
 * operation only.
 */

let registered = false;

function ensureTsLoader() {
  if (registered) return;
  require('tsx/cjs/api').register();
  registered = true;
}

module.exports = { ensureTsLoader };
