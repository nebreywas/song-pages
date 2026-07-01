/** Canonical song page URL for sharing — strips cache-bust query params. */
export function shareableSongPageUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    url.searchParams.delete('v');
    url.searchParams.delete('songpagesApp');
    return url.toString();
  } catch {
    return pageUrl.split('?')[0] ?? pageUrl;
  }
}
