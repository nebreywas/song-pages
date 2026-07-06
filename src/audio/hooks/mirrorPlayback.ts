import { audioDebug } from '../debug/audioDebug';

/** Play mirror only when media is loaded; ignore benign AbortError during HLS reload. */
export async function tryPlayMirror(
  audio: HTMLAudioElement,
  source: string,
): Promise<boolean> {
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
    return false;
  }

  if (!audio.paused) {
    return true;
  }

  try {
    await audio.play();
    return true;
  } catch (error) {
    const name = error instanceof DOMException ? error.name : 'Error';
    // play() interrupted by mirror.load() / src swap — expected during visualizer toggles.
    if (name === 'AbortError') {
      return false;
    }
    audioDebug.log(
      source,
      'Mirror play() rejected',
      { name, message: String(error), readyState: audio.readyState },
      'warn',
    );
    return false;
  }
}

/** Whether mirror media is far enough along to call play(). */
export function mirrorCanPlay(audio: HTMLMediaElement): boolean {
  return audio.readyState >= HTMLMediaElement.HAVE_METADATA;
}
