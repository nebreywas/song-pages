/**
 * Creation date / BPM input sanitizers for Artist 2 Song Overview.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BPM_MAX,
  sanitizeBpmInput,
  sanitizeCreationDateInput,
  todayDdMmYyyy,
  todayMmDdYyyy,
} from './creationDateInput.ts';

describe('sanitizeCreationDateInput', () => {
  it('allows digits and slashes only', () => {
    assert.equal(sanitizeCreationDateInput('16/07/2025!'), '16/07/2025');
    assert.equal(sanitizeCreationDateInput('abc2025'), '2025');
  });

  it('supports year-only and partial forms', () => {
    assert.equal(sanitizeCreationDateInput('2025'), '2025');
    assert.equal(sanitizeCreationDateInput('07/2025'), '07/2025');
    assert.equal(sanitizeCreationDateInput('16/07/2025'), '16/07/2025');
  });

  it('clamps segment lengths', () => {
    assert.equal(sanitizeCreationDateInput('9999'), '9999');
    assert.equal(sanitizeCreationDateInput('12345'), '1234');
    assert.equal(sanitizeCreationDateInput('16/07/20256'), '16/07/2025');
  });
});

describe('sanitizeBpmInput', () => {
  it('accepts 0–1999 and strips non-digits', () => {
    assert.equal(sanitizeBpmInput(''), null);
    assert.equal(sanitizeBpmInput('120'), 120);
    assert.equal(sanitizeBpmInput('1015'), 1015);
    assert.equal(sanitizeBpmInput('1999'), 1999);
    assert.equal(sanitizeBpmInput('2000'), BPM_MAX);
    assert.equal(sanitizeBpmInput('12a0'), 120);
  });
});

describe('todayDdMmYyyy', () => {
  it('formats a fixed date', () => {
    assert.equal(todayDdMmYyyy(new Date(2025, 6, 16)), '16/07/2025');
  });
});

describe('todayMmDdYyyy', () => {
  it('formats a fixed date US style', () => {
    assert.equal(todayMmDdYyyy(new Date(2025, 6, 16)), '07/16/2025');
  });
});
