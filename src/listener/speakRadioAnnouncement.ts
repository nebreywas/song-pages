/**
 * Speaks a Radio Mode announcement via native macOS `say` when available,
 * otherwise Chromium speechSynthesis. Curated profiles pin rate/pitch.
 */

import type { RadioVoiceProfile } from '@shared/listener/radioVoices';

export type SpeakRadioOptions = {
  profile: RadioVoiceProfile;
  text: string;
  /** Abort in-flight speech without treating it as success. */
  signal?: AbortSignal;
};

function speakWithWebVoice(profile: RadioVoiceProfile, text: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('speechSynthesis unavailable'));
      return;
    }

    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const loweredHints = profile.webNameHints.map((hint) => hint.toLowerCase());
    const voice =
      voices.find((entry) => {
        const name = entry.name.toLowerCase();
        return loweredHints.some((hint) => name.includes(hint));
      }) ?? null;

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-US';
    }
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;

    const onAbort = () => {
      window.speechSynthesis.cancel();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    utterance.onend = () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    utterance.onerror = (event) => {
      signal?.removeEventListener('abort', onAbort);
      if (event.error === 'interrupted' || event.error === 'canceled') {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      reject(new Error(event.error || 'speech error'));
    };
    window.speechSynthesis.speak(utterance);
  });
}

async function speakWithNativeSay(
  profile: RadioVoiceProfile,
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  const api = window.app?.webVoice;
  if (!api?.speakNative) {
    throw new Error('native say unavailable');
  }
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const onAbort = () => {
    void api.stopNative?.();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const result = await api.speakNative({
      voice: profile.sayName,
      text,
      rate: profile.rate,
      pitch: profile.pitch,
    });
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    if (!result.ok) {
      throw new Error(result.error || 'say failed');
    }
    if (result.data?.stopped) {
      throw new DOMException('Aborted', 'AbortError');
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Prefer native `say` for Enhanced profiles (and whenever the bridge exists on
 * macOS). Fall back to web speech so non-Mac / missing Enhanced still talks.
 */
export async function speakRadioAnnouncement(options: SpeakRadioOptions): Promise<void> {
  const { profile, text, signal } = options;
  const nativeAvailable = typeof window.app?.webVoice?.speakNative === 'function';

  if (nativeAvailable && profile.preferredEngine === 'native') {
    try {
      await speakWithNativeSay(profile, text, signal);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      // Fall through to web if the Enhanced voice isn't installed.
    }
  }

  if (nativeAvailable && profile.preferredEngine === 'web') {
    // Regular voices: native say still gives reliable pitch via [[pbas]].
    try {
      await speakWithNativeSay(profile, text, signal);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }
  }

  await speakWithWebVoice(profile, text, signal);
}

export function stopRadioSpeech(): void {
  window.speechSynthesis?.cancel();
  void window.app?.webVoice?.stopNative?.();
}
