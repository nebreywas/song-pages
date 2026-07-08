/**
 * Shared http(s) external URL scheme check for guest navigation, app:openExternal,
 * and trusted-window setWindowOpenHandler.
 */
function parseHttpUrl(raw) {
  try {
    return new URL(String(raw || '').trim());
  } catch {
    return null;
  }
}

function isAllowedExternalHttpUrl(raw) {
  const parsed = parseHttpUrl(raw);
  if (!parsed) return false;
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

/** Sanitize for logs — origin + pathname only (no query credentials). */
function sanitizeUrlForLog(raw) {
  const parsed = parseHttpUrl(raw);
  if (!parsed) return '(invalid-url)';
  return `${parsed.origin}${parsed.pathname}`;
}

module.exports = {
  parseHttpUrl,
  isAllowedExternalHttpUrl,
  sanitizeUrlForLog,
};
