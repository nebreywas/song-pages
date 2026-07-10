const assert = require('node:assert/strict');
const { test } = require('node:test');

const { pageUrlResourceIdentity } = require('./librarySongLookup');

test('playlist duplicate detection uses pathname identity', () => {
  const a = pageUrlResourceIdentity(
    'https://artist.example/songs/foo.html?v=20260630T003612Z-e0980',
  );
  const b = pageUrlResourceIdentity(
    'https://artist.example/songs/foo.html?v=20260702T142110Z-a7be5e1',
  );
  assert.equal(a, b);
});
