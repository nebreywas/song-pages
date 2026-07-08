/**
 * Gate key evaluation for the main process.
 * Keep in sync with shared/commands/gate.ts
 */
const { resolveBindingToCommand } = require('./bindingCodec');

const MODIFIER_OCAW = 'OCAW';
const MODIFIER_CS = 'CS';
const IGNORED_GATE_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Dead', 'CapsLock', 'Tab']);

function isSafeDirectModifierChord(input) {
  const ocaw = Boolean(input.alt && input.meta);
  const cs = Boolean(input.control && input.shift);
  return ocaw || cs;
}

function chordLetterKey(key) {
  if (key === '=' || key === '-') return key;
  return key.length === 1 ? key.toLowerCase() : key;
}

function logicalBindingFromChordInput(input) {
  if (!isSafeDirectModifierChord(input)) return null;
  const letter = chordLetterKey(input.key);
  if (input.alt && input.meta) return `${MODIFIER_OCAW}+${letter}`;
  if (input.control && input.shift) return `${MODIFIER_CS}+${letter}`;
  return null;
}

function shouldCaptureGateKey(key) {
  if (key === 'Escape') return true;
  if (IGNORED_GATE_KEYS.has(key)) return false;
  return true;
}

function evaluateGatedLetter(state, key) {
  if (!shouldCaptureGateKey(key)) return { action: 'ignore' };
  if (key === 'Escape') return { action: 'abort' };

  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
  const reservedKey = `gated:${normalizedKey}`;
  if (state.reservedKudoKeys.includes(reservedKey) && !state.kudoPresetByReservedKey[reservedKey]) {
    return { action: 'kudo-unassigned', key: normalizedKey };
  }

  const resolved = resolveBindingToCommand(state, 'gated', key);
  if (resolved) {
    return { action: 'dispatch', commandId: resolved.commandId, binding: resolved.binding };
  }

  return { action: 'unmapped', key };
}

function evaluateGateKey(state, gateOpen, input) {
  if (!gateOpen || input.type !== 'keyDown') return { action: 'ignore' };

  const logicalChord = logicalBindingFromChordInput(input);
  if (logicalChord && resolveBindingToCommand(state, 'direct', logicalChord)) {
    return { action: 'ignore' };
  }

  if (logicalChord) {
    return evaluateGatedLetter(state, chordLetterKey(input.key));
  }

  return evaluateGatedLetter(state, input.key);
}

module.exports = {
  evaluateGateKey,
  isSafeDirectModifierChord,
  logicalBindingFromChordInput,
  shouldCaptureGateKey,
};
