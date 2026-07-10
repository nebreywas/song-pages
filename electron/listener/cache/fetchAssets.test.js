const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  extractHtmlAssetReferences,
  isSameDocumentUrl,
  rewriteHtmlForCache,
} = require('./fetchAssets');

const PAGE_URL =
  'https://nebreywas.github.io/sawyerhousegenres/songs/booty-circuit-ghetto-tech-genre-shot-2.html?v=20260702T142110Z-a7be5e1';

test('extractHtmlAssetReferences keeps literal relative attribute values', () => {
  const html = `
    <link rel="canonical" href="${PAGE_URL}" />
    <script src="../js/site-app-mode.js?v=20260702T142110Z-a7be5e1"></script>
    <img src="booty-circuit-ghetto-tech-genre-shot-2/cover.jpg?v=20260702T142110Z-a7be5e1" />
  `;
  const refs = extractHtmlAssetReferences(html, PAGE_URL);
  const scriptRef = refs.find((entry) => entry.reference.includes('site-app-mode.js'));
  assert.ok(scriptRef);
  assert.equal(scriptRef.reference, '../js/site-app-mode.js?v=20260702T142110Z-a7be5e1');
  assert.equal(
    scriptRef.resolvedUrl,
    'https://nebreywas.github.io/sawyerhousegenres/js/site-app-mode.js?v=20260702T142110Z-a7be5e1',
  );
});

test('isSameDocumentUrl matches canonical self references without query/hash drift', () => {
  assert.equal(
    isSameDocumentUrl(
      'https://nebreywas.github.io/sawyerhousegenres/songs/booty-circuit-ghetto-tech-genre-shot-2.html',
      PAGE_URL,
    ),
    true,
  );
});

test('rewriteHtmlForCache rewrites relative src/href/data-cover-src references', () => {
  const html = `
    <script src="../js/site-app-mode.js?v=1"></script>
    <link rel="stylesheet" href="../css/site.css?v=1" />
    <img src="booty-circuit/cover.jpg?v=1" data-cover-src="booty-circuit/cover.jpg?v=1" />
  `;
  const remoteToLocal = new Map([
    [
      'https://nebreywas.github.io/sawyerhousegenres/js/site-app-mode.js?v=1',
      'asset-001.js',
    ],
    ['https://nebreywas.github.io/sawyerhousegenres/css/site.css?v=1', 'asset-002.css'],
    [
      'https://nebreywas.github.io/sawyerhousegenres/songs/booty-circuit/cover.jpg?v=1',
      'asset-003.jpg',
    ],
  ]);
  const htmlReferences = new Map([
    [
      'https://nebreywas.github.io/sawyerhousegenres/js/site-app-mode.js?v=1',
      new Set(['../js/site-app-mode.js?v=1']),
    ],
    [
      'https://nebreywas.github.io/sawyerhousegenres/css/site.css?v=1',
      new Set(['../css/site.css?v=1']),
    ],
    [
      'https://nebreywas.github.io/sawyerhousegenres/songs/booty-circuit/cover.jpg?v=1',
      new Set(['booty-circuit/cover.jpg?v=1']),
    ],
  ]);

  const output = rewriteHtmlForCache(
    html,
    'https://nebreywas.github.io/sawyerhousegenres/songs/booty-circuit.html?v=1',
    'cache123',
    remoteToLocal,
    htmlReferences,
  );

  assert.match(output, /songpages-cache:\/\/entry\/cache123\/asset-001\.js/);
  assert.match(output, /songpages-cache:\/\/entry\/cache123\/asset-002\.css/);
  assert.match(output, /songpages-cache:\/\/entry\/cache123\/asset-003\.jpg/);
  assert.doesNotMatch(output, /\.\.\/js\/site-app-mode\.js/);
  assert.doesNotMatch(output, /booty-circuit\/cover\.jpg/);
});
