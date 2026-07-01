// jsmediatags is browser-only (uses FileReader). Parse in renderer after main reads bytes.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error untyped UMD bundle
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

const empty = { title: '', album: '', year: '' };

/**
 * Read ID3 tags from a disk path: main process reads bytes, renderer parses with jsmediatags.
 */
export async function readMp3MetadataFromPath(
  filePath: string,
): Promise<{ title: string; album: string; year: string }> {
  const result = await window.app.artist.readMp3Bytes(filePath);
  if (!result.ok || !result.data) {
    return empty;
  }

  const bytes = result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
  const blob = new Blob([bytes], { type: 'audio/mpeg' });

  return new Promise((resolve) => {
    jsmediatags.read(blob, {
      onSuccess: (tag: { tags: Record<string, unknown> }) => {
        const tags = tag.tags ?? {};
        resolve({
          title: String(tags.title ?? ''),
          album: String(tags.album ?? ''),
          year: String(tags.year ?? tags.date ?? '').slice(0, 4),
        });
      },
      onError: () => resolve(empty),
    });
  });
}
