import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  electronAcceleratorToLogical,
  logicalBindingToElectronAccelerator,
} from './accelerators';
import { isSafeDirectBinding } from './safeHotkeys';

test('logicalBindingToElectronAccelerator uses literal = and - for ALARE chords', () => {
  assert.equal(logicalBindingToElectronAccelerator('OCAW+-', 'darwin'), 'Alt+Command+-');
  assert.equal(logicalBindingToElectronAccelerator('OCAW+=', 'darwin'), 'Alt+Command+=');
});

test('logicalBindingToElectronAccelerator maps OCAW letters on macOS', () => {
  assert.equal(logicalBindingToElectronAccelerator('OCAW+g', 'darwin'), 'Alt+Command+G');
});

test('logicalBindingToElectronAccelerator maps OCAW punctuation on macOS and Windows', () => {
  for (const platform of ['darwin', 'win32'] as const) {
    const mod = platform === 'darwin' ? 'Alt+Command' : 'Alt+Super';
    assert.equal(logicalBindingToElectronAccelerator('OCAW+[', platform), `${mod}+[`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+]', platform), `${mod}+]`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+\\', platform), `${mod}+\\`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+,', platform), `${mod}+,`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+.', platform), `${mod}+.`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+<', platform), `${mod}+<`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+>', platform), `${mod}+>`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+/', platform), `${mod}+/`);
    assert.equal(logicalBindingToElectronAccelerator('OCAW+;', platform), `${mod}+;`);
    assert.equal(logicalBindingToElectronAccelerator("OCAW+'", platform), `${mod}+'`);
  }
});

test('electronAcceleratorToLogical round-trips OCAW punctuation', () => {
  assert.equal(electronAcceleratorToLogical('Alt+Command+[', 'darwin'), 'OCAW+[');
  assert.equal(electronAcceleratorToLogical('Alt+Super+]', 'win32'), 'OCAW+]');
  assert.equal(electronAcceleratorToLogical('Alt+Command+,', 'darwin'), 'OCAW+,');
  assert.equal(electronAcceleratorToLogical('Alt+Super+.', 'win32'), 'OCAW+.');
  assert.equal(electronAcceleratorToLogical('Alt+Command+Semicolon', 'darwin'), 'OCAW+;');
  assert.equal(electronAcceleratorToLogical("Alt+Super+'", 'win32'), "OCAW+'");
});

test('isSafeDirectBinding includes requested OCAW punctuation chords', () => {
  assert.equal(isSafeDirectBinding('OCAW+['), true);
  assert.equal(isSafeDirectBinding('OCAW+]'), true);
  assert.equal(isSafeDirectBinding('OCAW+\\'), true);
  assert.equal(isSafeDirectBinding('OCAW+-'), true);
  assert.equal(isSafeDirectBinding('OCAW+='), true);
  assert.equal(isSafeDirectBinding('OCAW+,'), true);
  assert.equal(isSafeDirectBinding('OCAW+.'), true);
  assert.equal(isSafeDirectBinding('OCAW+<'), false);
  assert.equal(isSafeDirectBinding('OCAW+>'), false);
  assert.equal(isSafeDirectBinding('OCAW+/'), true);
  assert.equal(isSafeDirectBinding('OCAW+;'), true);
  assert.equal(isSafeDirectBinding("OCAW+'"), true);
});
