/** Install a click bridge on the guest song page Lyrics heading (no guest preload). */
export const INSTALL_LYRICS_HEADING_BRIDGE = `(function () {
  if (window.__songpagesLyricsBridgeInstalled) {
    return window.__songpagesLyricsMenuTick || 0;
  }
  window.__songpagesLyricsBridgeInstalled = true;
  window.__songpagesLyricsMenuTick = 0;
  var heading = document.querySelector('.lyrics-block h2');
  if (!heading) return 0;
  heading.style.cursor = 'pointer';
  heading.setAttribute('aria-haspopup', 'dialog');
  heading.addEventListener('click', function (event) {
    event.preventDefault();
    window.__songpagesLyricsMenuTick = (window.__songpagesLyricsMenuTick || 0) + 1;
  });
  return window.__songpagesLyricsMenuTick;
})()`;

export const READ_LYRICS_HEADING_TICK = 'window.__songpagesLyricsMenuTick || 0';

export const READ_LYRICS_HEADING_RECT = `(function () {
  var heading = document.querySelector('.lyrics-block h2');
  if (!heading) return null;
  var rect = heading.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
  };
})()`;

export const READ_LYRICS_BODY_HTML = `(function () {
  var body = document.querySelector('.lyrics-block .markdown-body');
  return body ? body.innerHTML : '';
})()`;

export const READ_LYRICS_BODY_TEXT = `(function () {
  var body = document.querySelector('.lyrics-block .markdown-body');
  return body ? body.textContent || '' : '';
})()`;

/** Replace lyrics body HTML in the guest page (display-only; source snapshot lives in host). */
export function buildApplyLyricsBodyHtmlScript(html: string): string {
  return `(function () {
    var body = document.querySelector('.lyrics-block .markdown-body');
    if (body) body.innerHTML = ${JSON.stringify(html)};
  })()`;
}

export type GuestLyricsHeadingRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};
