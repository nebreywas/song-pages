/**
 * Chromium stops routing decoded audio into MediaElementSource when the element is muted
 * or volume is 0 — FFT stays flat even though the graph looks healthy. Silence the mirror
 * via speakerGain (zero in tap mode) instead of HTML muted/volume.
 */
export function ensureMirrorElementFeedsGraph(audio: HTMLAudioElement): void {
  const wasMuted = audio.muted;
  const wasVolume = audio.volume;

  if (audio.muted) {
    audio.muted = false;
  }
  if (audio.volume <= 0) {
    audio.volume = 1;
  }

  if ((wasMuted || wasVolume <= 0) && typeof window !== 'undefined') {
    void import('../debug/audioDebug').then(({ audioDebug }) => {
      audioDebug.log('audioGraph', 'Mirror unmuted for Web Audio tap', {
        wasMuted,
        wasVolume,
        nowMuted: audio.muted,
        nowVolume: audio.volume,
      });
    });
  }
}

/** Whether the mirror element would block Web Audio in Chromium. */
export function mirrorElementBlocksWebAudio(audio: Pick<HTMLAudioElement, 'muted' | 'volume'>): boolean {
  return audio.muted || audio.volume <= 0;
}
