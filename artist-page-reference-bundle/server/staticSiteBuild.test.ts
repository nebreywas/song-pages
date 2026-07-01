import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendBuildVersionToLocalUrl,
  finalizeStaticHtml,
  isLocalStaticAssetUrl,
  versionHlsManifestContent,
} from "./staticSiteBuild.js";

const BUILD = "20260628T204513Z-abc1234";

test("isLocalStaticAssetUrl rejects external URLs", () => {
  assert.equal(isLocalStaticAssetUrl("https://open.spotify.com/track/1"), false);
  assert.equal(isLocalStaticAssetUrl("//cdn.example.com/app.js"), false);
  assert.equal(isLocalStaticAssetUrl("./css/site.css"), true);
});

test("appendBuildVersionToLocalUrl adds v query param", () => {
  assert.equal(
    appendBuildVersionToLocalUrl("./css/site.css", BUILD),
    `./css/site.css?v=${BUILD}`,
  );
  assert.equal(
    appendBuildVersionToLocalUrl("../js/site-player.js?foo=1", BUILD),
    `../js/site-player.js?foo=1&v=${BUILD}`,
  );
  assert.equal(
    appendBuildVersionToLocalUrl("https://youtube.com/watch?v=abc", BUILD),
    "https://youtube.com/watch?v=abc",
  );
});

test("finalizeStaticHtml injects meta and versions local assets", () => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="./css/site.css" />
  </head>
  <body>
    <img src="songs/demo/cover.jpg" alt="" />
    <a href="https://instagram.com/artist">IG</a>
    <script type="application/json" id="site-playlist">[{"title":"A","manifest":"songs/demo/manifest.m3u8","page":"songs/demo.html"}]</script>
    <script src="./js/site-player.js"></script>
  </body>
</html>`;

  const out = finalizeStaticHtml(html, BUILD);

  assert.match(out, /<meta name="build-version" content="20260628T204513Z-abc1234"/);
  assert.match(out, new RegExp(`href="./css/site.css\\?v=${BUILD}"`));
  assert.match(out, new RegExp(`src="songs/demo/cover.jpg\\?v=${BUILD}"`));
  assert.match(out, /href="https:\/\/instagram.com\/artist"/);
  assert.match(out, new RegExp(`manifest":"songs/demo/manifest.m3u8\\?v=${BUILD}"`));
  assert.match(out, new RegExp(`src="./js/site-player.js\\?v=${BUILD}"`));
});

test("versionHlsManifestContent versions segment lines only", () => {
  const raw = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:4.0,
seg_000.ts
seg_001.ts`;

  const out = versionHlsManifestContent(raw, BUILD);
  assert.match(out, new RegExp(`seg_000.ts\\?v=${BUILD}`));
  assert.match(out, /^#EXTM3U/m);
});
