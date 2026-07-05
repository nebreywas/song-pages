import { useEffect, useState } from 'react';

import { getApp } from '../lib/bridge';

type MediaStatus = 'idle' | 'loading' | 'ready' | 'missing';

/** Resolve userData media paths through Electron; pass through http(s)/cache URLs directly. */
export function useResolvedMediaUrl(
  remoteUrl?: string | null,
  mediaPath?: string | null,
): { url: string | null; status: MediaStatus } {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<MediaStatus>('idle');

  useEffect(() => {
    if (remoteUrl) {
      setUrl(remoteUrl);
      setStatus('ready');
      return;
    }

    if (!mediaPath) {
      setUrl(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setUrl(null);

    void getApp()?.hostContent?.resolveMediaUrl(mediaPath).then((resolved) => {
      if (cancelled) return;
      if (resolved) {
        setUrl(resolved);
        setStatus('ready');
        return;
      }
      setUrl(null);
      setStatus('missing');
    });

    return () => {
      cancelled = true;
    };
  }, [remoteUrl, mediaPath]);

  return { url, status };
}
