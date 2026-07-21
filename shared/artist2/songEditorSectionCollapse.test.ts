import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizeSongSectionCollapseStore,
  setSongSectionCollapsed,
  songSectionIsCollapsed,
} from './songEditorSectionCollapse.ts';

test('normalizeSongSectionCollapseStore drops junk and keeps booleans', () => {
  const store = normalizeSongSectionCollapseStore({
    songA: { musicalDetails: true, bogus: true, lyrics: 'yes' },
    '': { artwork: true },
    songB: null,
    songC: { artwork: false, creditsRights: true },
  });
  assert.deepEqual(store, {
    songA: { musicalDetails: true },
    songC: { artwork: false, creditsRights: true },
  });
});

test('setSongSectionCollapsed omits expanded flags and empty songs', () => {
  let store = setSongSectionCollapsed({}, 's1', 'lyrics', true);
  assert.equal(songSectionIsCollapsed(store.s1, 'lyrics'), true);
  store = setSongSectionCollapsed(store, 's1', 'lyrics', false);
  assert.deepEqual(store, {});
});
