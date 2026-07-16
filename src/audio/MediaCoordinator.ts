import {
  attachPlaybackSource,
  clearPlaybackSource,
  createHlsHolder,
  isPlaybackSourceReady,
  type HlsHolder,
} from './adapters/attachPlaybackSource';

export type MediaAttachCallbacks = {
  onReady: () => void;
  onError: (detail?: string) => void;
};

export type MediaAttachOptions = MediaAttachCallbacks & {
  playbackScope?: string | null;
  /** Caller-owned generation — stale loads are ignored when this no longer matches. */
  generation: number;
  isGenerationCurrent: (generation: number) => boolean;
};

/**
 * Owns hls.js attach/detach and load-generation guards for one `<audio>` element.
 * ListenerMode, analyser mirror, and VC mirror each keep their own coordinator instance.
 */
export class MediaCoordinator {
  private readonly hlsHolder: HlsHolder;
  private loadedUrl: string | null = null;
  private loadedScope: string | null | undefined = undefined;
  private attachCleanup: (() => void) | null = null;

  constructor(hlsHolder?: HlsHolder) {
    this.hlsHolder = hlsHolder ?? createHlsHolder();
  }

  getHlsHolder(): HlsHolder {
    return this.hlsHolder;
  }

  /** Invalidate in-flight loads and tear down hls.js without clearing the element. */
  invalidateLoads(): void {
    this.attachCleanup?.();
    this.attachCleanup = null;
    this.loadedUrl = null;
    this.loadedScope = undefined;
    this.hlsHolder.destroy();
  }

  isLoaded(playbackUrl: string, playbackScope?: string | null): boolean {
    if (this.loadedUrl !== playbackUrl) return false;
    if (this.loadedScope !== playbackScope) return false;
    return true;
  }

  isReady(
    audio: HTMLAudioElement,
    playbackUrl: string,
    playbackScope?: string | null,
  ): boolean {
    if (!this.isLoaded(playbackUrl, playbackScope)) return false;
    return isPlaybackSourceReady(audio, playbackUrl, this.hlsHolder, playbackScope);
  }

  markLoaded(playbackUrl: string, playbackScope?: string | null): void {
    this.loadedUrl = playbackUrl;
    this.loadedScope = playbackScope;
  }

  clearLoaded(): void {
    this.loadedUrl = null;
    this.loadedScope = undefined;
  }

  attach(
    audio: HTMLAudioElement,
    playbackUrl: string,
    options: MediaAttachOptions,
  ): () => void {
    this.attachCleanup?.();
    this.attachCleanup = null;
    this.clearLoaded();

    const cleanup = attachPlaybackSource(
      audio,
      {
        playbackUrl,
        playbackScope: options.playbackScope,
        generation: options.generation,
        isGenerationCurrent: options.isGenerationCurrent,
        onReady: () => {
          this.markLoaded(playbackUrl, options.playbackScope);
          options.onReady();
        },
        onError: options.onError,
      },
      this.hlsHolder,
    );

    this.attachCleanup = cleanup;
    return () => {
      cleanup();
      if (this.attachCleanup === cleanup) {
        this.attachCleanup = null;
      }
    };
  }

  teardownElement(audio: HTMLAudioElement): void {
    this.attachCleanup?.();
    this.attachCleanup = null;
    this.clearLoaded();
    clearPlaybackSource(audio, this.hlsHolder);
  }
}
