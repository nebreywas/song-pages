/** Load the YouTube IFrame Player API once per renderer session. */
export function loadYoutubeIframeApi(): Promise<void> {
  const w = window as Window & {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (w.YT?.Player) return Promise.resolve();

  if (loadYoutubeIframeApi.promise) return loadYoutubeIframeApi.promise;

  loadYoutubeIframeApi.promise = new Promise<void>((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const existing = document.querySelector('script[data-youtube-iframe-api]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      document.head.appendChild(script);
    }
  });

  return loadYoutubeIframeApi.promise;
}

loadYoutubeIframeApi.promise = null as Promise<void> | null;

export type YoutubePlayerState = {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
};

export type YoutubePlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  /** YouTube uses 0–100; we convert from the app’s 0–1 slider. */
  setVolume: (volume: number) => void;
  getVolume: () => number;
  destroy: () => void;
  getPlayerState: () => number;
  getIframe?: () => HTMLIFrameElement;
};

/** YouTube's embed probes Compute Pressure — delegate via iframe allow to silence policy violations. */
export function patchYoutubeIframePermissions(player: YoutubePlayerInstance): void {
  const iframe = typeof player.getIframe === 'function' ? player.getIframe() : null;
  if (!iframe) return;

  const features = new Set(
    (iframe.getAttribute('allow') ?? '')
      .split(';')
      .map((feature) => feature.trim())
      .filter(Boolean),
  );
  features.add('compute-pressure');
  iframe.setAttribute('allow', Array.from(features).join('; '));
}

type YoutubePlayerOptions = {
  videoId: string;
  events?: {
    onReady?: (event: { target: YoutubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YoutubePlayerInstance }) => void;
    onError?: (event: { data: number }) => void;
  };
  playerVars?: Record<string, string | number>;
};

type YoutubePlayerConstructor = new (
  element: HTMLElement,
  options: YoutubePlayerOptions,
) => YoutubePlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YoutubePlayerConstructor;
      PlayerState: YoutubePlayerState;
    };
  }
}
