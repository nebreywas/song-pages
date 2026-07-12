/**
 * Dispatch third-party song intake to the correct provider adapter.
 * Provider detection uses Electron CJS canonicalizers — not shared .ts imports.
 */
const { canonicalizeYoutubeInput } = require('./youtube/youtubeCanonicalize');
const { canonicalizeSoundcloudInput } = require('./soundcloud/soundcloudCanonicalize');
const { canonicalizeFlowInput } = require('./flow/flowCanonicalize');
const { canonicalizeSunoInput } = require('./suno/sunoCanonicalize');

const SUPPORTED_EXTERNAL_SONG_SERVICES =
  'YouTube, SoundCloud, Google Flow, and Suno';

const PROVIDER_PROBES = [
  { provider: 'youtube', probe: canonicalizeYoutubeInput },
  { provider: 'soundcloud', probe: canonicalizeSoundcloudInput },
  { provider: 'flow', probe: canonicalizeFlowInput },
  { provider: 'suno', probe: canonicalizeSunoInput },
];

function looksLikeUrl(input) {
  return /^https?:\/\//i.test(input) || /^www\./i.test(input) || input.includes('.com/');
}

function detectExternalSongProvider(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a link or ID to add a song.' };
  }

  for (const { provider, probe } of PROVIDER_PROBES) {
    if (probe(trimmed).ok) {
      return { ok: true, provider };
    }
  }

  if (looksLikeUrl(trimmed)) {
    return {
      ok: false,
      error: `That service is not supported. Song Pages accepts ${SUPPORTED_EXTERNAL_SONG_SERVICES} links only.`,
    };
  }

  return {
    ok: false,
    error: `Unrecognized input. Paste a supported link (${SUPPORTED_EXTERNAL_SONG_SERVICES}).`,
  };
}

async function addExternalSongToUserPlaylist(playlistId, input) {
  const detection = detectExternalSongProvider(input);
  if (!detection.ok) {
    return { ok: false, error: detection.error };
  }

  switch (detection.provider) {
    case 'youtube': {
      const youtubeSongs = require('./youtube/youtubeSongs');
      const result = await youtubeSongs.addYoutubeSongToUserPlaylist(playlistId, input);
      if (!result.ok || !result.data) return result;
      return { ok: true, data: { ...result.data, provider: 'youtube' } };
    }
    case 'soundcloud': {
      const soundcloudSongs = require('./soundcloud/soundcloudSongs');
      const result = await soundcloudSongs.addSoundcloudSongToUserPlaylist(playlistId, input);
      if (!result.ok || !result.data) return result;
      return { ok: true, data: { ...result.data, provider: 'soundcloud' } };
    }
    case 'flow': {
      const flowSongs = require('./flow/flowSongs');
      const { isFeatureEnabled } = flowSongs;
      if (!isFeatureEnabled()) {
        return { ok: false, error: 'Google Flow import is unavailable in this build.' };
      }
      const result = await flowSongs.addFlowSongToUserPlaylist(playlistId, input);
      if (!result.ok || !result.data) return result;
      return { ok: true, data: { ...result.data, provider: 'flow' } };
    }
    case 'suno': {
      const sunoSongs = require('./suno/sunoSongs');
      return sunoSongs.addSunoSongToUserPlaylist(playlistId, input);
    }
    default:
      return { ok: false, error: 'Unsupported provider.' };
  }
}

module.exports = {
  detectExternalSongProvider,
  addExternalSongToUserPlaylist,
};
