import fs from "node:fs/promises";
import path from "node:path";

import { exportHlsToDirectory, probeAudioDurationSeconds, resizeImageSquareWithFfmpeg, resizeImageWithFfmpeg, resizeShareCardWithFfmpeg, type SongPlaybackConfig } from "./hlsExport";
import {
  createStaticSiteBuildInfo,
  finalizeStaticHtml,
  versionHlsManifestsInTree,
  versionLocalAssetsInJs,
  writeBuildJson,
  type StaticSiteBuildInfo,
} from "./staticSiteBuild";
import { escapeHtmlText, slugifySiteText, socialLinksHtml, streamLinksHtml } from "./staticSiteUtils";
import { ARTIST_PHOTO_MAX_EDGE } from "../src/artist/types";
import {
  buildArtistManifestJson,
  buildCatalogManifestJson,
  buildSongManifestJson,
  resolveSiteRootForCompile,
} from "./manifestEmit";
import { buildPlayerFooterHtml, playerIconPlaySvg } from "./playerIcons";
import { buildSongShareMetaHtml,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from "./songShareMeta";
import { renderMarkdownToHtml } from "../shared/markdown";

export type CompileSongManifest = {
  id: string;
  slug: string;
  title: string;
  album: string;
  year: string;
  caption: string;
  about: string;
  lyrics: string;
  links: {
    youtube: string;
    spotify: string;
    soundcloud: string;
  };
  playback: SongPlaybackConfig;
  hasAudio: boolean;
  hasCover: boolean;
  hasExtraImage: boolean;
  /** Dev-only saved disk pointer — compile reads directly, no re-upload. */
  audioLocalPath?: string | null;
  coverLocalPath?: string | null;
  extraImageLocalPath?: string | null;
};

export type CompileArtistManifest = {
  artistSlug: string;
  artistName: string;
  artistBio: string;
  /** Optional deploy URL baked into manifest siteRoot metadata. */
  deploySiteUrl?: string;
  social: {
    instagram: string;
    tiktok: string;
    youtube: string;
    spotify: string;
    soundcloud: string;
  };
  songs: CompileSongManifest[];
  hasArtistPhoto: boolean;
  artistPhotoLocalPath?: string | null;
};

export type CompileFileMap = Map<string, string>;

export type CompileArtistPageResult = {
  slug: string;
  previewUrl: string;
  outputFolder: string;
  songCount: number;
  buildVersion: string;
  generatedAt: string;
};

export type PlaylistEntry = {
  title: string;
  manifest: string;
  page: string;
};

async function copyVersionedJs(sourcePath: string, destPath: string, buildVersion: string): Promise<void> {
  const source = await fs.readFile(sourcePath, "utf8");
  await fs.writeFile(destPath, versionLocalAssetsInJs(source, buildVersion), "utf8");
}

async function loadPlayerFooterHtml(): Promise<string> {
  return buildPlayerFooterHtml();
}

function coverPlaceholderHtml(letter: string): string {
  return `<div class="song-card-thumb-placeholder">${escapeHtmlText(letter)}</div>`;
}

function songCardHtml(song: CompileSongManifest, index: number, hasCover: boolean): string {
  const slug = slugifySiteText(song.slug || song.title);
  const pagePath = `songs/${slug}.html`;
  const letter = (song.title.trim()[0] ?? "?").toUpperCase();

  const thumbInner = hasCover
    ? `<img src="songs/${escapeHtmlText(slug)}/cover.jpg" alt="" />`
    : coverPlaceholderHtml(letter);

  const caption = song.caption.trim()
    ? `<p class="caption">${escapeHtmlText(song.caption)}</p>`
    : "";

  return `<article class="song-card">
  <button type="button" class="icon-btn song-card-play" data-songpages-client-chrome data-play-index="${index}" aria-label="Play ${escapeHtmlText(song.title)}">
    ${playerIconPlaySvg()}
  </button>
  <a class="song-card-thumb" href="${escapeHtmlText(pagePath)}">${thumbInner}</a>
  <div class="song-card-body">
    <h3><a href="${escapeHtmlText(pagePath)}">${escapeHtmlText(song.title)}</a></h3>
    ${caption}
  </div>
</article>`;
}

function songCoverHeroHtml(song: CompileSongManifest, hasCover: boolean): string {
  const letter = (song.title.trim()[0] ?? "?").toUpperCase();
  const slug = slugifySiteText(song.slug || song.title);
  if (hasCover) {
    return `<button type="button" class="song-cover-wrap song-cover-btn" data-cover-src="${escapeHtmlText(slug)}/cover.jpg" data-cover-title="${escapeHtmlText(song.title)}" aria-label="View cover art">
  <img src="${escapeHtmlText(slug)}/cover.jpg" alt="${escapeHtmlText(song.title)} cover" />
</button>`;
  }
  return `<div class="song-cover-wrap"><div class="song-cover-placeholder">${escapeHtmlText(letter)}</div></div>`;
}

async function applyTemplateWithHtml(
  templatePath: string,
  textReplacements: Record<string, string>,
  htmlReplacements: Record<string, string>,
): Promise<string> {
  let html = await fs.readFile(templatePath, "utf8");
  for (const [key, value] of Object.entries(textReplacements)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtmlText(value));
  }
  for (const [key, value] of Object.entries(htmlReplacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

export function validateCompileManifest(manifest: CompileArtistManifest): string[] {
  const errors: string[] = [];

  const slug = slugifySiteText(manifest.artistSlug);
  if (!slug) errors.push("Artist site slug is required.");
  if (!manifest.artistName.trim()) errors.push("Artist name is required.");
  if (manifest.artistBio.length > 5000) errors.push("Artist bio must be 5000 characters or fewer.");

  const activeSongs = manifest.songs.filter((s) => s.hasAudio);
  if (activeSongs.length === 0) errors.push("At least one song with an MP3 is required to compile.");

  if (manifest.songs.length > 12) errors.push("Maximum 12 song slots.");

  const slugs = new Set<string>();
  for (const song of activeSongs) {
    const songSlug = slugifySiteText(song.slug || song.title);
    if (!songSlug) {
      errors.push(`Song "${song.title || song.id}" needs a title/slug.`);
      continue;
    }
    if (slugs.has(songSlug)) errors.push(`Duplicate song slug: ${songSlug}`);
    slugs.add(songSlug);

    if (!song.title.trim()) errors.push(`Song slug "${songSlug}" needs a title.`);
    if (song.caption.length > 120) errors.push(`Caption for "${songSlug}" exceeds 120 characters.`);
    if (song.about.length > 1000) errors.push(`About text for "${songSlug}" exceeds 1000 characters.`);
    if (!song.hasAudio) errors.push(`Song "${songSlug}" is missing audio on compile.`);
  }

  return errors;
}

function buildPlaylist(activeSongs: CompileSongManifest[]): PlaylistEntry[] {
  return activeSongs.map((song) => {
    const slug = slugifySiteText(song.slug || song.title);
    return {
      title: song.title,
      manifest: `songs/${slug}/manifest.m3u8`,
      page: `songs/${slug}.html`,
    };
  });
}

/**
 * Wipes artistpages/{slug}/ and rebuilds a static artist site from manifest + uploaded files.
 * Dev-only — requires ffmpeg. See docs/artist-page-editor.md.
 */
export async function compileArtistPage(options: {
  projectRoot: string;
  manifest: CompileArtistManifest;
  files: CompileFileMap;
  uploadsDir: string;
  /** Override output directory (Electron: userData or user-selected folder). */
  outputRootOverride?: string;
}): Promise<CompileArtistPageResult> {
  const { projectRoot, manifest, files, uploadsDir, outputRootOverride } = options;

  const errors = validateCompileManifest(manifest);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const slug = slugifySiteText(manifest.artistSlug);
  const outputRoot = outputRootOverride ?? path.join(projectRoot, "artistpages", slug);
  const templatesRoot = path.join(projectRoot, "artist-page-templates");
  const hlsBundlePath = path.join(projectRoot, "node_modules", "hls.js", "dist", "hls.light.min.js");

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(outputRoot, "css"), { recursive: true });
  await fs.mkdir(path.join(outputRoot, "js"), { recursive: true });
  await fs.mkdir(path.join(outputRoot, "images"), { recursive: true });
  await fs.mkdir(path.join(outputRoot, "songs"), { recursive: true });

  const buildInfo: StaticSiteBuildInfo = await createStaticSiteBuildInfo(projectRoot);
  const siteRoot = resolveSiteRootForCompile(manifest, outputRoot);

  await fs.copyFile(path.join(templatesRoot, "shared/css/site.css"), path.join(outputRoot, "css/site.css"));
  await copyVersionedJs(
    path.join(templatesRoot, "shared/js/site-player.js"),
    path.join(outputRoot, "js/site-player.js"),
    buildInfo.buildVersion,
  );
  await copyVersionedJs(
    path.join(templatesRoot, "shared/js/site-cover-modal.js"),
    path.join(outputRoot, "js/site-cover-modal.js"),
    buildInfo.buildVersion,
  );
  await copyVersionedJs(
    path.join(templatesRoot, "shared/js/site-app-mode.js"),
    path.join(outputRoot, "js/site-app-mode.js"),
    buildInfo.buildVersion,
  );
  await copyVersionedJs(hlsBundlePath, path.join(outputRoot, "js/hls.light.min.js"), buildInfo.buildVersion);
  await fs.copyFile(path.join(templatesRoot, "robots.txt"), path.join(outputRoot, "robots.txt"));

  const hlsMapPath = path.join(projectRoot, "node_modules", "hls.js", "dist", "hls.light.min.js.map");
  try {
    await fs.copyFile(hlsMapPath, path.join(outputRoot, "js/hls.light.min.js.map"));
  } catch {
    // optional
  }

  if (manifest.hasArtistPhoto) {
    const src = files.get("artist-photo");
    if (src) {
      await resizeImageSquareWithFfmpeg(
        src,
        path.join(outputRoot, "images/artist.jpg"),
        ARTIST_PHOTO_MAX_EDGE,
      );
    }
  }

  const activeSongs = manifest.songs.filter((s) => s.hasAudio);
  const playlist = buildPlaylist(activeSongs);
  // Prevent </script> breakout when titles contain angle brackets
  const playlistJson = JSON.stringify(playlist).replace(/</g, "\\u003c");
  const playerFooterHtml = await loadPlayerFooterHtml();
  const songCards: string[] = [];
  const durationBySongId = new Map<string, number | null>();

  for (let i = 0; i < activeSongs.length; i++) {
    const song = activeSongs[i]!;
    const songSlug = slugifySiteText(song.slug || song.title);
    const songHlsDir = path.join(outputRoot, "songs", songSlug);
    const audioPath = files.get(`audio-${song.id}`);

    if (!audioPath) {
      throw new Error(`Missing audio upload for song "${song.title}".`);
    }

    durationBySongId.set(song.id, await probeAudioDurationSeconds(audioPath));
    await exportHlsToDirectory(audioPath, songHlsDir, song.playback);

    let coverRel = "";
    const coverSrc = files.get(`cover-${song.id}`);
    if (coverSrc) {
      const coverOut = path.join(songHlsDir, "cover.jpg");
      await resizeImageWithFfmpeg(coverSrc, coverOut, 1000);
      coverRel = `${songSlug}/cover.jpg`;
    }

    const extraSrc = files.get(`extra-${song.id}`);
    let extraRel = "";
    if (extraSrc) {
      const extraOut = path.join(songHlsDir, "extra.jpg");
      await resizeImageWithFfmpeg(extraSrc, extraOut, 1000);
      extraRel = `${songSlug}/extra.jpg`;
    }

    const manifestRel = `${songSlug}/manifest.m3u8`;
    const hasCover = Boolean(coverRel);

    const extraHtml = extraRel
      ? `<div class="song-extra-image"><img src="${escapeHtmlText(extraRel)}" alt="Additional artwork" /></div>`
      : "";

    let shareImagePath: string | null = null;
    let shareImageWidth = SHARE_CARD_WIDTH;
    let shareImageHeight = SHARE_CARD_HEIGHT;

    if (coverSrc) {
      const shareCardOut = path.join(songHlsDir, "share-card.jpg");
      await resizeShareCardWithFfmpeg(coverSrc, shareCardOut);
      shareImagePath = `songs/${songSlug}/share-card.jpg`;
    } else if (manifest.hasArtistPhoto) {
      // No cover yet — fall back to artist photo until a dedicated share image is provided in the editor.
      shareImagePath = "images/artist.jpg";
      shareImageWidth = ARTIST_PHOTO_MAX_EDGE;
      shareImageHeight = ARTIST_PHOTO_MAX_EDGE;
    }

    const shareMetaHtml = buildSongShareMetaHtml({
      siteRoot,
      songSlug,
      songTitle: song.title,
      artistName: manifest.artistName,
      caption: song.caption.trim(),
      shareImagePath,
      shareImageWidth,
      shareImageHeight,
    });

    const songHtml = await applyTemplateWithHtml(
      path.join(templatesRoot, "song-page.html"),
      {
        SONG_TITLE: song.title,
        ARTIST_NAME: manifest.artistName,
        SONG_CAPTION: song.caption.trim(),
        SONG_MANIFEST: manifestRel,
        SONG_INDEX: String(i),
      },
      {
        SHARE_META_HTML: shareMetaHtml,
        COVER_HTML: songCoverHeroHtml(song, hasCover),
        EXTRA_IMAGE_HTML: extraHtml,
        STREAM_LINKS_HTML: streamLinksHtml(song.links),
        PLAY_ICON_SVG: playerIconPlaySvg(),
        PLAYER_FOOTER_HTML: playerFooterHtml,
        PLAYLIST_JSON: JSON.stringify([playlist[i]]).replace(/</g, "\\u003c"),
        SONG_ABOUT: renderMarkdownToHtml(song.about),
        SONG_LYRICS: song.lyrics.trim()
          ? renderMarkdownToHtml(song.lyrics)
          : '<p class="markdown-empty">No lyrics provided.</p>',
      },
    );

    await fs.writeFile(
      path.join(outputRoot, "songs", `${songSlug}.html`),
      finalizeStaticHtml(songHtml, buildInfo.buildVersion),
      "utf8",
    );

    const songManifestJson = buildSongManifestJson(
      manifest,
      song,
      buildInfo,
      siteRoot,
      hasCover,
      Boolean(extraRel),
      durationBySongId.get(song.id) ?? null,
    );
    await fs.writeFile(
      path.join(songHlsDir, "songpages-song.json"),
      `${JSON.stringify(songManifestJson, null, 2)}\n`,
      "utf8",
    );

    songCards.push(songCardHtml(song, i, hasCover));
  }

  const artistPhotoHtml = manifest.hasArtistPhoto
    ? `<img class="artist-photo" src="./images/artist.jpg" alt="${escapeHtmlText(manifest.artistName)}" />`
    : "";

  const indexHtml = await applyTemplateWithHtml(
    path.join(templatesRoot, "artist-index.html"),
    {
      ARTIST_NAME: manifest.artistName,
    },
    {
      ARTIST_PHOTO_HTML: artistPhotoHtml,
      SOCIAL_LINKS_HTML: socialLinksHtml(manifest.social),
      SONG_CARDS_HTML: songCards.join("\n"),
      PLAYER_FOOTER_HTML: playerFooterHtml,
      PLAYLIST_JSON: playlistJson,
      ARTIST_BIO: renderMarkdownToHtml(manifest.artistBio || ""),
    },
  );

  await fs.writeFile(
    path.join(outputRoot, "index.html"),
    finalizeStaticHtml(indexHtml, buildInfo.buildVersion),
    "utf8",
  );

  await versionHlsManifestsInTree(outputRoot, buildInfo.buildVersion);
  await writeBuildJson(outputRoot, buildInfo);

  const artistManifestJson = buildArtistManifestJson(manifest, buildInfo, siteRoot);
  await fs.writeFile(
    path.join(outputRoot, "songpages-artist.json"),
    `${JSON.stringify(artistManifestJson, null, 2)}\n`,
    "utf8",
  );

  const catalogManifestJson = buildCatalogManifestJson(manifest, activeSongs, buildInfo, siteRoot, durationBySongId);
  await fs.writeFile(
    path.join(outputRoot, "songpages-catalog.json"),
    `${JSON.stringify(catalogManifestJson, null, 2)}\n`,
    "utf8",
  );

  return {
    slug,
    previewUrl: path.join(outputRoot, 'index.html'),
    outputFolder: outputRoot,
    songCount: activeSongs.length,
    buildVersion: buildInfo.buildVersion,
    generatedAt: buildInfo.generatedAt,
  };
}
