import assert from 'node:assert/strict';
import test from 'node:test';

import {
  absoluteSiteAssetUrl,
  buildShareDescription,
  buildShareTitle,
  buildSongShareMetaHtml,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from './songShareMeta';

test('absoluteSiteAssetUrl joins deploy root and relative paths', () => {
  assert.equal(
    absoluteSiteAssetUrl('https://example.com/artist', 'songs/demo.html'),
    'https://example.com/artist/songs/demo.html',
  );
});

test('buildShareTitle includes caption in parentheses', () => {
  assert.equal(buildShareTitle('Plastic Halo', 'Vapor Trap genre - shot 1'), 'Plastic Halo (Vapor Trap genre - shot 1)');
  assert.equal(buildShareTitle('Plastic Halo', ''), 'Plastic Halo');
});

test('buildSongShareMetaHtml emits absolute Open Graph and Twitter tags', () => {
  const html = buildSongShareMetaHtml({
    siteRoot: 'https://nebreywas.github.io/sawyerhousegenres',
    songSlug: 'plastic-halo',
    songTitle: 'Plastic Halo',
    artistName: 'SawyerHouse Genres',
    caption: 'Vapor Trap genre - untouched pure AI',
    shareImagePath: 'songs/plastic-halo/share-card.jpg',
    shareImageWidth: SHARE_CARD_WIDTH,
    shareImageHeight: SHARE_CARD_HEIGHT,
  });

  assert.match(html, /property="og:type" content="music\.song"/);
  assert.match(html, /property="og:title" content="Plastic Halo \(Vapor Trap genre - untouched pure AI\)"/);
  assert.match(
    html,
    /property="og:url" content="https:\/\/nebreywas\.github\.io\/sawyerhousegenres\/songs\/plastic-halo\.html"/,
  );
  assert.match(
    html,
    /property="og:image" content="https:\/\/nebreywas\.github\.io\/sawyerhousegenres\/songs\/plastic-halo\/share-card\.jpg"/,
  );
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical"/);
});

test('buildShareDescription prefers caption', () => {
  assert.equal(buildShareDescription('Pure AI', 'Plastic Halo', 'Artist'), 'Pure AI');
  assert.equal(buildShareDescription('', 'Plastic Halo', 'Artist'), 'Plastic Halo — Artist');
});
