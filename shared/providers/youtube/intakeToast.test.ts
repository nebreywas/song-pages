import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildYoutubeIntakeToastMessage } from './intakeToast.ts';

test('buildYoutubeIntakeToastMessage returns null when nothing meaningful was stripped', () => {
  assert.equal(buildYoutubeIntakeToastMessage({ queryParams: {}, notes: [] }), null);
  assert.equal(
    buildYoutubeIntakeToastMessage({ queryParams: { utm_source: 'x' }, notes: ['tracking'] }),
    null,
  );
});

test('buildYoutubeIntakeToastMessage describes playlist and timestamp stripping', () => {
  const message = buildYoutubeIntakeToastMessage({
    queryParams: { list: 'RDabc', t: '42' },
    notes: [],
  });
  assert.equal(
    message,
    'Added as a single video — playlist link and start time from the URL were ignored.',
  );
});

test('buildYoutubeIntakeToastMessage describes radio stripping', () => {
  const message = buildYoutubeIntakeToastMessage({
    queryParams: { start_radio: '1' },
    notes: [],
  });
  assert.equal(message, 'Added as a single video — radio / mix from the URL was ignored.');
});
