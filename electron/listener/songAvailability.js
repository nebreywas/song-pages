/**
 * Lazy reachability checks — only invoked when the user opens or plays a song.
 */

async function probeUrl(url, method = 'GET') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { Accept: '*/*' },
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Page HTML must load; playback manifest must respond for play. */
async function probeSongAvailability(pageUrl, playbackUrl) {
  const pageOk = await probeUrl(pageUrl, 'GET');
  if (!pageOk) {
    return { ok: false, pageAvailable: false, playbackAvailable: false };
  }

  const playbackOk = await probeUrl(playbackUrl, 'GET');
  return {
    ok: pageOk && playbackOk,
    pageAvailable: pageOk,
    playbackAvailable: playbackOk,
  };
}

module.exports = { probeSongAvailability };
