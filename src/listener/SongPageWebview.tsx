import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';
import {
  appendSongPagesAppParam,
  SONG_PAGES_GUEST_PARTITION,
  SONG_PAGES_GUEST_WEB_PREFERENCES,
} from '@shared/appClient';
import type { ListenerLyricsDisplaySettings } from '@shared/listener/lyricsDisplaySettings';
import { formatListenerLyricsDisplayText } from '@shared/lyricsText';
import { renderMarkdownPreview } from '../lib/markdownPreview';
import { LyricsSettingsPopover } from './LyricsSettingsPopover';
import { SongCoverPopover } from './SongCoverPopover';
import {
  INSTALL_COVER_CLICK_BRIDGE,
  READ_COVER_ART_DATA,
  READ_COVER_CLICK_TICK,
  type GuestCoverArtData,
} from './songPageCoverBridge';
import {
  buildApplyLyricsBodyHtmlScript,
  INSTALL_LYRICS_HEADING_BRIDGE,
  READ_LYRICS_BODY_TEXT,
  READ_LYRICS_HEADING_RECT,
  READ_LYRICS_HEADING_TICK,
  type GuestLyricsHeadingRect,
} from './songPageLyricsBridge';

type SongPageWebviewProps = {
  url: string;
  /** Bumps when the user re-opens a song so the guest webview remounts reliably. */
  loadKey?: string | number;
  lyricsSettings: ListenerLyricsDisplaySettings;
  onRemoveBracketsChange: (value: boolean) => void;
  onLoadError?: (message: string) => void;
  /** Fired when the host cover popover opens or closes. */
  onCoverModalChange?: (open: boolean) => void;
};

type WebviewElement = HTMLElement & {
  src: string;
  getBoundingClientRect: () => DOMRect;
  getWebContentsId?: () => number;
  executeJavaScript?: (code: string, userGesture?: boolean) => Promise<unknown>;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
};

type DidFailLoadEvent = Event & {
  errorCode: number;
  errorDescription: string;
};

const COVER_CLICK_POLL_MS = 200;
const LYRICS_HEADING_POLL_MS = 250;

/**
 * Sandboxed webview for untrusted remote Song Pages.
 *
 * Security: isolated guest partition, no preload/IPC/Node in guest, navigation
 * bound in main process. Presentation: ?songpagesApp=1 — templates hide chrome;
 * the app does not inject CSS or JS into guest documents.
 */
export function SongPageWebview({
  url,
  loadKey,
  lyricsSettings,
  onRemoveBracketsChange,
  onLoadError,
  onCoverModalChange,
}: SongPageWebviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const onCoverModalChangeRef = useRef(onCoverModalChange);
  onCoverModalChangeRef.current = onCoverModalChange;
  const lyricsSettingsRef = useRef(lyricsSettings);
  lyricsSettingsRef.current = lyricsSettings;
  const onRemoveBracketsChangeRef = useRef(onRemoveBracketsChange);
  onRemoveBracketsChangeRef.current = onRemoveBracketsChange;
  const sourceLyricsTextRef = useRef('');
  const coverPopoverRef = useRef<{ src: string; title: string } | null>(null);

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [lyricsPopoverAnchor, setLyricsPopoverAnchor] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [coverPopover, setCoverPopover] = useState<{ src: string; title: string } | null>(null);
  coverPopoverRef.current = coverPopover;

  const closeCoverPopover = () => {
    setCoverPopover(null);
    onCoverModalChangeRef.current?.(false);
  };

  useEffect(() => {
    onCoverModalChangeRef.current?.(false);
    setLyricsPopoverAnchor(null);
    setCoverPopover(null);
    sourceLyricsTextRef.current = '';
  }, [url, loadKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    const app = getApp();
    const appModeUrl = appendSongPagesAppParam(url);

    setLoadState('loading');
    setErrorMessage('');

    const webview = document.createElement('webview') as WebviewElement;
    webview.className = 'song-webview';
    webview.setAttribute('partition', SONG_PAGES_GUEST_PARTITION);
    webview.setAttribute('webpreferences', SONG_PAGES_GUEST_WEB_PREFERENCES);
    webview.setAttribute('allowpopups', 'false');

    let coverClickPollId: number | null = null;
    let lyricsHeadingPollId: number | null = null;
    let guestReady = false;
    let disposed = false;
    let lastLyricsMenuTick = 0;
    let lastCoverClickTick = 0;

    const applyLyricsDisplay = async () => {
      if (disposed || !guestReady || !webview.executeJavaScript) return;
      const sourceLyricsText = sourceLyricsTextRef.current;
      if (!sourceLyricsText.trim()) return;

      const displayText = formatListenerLyricsDisplayText(
        sourceLyricsText,
        lyricsSettingsRef.current.removeBrackets,
      );
      const html = renderMarkdownPreview(displayText);

      try {
        await webview.executeJavaScript(buildApplyLyricsBodyHtmlScript(html), false);
      } catch {
        /* guest may be mid-navigation */
      }
    };

    const pollCoverClick = () => {
      if (disposed || !guestReady || !webview.executeJavaScript) return;

      void webview
        .executeJavaScript(READ_COVER_CLICK_TICK, false)
        .then(async (tickValue) => {
          if (disposed) return;
          const tick = typeof tickValue === 'number' ? tickValue : Number(tickValue);
          if (!Number.isFinite(tick) || tick === lastCoverClickTick) return;
          lastCoverClickTick = tick;

          if (coverPopoverRef.current) {
            setCoverPopover(null);
            onCoverModalChangeRef.current?.(false);
            return;
          }

          const data = (await webview.executeJavaScript(
            READ_COVER_ART_DATA,
            false,
          )) as GuestCoverArtData | null;
          if (disposed || !data?.src) return;

          setCoverPopover({
            src: data.src,
            title: typeof data.title === 'string' ? data.title : '',
          });
          onCoverModalChangeRef.current?.(true);
        })
        .catch(() => {
          /* guest may be mid-navigation */
        });
    };

    const pollLyricsHeading = () => {
      if (disposed || !guestReady || !webview.executeJavaScript) return;

      void webview
        .executeJavaScript(READ_LYRICS_HEADING_TICK, false)
        .then(async (tickValue) => {
          if (disposed) return;
          const tick = typeof tickValue === 'number' ? tickValue : Number(tickValue);
          if (!Number.isFinite(tick) || tick === lastLyricsMenuTick) return;
          lastLyricsMenuTick = tick;

          const rect = (await webview.executeJavaScript(
            READ_LYRICS_HEADING_RECT,
            false,
          )) as GuestLyricsHeadingRect | null;
          if (disposed || !rect) return;

          const webviewRect = webview.getBoundingClientRect();
          setLyricsPopoverAnchor({
            x: webviewRect.left + rect.left,
            y: webviewRect.top + rect.bottom + 4,
          });
        })
        .catch(() => {
          /* guest may be mid-navigation */
        });
    };

    const onFailLoad = (event: Event) => {
      const failEvent = event as DidFailLoadEvent;
      if (failEvent.errorCode === -3) return;
      const message =
        failEvent.errorDescription || `Failed to load song page (code ${failEvent.errorCode})`;
      setLoadState('error');
      setErrorMessage(message);
      onLoadErrorRef.current?.(message);
    };

    const onDomReady = () => {
      if (disposed) return;
      guestReady = true;
      setLoadState('ready');

      if (app?.listener.bindSongPageGuest) {
        try {
          const guestId = webview.getWebContentsId?.();
          if (guestId != null) {
            void app.listener.bindSongPageGuest(guestId, appModeUrl).then((result) => {
              if (!result.ok) {
                onLoadErrorRef.current?.(result.error || 'Could not secure song page guest.');
              }
            });
          }
        } catch {
          /* guest may be mid-teardown when dom-ready races a remount */
        }
      }

      void webview
        .executeJavaScript(INSTALL_COVER_CLICK_BRIDGE, false)
        .then((initialTick) => {
          if (disposed) return;
          const tick = typeof initialTick === 'number' ? initialTick : Number(initialTick);
          if (Number.isFinite(tick)) lastCoverClickTick = tick;
        })
        .catch(() => {
          /* optional bridge */
        });

      void webview
        .executeJavaScript(INSTALL_LYRICS_HEADING_BRIDGE, false)
        .then((initialTick) => {
          if (disposed) return;
          const tick = typeof initialTick === 'number' ? initialTick : Number(initialTick);
          if (Number.isFinite(tick)) lastLyricsMenuTick = tick;
        })
        .catch(() => {
          /* optional bridge */
        });

      void webview
        .executeJavaScript(READ_LYRICS_BODY_TEXT, false)
        .then((text) => {
          if (disposed || typeof text !== 'string') return;
          sourceLyricsTextRef.current = text;
          void applyLyricsDisplay();
        })
        .catch(() => {
          /* lyrics block may be absent */
        });

      coverClickPollId = window.setInterval(pollCoverClick, COVER_CLICK_POLL_MS);
      lyricsHeadingPollId = window.setInterval(pollLyricsHeading, LYRICS_HEADING_POLL_MS);
    };

    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-fail-load', onFailLoad);

    container.replaceChildren(webview);
    webview.src = appModeUrl;

    return () => {
      disposed = true;
      guestReady = false;
      if (coverClickPollId != null) {
        window.clearInterval(coverClickPollId);
        coverClickPollId = null;
      }
      if (lyricsHeadingPollId != null) {
        window.clearInterval(lyricsHeadingPollId);
        lyricsHeadingPollId = null;
      }
      onCoverModalChangeRef.current?.(false);
      webview.removeEventListener('dom-ready', onDomReady);
      webview.removeEventListener('did-fail-load', onFailLoad);
      container.replaceChildren();
    };
  }, [url, loadKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadState !== 'ready') return;

    const webview = container.querySelector('webview') as WebviewElement | null;
    if (!webview?.executeJavaScript || !sourceLyricsTextRef.current.trim()) return;

    const displayText = formatListenerLyricsDisplayText(
      sourceLyricsTextRef.current,
      lyricsSettings.removeBrackets,
    );
    const html = renderMarkdownPreview(displayText);

    void webview.executeJavaScript(buildApplyLyricsBodyHtmlScript(html), false).catch(() => {
      /* guest may be mid-navigation */
    });
  }, [lyricsSettings.removeBrackets, loadState, url, loadKey]);

  return (
    <div className="song-webview-wrap">
      {loadState === 'loading' ? (
        <div className="song-page-placeholder song-page-overlay">
          <p>Loading song page…</p>
        </div>
      ) : null}
      {loadState === 'error' ? (
        <div className="song-page-placeholder song-page-overlay">
          <p>Could not load song page.</p>
          <p className="song-page-url">{errorMessage || url}</p>
        </div>
      ) : null}
      <div ref={containerRef} className="song-webview-host" />
      {coverPopover ? (
        <SongCoverPopover
          src={coverPopover.src}
          alt={coverPopover.title ? `${coverPopover.title} cover art` : 'Cover art'}
          onClose={closeCoverPopover}
        />
      ) : null}
      {lyricsPopoverAnchor ? (
        <LyricsSettingsPopover
          anchor={lyricsPopoverAnchor}
          settings={lyricsSettings}
          onRemoveBracketsChange={onRemoveBracketsChange}
          onClose={() => setLyricsPopoverAnchor(null)}
        />
      ) : null}
    </div>
  );
}
