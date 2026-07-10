const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  pageUrlResourceIdentity,
  resolveCatalogSourceArtistId,
} = require('./librarySongLookup');

test('pageUrlResourceIdentity ignores cache-bust query params', () => {
  const a = pageUrlResourceIdentity(
    'https://artist.example/songs/foo.html?v=20260630T003612Z-e0980',
  );
  const b = pageUrlResourceIdentity(
    'https://artist.example/songs/foo.html?v=20260702T142110Z-a7be5e1',
  );
  assert.equal(a, b);
});

test('resolveCatalogSourceArtistId ignores virtual playlist sidebar ids', () => {
  assert.equal(
    resolveCatalogSourceArtistId({ artist_id: -10002, source_artist_id: null }),
    null,
  );
  assert.equal(
    resolveCatalogSourceArtistId({ artist_id: -10002, source_artist_id: 9 }),
    9,
  );
  assert.equal(resolveCatalogSourceArtistId({ artist_id: 9 }), 9);
});
