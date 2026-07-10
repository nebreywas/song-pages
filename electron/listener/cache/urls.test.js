const assert = require('node:assert/strict');
const { test } = require('node:test');

const { parseCacheAssetUrl } = require('./urls');

test('parseCacheAssetUrl ignores query params on cached page URLs', () => {
  const parsed = parseCacheAssetUrl(
    'songpages-cache://entry/b5c94b69/page.html?songpagesApp=1',
  );
  assert.ok(parsed);
  assert.equal(parsed.cacheId, 'b5c94b69');
  assert.equal(parsed.filename, 'page.html');
});
