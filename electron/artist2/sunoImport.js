/**
 * Artist 2.0 — import Suno clip metadata into a Song.
 *
 * Downloads the static cover JPEG once into userData (not CDN hotlink).
 * Never downloads MP3, lyric video MP4, or animated cover MP4.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const catalog = require('./catalog');
const sunoFeature = require('../listener/sunoDemo/feature');

const COVER_MAX_BYTES = 8 * 1024 * 1024;

function loadSongPatchFromSunoClip() {
  require('tsx/cjs/api').register();
  return require('../../shared/artist2/songPatchFromSunoClip.ts');
}

function artist2MediaRoot(artistId) {
  return path.join(app.getPath('userData'), 'artist2', artistId, 'covers');
}

/**
 * One-shot download of the static still. Failures are non-fatal — metadata still applies.
 */
async function downloadStaticCover(coverUrl, artistId, clipId) {
  if (!coverUrl || !artistId || !clipId) return null;

  const response = await fetch(coverUrl, {
    headers: { Accept: 'image/jpeg,image/png,image/*,*/*' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Cover download failed (HTTP ${response.status}).`);
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  // Refuse video payloads even if a bad URL slipped through.
  if (contentType.includes('video') || contentType.includes('mpegurl')) {
    throw new Error('Refusing non-image cover download.');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error('Cover download was empty.');
  if (buffer.length > COVER_MAX_BYTES) {
    throw new Error('Cover image exceeds size limit.');
  }

  const dir = artist2MediaRoot(artistId);
  fs.mkdirSync(dir, { recursive: true });

  let ext = '.jpeg';
  if (contentType.includes('png')) ext = '.png';
  else if (contentType.includes('webp')) ext = '.webp';
  else if (/\.png(\?|$)/i.test(coverUrl)) ext = '.png';

  const dest = path.join(dir, `${clipId}${ext}`);
  fs.writeFileSync(dest, buffer);
  return dest;
}

/**
 * Resolve URL/ID → Studio clip → patch Song fields + local static cover.
 * Does not import audio or any video assets.
 */
async function importSunoIntoSong(objectId, rawInput) {
  const existing = catalog.getObject(objectId);
  if (!existing) throw new Error('Song not found.');
  if (existing.kind !== 'song') throw new Error('Suno import is only available on Songs.');

  const clipId = await sunoFeature.resolveInputToSongId(rawInput);
  if (!clipId) {
    throw new Error('Paste a suno.com share link or clip UUID.');
  }

  const clip = await sunoFeature.fetchStudioClip(clipId);
  const { songPatchFromSunoClip } = loadSongPatchFromSunoClip();
  const patch = songPatchFromSunoClip(clip);

  let coverPath = null;
  let coverWarning = null;
  if (patch.staticCoverUrl) {
    try {
      coverPath = await downloadStaticCover(
        patch.staticCoverUrl,
        existing.artistId,
        patch.payload.suno?.clipId || clipId,
      );
    } catch (err) {
      coverWarning = err instanceof Error ? err.message : String(err);
    }
  }

  const payload = {
    ...patch.payload,
    // Preserve existing audio pointers — import never sets recordings.
    recording: existing.payload?.recording ?? { audioPath: null, label: 'Main Recording' },
    recordings: Array.isArray(existing.payload?.recordings)
      ? existing.payload.recordings
      : undefined,
  };

  // Merge Suno streaming link into existing structured rows (cutover — no flat links).
  try {
    require('tsx/cjs/api').register();
    const { normalizeSongLinks, upsertStreamingLink } = require('../../shared/artist2/songLinks.ts');
    const {
      applySunoToCreationProcess,
      normalizeCreationProcessState,
    } = require('../../shared/artist2/songCreationProcess.ts');
    const existingEntries = normalizeSongLinks(existing.payload ?? {});
    const shareUrl = patch.payload?.suno?.shareUrl || patch.payload?.linkEntries?.find?.(
      (e) => e.kind === 'streaming' && e.providerId === 'suno',
    )?.url;
    payload.linkEntries = shareUrl
      ? upsertStreamingLink(existingEntries, 'suno', shareUrl)
      : existingEntries;

    const existingCreation = normalizeCreationProcessState(existing.payload ?? {});
    const styleFromImport =
      patch.payload?.aiPrompts?.find?.((p) => p.promptType === 'prompt' && p.primary)?.text ||
      patch.payload?.aiPrompts?.find?.((p) => p.promptType === 'prompt')?.text ||
      null;
    const mergedCreation = applySunoToCreationProcess({
      existingProcesses: existingCreation.processes,
      existingPrompts: existingCreation.aiPrompts,
      stylePrompt: styleFromImport,
      modelName: patch.payload?.suno?.modelName,
      modelBadge: patch.payload?.suno?.modelBadge,
    });
    payload.creationProcesses = mergedCreation.creationProcesses;
    payload.aiPrompts = mergedCreation.aiPrompts;
  } catch {
    payload.linkEntries = patch.payload?.linkEntries ?? existing.payload?.linkEntries;
    payload.creationProcesses =
      patch.payload?.creationProcesses ?? existing.payload?.creationProcesses;
    payload.aiPrompts = patch.payload?.aiPrompts ?? existing.payload?.aiPrompts;
  }

  if (coverPath) {
    payload.artwork = { mode: 'inline', path: coverPath };
    payload.artworkEntries = [
      {
        id: `art_${Date.now().toString(36)}`,
        role: 'primary_cover',
        source: { mode: 'inline', path: coverPath },
        sortOrder: 0,
      },
    ];
  } else if (existing.payload?.artworkEntries) {
    payload.artworkEntries = existing.payload.artworkEntries;
    payload.artwork = existing.payload.artwork;
  } else if (existing.payload?.artwork) {
    payload.artwork = existing.payload.artwork;
  }

  const updated = catalog.updateObject(objectId, {
    name: patch.name,
    payload,
  });

  return {
    object: updated,
    coverImported: Boolean(coverPath),
    coverWarning,
    clipId: patch.payload.suno?.clipId || clipId,
  };
}

module.exports = {
  importSunoIntoSong,
  downloadStaticCover,
};
