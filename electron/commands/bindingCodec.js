/**
 * Logical binding → Electron accelerator (main process).
 * Keep in sync with shared/commands/accelerators.ts
 */
const MODIFIER_OCAW = 'OCAW';
const MODIFIER_CS = 'CS';

function parseLogicalBinding(binding) {
  const parts = binding.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { modifiers: [], key: '' };
  const key = parts[parts.length - 1];
  return { modifiers: parts.slice(0, -1), key };
}

function modifierToElectron(modifier, platform) {
  if (modifier === MODIFIER_OCAW) {
    return platform === 'darwin' ? 'Alt+Command' : 'Alt+Super';
  }
  if (modifier === MODIFIER_CS) return 'Control+Shift';
  return null;
}

function logicalBindingToElectronAccelerator(binding, platform = process.platform) {
  const { modifiers, key } = parseLogicalBinding(binding);
  const electronModifiers = modifiers
    .map((modifier) => modifierToElectron(modifier, platform))
    .filter(Boolean);

  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(key)) {
    return [...electronModifiers, key.toUpperCase()].join('+');
  }

  const normalizedKey =
    key === '=' || key === '-'
      ? key
      : key.length === 1
        ? key.toUpperCase()
        : key;

  return [...electronModifiers, normalizedKey].join('+');
}

const LEGACY_ACTION_BY_COMMAND = {
  'toggle-cover': 'cover',
  'toggle-host': 'host',
  'toggle-next-overlay': 'next',
  'toggle-remaining': 'remaining',
  'toggle-song-info': 'songInfo',
  'toggle-upcoming': 'upcoming',
  'toggle-layout-mode': 'layoutMode',
  'toggle-debug-outlines': 'debugOutlines',
  'alare-speed-up': 'alareSpeedUp',
  'alare-speed-down': 'alareSpeedDown',
  'alare-speed-reset': 'alareSpeedReset',
};

function createDefaultMappingState() {
  const O = MODIFIER_OCAW;
  const configuredCommandIds = [
    'toggle-cover',
    'toggle-host',
    'toggle-next-overlay',
    'toggle-remaining',
    'toggle-song-info',
    'toggle-upcoming',
    'toggle-layout-mode',
    'toggle-debug-outlines',
    'alare-speed-up',
    'alare-speed-down',
    'alare-speed-reset',
    'toggle-vc-command-gate',
  ];
  return {
    version: 2,
    gateTimeoutMs: 8000,
    configuredCommandIds,
    configuredKudoPresetIds: [],
    commands: {
      'toggle-cover': { direct: `${O}+c` },
      'toggle-host': { direct: `${O}+f` },
      'toggle-next-overlay': { direct: `${O}+n` },
      'toggle-remaining': { direct: `${O}+r` },
      'toggle-song-info': { direct: `${O}+s` },
      'toggle-upcoming': { direct: `${O}+u` },
      'toggle-layout-mode': { direct: `${O}+l` },
      'toggle-debug-outlines': { direct: `${O}+d` },
      'alare-speed-up': { direct: `${O}+=` },
      'alare-speed-down': { direct: `${O}+-` },
      'alare-speed-reset': { direct: `${O}+0` },
      'toggle-vc-command-gate': { direct: `${O}+g` },
    },
    reservedKudoKeys: [],
    kudoPresetByReservedKey: {},
    kudoPresetBindings: {},
  };
}

const RESERVE_KUDO_SLOT_PREFIX = 'reserve-kudo-slot:';

function isReserveKudoSlotCommandId(commandId) {
  return commandId.startsWith(RESERVE_KUDO_SLOT_PREFIX) && commandId.length > RESERVE_KUDO_SLOT_PREFIX.length;
}

function reservedBindingKey(source, binding) {
  const normalized =
    source === 'gated'
      ? binding.toLowerCase()
      : source === 'extended-function'
        ? binding.toUpperCase()
        : binding;
  return `${source}:${normalized}`;
}

function syncReservedKudoKeysFromSlots(state) {
  const reservedKudoKeys = [];

  for (const commandId of state.configuredCommandIds) {
    if (!isReserveKudoSlotCommandId(commandId)) continue;
    const slot = state.commands[commandId];
    if (!slot) continue;
    if (slot.direct) reservedKudoKeys.push(reservedBindingKey('direct', slot.direct));
    if (slot.gated) reservedKudoKeys.push(reservedBindingKey('gated', slot.gated));
    if (slot.extendedFunction) {
      reservedKudoKeys.push(reservedBindingKey('extended-function', slot.extendedFunction));
    }
  }

  const kudoPresetByReservedKey = {};
  for (const key of reservedKudoKeys) {
    const presetId = state.kudoPresetByReservedKey[key];
    if (presetId) kudoPresetByReservedKey[key] = presetId;
  }

  return { ...state, reservedKudoKeys, kudoPresetByReservedKey };
}

function createReserveKudoSlotCommandId() {
  return `${RESERVE_KUDO_SLOT_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function bindingFieldForReservedSource(source) {
  if (source === 'direct') return 'direct';
  if (source === 'gated') return 'gated';
  return 'extendedFunction';
}

function migrateOrphanReservedKeysToSlots(state) {
  let next = syncReservedKudoKeysFromSlots(state);
  const keysFromSlots = new Set(next.reservedKudoKeys);

  for (const reservedKey of state.reservedKudoKeys) {
    if (keysFromSlots.has(reservedKey)) continue;

    const parsed = parseReservedBindingKey(reservedKey);
    if (!parsed) continue;

    const slotId = createReserveKudoSlotCommandId();
    const field = bindingFieldForReservedSource(parsed.source);
    const slot = { [field]: parsed.binding };

    next = {
      ...next,
      configuredCommandIds: [...next.configuredCommandIds, slotId],
      commands: { ...next.commands, [slotId]: slot },
    };
    keysFromSlots.add(reservedKey);
  }

  return syncReservedKudoKeysFromSlots(next);
}

function normalizeUniqueBindings(state) {
  const seen = new Map();
  const commands = { ...state.commands };

  for (const [commandId, slot] of Object.entries(commands)) {
    if (!slot) continue;
    for (const field of ['direct', 'gated', 'extendedFunction']) {
      const binding = slot[field];
      if (!binding) continue;
      const source =
        field === 'direct' ? 'direct' : field === 'gated' ? 'gated' : 'extended-function';
      const key = `${source}:${field === 'gated' ? binding.toLowerCase() : field === 'extendedFunction' ? binding.toUpperCase() : binding}`;
      const owner = seen.get(key);
      if (owner && owner !== commandId) {
        delete slot[field];
      } else {
        seen.set(key, commandId);
      }
    }
  }

  return { ...state, commands };
}

function inferLegacyConfiguredCommandIds(rawCommands, factoryCommandIds) {
  const ids = new Set(factoryCommandIds);
  if (rawCommands) {
    for (const commandId of Object.keys(rawCommands)) ids.add(commandId);
  }
  return [...ids];
}

function parseReservedBindingKey(key) {
  const match = /^(gated|direct|extended-function):(.+)$/.exec(key);
  if (!match) return null;
  return { source: match[1], binding: match[2] };
}

function sanitizeBindingSlot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const slot = {};
  if (typeof raw.direct === 'string' && raw.direct.trim()) slot.direct = raw.direct.trim();
  if (typeof raw.gated === 'string' && raw.gated.trim()) slot.gated = raw.gated.trim().toLowerCase();
  if (typeof raw.extendedFunction === 'string' && raw.extendedFunction.trim()) {
    slot.extendedFunction = raw.extendedFunction.trim().toUpperCase();
  }
  return Object.keys(slot).length > 0 ? slot : null;
}

function migrateMappingState(raw) {
  const defaults = createDefaultMappingState();
  if (!raw || typeof raw !== 'object') return defaults;

  const rawCommands = raw.commands && typeof raw.commands === 'object' ? raw.commands : undefined;
  const configuredCommandIds = Array.isArray(raw.configuredCommandIds)
    ? raw.configuredCommandIds.filter((id) => typeof id === 'string')
    : inferLegacyConfiguredCommandIds(rawCommands, defaults.configuredCommandIds);

  const kudoPresetBindings = {};
  if (raw.kudoPresetBindings && typeof raw.kudoPresetBindings === 'object') {
    for (const [presetId, value] of Object.entries(raw.kudoPresetBindings)) {
      const sanitized = sanitizeBindingSlot(value);
      if (!sanitized) continue;
      kudoPresetBindings[presetId] = { ...kudoPresetBindings[presetId], ...sanitized };
    }
  }

  const configuredKudoPresetIds = Array.isArray(raw.configuredKudoPresetIds)
    ? raw.configuredKudoPresetIds.filter((id) => typeof id === 'string')
    : Object.keys(kudoPresetBindings);

  const commands = {};
  for (const commandId of configuredCommandIds) {
    const fromRaw = rawCommands ? sanitizeBindingSlot(rawCommands[commandId]) : null;
    const fromFactory = defaults.commands[commandId];
    commands[commandId] = { ...fromFactory, ...fromRaw };
  }

  const migrated = {
    version: 2,
    gateTimeoutMs:
      typeof raw.gateTimeoutMs === 'number' && raw.gateTimeoutMs >= 1000
        ? raw.gateTimeoutMs === 3000
          ? defaults.gateTimeoutMs
          : raw.gateTimeoutMs
        : defaults.gateTimeoutMs,
    configuredCommandIds,
    configuredKudoPresetIds,
    commands,
    reservedKudoKeys: Array.isArray(raw.reservedKudoKeys) ? raw.reservedKudoKeys : [],
    kudoPresetByReservedKey:
      raw.kudoPresetByReservedKey && typeof raw.kudoPresetByReservedKey === 'object'
        ? raw.kudoPresetByReservedKey
        : {},
    kudoPresetBindings,
  };

  const synced = syncReservedKudoKeysFromSlots(migrated);
  const withReserveSlots = migrateOrphanReservedKeysToSlots(synced);
  return normalizeUniqueBindings(withReserveSlots);
}

function resolveBindingToCommand(state, source, binding) {
  const normalizedBinding =
    source === 'gated'
      ? binding.toLowerCase()
      : source === 'extended-function'
        ? binding.toUpperCase()
        : binding;

  for (const [commandId, slot] of Object.entries(state.commands)) {
    if (isReserveKudoSlotCommandId(commandId)) continue;
    if (source === 'direct' && slot.direct?.toLowerCase() === normalizedBinding.toLowerCase()) {
      return { commandId, source, binding: slot.direct };
    }
    if (source === 'gated' && slot.gated?.toLowerCase() === normalizedBinding) {
      return { commandId, source, binding: slot.gated };
    }
    if (source === 'extended-function' && slot.extendedFunction === normalizedBinding) {
      return { commandId, source, binding: slot.extendedFunction };
    }
  }

  const reservedKey = `${source}:${normalizedBinding}`;
  if (state.reservedKudoKeys.includes(reservedKey)) {
    const presetId = state.kudoPresetByReservedKey[reservedKey];
    if (presetId) return { commandId: `trigger-kudo-${presetId}`, source, binding: normalizedBinding };
  }

  for (const [presetId, slot] of Object.entries(state.kudoPresetBindings)) {
    if (source === 'direct' && slot.direct?.toLowerCase() === normalizedBinding.toLowerCase()) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.direct };
    }
    if (source === 'gated' && slot.gated?.toLowerCase() === normalizedBinding) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.gated };
    }
    if (source === 'extended-function' && slot.extendedFunction === normalizedBinding) {
      return { commandId: `trigger-kudo-${presetId}`, source, binding: slot.extendedFunction };
    }
  }

  return null;
}

module.exports = {
  COMMAND_MAPPINGS_SETTINGS_KEY: 'commands.mappings',
  LEGACY_ACTION_BY_COMMAND,
  createDefaultMappingState,
  logicalBindingToElectronAccelerator,
  migrateMappingState,
  parseReservedBindingKey,
  resolveBindingToCommand,
};
