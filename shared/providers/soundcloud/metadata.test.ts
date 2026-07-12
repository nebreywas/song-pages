import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseTrackIdFromOEmbedHtml, isSoundcloudTrackOEmbed } from './metadata.ts';

describe('soundcloud metadata', () => {
  it('parses track id when oEmbed iframe src uses URL-encoded slashes', () => {
    const html =
      '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F2154619488&show_artwork=true"></iframe>';
    assert.equal(parseTrackIdFromOEmbedHtml(html), '2154619488');
    assert.equal(isSoundcloudTrackOEmbed(html), true);
  });

  it('parses track id with literal slashes', () => {
    const html =
      '<iframe src="https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/293"></iframe>';
    assert.equal(parseTrackIdFromOEmbedHtml(html), '293');
  });

  it('rejects playlist oEmbed html', () => {
    const html =
      '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F18"></iframe>';
    assert.equal(parseTrackIdFromOEmbedHtml(html), null);
  });
});
