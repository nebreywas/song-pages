/** Playback-progress horizontal scroll for marquee lyrics (Simple Scroll mode). */
export function resolveMarqueeSimpleScrollPx(
  progress: number,
  textWidth: number,
  viewportWidth: number,
): number {
  const maxScroll = Math.max(0, textWidth - viewportWidth);
  if (maxScroll === 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  if (clamped === 0) return 0;
  return -clamped * maxScroll;
}
