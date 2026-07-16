/**
 * Guest song pages size type in rem — bump documentElement font-size so content
 * scales without injecting stylesheets into untrusted artist HTML.
 */
export function buildApplySongPageFontScaleScript(scale: number): string {
  const safe = Number.isFinite(scale) && scale > 0 ? scale : 1;
  // 1 → clear override so the page’s own default root size wins again.
  if (safe === 1) {
    return `(function () {
  document.documentElement.style.fontSize = '';
  return true;
})()`;
  }
  const pct = `${Math.round(safe * 100)}%`;
  return `(function () {
  document.documentElement.style.fontSize = ${JSON.stringify(pct)};
  return true;
})()`;
}
