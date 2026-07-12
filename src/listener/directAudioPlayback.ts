/**
 * Load direct audio (MP3, etc.) into an HTMLAudioElement without HLS.
 */
export type DirectAudioLoadOptions = {
  onReady: () => void;
  onError: () => void;
};

/** True when the URL is not an HLS manifest — use native <audio> instead of hls.js. */
export function isDirectAudioPlaybackUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/\.m3u8(?:\?|$)/i.test(trimmed)) return false;
  if (/\.mp3(?:\?|$)/i.test(trimmed)) return true;
  if (/\.m4a(?:\?|$)/i.test(trimmed)) return true;
  if (/^https?:\/\/cdn\d+\.suno\.ai\//i.test(trimmed)) return true;
  if (/^https?:\/\/storage\.googleapis\.com\/producer-app-public\/clips\//i.test(trimmed)) {
    return true;
  }
  return false;
}

export function shouldUseDirectAudioPlayback(
  playbackUrl: string,
  playbackScope?: string | null,
): boolean {
  if (playbackScope === 'suno-demo' || playbackScope === 'flow') return true;
  return isDirectAudioPlaybackUrl(playbackUrl);
}

/** Attach a direct audio source and invoke callbacks when metadata loads or playback fails. */
export function loadDirectAudioPlayback(
  audio: HTMLAudioElement,
  playbackUrl: string,
  { onReady, onError }: DirectAudioLoadOptions,
): () => void {
  const onLoaded = () => {
    onReady();
  };

  audio.addEventListener('loadedmetadata', onLoaded, { once: true });
  audio.addEventListener('error', onError, { once: true });
  audio.src = playbackUrl;

  return () => {
    audio.removeEventListener('loadedmetadata', onLoaded);
    audio.removeEventListener('error', onError);
  };
}
