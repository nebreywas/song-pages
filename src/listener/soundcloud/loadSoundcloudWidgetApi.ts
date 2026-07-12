/** Load the SoundCloud Widget API once per renderer session. */
export function loadSoundcloudWidgetApi(): Promise<void> {
  const w = window as Window & { SC?: { Widget?: SoundcloudWidgetFactory } };

  if (w.SC?.Widget) return Promise.resolve();

  if (loadSoundcloudWidgetApi.promise) return loadSoundcloudWidgetApi.promise;

  loadSoundcloudWidgetApi.promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-soundcloud-widget-api]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('SoundCloud Widget API failed to load.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.dataset.soundcloudWidgetApi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SoundCloud Widget API failed to load.'));
    document.head.appendChild(script);
  });

  return loadSoundcloudWidgetApi.promise;
}

loadSoundcloudWidgetApi.promise = null as Promise<void> | null;

export type SoundcloudWidgetEvent = {
  currentPosition?: number;
  relativePosition?: number;
};

export type SoundcloudWidgetInstance = {
  play: () => void;
  pause: () => void;
  seekTo: (milliseconds: number) => void;
  getPosition: (callback: (positionMs: number) => void) => void;
  getDuration: (callback: (durationMs: number) => void) => void;
  bind: (event: string, listener: (payload?: SoundcloudWidgetEvent) => void) => void;
  unbind: (event: string) => void;
};

export type SoundcloudWidgetEvents = {
  READY: string;
  PLAY: string;
  PAUSE: string;
  FINISH: string;
  PLAY_PROGRESS: string;
  ERROR: string;
};

type SoundcloudWidgetFactory = {
  (iframe: HTMLIFrameElement): SoundcloudWidgetInstance;
  Events: SoundcloudWidgetEvents;
};

declare global {
  interface Window {
    SC?: {
      Widget: SoundcloudWidgetFactory;
    };
  }
}

export function soundcloudWidgetEvents(): SoundcloudWidgetEvents {
  return window.SC!.Widget.Events;
}
