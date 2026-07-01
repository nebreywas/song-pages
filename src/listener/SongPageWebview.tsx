import { useEffect, useRef, useState } from 'react';
import { getApp } from '../lib/bridge';
import {
  appendSongPagesAppParam,
  SONG_PAGES_GUEST_PARTITION,
  SONG_PAGES_GUEST_WEB_PREFERENCES,
} from '@shared/appClient';

type SongPageWebviewProps = {
  url: string;
  onLoadError?: (message: string) => void;
  /** Fired when the guest cover lightbox opens or closes. */
  onCoverModalChange?: (open: boolean) => void;
};

type WebviewElement = HTMLElement & {
  src: string;
  getWebContentsId?: () => number;
  executeJavaScript?: (code: string, userGesture?: boolean) => Promise<unknown>;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
};

type DidFailLoadEvent = Event & {
  errorCode: number;
  errorDescription: string;
};

/** Read-only probe — guest cover modal uses #cover-modal.hidden when collapsed. */
const COVER_MODAL_OPEN_PROBE = `(function () {
  var modal = document.getElementById('cover-modal');
  return !!(modal && !modal.classList.contains('hidden'));
})()`;

const COVER_MODAL_POLL_MS = 200;

/**
 * Sandboxed webview for untrusted remote Song Pages.
 *
 * Security: isolated guest partition, no preload/IPC/Node in guest, navigation
 * bound in main process. Presentation: ?songpagesApp=1 — templates hide chrome;
 * the app does not inject CSS or JS into guest documents.
 */
export function SongPageWebview({ url, onLoadError, onCoverModalChange }: SongPageWebviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const onCoverModalChangeRef = useRef(onCoverModalChange);
  onCoverModalChangeRef.current = onCoverModalChange;

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    onCoverModalChangeRef.current?.(false);
  }, [url]);

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

    let coverModalPollId: number | null = null;
    let lastCoverModalOpen = false;

    const syncCoverModalOpen = () => {
      if (!webview.executeJavaScript) return;
      void webview
        .executeJavaScript(COVER_MODAL_OPEN_PROBE, false)
        .then((result) => {
          const open = Boolean(result);
          if (open === lastCoverModalOpen) return;
          lastCoverModalOpen = open;
          onCoverModalChangeRef.current?.(open);
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
      setLoadState('ready');

      if (app?.listener.bindSongPageGuest) {
        const guestId = webview.getWebContentsId?.();
        if (guestId != null) {
          void app.listener.bindSongPageGuest(guestId, appModeUrl).then((result) => {
            if (!result.ok) {
              onLoadErrorRef.current?.(result.error || 'Could not secure song page guest.');
            }
          });
        }
      }

      syncCoverModalOpen();
      coverModalPollId = window.setInterval(syncCoverModalOpen, COVER_MODAL_POLL_MS);
    };

    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-fail-load', onFailLoad);

    webview.src = appModeUrl;
    container.replaceChildren(webview);

    return () => {
      if (coverModalPollId != null) {
        window.clearInterval(coverModalPollId);
      }
      onCoverModalChangeRef.current?.(false);
      webview.removeEventListener('dom-ready', onDomReady);
      webview.removeEventListener('did-fail-load', onFailLoad);
      container.replaceChildren();
    };
  }, [url]);

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
    </div>
  );
}
