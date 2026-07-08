/**
 * Lazy reachability checks — only invoked when the user opens or plays a song.
 */
const { fetchWithUrlPolicy } = require('../net/fetchWithPolicy');
const { resolveProbeProvenance } = require('./urlProvenance');

const PROBE_TIMEOUT_MS = 8000;

async function probeUrl(url, provenance, method = 'GET') {
  try {
    await fetchWithUrlPolicy(url, {
      purpose: 'probe-song-availability',
      provenance,
      method,
      maxRedirects: 3,
      timeoutMs: PROBE_TIMEOUT_MS,
      maxBytes: 4096,
      expectJson: false,
      headers: { Accept: '*/*' },
    });
    return true;
  } catch {
    return false;
  }
}

/** Page HTML must load; playback manifest must respond for play. */
async function probeSongAvailability(pageUrl, playbackUrl) {
  const provenance = resolveProbeProvenance(pageUrl, playbackUrl);
  if (provenance === 'none') {
    return { ok: false, pageAvailable: false, playbackAvailable: false, error: 'Probe URLs lack catalog context.' };
  }

  const pageOk = await probeUrl(pageUrl, provenance, 'GET');
  if (!pageOk) {
    return { ok: false, pageAvailable: false, playbackAvailable: false };
  }

  const playbackOk = await probeUrl(playbackUrl, provenance, 'GET');
  return {
    ok: pageOk && playbackOk,
    pageAvailable: pageOk,
    playbackAvailable: playbackOk,
  };
}

module.exports = { probeSongAvailability };
