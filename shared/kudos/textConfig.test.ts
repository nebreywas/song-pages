import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanitizeTextKudoConfig } from './textConfig';

test('sanitizeTextKudoConfig enforces grapheme limit and defaults', () => {
  const config = sanitizeTextKudoConfig({
    value: 'WAY TOO LONG FOR KUDO TEXT',
    effectId: 'nope',
    fontId: 'impact',
    durationMs: 99999,
    outline: 'heavy',
    shadow: 'soft',
    placement: 'center',
  });
  assert.ok(config);
  assert.equal(config!.effectId, 'slam');
  assert.equal(config!.fontId, 'impact');
  assert.ok(config!.value.length <= 18);
  assert.equal(config!.textColor, '#ffffff');
});
