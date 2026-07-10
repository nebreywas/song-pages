import { MODIFIER_CS, MODIFIER_OCAW } from './constants';
import { resolveBindingToCommand } from './resolve';
import type { CommandMappingState } from './types';

export type GateCloseReason =
  | 'executed'
  | 'gate-abort'
  | 'gate-timeout'
  | 'unmapped-gated-key'
  | 'kudo-unassigned'
  | 'unavailable'
  | 'vc-inactive'
  | 'controller-closed';

export type GateKeyInput = {
  type: string;
  key: string;
  alt?: boolean;
  meta?: boolean;
  control?: boolean;
  shift?: boolean;
};

export type GateKeyEvaluation =
  | { action: 'ignore' }
  | { action: 'abort' }
  | { action: 'dispatch'; commandId: string; binding: string }
  | { action: 'unmapped'; key: string }
  | { action: 'kudo-unassigned'; key: string };

const IGNORED_GATE_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Dead', 'CapsLock', 'Tab']);

/** True when modifiers match a Safe Direct family (handled by globalShortcut). */
export function isSafeDirectModifierChord(input: GateKeyInput): boolean {
  const ocaw = Boolean(input.alt && input.meta);
  const cs = Boolean(input.control && input.shift);
  return ocaw || cs;
}

function chordLetterKey(key: string): string {
  if (key === '=' || key === '-' || key === '[' || key === ']' || key === ';' || key === "'") {
    return key;
  }
  return key.length === 1 ? key.toLowerCase() : key;
}

/** Build logical Safe Direct binding from a modifier chord, if any. */
export function logicalBindingFromChordInput(input: GateKeyInput): string | null {
  if (!isSafeDirectModifierChord(input)) return null;
  const letter = chordLetterKey(input.key);
  if (input.alt && input.meta) return `${MODIFIER_OCAW}+${letter}`;
  if (input.control && input.shift) return `${MODIFIER_CS}+${letter}`;
  return null;
}

/** Whether a key press should be captured for one-shot gate evaluation. */
export function shouldCaptureGateKey(key: string): boolean {
  if (key === 'Escape') return true;
  if (IGNORED_GATE_KEYS.has(key)) return false;
  return true;
}

function evaluateGatedLetter(
  state: CommandMappingState,
  key: string,
): GateKeyEvaluation {
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

/** Decide how an input event is handled while the gate is armed. */
export function evaluateGateKey(
  state: CommandMappingState,
  gateOpen: boolean,
  input: GateKeyInput,
): GateKeyEvaluation {
  if (!gateOpen || input.type !== 'keyDown') return { action: 'ignore' };

  const logicalChord = logicalBindingFromChordInput(input);
  if (logicalChord && resolveBindingToCommand(state, 'direct', logicalChord)) {
    // Registered Safe Direct chords stay with globalShortcut (including gate toggle).
    return { action: 'ignore' };
  }

  if (logicalChord) {
    // Hosts often still hold ⌥⌘ after opening the gate — evaluate the letter as gated.
    return evaluateGatedLetter(state, chordLetterKey(input.key));
  }

  return evaluateGatedLetter(state, input.key);
}
