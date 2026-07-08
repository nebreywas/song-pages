import assert from 'node:assert/strict';
import { test } from 'node:test';

import { logicalBindingToElectronAccelerator } from './accelerators';

test('logicalBindingToElectronAccelerator uses literal = and - for ALARE chords', () => {
  assert.equal(logicalBindingToElectronAccelerator('OCAW+-', 'darwin'), 'Alt+Command+-');
  assert.equal(logicalBindingToElectronAccelerator('OCAW+=', 'darwin'), 'Alt+Command+=');
});

test('logicalBindingToElectronAccelerator maps OCAW letters on macOS', () => {
  assert.equal(logicalBindingToElectronAccelerator('OCAW+g', 'darwin'), 'Alt+Command+G');
});
