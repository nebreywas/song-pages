import assert from 'node:assert/strict';
import test from 'node:test';

import { stepExperienceId } from './experienceNavigation';

const CATALOG = ['spectrum', 'aurora', 'butterchurn:foo', 'butterchurn:bar'] as const;

test('stepExperienceId moves forward and wraps in catalog order', () => {
  assert.equal(stepExperienceId(CATALOG, 'spectrum', 1), 'aurora');
  assert.equal(stepExperienceId(CATALOG, 'butterchurn:bar', 1), 'spectrum');
});

test('stepExperienceId moves backward and wraps in catalog order', () => {
  assert.equal(stepExperienceId(CATALOG, 'aurora', -1), 'spectrum');
  assert.equal(stepExperienceId(CATALOG, 'spectrum', -1), 'butterchurn:bar');
});

test('stepExperienceId starts from first entry when current id is unknown', () => {
  assert.equal(stepExperienceId(CATALOG, 'missing', 1), 'aurora');
  assert.equal(stepExperienceId(CATALOG, 'missing', -1), 'butterchurn:bar');
});
