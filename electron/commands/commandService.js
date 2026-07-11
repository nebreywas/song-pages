/**
 * VC command registration and dispatch (main process).
 * Replaces the legacy hard-coded VC hotkey table.
 */
const { globalShortcut } = require('electron');
const logger = require('../logger');
const database = require('../database');
const {
  COMMAND_MAPPINGS_SETTINGS_KEY,
  LEGACY_ACTION_BY_COMMAND,
  createDefaultMappingState,
  logicalBindingToElectronAccelerator,
  extendedBindingToElectronAccelerator,
  migrateMappingState,
  parseReservedBindingKey,
  resolveBindingToCommand,
} = require('./bindingCodec');
const { evaluateGateKey } = require('./gateHandler');
const { syncGateInputCapture } = require('./gateInputCapture');
const { isCommandAvailableForDispatch } = require('./commandAvailability');

/** @type {import('../../shared/commands/runtimeContext').CommandRuntimeContext} */
let runtimeContext = { vcModeActive: false };

/** @type {import('electron').BrowserWindow | null} */
let mainWindowRef = null;
/** @type {import('electron').BrowserWindow | null} */
let vcWindowRef = null;
/** @type {import('electron').BrowserWindow | null} */
let controllerWindowRef = null;

/** @type {ReturnType<typeof createDefaultMappingState>} */
let mappingState = createDefaultMappingState();

/** @type {string[]} */
const registeredAccelerators = [];

/** @type {Map<string, { commandId: string; source: string; binding: string }>} */
const acceleratorToBinding = new Map();

let vcModeActive = false;
let gateOpen = false;
let gateTimeoutId = null;
let gateOpenedAt = 0;

/** @see shared/commands/constants.ts COMMAND_GATE_INPUT_GRACE_MS */
const GATE_INPUT_GRACE_MS = 400;

/** Playback commands routed to the main listener window (not VC hotkeys). */
const MAIN_PLAYBACK_BY_COMMAND = {
  'seek-back-500': { type: 'seekRelative', deltaSeconds: -0.5 },
  'seek-back-1s': { type: 'seekRelative', deltaSeconds: -1 },
  'seek-back-2s': { type: 'seekRelative', deltaSeconds: -2 },
  'seek-back-5s': { type: 'seekRelative', deltaSeconds: -5 },
  'stutter-500': { type: 'stutter', durationMs: 500 },
  'stutter-1000': { type: 'stutter', durationMs: 1000 },
  'stutter-1500': { type: 'stutter', durationMs: 1500 },
  'stutter-2000': { type: 'stutter', durationMs: 2000 },
  'play-next-song': { type: 'playNextSong' },
  'volume-up': { type: 'volumeDelta', delta: 0.05 },
  'volume-down': { type: 'volumeDelta', delta: -0.05 },
  'visualizer-next': { type: 'visualizerStep', direction: 1 },
  'visualizer-previous': { type: 'visualizerStep', direction: -1 },
};

/** Player commands that work without VC Mode — keep in sync with shared/commands/appWideCommands.ts */
const APP_WIDE_COMMAND_IDS = new Set(Object.keys(MAIN_PLAYBACK_BY_COMMAND));

function loadMappingState() {
  try {
    const raw = database.getSetting(COMMAND_MAPPINGS_SETTINGS_KEY);
    const parsed =
      raw == null
        ? null
        : typeof raw === 'string'
          ? JSON.parse(raw)
          : typeof raw === 'object'
            ? raw
            : null;
    mappingState = migrateMappingState(parsed);
  } catch (error) {
    logger.warn('Command mapping load failed — using defaults', { error: String(error) });
    mappingState = createDefaultMappingState();
  }
  return mappingState;
}

function saveMappingState(next) {
  mappingState = migrateMappingState(next);
  try {
    database.setSetting(COMMAND_MAPPINGS_SETTINGS_KEY, mappingState);
    const roundtrip = database.getSetting(COMMAND_MAPPINGS_SETTINGS_KEY);
    if (!roundtrip || typeof roundtrip !== 'object') {
      throw new Error('Command mappings did not persist to the database.');
    }
    mappingState = migrateMappingState(roundtrip);
    logger.debug('Command mappings saved', {
      key: COMMAND_MAPPINGS_SETTINGS_KEY,
      commandCount: Object.keys(mappingState.commands).length,
    });
  } catch (error) {
    logger.error('Command mapping save failed', { error: String(error) });
    throw error;
  }
  registerActiveShortcuts();
  broadcastMappingState();
  return mappingState;
}

function getMappingState() {
  return mappingState;
}

function setWindowRefs({ mainWindow, vcWindow, controllerWindow }) {
  mainWindowRef = mainWindow ?? null;
  vcWindowRef = vcWindow ?? null;
  controllerWindowRef = controllerWindow ?? null;
  syncGateCapture();
  if (mainWindowRef) registerActiveShortcuts();
}

function sendToWindow(windowRef, channel, payload) {
  if (!windowRef || windowRef.isDestroyed()) return;
  windowRef.webContents.send(channel, payload);
}

function broadcast(channel, payload) {
  sendToWindow(mainWindowRef, channel, payload);
  sendToWindow(vcWindowRef, channel, payload);
  sendToWindow(controllerWindowRef, channel, payload);
}

function setRuntimeContext(next) {
  if (!next || typeof next !== 'object') return runtimeContext;
  // Replace derived VC flags wholesale so stale false values cannot block overlay hotkeys.
  if (
    'hasNextSong' in next ||
    'hasUpcomingSongs' in next ||
    'hasCurrentSong' in next ||
    'hasCoverArt' in next ||
    'hasHostGraphic' in next ||
    'hasPlaybackTiming' in next
  ) {
    runtimeContext = {
      vcModeActive: next.vcModeActive !== false,
      hasNextSong: next.hasNextSong,
      hasUpcomingSongs: next.hasUpcomingSongs,
      hasCurrentSong: next.hasCurrentSong,
      hasCoverArt: next.hasCoverArt,
      hasHostGraphic: next.hasHostGraphic,
      hasPlaybackTiming: next.hasPlaybackTiming,
      specialPlayPauseActive: next.specialPlayPauseActive,
    };
  } else {
    runtimeContext = { ...runtimeContext, ...next };
  }
  broadcast('commands:runtime-context', runtimeContext);
  return runtimeContext;
}

function getRuntimeContext() {
  return runtimeContext;
}

function broadcastUnavailable(commandId, source, binding) {
  broadcast('command:invoke', {
    commandId,
    source,
    binding,
    result: 'unavailable',
    timestamp: Date.now(),
  });
}

function broadcastMappingState() {
  broadcast('commands:mapping-state', mappingState);
}

function broadcastGateState() {
  broadcast('commands:gate-state', {
    open: gateOpen,
    timeoutMs: mappingState.gateTimeoutMs,
    openedAt: gateOpen ? gateOpenedAt : null,
  });
}

function clearGateTimeout() {
  if (gateTimeoutId != null) {
    clearTimeout(gateTimeoutId);
    gateTimeoutId = null;
  }
}

function syncGateCapture() {
  syncGateInputCapture({
    enabled: gateOpen && vcModeActive,
    windows: [mainWindowRef, vcWindowRef, controllerWindowRef],
    getMappingState: () => mappingState,
    onGateKey: (input) => {
      handleGatedKey(input);
    },
  });
}

function closeGate(reason = 'gate-abort') {
  if (!gateOpen) return;
  gateOpen = false;
  clearGateTimeout();
  syncGateCapture();
  broadcastGateState();
  broadcast('commands:gate-event', { type: 'closed', reason });
}

function openGate() {
  gateOpen = true;
  gateOpenedAt = Date.now();
  syncGateCapture();
  broadcastGateState();
  broadcast('commands:gate-event', { type: 'opened' });
  clearGateTimeout();
  gateTimeoutId = setTimeout(() => closeGate('gate-timeout'), mappingState.gateTimeoutMs);
  if (controllerWindowRef && !controllerWindowRef.isDestroyed()) {
    controllerWindowRef.focus();
  }
}

function toggleGate() {
  if (gateOpen) closeGate('gate-abort');
  else openGate();
}

function parseKudoPresetId(commandId) {
  const prefix = 'trigger-kudo-';
  if (!commandId.startsWith(prefix)) return null;
  return commandId.slice(prefix.length) || null;
}

function dispatchCommand(invocation) {
  const { commandId, source, binding } = invocation;
  logger.debug('Command dispatch', { commandId, source, binding });

  if (commandId === 'toggle-vc-command-gate') {
    toggleGate();
    return { ok: true, result: 'executed' };
  }

  const kudoPresetId = parseKudoPresetId(commandId);
  if (kudoPresetId) {
    if (!vcModeActive) return { ok: false, result: 'vc-inactive' };
    broadcast('command:invoke', {
      commandId,
      kudoPresetId,
      source,
      binding,
      result: 'executed',
      timestamp: Date.now(),
    });
    return { ok: true, result: 'executed' };
  }

  const playbackCommand = MAIN_PLAYBACK_BY_COMMAND[commandId];
  if (playbackCommand) {
    const available = isCommandAvailableForDispatch(commandId, runtimeContext);
    if (!available) {
      broadcastUnavailable(commandId, source, binding);
      return { ok: false, result: 'unavailable' };
    }
    sendToWindow(mainWindowRef, 'listener:playback-command', playbackCommand);
    broadcast('command:invoke', {
      commandId,
      source,
      binding,
      result: 'executed',
      timestamp: Date.now(),
    });
    return { ok: true, result: 'executed' };
  }

  if (!vcModeActive) return { ok: false, result: 'vc-inactive' };

  if (!isCommandAvailableForDispatch(commandId, runtimeContext)) {
    broadcastUnavailable(commandId, source, binding);
    return { ok: false, result: 'unavailable' };
  }

  const legacyAction = LEGACY_ACTION_BY_COMMAND[commandId];
  if (legacyAction) {
    broadcast('vc:hotkey', { action: legacyAction });
    broadcast('command:invoke', {
      commandId,
      source,
      binding,
      result: 'executed',
      timestamp: Date.now(),
    });
    return { ok: true, result: 'executed' };
  }

  return { ok: false, result: 'not-found' };
}

function handleDirectOrExtended(source, binding) {
  const resolved = resolveBindingToCommand(mappingState, source, binding);
  if (!resolved) return;
  dispatchCommand(resolved);
}

function unregisterAllShortcuts() {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator);
  }
  registeredAccelerators.length = 0;
  acceleratorToBinding.clear();
}

function registerActiveShortcuts() {
  unregisterAllShortcuts();
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return;

  /** @type {Array<{ commandId: string; source: string; binding: string }>} */
  const bindings = [];

  for (const [commandId, slot] of Object.entries(mappingState.commands)) {
    if (slot.direct) bindings.push({ commandId, source: 'direct', binding: slot.direct });
    if (slot.extendedFunction) {
      bindings.push({ commandId, source: 'extended-function', binding: slot.extendedFunction });
    }
  }

  for (const [presetId, slot] of Object.entries(mappingState.kudoPresetBindings)) {
    const commandId = `trigger-kudo-${presetId}`;
    if (slot.direct) bindings.push({ commandId, source: 'direct', binding: slot.direct });
    if (slot.extendedFunction) {
      bindings.push({ commandId, source: 'extended-function', binding: slot.extendedFunction });
    }
  }

  for (const reservedKey of mappingState.reservedKudoKeys) {
    const presetId = mappingState.kudoPresetByReservedKey[reservedKey];
    if (!presetId) continue;
    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed) continue;
    if (parsed.source === 'direct' || parsed.source === 'extended-function') {
      bindings.push({
        commandId: `trigger-kudo-${presetId}`,
        source: parsed.source,
        binding: parsed.binding,
      });
    }
  }

  const failures = [];

  for (const row of bindings) {
    const accelerator =
      row.source === 'extended-function'
        ? extendedBindingToElectronAccelerator(row.binding)
        : logicalBindingToElectronAccelerator(row.binding);

    if (acceleratorToBinding.has(accelerator)) {
      failures.push({ accelerator, reason: 'duplicate-accelerator' });
      continue;
    }

    let ok = false;
    try {
      ok = globalShortcut.register(accelerator, () => {
        handleDirectOrExtended(row.source, row.binding);
      });
    } catch (error) {
      failures.push({ accelerator, commandId: row.commandId, reason: 'binding-unregistered' });
      logger.warn('Command shortcut registration threw', {
        accelerator,
        commandId: row.commandId,
        error: String(error),
      });
      continue;
    }

    if (ok) {
      registeredAccelerators.push(accelerator);
      acceleratorToBinding.set(accelerator, row);
    } else {
      failures.push({ accelerator, commandId: row.commandId, reason: 'binding-unregistered' });
      logger.warn('Command shortcut registration failed', { accelerator, commandId: row.commandId });
    }
  }

  broadcast('commands:registration-status', { failures, registered: registeredAccelerators.length });
}

function setVcModeActive(active) {
  vcModeActive = Boolean(active);
  if (!vcModeActive) {
    runtimeContext = { ...runtimeContext, vcModeActive: false };
    broadcast('commands:runtime-context', runtimeContext);
    closeGate('vc-inactive');
    registerActiveShortcuts();
    return;
  }
  runtimeContext = { ...runtimeContext, vcModeActive: true };
  broadcast('commands:runtime-context', runtimeContext);
  registerActiveShortcuts();
}

function normalizeGateKeyInput(input) {
  if (typeof input === 'string') {
    return { type: 'keyDown', key: input };
  }
  return {
    type: input.type ?? 'keyDown',
    key: input.key,
    alt: input.alt,
    meta: input.meta,
    control: input.control,
    shift: input.shift,
  };
}

function handleGatedKey(input) {
  if (gateOpen && Date.now() - gateOpenedAt < GATE_INPUT_GRACE_MS) {
    return { ok: false, reason: 'gate-grace' };
  }

  const evaluation = evaluateGateKey(mappingState, gateOpen, normalizeGateKeyInput(input));
  if (evaluation.action === 'ignore') return { ok: false, reason: 'gate-closed' };

  if (evaluation.action === 'abort') {
    closeGate('gate-abort');
    return { ok: true, reason: 'gate-abort' };
  }

  if (evaluation.action === 'unmapped') {
    closeGate('unmapped-gated-key');
    broadcast('commands:gate-event', { type: 'unmapped', key: evaluation.key });
    return { ok: false, reason: 'unmapped-gated-key' };
  }

  if (evaluation.action === 'kudo-unassigned') {
    closeGate('kudo-unassigned');
    broadcast('commands:gate-event', { type: 'kudo-unassigned', key: evaluation.key });
    return { ok: false, reason: 'kudo-unassigned' };
  }

  if (!isCommandAvailableForDispatch(evaluation.commandId, runtimeContext)) {
    closeGate('unavailable');
    broadcast('commands:gate-event', { type: 'unavailable', commandId: evaluation.commandId });
    broadcastUnavailable(evaluation.commandId, 'gated', evaluation.binding);
    return { ok: false, reason: 'unavailable' };
  }

  closeGate('executed');
  dispatchCommand({
    commandId: evaluation.commandId,
    source: 'gated',
    binding: evaluation.binding,
  });
  return { ok: true, reason: 'executed' };
}

function initCommandService() {
  loadMappingState();
  // Seed SQLite on first run so later saves merge against a stored baseline.
  if (database.getSetting(COMMAND_MAPPINGS_SETTINGS_KEY) == null) {
    try {
      database.setSetting(COMMAND_MAPPINGS_SETTINGS_KEY, mappingState);
      logger.debug('Seeded default command mappings', { key: COMMAND_MAPPINGS_SETTINGS_KEY });
    } catch (error) {
      logger.warn('Could not seed default command mappings', { error: String(error) });
    }
  }
}

module.exports = {
  initCommandService,
  loadMappingState,
  saveMappingState,
  getMappingState,
  getRuntimeContext,
  setRuntimeContext,
  setWindowRefs,
  setVcModeActive,
  registerActiveShortcuts,
  unregisterAllShortcuts,
  dispatchCommand,
  handleGatedKey,
  openGate,
  closeGate,
  toggleGate,
  isGateOpen: () => gateOpen,
  broadcastMappingState,
  broadcastGateState,
};
