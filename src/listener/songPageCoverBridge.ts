/** Install a capture-phase click bridge on the guest song cover — host owns the lightbox. */
export const INSTALL_COVER_CLICK_BRIDGE = `(function () {
  if (window.__songpagesCoverBridgeInstalled) {
    return window.__songpagesCoverClickTick || 0;
  }
  window.__songpagesCoverBridgeInstalled = true;
  window.__songpagesCoverClickTick = 0;

  var btn = document.querySelector('.song-cover-btn');
  if (!btn) return 0;

  btn.addEventListener(
    'click',
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.__songpagesCoverClickTick = (window.__songpagesCoverClickTick || 0) + 1;
      var modal = document.getElementById('cover-modal');
      if (modal) modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    },
    true,
  );

  return window.__songpagesCoverClickTick;
})()`;

export const READ_COVER_CLICK_TICK = 'window.__songpagesCoverClickTick || 0';

export const READ_COVER_ART_DATA = `(function () {
  var btn = document.querySelector('.song-cover-btn');
  if (!btn) return null;

  var src = btn.getAttribute('data-cover-src');
  var title = btn.getAttribute('data-cover-title') || '';
  if (!src) {
    var img = btn.querySelector('img');
    src = img ? img.getAttribute('src') : '';
  }
  if (!src) return null;

  try {
    src = new URL(src, window.location.href).href;
  } catch (e) {
    /* keep literal src */
  }

  return { src: src, title: title };
})()`;

export type GuestCoverArtData = {
  src: string;
  title: string;
};
