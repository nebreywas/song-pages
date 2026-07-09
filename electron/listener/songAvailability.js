/**
 * Lazy reachability checks — only invoked when the user opens or plays a song.
 */
const { fetchWithUrlPolicy } = require('../net/fetchWithPolicy');
const { resolveProbeProvenance } = require('./urlProvenance');

const PROBE_TIMEOUT_MS = 8000;

const probeRequestBase = (url, provenance) => ({
  purpose: 'probe-song-availability',
  provenance,
  maxRedirects: 3,
  timeoutMs: PROBE_TIMEOUT_MS,
  expectJson: false,
  headers: { Accept: '*/*' },
});

/** HEAD first (minimal); fall back to status-only GET when CDN/host omits HEAD. */
async function probeUrl(url, provenance) {
  const base = probeRequestBase(url, provenance);
  try {
    await fetchWithUrlPolicy(url, { ...base, method: 'HEAD', skipBody: true });
    return true;
  } catch {
    try {
      await fetchWithUrlPolicy(url, { ...base, method: 'GET', skipBody: true });
      return true;
    } catch {
      return false;
    }
  }
}

/** Page HTML must load; playback manifest must respond for play. */
async function probeSongAvailability(pageUrl, playbackUrl) {
  const provenance = resolveProbeProvenance(pageUrl, playbackUrl);
  if (provenance === 'none') {
    return { ok: false, pageAvailable: false, playbackAvailable: false, error: 'Probe URLs lack catalog context.' };
  }

  const pageOk = await probeUrl(pageUrl, provenance);
  if (!pageOk) {
    return { ok: false, pageAvailable: false, playbackAvailable: false };
  }

  const playbackOk = await probeUrl(playbackUrl, provenance);
  return {
    ok: pageOk && playbackOk,
    pageAvailable: pageOk,
    playbackAvailable: playbackOk,
  };
}

module.exports = { probeSongAvailability };
