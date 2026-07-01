/**
 * Hardened session for Song Page webview guests (untrusted remote HTML).
 *
 * Runs in main process only. Guest pages never receive preload, IPC, or Node.
 */
const { session } = require('electron');

const GUEST_PARTITION = 'persist:songpages-guest';

function configureSongPageGuestSession() {
  const guestSession = session.fromPartition(GUEST_PARTITION);

  // Deny all permission prompts (camera, mic, location, notifications, etc.).
  guestSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  guestSession.setPermissionCheckHandler(() => false);

  // Block downloads initiated from guest content.
  guestSession.on('will-download', (event) => {
    event.preventDefault();
  });

  return guestSession;
}

module.exports = { configureSongPageGuestSession };
