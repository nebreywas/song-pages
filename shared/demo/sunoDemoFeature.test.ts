import assert from 'node:assert/strict';
import test from 'node:test';

import { isSunoDemoSong, sunoShareUrlFromClipUuid } from './sunoDemoFeature';

test('sunoShareUrlFromClipUuid builds canonical suno.com song links', () => {
  assert.equal(
    sunoShareUrlFromClipUuid('173e6315-42fd-4ddb-b2bf-b3645aed2f86'),
    'https://suno.com/song/173e6315-42fd-4ddb-b2bf-b3645aed2f86',
  );
  assert.equal(sunoShareUrlFromClipUuid('not-a-uuid'), null);
});

test('isSunoDemoSong matches demo playback scope', () => {
  assert.equal(isSunoDemoSong({ id: 1, playback_scope: 'suno-demo' }), true);
});
