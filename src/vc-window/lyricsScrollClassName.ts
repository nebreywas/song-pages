/** Scroll container class names for lyrics — edge fade is optional per assignment. */
export function lyricsScrollClassName(edgeFade: boolean | undefined, designer = false): string {
  const classes = ['vc-lyrics-scroll'];
  if (designer) classes.push('vc-designer-lyrics-scroll');
  if (edgeFade !== false) classes.push('vc-lyrics-scroll--edge-fade');
  return classes.join(' ');
}
